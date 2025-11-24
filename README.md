# Azure IP Ranges & Service Tags — Tracker

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/downloads/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=github-actions&logoColor=white)](https://github.com/features/actions)
[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222222?logo=github&logoColor=white)](https://pages.github.com/)
[![Azure](https://img.shields.io/badge/Azure-Service_Tags-0078D4?logo=microsoft-azure&logoColor=white)](https://docs.microsoft.com/en-us/azure/virtual-network/service-tags-overview)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🌐 **Live Dashboard**: [View Demo](https://eliaquimbrandao.github.io/azure-service-tags-tracker)

A **100% FREE** serverless solution to monitor Microsoft Azure's 3000+ Service Tags and IP ranges using GitHub Actions + GitHub Pages. No hosting costs, no server maintenance.

**Built to help the Azure community** track infrastructure changes, improve security posture, and automate network management.

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Python 3.11+ |
| **Frontend** | Vanilla JavaScript (ES6+) |
| **UI/UX** | HTML5 + CSS3 |
| **Charts** | Chart.js 4.4+ |
| **Automation** | GitHub Actions (Cron + Workflow Dispatch) |
| **Hosting** | GitHub Pages (Static Site) |
| **Data Storage** | JSON files (Git-versioned) |
| **Change Detection** | SHA256 hashing + diff algorithms |

**No dependencies required** - Fork, enable Pages, and you're live in 2 minutes! ✨

---

## 🎯 What It Does

**Automatically tracks and visualizes changes** to Azure Service Tags weekly:

- � **Analytics Dashboard**: Charts showing service volatility, regional infrastructure changes, and update timelines
- 📅 **Change History**: Complete timeline with detailed IP-level changes per service and region
- 🔍 **Smart Search**: Find services, regions, or specific IP addresses instantly
- 📥 **Export Data**: Download filtered results as JSON for automation
- 🌍 **Regional Analysis**: See which Azure regions and services are most active

---

## ⚡ Quick Start

### 1. Fork & Setup (2 minutes)

```bash
# Fork this repository on GitHub, then:
git clone https://github.com/yourusername/azure-service-tags-watcher.git
cd azure-service-tags-watcher
```

### 2. Enable GitHub Pages

1. **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main**, Folder: **/docs**
4. **Save**

### 3. Run Initial Baseline

1. **Actions** → **Update Azure Service Tags** → **Run workflow**
2. ✅ Check **"Setup initial baseline (first run)"**
3. **Run workflow**
4. Wait 2-3 minutes

Done! Your dashboard will be live at: `https://yourusername.github.io/azure-service-tags-watcher`

**Auto-updates**: Runs every **Monday 7 AM UTC** automatically

---

## 📁 Project Structure

```text
azure-service-tags-watcher/
├── .github/workflows/
│   └── update-data.yml           # Weekly automation (GitHub Actions)
├── docs/                         # GitHub Pages website
│   ├── index.html                # Main dashboard
│   ├── analytics.html            # Analytics & charts page
│   ├── history.html              # Change history timeline
│   ├── js/
│   │   └── dashboard.js          # Core JavaScript (6000+ lines)
│   ├── css/
│   │   ├── style.css             # Main styles
│   │   ├── navigation.css        # Navigation & common components
│   │   └── history-controls.css  # History page controls
│   └── data/                     # JSON data storage
│       ├── current.json          # Latest Azure Service Tags
│       ├── summary.json          # Dashboard statistics
│       ├── changes/              # Change detection reports
│       │   ├── manifest.json     # Index of all change files
│       │   ├── latest-changes.json
│       │   └── YYYY-MM-DD-changes.json
│       └── history/              # Weekly snapshots
│           └── YYYY-MM-DD.json
├── examples/
│   └── api-usage-examples.md     # API integration examples & guides
├── scripts/
│   └── azure_watcher.py          # Data collection & change detection
└── README.md
```

### Key Components

**Backend (Python)**

- `azure_watcher.py`: Scrapes Microsoft's Service Tags page, downloads JSON, detects changes using SHA256 hashing

**Frontend (Vanilla JS + Chart.js)**

- `dashboard.js`: Handles all chart rendering, data loading, search, filtering, and exports
- Pie charts for AzureCloud regional infrastructure
- Timeline scatter plots for Microsoft update tracking
- Bar charts for service activity and regional analysis

**Data Flow**

1. GitHub Action triggers weekly → Python script downloads latest Azure data
2. Compares with previous snapshot using hash comparison
3. Generates change reports (added/removed IPs per service/region)
4. Commits to `docs/data/` → GitHub Pages auto-deploys
5. Dashboard loads JSON via fetch API and renders visualizations

---

## 🚀 Features

### Main Dashboard (`index.html`)

- **Summary Cards**: Total services, IP ranges, weekly changes
- **Service Search**: Real-time search across 3000+ services
- **Recent Changes**: Latest additions/removals with visual indicators
- **Quick Stats**: Click cards to view detailed modals

### Analytics Page (`analytics.html`)

- **🌍 AzureCloud Regional Infrastructure**: Pie chart showing top 10 most affected regions
- **📅 Microsoft Update Timeline**: Timeline markers showing baseline, Microsoft publish dates, and collection dates
- **🏆 Most Active Services**: Historical ranking by change frequency and magnitude
- **📊 Regional Hotspots**: Bar chart of regions with most activity

### History Page (`history.html`)

- **Complete Timeline**: Visual timeline of all weekly changes
- **Smart Filters**: Search by service, region, date range (7/14/30/60 days)
- **Detailed Views**: Expandable service cards with exact IP changes
- **One-Click Copy**: Copy all added or removed IPs per service
- **Export Data**: Download filtered results as JSON for automation
- **Week Comparison**: Compare any two weeks side-by-side
- **Region Navigation**: Browse changes by geographic region

---

## API Access & Usage

All data is publicly accessible as JSON via GitHub Pages. You can integrate this into your applications, scripts, and monitoring systems.

### Quick Reference

**Base URL**: `https://yourusername.github.io/azure-service-tags-watcher`

**Available Endpoints**:

- `/data/current.json` - Latest Azure Service Tags snapshot
- `/data/summary.json` - Statistics and available dates
- `/data/changes/latest-changes.json` - Most recent changes
- `/data/changes/manifest.json` - Index of all change reports
- `/data/history/YYYY-MM-DD.json` - Historical snapshots

### Complete Integration Examples

For **comprehensive API documentation** with working code examples, see:

📁 **[examples/api-usage-examples.md](examples/api-usage-examples.md)**

This includes:

- **PowerShell**: Auto-discovery function with detailed change tracking
- **Python**: Complete implementation with error handling and filtering
- **Multi-language guides**: JavaScript, C#, Go, Java, Ruby code samples
- **Integration patterns**: DevOps automation, security monitoring, compliance reporting
- **Best practices**: Caching strategies, error handling, rate limiting
- **Data structure reference**: Complete JSON schemas for all endpoints

---

## 🛠️ Local Development

```bash
# Test Python script
cd scripts
python azure_watcher.py --baseline  # First run
python azure_watcher.py             # Regular update

# Test dashboard locally
cd docs
python -m http.server 8000
# Open http://localhost:8000
```

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Action not running | Check Actions tab, ensure repo is public or has GitHub Pro |
| Dashboard empty | Run baseline setup first with checkbox enabled |
| No data loading | Verify `docs/data/current.json` exists and is valid JSON |
| Pages not working | Settings → Pages → Deploy from `main` branch, `/docs` folder |

---

## 📜 License

Made with ❤️ by [Eliaquim Brandão](https://github.com/eliaquimbrandao)

This project is licensed under the [MIT License](LICENSE).

⭐ Star this repo if you find it useful!

---

## 📞 Contact

For any questions or suggestions, feel free to reach out:

- **LinkedIn**: [Eliaquim Brandão](https://www.linkedin.com/in/eliaquim/)
- **GitHub**: [Eliaquim Brandão](https://github.com/eliaquimbrandao)

**🐛 Report issues** or suggest features in [GitHub Issues](https://github.com/eliaquimbrandao/azure-service-tags-watcher/issues)

**🤝 Contribute** to make it even better for the Azure community!

---

## ⚠️ Disclaimer

> [!WARNING]
> **Disclaimer:**  
> This codebase was developed with the assistance of artificial intelligence and is provided **"as-is"**, without warranties or guarantees of any kind. While extensive testing has yielded successful results, the author and contributors assume no responsibility for any direct or indirect damages, losses, or operational issues resulting from its use or misuse.  
> **Users are solely responsible for thoroughly reviewing, testing, and validating these scripts in their own environments before deploying them in production. By using this code, you acknowledge and accept all associated risks.**
