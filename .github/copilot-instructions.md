# Azure Service Tags & IP Ranges Watcher - AI Coding Agent Guide

## Architecture Overview

This is a **serverless monitoring system** that tracks changes to Azure Service Tags using GitHub Actions + GitHub Pages:

- **Data Collection**: `scripts/azure_watcher.py` downloads Microsoft's Service Tags JSON weekly
- **Change Detection**: Compares current data with previous snapshots, generates diff reports
- **Web Dashboard**: Static site in `docs/` with interactive charts and search functionality  
- **Automation**: GitHub Actions (`update-data.yml`) runs weekly, commits data updates
- **Hosting**: GitHub Pages serves the dashboard from `docs/` folder

## Critical Data Flow

1. **Weekly Schedule**: Action triggers Monday 7AM UTC → Downloads latest Azure JSON
2. **Change Analysis**: Compare with `docs/data/current.json` → Generate change reports in `docs/data/changes/`
3. **Historical Archive**: Snapshot saved to `docs/data/history/YYYY-MM-DD.json`
4. **Dashboard Update**: `docs/data/summary.json` updated with statistics
5. **Auto-Deploy**: Git commit triggers GitHub Pages rebuild

## Key Implementation Patterns

### Python Script (`azure_watcher.py`)
- **Scrapes Microsoft's confirmation page** to find current JSON URL (changes weekly)
- **Hash-based change detection** prevents duplicate processing
- **Robust error handling** with retries for network failures
- **Baseline mode** (`--baseline` flag) for initial setup without change detection

### Dashboard JavaScript (`dashboard.js`)
- **Region mapping**: Programmatic names (e.g., `eastus`) to display names (e.g., `East US`)
- **Chart.js integration** for time-series visualizations
- **Real-time search** through 3000+ service tags with regex support
- **Lazy loading** of historical data for performance

### Data Structure
```json
// docs/data/current.json - Raw Microsoft data
{"changeNumber": "XXX", "cloud": "Public", "values": [...]}

// docs/data/summary.json - Dashboard statistics  
{"total_services": 3039, "changes_this_week": 5, "top_active_services": [...]}

// docs/data/changes/latest-changes.json - Detailed diffs
{"timestamp": "...", "changes": [{"service": "...", "added": [...], "removed": [...]}]}
```

## Essential Development Commands

```bash
# Test data collection locally
python scripts/azure_watcher.py --baseline  # First run setup
python scripts/azure_watcher.py            # Regular update with change detection

# Test dashboard locally
cd docs && python -m http.server 8000     # Serve on localhost:8000

# Manual GitHub Action trigger
# Go to Actions tab → "Update Azure Service Tags" → "Run workflow"
```

## Integration Points

- **Microsoft API**: Downloads from dynamic URLs found on confirmation page
- **GitHub Actions**: Requires `contents: write` permission for data commits
- **GitHub Pages**: Must serve from `docs/` folder, updates automatically on push
- **Chart.js CDN**: Dashboard depends on external CDN for visualizations

## Project-Specific Conventions

- **File Naming**: Historical files use `YYYY-MM-DD.json` format in UTC
- **Commit Messages**: Automated commits use emoji prefixes (`📊`, `📈`)
- **Error Handling**: Python script continues on network errors, logs to GitHub Actions
- **Data Persistence**: All data stored in `docs/data/` for GitHub Pages access

## Common Debugging Scenarios

- **Missing data**: Check if GitHub Action completed successfully in Actions tab
- **Dashboard not loading**: Verify GitHub Pages enabled in Settings → Pages → Deploy from branch `main/docs`
- **No changes detected**: Verify internet connectivity and Microsoft's JSON structure hasn't changed
- **Python errors**: Check Action logs for network timeouts or JSON parsing issues