# Azure Service Tags Watcher

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
3. Branch: **main** / **docs**
4. Click **Save**

### 3. Enable GitHub Actions

1. Go to **Actions** tab in your repository
2. Click **"I understand my workflows, go ahead and enable them"**
3. The first run will trigger automatically

### 4. Wait for First Data Collection

- GitHub Action will run automatically every Monday at 7 AM UTC
- Or manually trigger: **Actions** → **Update Azure Service Tags** → **Run workflow**
- After first run, your dashboard will be live!

## 📁 Project Structure

```
azure-service-tags-dashboard/
├── .github/workflows/
│   └── update-data.yml          # Weekly automation
├── data/
│   ├── current.json             # Latest Azure data
│   ├── summary.json             # Dashboard statistics
│   ├── history/                 # Weekly snapshots
│   │   ├── 2025-10-01.json
│   │   └── 2025-10-08.json
│   └── changes/                 # Change reports
│       ├── 2025-10-08-changes.json
│       └── latest-changes.json
├── docs/                        # GitHub Pages website
│   ├── index.html              # Main dashboard
│   ├── dashboard.js            # JavaScript logic
│   ├── style.css               # Styling
│   └── assets/                 # Images, fonts, etc.
├── scripts/
│   └── azure_watcher.py        # Data collection script
└── README.md                   # This file
```

## 🔧 How It Works

1. **GitHub Action** runs every Monday morning
2. **Python script** downloads latest Azure Service Tags JSON
3. **Compares** with previous week's data
4. **Generates** JSON files with changes and statistics
5. **Commits** new data to repository
6. **GitHub Pages** serves updated dashboard automatically

## 📊 Dashboard Features

### Main Dashboard

- **Total Services**: Count of all Azure service tags
- **Weekly Changes**: Number of IP range changes this week
- **Change Frequency Chart**: Visual timeline of changes
- **Most Active Services**: Which services change most often
- **Regional Heatmap**: Geographic distribution of changes

### Service Search

- **Real-time search** through all 3000+ service tags
- **Filter by region** (e.g., "WestEurope", "EastUS")
- **Filter by service** (e.g., "Storage", "SQL", "AzureCloud")
- **View current IP ranges** for any service
- **Historical changes** for specific services

### Change Reports

- **Latest changes** with added/removed IP ranges
- **Change timeline** showing when each service was modified
- **Impact analysis** - how many IP ranges were affected
- **Download data** as JSON for automation

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

### Add Your Own Services

Track specific services by editing `scripts/azure_watcher.py`:

```python
# Focus on specific services
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

All data is available as JSON files:

```bash
# Current data
curl https://yourusername.github.io/azure-service-tags-dashboard/data/current.json

# Latest changes
curl https://yourusername.github.io/azure-service-tags-dashboard/data/changes/latest-changes.json

# Historical data
curl https://yourusername.github.io/azure-service-tags-dashboard/data/history/2025-10-08.json

# Dashboard summary
curl https://yourusername.github.io/azure-service-tags-dashboard/data/summary.json
```

## 🚨 Troubleshooting

### GitHub Action Not Running

1. Check **Actions** tab for error messages
2. Ensure repository is public (or have GitHub Pro for private Actions)
3. Verify Python script syntax in `scripts/azure_watcher.py`

### Dashboard Not Loading

1. Check GitHub Pages is enabled in **Settings** → **Pages**
2. Ensure `docs/` folder exists with HTML files
3. Wait 5-10 minutes after enabling Pages

### Missing Data

1. Check if GitHub Action completed successfully
2. Look at Action logs for Python errors
3. Ensure `data/` folder has JSON files

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

## 📄 License

MIT License - Feel free to use, modify, and distribute!

## 🙏 Credits

- **Original Azure Service Tag Watcher**: Command-line tool inspiration
- **Microsoft**: Azure Service Tags API
- **GitHub**: Free hosting and automation
- **Chart.js**: Beautiful charts
- **Community**: Ideas and contributions

---

⭐ **Star this repository** if you find it useful!

🐛 **Report issues** or suggest features in GitHub Issues

🤝 **Contribute** to make it even better for everyone!
