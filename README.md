# Azure Service Tags Watcher

[![Python](https://img.shields.io/badge/Python-3.6+-blue.svg)](https://www.python.org/downloads/)
[![Azure](https://img.shields.io/badge/Azure-Service%20Tags-blue.svg)](https://docs.microsoft.com/en-us/azure/virtual-network/service-tags-overview)
[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-green.svg)](https://pages.github.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Status](https://img.shields.io/badge/Status-Active%20Development-orange.svg)

🌐 **Live Dashboard**: Track changes to Azure Service Tags and IP ranges with automated weekly updates

A completely **FREE** solution using GitHub Actions + GitHub Pages to monitor all 3000+ Azure service tags and visualize changes over time.

## 🚀 Features

- **📊 Interactive Dashboard** - Beautiful charts showing change frequency and trends
- **🔍 Service Search** - Find any Azure service tag quickly
- **📈 Historical Data** - Track changes over weeks/months
- **🗺️ Regional Analysis** - See which regions have the most changes  
- **📱 Mobile Friendly** - Responsive design works on all devices
- **⚡ Auto-Updates** - GitHub Actions runs weekly, no manual intervention
- **🌍 Global CDN** - Fast loading worldwide via GitHub Pages
- **💰 100% FREE** - No hosting costs, no server maintenance

## 🎯 Live Demo

Visit the live dashboard: `https://eliaquimbrandao.github.io/azure-service-tags-watcher`

## 🛠️ Quick Setup (5 minutes)

### 1. Fork & Clone

```bash
# Fork this repository on GitHub, then:
git clone https://github.com/yourusername/azure-service-tags-watcher.git
cd azure-service-tags-watcher
```

### 2. Enable GitHub Pages

1. Go to **Settings** → **Pages** in your GitHub repository
2. Source: **Deploy from a branch**
3. Branch: **main**
4. Folder: **/ (root)** *(GitHub Pages will automatically serve from `docs/` folder)*
5. Click **Save**

### 3. Enable GitHub Actions

1. Go to **Actions** tab in your repository
2. Click **"I understand my workflows, go ahead and enable them"**

### 4. Run Initial Baseline Setup

**Important**: For the first run, you need to establish a baseline:

1. Go to **Actions** → **Update Azure Service Tags** → **Run workflow**
2. Check **"Setup initial baseline (first run)"** checkbox
3. Click **Run workflow**
4. Wait 2-3 minutes for completion

### 5. Schedule Regular Updates

After baseline setup, the system will:

- Auto-run every **Monday at 7:00 AM UTC**
- Or manually trigger anytime without the baseline checkbox
- Dashboard updates automatically after each run

## 📁 Project Structure

```text
azure-service-tags-watcher/
├── .github/
│   ├── workflows/
│   │   └── update-data.yml          # Weekly automation
│   └── copilot-instructions.md      # AI agent guidance
├── docs/                            # GitHub Pages website
│   ├── index.html                   # Main dashboard
│   ├── dashboard.js                 # JavaScript logic
│   ├── style.css                    # Modern styling
│   ├── style-old.css                # Legacy styles
│   └── data/                        # JSON data files
│       ├── current.json             # Latest Azure data
│       ├── summary.json             # Dashboard statistics
│       ├── history/                 # Weekly snapshots
│       │   └── 2025-10-08.json
│       └── changes/                 # Change reports
│           ├── 2025-10-08-changes.json
│           └── latest-changes.json
├── data/                            # Mirror of docs/data (legacy)
│   ├── current.json
│   ├── summary.json
│   ├── history/
│   └── changes/
├── scripts/
│   └── azure_watcher.py             # Data collection script
└── README.md                        # This file
```

## 🔧 How It Works

1. **GitHub Action** runs every Monday morning
2. **Python script** downloads latest Azure Service Tags JSON from Microsoft
3. **Compares** with previous week's data using SHA256 hash comparison
4. **Generates** JSON files with changes and statistics
5. **Commits** new data to repository (both `docs/data/` and `data/` folders)
6. **GitHub Pages** serves updated dashboard automatically

### Dependencies

The system only requires Python 3.11+ with the `requests` library:

```bash
# Dependencies are automatically installed by GitHub Actions
pip install requests
```

No additional packages, databases, or external services needed!

## 📊 Dashboard Features

### Main Dashboard

- **Total IP Ranges**: Number of individual IP ranges across all services  
- **Weekly Changes**: Number of IP range changes detected this week
- **Region Changes**: Number of regions affected by IP changes this week
- **Most Active Services Chart**: Paginated list showing services with frequent changes (with yellow 🟡 status for mixed IP changes)
- **Regional Analysis**: Interactive region selection to view detailed service changes per region

### Service Search & Discovery

- **Interactive stat cards** - Click on IP Ranges, Changes This Week, or Region Changes to see detailed modals
- **Expandable IP lists** - View first 10 IPs with "Show more" button for longer lists
- **Detailed change tracking** - See exact IPs added/removed with copy functionality
- **Service details modal** - View current IP ranges for any service by clicking on service name
- **Region drill-down** - Two-level modal: select region → see all services with IP changes in that region

### Change Tracking

- **Weekly change detection** - Automated comparison with previous data
- **Visual status indicators** - 🟢 Green (additions only), 🔴 Red (removals only), 🟡 Yellow (mixed changes)
- **Recent changes feed** - Paginated list of latest additions/removals to IP ranges
- **Change statistics** - Count of services added, removed, or modified
- **JSON data export** - All data accessible via API endpoints for automation

### Current Limitations

- **Historical trends**: Only tracks week-over-week changes (no long-term charts yet)
- **Per-service history**: No drill-down into individual service change history across multiple weeks  
- **Search functionality**: No global search yet (planned for future release)

## 🎨 Customization

### Update Collection Schedule

Edit `.github/workflows/update-data.yml`:

```yaml
on:
  schedule:
    - cron: '0 7 * * 1'  # Every Monday at 7 AM UTC
    # Change to: '0 12 * * 3'  # Every Wednesday at noon
```

### Customize Dashboard

- **Colors**: Edit `docs/style.css`
- **Charts**: Modify `docs/dashboard.js`
- **Layout**: Update `docs/index.html`
- **Add features**: All code is open source!

### Data Storage Architecture

The project maintains data in two locations:

- **`docs/data/`**: Primary location served by GitHub Pages (dashboard reads from here)
- **`data/`**: Legacy mirror for backward compatibility

Both folders contain identical data. The Python script updates both locations to ensure consistency.

### Add Your Own Services

Track specific services by editing `scripts/azure_watcher.py`. The script processes all 3000+ service tags by default, but you can add custom filtering:

```python
# Example: Focus on specific services (modify detect_changes function)
PRIORITY_SERVICES = [
    'Storage.WestEurope',
    'AzureSQLDatabase.EastUS', 
    'AzureKeyVault.SoutheastAsia'
]
```

## 📈 Usage Examples

### For DevOps Teams

- Monitor Azure services your applications depend on
- Get alerts when IP ranges change (affects firewall rules)
- Plan maintenance windows around Azure updates

### For Security Teams  

- Track changes to Azure security services
- Monitor new IP ranges for allowlist updates
- Audit Azure infrastructure changes

### For Compliance

- Historical record of all Azure IP changes
- Export data for compliance reports
- Track regional data residency changes

## 🔍 API Access

All data is available as JSON files via GitHub Pages:

```bash
# Replace 'yourusername' with your GitHub username
BASE_URL="https://yourusername.github.io/azure-service-tags-watcher"

# Current Azure Service Tags (raw Microsoft data)
curl "${BASE_URL}/data/current.json"

# Dashboard statistics and summary  
curl "${BASE_URL}/data/summary.json"

# Latest detected changes
curl "${BASE_URL}/data/changes/latest-changes.json"

# Historical snapshot (replace date)
curl "${BASE_URL}/data/history/2025-10-08.json"

# All available historical files
curl "${BASE_URL}/data/history/" | grep -o '2025-[0-9][0-9]-[0-9][0-9].json'
```

### Data Format Examples

```json
// summary.json structure
{
  "last_updated": "2025-10-08T14:16:40.528851+00:00",
  "total_services": 3039,
  "total_ip_ranges": 92436,
  "changes_this_week": 0,
  "top_active_services": []
}

// current.json structure (Microsoft's format)
{
  "changeNumber": "XXX",
  "cloud": "Public", 
  "values": [
    {
      "name": "ActionGroup",
      "id": "ActionGroup",
      "properties": {
        "addressPrefixes": ["13.66.60.119/32", "..."]
      }
    }
  ]
}
```

## 🚨 Troubleshooting

### GitHub Action Not Running

1. Check **Actions** tab for error messages
2. Ensure repository is public (or have GitHub Pro for private Actions)  
3. Verify workflow file exists: `.github/workflows/update-data.yml`
4. Check if baseline setup was completed first

### Dashboard Not Loading

1. Verify GitHub Pages is enabled: **Settings** → **Pages** → Deploy from `main` branch
2. Ensure `docs/index.html` exists and is valid HTML
3. Wait 5-10 minutes after enabling Pages for CDN propagation
4. Check browser console for JavaScript errors (F12)

### Missing Data or Empty Dashboard

1. **First-time setup**: Run baseline setup in Actions with checkbox enabled
2. **Check Action logs**: Go to Actions → Latest run → View logs for Python errors
3. **Data structure**: Ensure `docs/data/current.json` has valid JSON with "values" array
4. **Microsoft API changes**: Check if Azure Service Tags URL structure changed

### Local Development Issues

```bash
# Test Python script locally
cd scripts
python azure_watcher.py --baseline  # First run
python azure_watcher.py            # Regular run

# Test dashboard locally  
cd docs
python -m http.server 8000
# Open http://localhost:8000
```

### Common Error Messages

- **"Could not locate JSON download link"**: Microsoft changed their confirmation page
- **"All retry attempts failed"**: Network connectivity issues or rate limiting
- **"Dashboard shows 0 services"**: Data files corrupted or baseline not established

## 🤝 Contributing

This project is designed to be forkable and customizable:

1. **Fork** the repository
2. **Make your changes**
3. **Test locally** by opening `docs/index.html` in browser
4. **Create Pull Request** to share improvements

Ideas for contributions:

- 🎨 Better dashboard design
- 📊 Additional chart types
- 🔔 Email/Slack notifications
- 📱 Mobile app integration
- 🌍 Multi-language support

## ⚠️ Disclaimer

> [!WARNING]
> **Disclaimer:**  
> This codebase was developed with the assistance of artificial intelligence and is provided **"as-is"**, without warranties or guarantees of any kind. While extensive testing has yielded successful results, the author and contributors assume no responsibility for any direct or indirect damages, losses, or operational issues resulting from its use or misuse.  
> **Users are solely responsible for thoroughly reviewing, testing, and validating these scripts in their own environments before deploying them in production. By using this code, you acknowledge and accept all associated risks.**

## 📜 License

Made with ❤️ by [Eliaquim Brandao](https://github.com/eliaquimbrandao)  
Distributed under the [MIT License](https://choosealicense.com/licenses/mit/).

---

⭐ **Star this repository** if you find it useful!

🐛 **Report issues** or suggest features in GitHub Issues

🤝 **Contribute** to make it even better for everyone!
