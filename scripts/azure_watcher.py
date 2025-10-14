#!/usr/bin/env python3
"""
Azure Service Tag Watcher - Dashboard Data Generator
Adapted for GitHub Actions + GitHub Pages deployment

This script:
1. Downloads the latest Azure Service Tags JSON
2. Compares with previous data to detect changes  
3. Generates JSON files for the web dashboard
4. Creates summary statistics for visualization
"""

import json
import logging
import os
import re
import requests
import hashlib
import time
import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

AZURE_PUBLIC_IP_JSON_URL = "https://www.microsoft.com/en-us/download/confirmation.aspx?id=56519"
MAX_RETRIES = 3
RETRY_DELAY = 2
USER_AGENT = "Azure-Service-Tags-Watcher/1.0"

def download_latest_json() -> Dict:
    """Download the latest Azure Service Tags JSON with retry logic."""
    session = requests.Session()
    session.headers.update({'User-Agent': USER_AGENT})
    
    for attempt in range(MAX_RETRIES):
        try:
            logging.info(f"Downloading metadata page (attempt {attempt + 1}/{MAX_RETRIES})...")
            r = session.get(AZURE_PUBLIC_IP_JSON_URL, timeout=60)
            r.raise_for_status()
            
            matches = re.findall(r'href="(https?://[^\"]+\.json)"', r.text, flags=re.IGNORECASE)
            if not matches:
                raise RuntimeError("Could not locate the JSON download link on the confirmation page.")
            
            json_url = matches[0]
            logging.info(f"Downloading JSON from: {json_url}")
            
            r2 = session.get(json_url, timeout=120)
            r2.raise_for_status()
            
            data = r2.json()
            if not data or not isinstance(data, dict):
                raise ValueError("Downloaded JSON is empty or invalid.")
            
            if "values" not in data:
                raise ValueError("JSON missing 'values' key.")
            
            logging.info(f"Successfully downloaded JSON with {len(data.get('values', []))} tags.")
            return data
            
        except (requests.RequestException, ValueError, RuntimeError) as e:
            logging.error(f"Attempt {attempt + 1} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                logging.info(f"Retrying in {RETRY_DELAY} seconds...")
                time.sleep(RETRY_DELAY)
            else:
                logging.error("All retry attempts failed.")
                raise

def calculate_data_hash(data: Dict) -> str:
    """Calculate SHA256 hash of the data for change detection."""
    json_str = json.dumps(data, sort_keys=True)
    return hashlib.sha256(json_str.encode('utf-8')).hexdigest()

def load_previous_data() -> Optional[Dict]:
    """Load the previous week's data for comparison."""
    current_file = Path('docs/data/current.json')
    if current_file.exists():
        try:
            with open(current_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logging.warning(f"Could not load previous data: {e}")
    return None

def detect_changes(old_data: Optional[Dict], new_data: Dict) -> List[Dict]:
    """Detect changes between old and new data."""
    if not old_data:
        logging.info("No previous data found - this is the first run")
        return []
    
    changes = []
    old_services = {v['name']: v for v in old_data.get('values', [])}
    new_services = {v['name']: v for v in new_data.get('values', [])}
    
    for service_name, new_service in new_services.items():
        old_service = old_services.get(service_name)
        
        if not old_service:
            # New service added
            changes.append({
                'type': 'service_added',
                'service': service_name,
                'ip_count': len(new_service.get('properties', {}).get('addressPrefixes', [])),
                'region': new_service.get('properties', {}).get('region'),
                'system_service': new_service.get('properties', {}).get('systemService')
            })
            continue
        
        # Check for IP prefix changes
        old_prefixes = set(old_service.get('properties', {}).get('addressPrefixes', []))
        new_prefixes = set(new_service.get('properties', {}).get('addressPrefixes', []))
        
        added_prefixes = new_prefixes - old_prefixes
        removed_prefixes = old_prefixes - new_prefixes
        
        if added_prefixes or removed_prefixes:
            changes.append({
                'type': 'ip_changes',
                'service': service_name,
                'added_prefixes': sorted(list(added_prefixes)),
                'removed_prefixes': sorted(list(removed_prefixes)),
                'added_count': len(added_prefixes),
                'removed_count': len(removed_prefixes),
                'region': new_service.get('properties', {}).get('region'),
                'system_service': new_service.get('properties', {}).get('systemService')
            })
    
    # Check for removed services
    for service_name in old_services:
        if service_name not in new_services:
            changes.append({
                'type': 'service_removed',
                'service': service_name,
                'region': old_services[service_name].get('properties', {}).get('region'),
                'system_service': old_services[service_name].get('properties', {}).get('systemService')
            })
    
    logging.info(f"Detected {len(changes)} changes")
    return changes

def generate_summary_stats(data: Dict, changes: List[Dict]) -> Dict:
    """Generate summary statistics for the dashboard."""
    total_services = len(data.get('values', []))
    total_ip_ranges = sum(
        len(service.get('properties', {}).get('addressPrefixes', []))
        for service in data.get('values', [])
    )
    
    # Count changes by type
    ip_changes = [c for c in changes if c['type'] == 'ip_changes']
    service_additions = [c for c in changes if c['type'] == 'service_added']
    service_removals = [c for c in changes if c['type'] == 'service_removed']
    
    # Count changes by region
    regional_changes = {}
    for change in changes:
        region = change.get('region', 'Global')
        if region not in regional_changes:
            regional_changes[region] = 0
        regional_changes[region] += 1
    
    # Most active services (services with most changes)
    service_activity = {}
    for change in ip_changes:
        service = change['service']
        if service not in service_activity:
            service_activity[service] = 0
        service_activity[service] += change['added_count'] + change['removed_count']
    
    # Sort by activity
    top_active_services = sorted(
        service_activity.items(), 
        key=lambda x: x[1], 
        reverse=True
    )[:10]
    
    # Get list of available historical dates
    history_dir = 'docs/data/history'
    available_dates = []
    if os.path.exists(history_dir):
        history_files = sorted([f for f in os.listdir(history_dir) if f.endswith('.json')])
        available_dates = [f.replace('.json', '') for f in history_files]
    
    return {
        'last_updated': datetime.now(timezone.utc).isoformat(),
        'total_services': total_services,
        'total_ip_ranges': total_ip_ranges,
        'changes_this_week': len(changes),
        'ip_changes': len(ip_changes),
        'service_additions': len(service_additions),
        'service_removals': len(service_removals),
        'regional_changes': regional_changes,
        'top_active_services': [
            {'service': service, 'change_count': count}
            for service, count in top_active_services
        ],
        'available_dates': available_dates
    }

def save_data_files(data: Dict, changes: List[Dict], summary: Dict):
    """Save all data files for the dashboard."""
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    
    # Ensure data directories exist
    Path('docs/data').mkdir(exist_ok=True)
    Path('docs/data/history').mkdir(exist_ok=True)
    Path('docs/data/changes').mkdir(exist_ok=True)
    
    # Save current data
    with open('docs/data/current.json', 'w') as f:
        json.dump(data, f, indent=2)
    logging.info("Saved current.json")
    
    # Save historical snapshot
    history_file = f'docs/data/history/{today}.json'
    with open(history_file, 'w') as f:
        json.dump(data, f, indent=2)
    logging.info(f"Saved {history_file}")
    
    # Save changes if any
    if changes:
        changes_data = {
            'date': today,
            'changes': changes,
            'total_changes': len(changes),
            'generated_at': datetime.now(timezone.utc).isoformat()
        }
        
        # Save dated changes file
        changes_file = f'docs/data/changes/{today}-changes.json'
        with open(changes_file, 'w') as f:
            json.dump(changes_data, f, indent=2)
        logging.info(f"Saved {changes_file}")
        
        # Save latest changes (for dashboard)
        with open('docs/data/changes/latest-changes.json', 'w') as f:
            json.dump(changes_data, f, indent=2)
        logging.info("Saved latest-changes.json")
    else:
        # Save empty changes file
        empty_changes = {
            'date': today,
            'changes': [],
            'total_changes': 0,
            'generated_at': datetime.now(timezone.utc).isoformat(),
            'message': 'No changes detected this week'
        }
        with open('docs/data/changes/latest-changes.json', 'w') as f:
            json.dump(empty_changes, f, indent=2)
        logging.info("No changes detected - saved empty changes file")
    
    # Save summary statistics
    with open('docs/data/summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    logging.info("Saved summary.json")
    
    # Generate manifest of all change files for historical analysis
    generate_changes_manifest()

def generate_changes_manifest():
    """Generate a manifest file listing all available change files for the dashboard."""
    try:
        changes_dir = Path('docs/data/changes')
        
        # Find all change files (exclude latest-changes.json and manifest.json)
        change_files = []
        for file_path in sorted(changes_dir.glob('*-changes.json')):
            filename = file_path.name
            if filename not in ['latest-changes.json', 'manifest.json']:
                # Extract date from filename (YYYY-MM-DD-changes.json)
                date_match = re.match(r'(\d{4}-\d{2}-\d{2})-changes\.json', filename)
                if date_match:
                    file_size = file_path.stat().st_size
                    change_files.append({
                        'date': date_match.group(1),
                        'filename': filename,
                        'size': file_size
                    })
        
        # Sort by date (newest first)
        change_files.sort(key=lambda x: x['date'], reverse=True)
        
        manifest = {
            'generated': datetime.now(timezone.utc).isoformat(),
            'total_files': len(change_files),
            'date_range': {
                'oldest': change_files[-1]['date'] if change_files else None,
                'newest': change_files[0]['date'] if change_files else None
            },
            'files': change_files
        }
        
        manifest_file = changes_dir / 'manifest.json'
        with open(manifest_file, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        logging.info(f"Generated manifest with {len(change_files)} historical files")
        
    except Exception as e:
        logging.warning(f"Could not generate manifest: {e}")

def cleanup_old_files(keep_weeks: int = 12):
    """Clean up old history files to prevent repository bloat."""
    import glob
    from datetime import datetime, timedelta
    
    cutoff_date = datetime.now() - timedelta(weeks=keep_weeks)
    
    history_files = glob.glob('docs/data/history/*.json')
    changes_files = glob.glob('docs/data/changes/*-changes.json')
    
    for file_path in history_files + changes_files:
        try:
            # Extract date from filename
            filename = Path(file_path).stem
            if filename.startswith('2'):  # Year starts with 2
                file_date_str = filename[:10]  # YYYY-MM-DD
                file_date = datetime.strptime(file_date_str, '%Y-%m-%d')
                
                if file_date < cutoff_date:
                    os.remove(file_path)
                    logging.info(f"Cleaned up old file: {file_path}")
        except Exception as e:
            logging.warning(f"Could not process file {file_path}: {e}")

def main():
    """Main execution function."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Azure Service Tags Watcher - Dashboard Data Generator')
    parser.add_argument('--baseline', action='store_true', 
                       help='Setup initial baseline (no changes recorded)')
    args = parser.parse_args()
    
    try:
        if args.baseline:
            logging.info("=== Azure Service Tags Watcher - Baseline Setup ===")
            print("🎯 Setting up initial baseline")
        else:
            logging.info("=== Azure Service Tags Watcher Update ===")
        
        # Download latest data
        new_data = download_latest_json()
        
        if args.baseline:
            # For baseline setup, don't load previous data or detect changes
            logging.info("Baseline mode: Skipping change detection")
            old_data = None
            changes = []
        else:
            # Load previous data for comparison
            old_data = load_previous_data()
            # Detect changes
            changes = detect_changes(old_data, new_data)
        
        # Generate summary statistics
        summary = generate_summary_stats(new_data, changes)
        
        # Save all files
        save_data_files(new_data, changes, summary)
        
        # Cleanup old files
        cleanup_old_files()
        
        if args.baseline:
            logging.info("=== Baseline setup completed successfully ===")
            print("✅ Successfully established baseline data")
            print(f"📊 Total services: {summary['total_services']}")
            print(f"🔢 Total IP ranges: {summary['total_ip_ranges']}")
            print("🎯 Next weekly run will detect changes from this baseline")
        else:
            logging.info("=== Update completed successfully ===")
            print(f"✅ Successfully updated Azure Service Tags data")
            print(f"📊 Total services: {summary['total_services']}")
            print(f"🔢 Total IP ranges: {summary['total_ip_ranges']}")
            print(f"📈 Changes detected: {summary['changes_this_week']}")
            
            if changes:
                print(f"🔄 IP changes: {summary['ip_changes']}")
                print(f"➕ New services: {summary['service_additions']}")
                print(f"➖ Removed services: {summary['service_removals']}")
            else:
                print("✨ No changes detected this week")
            
    except Exception as e:
        logging.error(f"Update failed: {e}")
        raise

if __name__ == "__main__":
    main()