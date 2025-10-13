/**
 * Azure Service Tags Dashboard
 * Interactive dashboard for monitoring Azure service tag changes
 */

// Azure region mapping - programmatic name to display name
const AZURE_REGIONS = {
    'australiacentral': 'Australia Central',
    'australiacentral2': 'Australia Central 2',
    'australiaeast': 'Australia East',
    'australiasoutheast': 'Australia Southeast',
    'austriaeast': 'Austria East',
    'belgiumcentral': 'Belgium Central',
    'brazilsouth': 'Brazil South',
    'brazilsoutheast': 'Brazil Southeast',
    'canadacentral': 'Canada Central',
    'canadaeast': 'Canada East',
    'centralindia': 'Central India',
    'centralus': 'Central US',
    'chilecentral': 'Chile Central',
    'eastasia': 'East Asia',
    'eastus': 'East US',
    'eastus2': 'East US 2',
    'francecentral': 'France Central',
    'francesouth': 'France South',
    'germanynorth': 'Germany North',
    'germanywestcentral': 'Germany West Central',
    'indonesiacentral': 'Indonesia Central',
    'israelcentral': 'Israel Central',
    'italynorth': 'Italy North',
    'japaneast': 'Japan East',
    'japanwest': 'Japan West',
    'koreacentral': 'Korea Central',
    'koreasouth': 'Korea South',
    'malaysiawest': 'Malaysia West',
    'mexicocentral': 'Mexico Central',
    'newzealandnorth': 'New Zealand North',
    'northcentralus': 'North Central US',
    'northeurope': 'North Europe',
    'norwayeast': 'Norway East',
    'norwaywest': 'Norway West',
    'polandcentral': 'Poland Central',
    'qatarcentral': 'Qatar Central',
    'southafricanorth': 'South Africa North',
    'southafricawest': 'South Africa West',
    'southcentralus': 'South Central US',
    'southindia': 'South India',
    'southeastasia': 'Southeast Asia',
    'spaincentral': 'Spain Central',
    'swedencentral': 'Sweden Central',
    'swedensouth': 'Sweden South',
    'switzerlandnorth': 'Switzerland North',
    'switzerlandwest': 'Switzerland West',
    'uaecentral': 'UAE Central',
    'uaenorth': 'UAE North',
    'uksouth': 'UK South',
    'ukwest': 'UK West',
    'westcentralus': 'West Central US',
    'westeurope': 'West Europe',
    'westindia': 'West India',
    'westus': 'West US',
    'westus2': 'West US 2',
    'westus3': 'West US 3'
};

function getRegionDisplayName(programmaticName) {
    if (!programmaticName || programmaticName === '') {
        return 'Global';
    }

    // Clean the programmatic name (remove any prefixes/suffixes that might exist)
    const cleanName = programmaticName.toLowerCase().replace(/[^a-z]/g, '');

    return AZURE_REGIONS[cleanName] || programmaticName;
}

class AzureServiceTagsDashboard {
    constructor() {
        this.currentData = null;
        this.summaryData = null;
        this.changesData = null;
        this.filteredServices = [];
        this.activeServicesChart = null;
        this.regionalChart = null;
        this.currentModal = null;
        this.isRendered = false;
        this.servicesPage = 1;
        this.servicesContainer = null;
        this.recentChangesPage = 1;

        this.init();
    }

    async init() {
        try {
            // Ensure all modals are hidden initially
            this.hideAllModals();

            await this.loadData();
            this.renderDashboard();
            this.setupEventListeners();
        } catch (error) {
            this.showError(error);
        }
    }

    hideAllModals() {
        // Hide all modals on page load
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    async loadData() {
        const loadingEl = document.getElementById('loadingState');
        loadingEl.classList.remove('hidden');

        try {
            // Load all required data files with cache busting
            const timestamp = new Date().getTime();
            const [currentResponse, summaryResponse, changesResponse] = await Promise.all([
                fetch(`./data/current.json?t=${timestamp}`),
                fetch(`./data/summary.json?t=${timestamp}`),
                fetch(`./data/changes/latest-changes.json?t=${timestamp}`)
            ]);

            if (!currentResponse.ok || !summaryResponse.ok) {
                throw new Error('Failed to load required data files');
            }

            this.currentData = await currentResponse.json();
            this.summaryData = await summaryResponse.json();

            // Changes file might not exist on first run
            if (changesResponse.ok) {
                this.changesData = await changesResponse.json();
            } else {
                this.changesData = { changes: [], total_changes: 0 };
            }

        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        } finally {
            loadingEl.classList.add('hidden');
        }
    }

    renderDashboard() {
        // Prevent multiple renderings
        if (this.isRendered) {
            console.log('Dashboard already rendered, skipping...');
            return;
        }

        const dashboardEl = document.getElementById('dashboard');
        dashboardEl.classList.remove('hidden');

        this.renderStats();
        this.renderLastUpdated();
        this.renderCharts();
        this.renderChangeHistoryTimeline();
        this.renderRecentChanges();
        this.initializeGlobalSearch();

        this.isRendered = true;
    }

    renderStats() {
        // Update stat cards
        document.getElementById('totalIPRanges').textContent =
            this.summaryData.total_ip_ranges?.toLocaleString() || '0';

        document.getElementById('changesThisWeek').textContent =
            this.summaryData.changes_this_week?.toLocaleString() || '0';

        // Calculate number of regions with changes
        const regionsWithChanges = this.summaryData.regional_changes ?
            Object.keys(this.summaryData.regional_changes).length : 0;
        document.getElementById('ipChanges').textContent =
            regionsWithChanges.toLocaleString();

        // Update hero stats
        document.getElementById('heroTotalRanges').textContent =
            this.summaryData.total_ip_ranges?.toLocaleString() || '...';

        // Calculate actual region count from regional data
        const regionalData = this.summaryData.regional_changes || {};
        let regionCount = Object.keys(regionalData).length;

        // If no regional data available yet, extract from current service tags
        if (regionCount === 0 && this.currentData && this.currentData.values) {
            const regions = new Set();
            this.currentData.values.forEach(tag => {
                const name = tag.name || '';
                if (name.includes('.')) {
                    const parts = name.split('.');
                    if (parts.length > 1) {
                        const region = parts[parts.length - 1].toLowerCase();
                        // Only count known Azure regions (filter out service components like 'backend', 'core', etc.)
                        if (AZURE_REGIONS[region]) {
                            regions.add(region);
                        }
                    }
                }
            });
            regionCount = regions.size;
        }

        document.getElementById('heroRegions').textContent = regionCount > 0 ? regionCount.toLocaleString() : '...';
    }

    renderLastUpdated() {
        const lastUpdated = this.summaryData.last_updated;
        if (lastUpdated) {
            const date = new Date(lastUpdated);
            const formattedDate = date.toLocaleString();

            // Update both hero and main sections
            document.getElementById('lastUpdated').textContent = formattedDate;
        }
    }

    renderCharts() {
        this.renderActiveServicesChart();
        this.renderRegionalList();
    }

    renderActiveServicesChart() {
        // Store container reference or find it
        if (!this.servicesContainer) {
            const chartElement = document.getElementById('activeServicesChart');
            this.servicesContainer = chartElement ? chartElement.parentElement : null;
        }

        const container = this.servicesContainer;
        if (!container) {
            console.error('Services container not found');
            return;
        }

        // Calculate all active services from changes data with historical context
        const changes = this.changesData.changes || [];
        const serviceCounts = {};
        const serviceIPCounts = {};

        changes.forEach(change => {
            const serviceName = change.service;
            if (!serviceCounts[serviceName]) {
                serviceCounts[serviceName] = 0;
                serviceIPCounts[serviceName] = { added: 0, removed: 0 };
            }
            serviceCounts[serviceName]++;

            // Track IP changes
            if (change.added_count) {
                serviceIPCounts[serviceName].added += change.added_count;
            }
            if (change.removed_count) {
                serviceIPCounts[serviceName].removed += change.removed_count;
            }
        });

        // Load historical data to calculate true "activity" (services that change frequently over time)
        this.loadHistoricalActivity().then(historicalActivity => {
            const allServices = Object.entries(serviceCounts)
                .map(([service, count]) => {
                    const ipAdded = serviceIPCounts[service].added;
                    const ipRemoved = serviceIPCounts[service].removed;
                    const totalIPChange = ipAdded + ipRemoved;

                    // Calculate activity score combining:
                    // 1. Historical frequency (how many weeks this service changed)
                    // 2. IP impact (total IPs changed this week)
                    // 3. Change count this week (number of regions affected)
                    const historicalFrequency = historicalActivity[service] || 0;
                    const activityScore = (historicalFrequency * 100) + (totalIPChange * 0.1) + (count * 10);

                    return {
                        service,
                        change_count: count,
                        ip_added: ipAdded,
                        ip_removed: ipRemoved,
                        net_ip_change: ipAdded - ipRemoved,
                        historical_weeks: historicalFrequency,
                        activity_score: activityScore
                    };
                })
                // Sort by activity score (highest = most active over time)
                .sort((a, b) => b.activity_score - a.activity_score);

            this.renderServicesList(container, allServices);
        }).catch(error => {
            console.error('Error loading historical activity:', error);
            // Fallback: sort by IP impact if historical data fails
            const allServices = Object.entries(serviceCounts)
                .map(([service, count]) => ({
                    service,
                    change_count: count,
                    ip_added: serviceIPCounts[service].added,
                    ip_removed: serviceIPCounts[service].removed,
                    net_ip_change: serviceIPCounts[service].added - serviceIPCounts[service].removed,
                    historical_weeks: 0,
                    activity_score: (serviceIPCounts[service].added + serviceIPCounts[service].removed)
                }))
                .sort((a, b) => b.activity_score - a.activity_score);

            this.renderServicesList(container, allServices);
        });
    }

    async loadHistoricalActivity() {
        // Load all historical change files to calculate frequency
        const historicalActivity = {};

        try {
            // Load manifest to get list of all change files
            const manifestResponse = await fetch('data/changes/manifest.json');
            if (!manifestResponse.ok) {
                console.log('Manifest not found, falling back to known files');
                // Fallback to known files if manifest doesn't exist
                return this.loadHistoricalActivityFallback();
            }

            const manifest = await manifestResponse.json();

            // Filter out baseline/initial data files (oldest date)
            const oldestDate = manifest.date_range?.oldest;
            const changeFiles = manifest.files.filter(fileInfo => fileInfo.date !== oldestDate);

            console.log(`Loading ${changeFiles.length} actual change files (excluding baseline)...`);

            // Load each historical change file (excluding baseline)
            for (const fileInfo of changeFiles) {
                try {
                    const response = await fetch(`data/changes/${fileInfo.filename}`);
                    if (response.ok) {
                        const data = await response.json();

                        // Count IP changes per service (total magnitude of changes)
                        (data.changes || []).forEach(change => {
                            if (change.service) {
                                const serviceName = change.service;
                                if (!historicalActivity[serviceName]) {
                                    historicalActivity[serviceName] = {
                                        changeCount: 0,
                                        totalIPsAdded: 0,
                                        totalIPsRemoved: 0,
                                        totalIPChange: 0
                                    };
                                }

                                // Track all metrics
                                historicalActivity[serviceName].changeCount++;
                                historicalActivity[serviceName].totalIPsAdded += (change.added_count || 0);
                                historicalActivity[serviceName].totalIPsRemoved += (change.removed_count || 0);
                                historicalActivity[serviceName].totalIPChange += (change.added_count || 0) + (change.removed_count || 0);
                            }
                        });

                        console.log(`Loaded ${fileInfo.filename}: ${data.changes?.length || 0} changes`);
                    }
                } catch (err) {
                    console.log(`Could not load ${fileInfo.filename}:`, err.message);
                }
            }

            const totalServices = Object.keys(historicalActivity).length;
            console.log(`Historical analysis complete: ${totalServices} services tracked`);

            return historicalActivity;
        } catch (error) {
            console.error('Error in loadHistoricalActivity:', error);
            return this.loadHistoricalActivityFallback();
        }
    }

    async loadHistoricalActivityFallback() {
        // Fallback method when manifest is not available
        const historicalActivity = {};
        const changeFiles = ['2025-10-08-changes.json', '2025-10-10-changes.json'];

        console.log('Using fallback method to load historical data');

        for (const fileName of changeFiles) {
            try {
                const response = await fetch(`data/changes/${fileName}`);
                if (response.ok) {
                    const data = await response.json();
                    const services = new Set();

                    (data.changes || []).forEach(change => {
                        if (change.service) {
                            services.add(change.service);
                        }
                    });

                    services.forEach(service => {
                        historicalActivity[service] = (historicalActivity[service] || 0) + 1;
                    });
                }
            } catch (err) {
                console.log(`Could not load ${fileName}:`, err.message);
            }
        }

        return historicalActivity;
    }

    async showHistoricalInsights(container) {
        // Show insights from historical data when no changes this week
        try {
            const historicalActivity = await this.loadHistoricalActivity();
            const services = Object.entries(historicalActivity)
                .map(([service, stats]) => ({
                    service,
                    changeCount: stats.changeCount,
                    totalIPsAdded: stats.totalIPsAdded,
                    totalIPsRemoved: stats.totalIPsRemoved,
                    totalIPChange: stats.totalIPChange
                }))
                .sort((a, b) => b.totalIPChange - a.totalIPChange)  // Sort by total IP changes (magnitude)
                .slice(0, 5);  // Show only top 5

            if (services.length === 0) {
                container.innerHTML = `
                    <div class="no-changes-analytics">
                        <div class="no-changes-icon">✨</div>
                        <h3>No Changes This Week</h3>
                        <p>All Azure Service Tags remain stable.</p>
                        <div class="analytics-card">
                            <p><strong>📊 Baseline established</strong></p>
                            <p>Historical trends will appear here as data accumulates over time.</p>
                        </div>
                    </div>
                `;
                return;
            }

            // Show historical trends - Top 5 most active services by IP change magnitude
            const topServicesHtml = services.map((item, index) => `
                <div class="historical-insight-item" 
                     onclick="dashboard.showServiceHistory('${item.service.replace(/'/g, "\\'")}')"
                     title="Click to view ${item.service} history">
                    <div class="rank-number">${index + 1}</div>
                    <div class="service-details">
                        <div class="service-name">${item.service}</div>
                        <div class="service-meta">
                            <span class="frequency-badge">🔥 ${item.changeCount} change${item.changeCount !== 1 ? 's' : ''} recorded</span>
                            <span class="ip-details" style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem; display: block;">
                                ${item.totalIPChange.toLocaleString()} total IPs affected (+${item.totalIPsAdded.toLocaleString()} • -${item.totalIPsRemoved.toLocaleString()})
                            </span>
                        </div>
                    </div>
                </div>
            `).join('');

            container.innerHTML = `
                <div class="no-changes-analytics">
                    <div class="no-changes-icon">✨</div>
                    <h3>No Changes This Week</h3>
                    <p>All Azure Service Tags remain stable.</p>
                    
                    <div class="analytics-card">
                        <h4>📈 Top 5 Most Active Services</h4>
                        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">
                            Services with the most significant activity (combining frequency and IP range changes)
                        </p>
                        <div class="historical-insights-list">
                            ${topServicesHtml}
                        </div>
                    </div>

                    <div class="analytics-tip">
                        💡 <strong>Tip:</strong> Check the Change History Timeline below to explore past updates
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error showing historical insights:', error);
            container.innerHTML = `
                <div class="no-changes-analytics">
                    <div class="no-changes-icon">✨</div>
                    <h3>No Changes This Week</h3>
                    <p>All Azure Service Tags remain stable.</p>
                    <div class="analytics-card">
                        <p><strong>📊 Monitoring continues</strong></p>
                        <p>Check back next week for new updates or explore the Change History Timeline below.</p>
                    </div>
                </div>
            `;
        }
    }

    renderServicesList(container, allServices) {

        if (allServices.length === 0) {
            // When no changes this week, show historical insights
            this.showHistoricalInsights(container);
            return;
        }

        // Initialize pagination
        if (!this.servicesPage) {
            this.servicesPage = 1;
        }
        const itemsPerPage = 5;
        const totalPages = Math.ceil(allServices.length / itemsPerPage);
        const startIndex = (this.servicesPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentServices = allServices.slice(startIndex, endIndex);

        // Create a simple list instead of a chart
        const servicesHtml = currentServices.map((service, index) => {
            const actualRank = startIndex + index + 1;

            // Simple display: just show what was added and removed
            let ipIndicator;
            if (service.ip_added > 0 && service.ip_removed > 0) {
                // Mixed changes - show both additions and removals
                ipIndicator = `🟡 +${service.ip_added.toLocaleString()} IPs added, ${service.ip_removed.toLocaleString()} IPs removed`;
            } else if (service.ip_added > 0) {
                // Only additions
                ipIndicator = `🟢 +${service.ip_added.toLocaleString()} IPs added`;
            } else if (service.ip_removed > 0) {
                // Only removals
                ipIndicator = `🔴 ${service.ip_removed.toLocaleString()} IPs removed`;
            } else {
                // No change
                ipIndicator = '⚪ No IP changes';
            }

            // Add historical frequency indicator
            const frequencyBadge = service.historical_weeks > 1
                ? `<span class="frequency-badge" title="Changed in ${service.historical_weeks} of the last weeks">🔥 ${service.historical_weeks}× weeks</span>`
                : '';

            return `
                <div class="service-rank-item" 
                     data-service-name="${service.service.replace(/"/g, '&quot;')}" 
                     title="Click to view details for ${service.service.replace(/"/g, '&quot;')}">
                    <div class="rank-number">${actualRank}</div>
                    <div class="service-details">
                        <div class="service-name">
                            ${service.service}
                            ${frequencyBadge}
                        </div>
                        <div class="change-count">
                            ${service.change_count} change${service.change_count !== 1 ? 's' : ''} this week • ${ipIndicator}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Create pagination controls
        const paginationHtml = totalPages > 1 ? `
            <div class="pagination">
                <button class="pagination-btn" ${this.servicesPage === 1 ? 'disabled' : ''} onclick="dashboard.changeServicesPage(${this.servicesPage - 1})">
                    ←
                </button>
                ${this.generatePageNumbers(this.servicesPage, totalPages, 'changeServicesPage')}
                <button class="pagination-btn" ${this.servicesPage === totalPages ? 'disabled' : ''} onclick="dashboard.changeServicesPage(${this.servicesPage + 1})">
                    →
                </button>
            </div>
            <div class="pagination-info">
                Showing ${startIndex + 1}-${Math.min(endIndex, allServices.length)} of ${allServices.length} services
            </div>
        ` : '';

        container.innerHTML = `
            <h3>📊 Most Active Services</h3>
            <div class="services-rank-list">
                ${servicesHtml}
            </div>
            ${paginationHtml}
        `;

        // Add event delegation for service item clicks
        const servicesList = container.querySelector('.services-rank-list');
        if (servicesList) {
            servicesList.addEventListener('click', (e) => {
                const serviceItem = e.target.closest('.service-rank-item');
                if (serviceItem) {
                    const serviceName = serviceItem.getAttribute('data-service-name');
                    if (serviceName) {
                        this.showServiceDetails(serviceName);
                    }
                }
            });
        }
    }

    generatePageNumbers(currentPage, totalPages, onClickFunction) {
        let pages = [];
        const maxVisible = 4;

        if (totalPages <= maxVisible + 2) {
            // Show all pages if total is small
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);

            // Calculate range around current page
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            // Add ellipsis if needed
            if (start > 2) pages.push('...');

            // Add pages around current
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            // Add ellipsis if needed
            if (end < totalPages - 1) pages.push('...');

            // Always show last page
            pages.push(totalPages);
        }

        return pages.map(page => {
            if (page === '...') {
                return '<span class="pagination-ellipsis">...</span>';
            }
            return `<button class="pagination-btn ${page === currentPage ? 'active' : ''}" onclick="dashboard.${onClickFunction}(${page})">${page}</button>`;
        }).join('');
    }

    changeServicesPage(page) {
        this.servicesPage = page;
        this.renderActiveServicesChart();
    }

    changeRecentChangesPage(page) {
        this.recentChangesPage = page;
        this.renderRecentChanges();
        // Scroll to recent changes section
        document.getElementById('recentChanges').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    renderRegionalList() {
        const regionalContainer = document.getElementById('regionalChart').parentElement;
        const regionalData = this.summaryData.regional_changes || {};

        if (Object.keys(regionalData).length === 0) {
            // Show helpful message when no regional changes
            regionalContainer.innerHTML = `
                <div class="no-changes-analytics">
                    <div class="no-changes-icon">🌍</div>
                    <h3>No Regional Changes This Week</h3>
                    <p>All Azure regional service tags remain stable.</p>
                    <div class="analytics-card">
                        <p><strong>🌐 Global Stability</strong></p>
                        <p>No geographic region experienced service tag updates this week. This indicates stable infrastructure across all Azure regions.</p>
                    </div>
                    <div class="analytics-tip">
                        💡 <strong>Tip:</strong> Historical regional trends will appear here as changes occur over time
                    </div>
                </div>
            `;
            return;
        }

        // Filter out Global region (empty string) and sort alphabetically
        const sortedRegions = Object.entries(regionalData)
            .filter(([region]) => region !== '') // Exclude Global (empty string)
            .sort(([a], [b]) => a.localeCompare(b)); // Sort alphabetically by region name

        // Filter to only show regions with more than 3 changes
        const significantRegions = sortedRegions.filter(([region, count]) => count > 3);

        if (significantRegions.length === 0) {
            regionalContainer.innerHTML = `
                <div class="no-changes-analytics">
                    <div class="no-changes-icon">🌍</div>
                    <h3>No Significant Regional Changes</h3>
                    <p>Only minor updates detected this week.</p>
                    <div class="analytics-card">
                        <p><strong>🔍 Minor Activity Detected</strong></p>
                        <p>While some regions had updates, none exceeded the threshold of 3+ service changes. This indicates routine maintenance rather than major infrastructure changes.</p>
                        <div style="margin-top: 1rem; padding: 0.75rem; background: var(--background-color); border-radius: 6px;">
                            <strong>Regions with minor changes:</strong>
                            <div style="margin-top: 0.5rem;">
                                ${sortedRegions.map(([region, count]) => {
                const displayName = getRegionDisplayName(region);
                return `<div style="padding: 0.25rem 0;">• ${displayName}: ${count} change${count !== 1 ? 's' : ''}</div>`;
            }).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="analytics-tip">
                        💡 <strong>Note:</strong> Showing only geographic regions (Global services excluded)
                    </div>
                </div>
            `;
            return;
        }

        // Get detailed data for each region
        const changes = this.changesData.changes || [];

        // Create interactive regional list
        const regionsHtml = significantRegions.map(([region, count]) => {
            const displayName = getRegionDisplayName(region);

            // Get all changes for this region
            const regionChanges = changes.filter(change => (change.region || '') === region);

            // Calculate IP totals for this region
            let totalIPsAdded = 0;
            let totalIPsRemoved = 0;
            regionChanges.forEach(change => {
                totalIPsAdded += change.added_count || 0;
                totalIPsRemoved += change.removed_count || 0;
            });
            const netIPChange = totalIPsAdded - totalIPsRemoved;

            // Find top service in this region
            const serviceCounts = {};
            regionChanges.forEach(change => {
                const serviceName = change.service;
                serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
            });
            const topService = Object.entries(serviceCounts)
                .sort((a, b) => b[1] - a[1])[0];
            const topServiceName = topService ? topService[0] : 'N/A';
            const topServiceCount = topService ? topService[1] : 0;

            return `
                <div class="region-item" data-region="${region}" onclick="dashboard.showRegionChanges('${region}', '${displayName}', ${count})">
                    <div class="region-info">
                        <span class="region-name">${displayName}</span>
                        <span class="region-top-service">└─ ${topServiceName} (${topServiceCount} change${topServiceCount !== 1 ? 's' : ''})</span>
                    </div>
                    <div class="region-count">
                        <span class="change-badge">${count} changes</span>
                        <span class="ip-badge">${netIPChange >= 0 ? '+' : ''}${netIPChange.toLocaleString()} IPs</span>
                    </div>
                </div>
            `;
        }).join('');

        regionalContainer.innerHTML = `
            <h3>🌍 Regional Hotspots</h3>
            <div class="regions-list">
                ${regionsHtml}
            </div>
            <div class="region-help">
                💡 Showing geographic regions with more than 3 service changes (Global services excluded)
            </div>
        `;
    }

    showRegionChanges(region, displayName, changeCount) {
        const changes = this.changesData.changes || [];
        const regionChanges = changes.filter(change =>
            (change.region || '') === region
        );

        console.log(`Region: ${region}, Display: ${displayName}`);
        console.log(`Found ${regionChanges.length} changes for this region`);
        console.log('Sample change:', regionChanges[0]);

        if (regionChanges.length === 0) {
            alert(`No detailed changes available for ${displayName}`);
            return;
        }

        // Use the same modal as "All Changes This Week" for consistency
        this.showChangesModal(`🗺️ ${displayName} - Changes This Week`, regionChanges, 'region');
    }

    closeRegionModal() {
        if (this.currentModal) {
            document.body.removeChild(this.currentModal);
            this.currentModal = null;
        }
    }

    async renderRecentChanges() {
        const changesContainer = document.getElementById('recentChanges');
        const changes = this.changesData.changes || [];

        if (!changesContainer) {
            console.error('recentChanges container not found!');
            return;
        }

        if (changes.length === 0) {
            // Fetch last change date from manifest
            let lastChangeInfo = await this.getLastChangeDate();

            changesContainer.innerHTML = `
                <div class="change-item">
                    <div class="change-header">
                        <div class="change-service">✨ No Changes This Week</div>
                    </div>
                    <div class="change-details">
                        All Azure service tags remain unchanged since the last update.
                        ${lastChangeInfo.html}
                    </div>
                </div>
            `;
            return;
        }

        // Sort changes alphabetically
        const sortedChanges = changes.sort((a, b) => a.service.localeCompare(b.service));

        // Initialize pagination
        if (!this.recentChangesPage) {
            this.recentChangesPage = 1;
        }
        const itemsPerPage = 5;
        const totalPages = Math.ceil(sortedChanges.length / itemsPerPage);
        const startIndex = (this.recentChangesPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const displayChanges = sortedChanges.slice(startIndex, endIndex);

        const changesHtml = displayChanges.map(change => {
            return this.renderChangeItem(change);
        }).join('');

        // Create pagination controls
        const paginationHtml = totalPages > 1 ? `
            <div class="pagination">
                <button class="pagination-btn" ${this.recentChangesPage === 1 ? 'disabled' : ''} onclick="dashboard.changeRecentChangesPage(${this.recentChangesPage - 1})">
                    ←
                </button>
                ${this.generatePageNumbers(this.recentChangesPage, totalPages, 'changeRecentChangesPage')}
                <button class="pagination-btn" ${this.recentChangesPage === totalPages ? 'disabled' : ''} onclick="dashboard.changeRecentChangesPage(${this.recentChangesPage + 1})">
                    →
                </button>
            </div>
            <div class="pagination-info">
                Showing ${startIndex + 1}-${Math.min(endIndex, sortedChanges.length)} of ${sortedChanges.length} changes
            </div>
        ` : '';

        changesContainer.innerHTML = changesHtml + paginationHtml;
    }

    async getLastChangeDate() {
        try {
            const timestamp = new Date().getTime();
            const response = await fetch(`./data/changes/manifest.json?t=${timestamp}`);

            if (!response.ok) {
                return {
                    html: `
                        <div style="margin-top: 1rem; padding: 1rem; background: var(--card-background); border-radius: 8px; border: 1px solid var(--border-color);">
                            <div style="font-weight: 600; margin-bottom: 0.5rem;">💡 Want to see previous updates?</div>
                            <div style="font-size: 0.9rem; margin-bottom: 0.75rem; color: var(--text-secondary);">
                                Check the Change History Timeline below to browse historical changes
                            </div>
                            <button onclick="dashboard.scrollToTimeline()" class="timeline-link-btn">
                                📅 View Change History Timeline
                            </button>
                        </div>
                    `
                };
            }

            const manifest = await response.json();
            const files = manifest.files || [];

            // Filter out baseline (oldest date)
            const oldestDate = manifest.date_range?.oldest;
            const changeFiles = files.filter(f => f.date !== oldestDate);

            if (changeFiles.length === 0) {
                return {
                    html: `
                        <div style="margin-top: 1rem; padding: 1rem; background: var(--card-background); border-radius: 8px; border: 1px solid var(--border-color);">
                            <div style="font-weight: 600; margin-bottom: 0.5rem;">📊 Change tracking started</div>
                            <div style="font-size: 0.9rem; color: var(--text-secondary);">
                                Monitoring Azure Service Tags for changes. Updates will appear here weekly.
                            </div>
                        </div>
                    `
                };
            }

            // Get the most recent change file (should be sorted newest first)
            const sortedFiles = changeFiles.sort((a, b) => new Date(b.date) - new Date(a.date));
            const lastChangeFile = sortedFiles[0];
            const lastChangeDate = new Date(lastChangeFile.date);
            const formattedDate = lastChangeDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Calculate days ago
            const today = new Date();
            const diffTime = Math.abs(today - lastChangeDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const daysAgoText = diffDays === 0 ? 'today' : diffDays === 1 ? 'yesterday' : `${diffDays} days ago`;

            return {
                html: `
                    <div style="margin-top: 1rem; padding: 1rem; background: var(--card-background); border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-weight: 600; margin-bottom: 0.5rem;">📅 Last Update</div>
                        <div style="font-size: 0.95rem; margin-bottom: 0.5rem;">
                            <strong>${formattedDate}</strong> (${daysAgoText})
                        </div>
                        <div style="font-size: 0.9rem; margin-bottom: 0.75rem; color: var(--text-secondary);">
                            View all historical changes in the timeline below
                        </div>
                        <button onclick="dashboard.scrollToTimeline()" class="timeline-link-btn">
                            📅 View Change History Timeline
                        </button>
                    </div>
                `
            };

        } catch (error) {
            console.error('Error fetching last change date:', error);
            return {
                html: `
                    <div style="margin-top: 1rem; padding: 1rem; background: var(--card-background); border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-weight: 600; margin-bottom: 0.5rem;">💡 Want to see previous updates?</div>
                        <div style="font-size: 0.9rem; margin-bottom: 0.75rem; color: var(--text-secondary);">
                            Check the Change History Timeline below to browse historical changes
                        </div>
                        <button onclick="dashboard.scrollToTimeline()" class="timeline-link-btn">
                            📅 View Change History Timeline
                        </button>
                    </div>
                `
            };
        }
    }

    async renderChangeHistoryTimeline() {
        const timelineContainer = document.getElementById('changeHistoryTimeline');

        if (!timelineContainer) {
            console.error('changeHistoryTimeline container not found!');
            return;
        }

        // Show loading state
        timelineContainer.innerHTML = `
            <div class="timeline-loading">
                <div class="spinner"></div>
                <p>Loading change history...</p>
            </div>
        `;

        try {
            // Load the manifest file to get all historical changes
            const timestamp = new Date().getTime();
            const manifestResponse = await fetch(`./data/changes/manifest.json?t=${timestamp}`);

            if (!manifestResponse.ok) {
                throw new Error('Could not load change history manifest');
            }

            const manifest = await manifestResponse.json();
            const files = manifest.files || [];

            if (files.length === 0) {
                timelineContainer.innerHTML = `
                    <div class="timeline-empty">
                        <p>📅 No change history available yet</p>
                        <p>Change history will appear here as updates are detected</p>
                    </div>
                `;
                return;
            }

            // Filter out baseline/initial data files
            const oldestDate = manifest.date_range?.oldest;
            const changeFiles = files.filter(fileInfo => fileInfo.date !== oldestDate);

            if (changeFiles.length === 0) {
                timelineContainer.innerHTML = `
                    <div class="timeline-empty">
                        <p>📅 No change history available yet</p>
                        <p>Only baseline data exists. Change history will appear as updates are detected</p>
                    </div>
                `;
                return;
            }

            // Sort files by date (newest first)
            const sortedFiles = changeFiles.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Load summary data for each change file (limit to last 10 for performance)
            const recentFiles = sortedFiles.slice(0, 10);
            const timelineItems = await Promise.all(
                recentFiles.map(file => this.loadTimelineItem(file))
            );

            // Render timeline
            const timelineHtml = timelineItems.map(item => this.renderTimelineItem(item)).join('');
            timelineContainer.innerHTML = timelineHtml;

        } catch (error) {
            console.error('Error loading change history:', error);
            timelineContainer.innerHTML = `
                <div class="timeline-error">
                    <p>⚠️ Unable to load change history</p>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    async loadTimelineItem(fileInfo) {
        try {
            const timestamp = new Date().getTime();
            const response = await fetch(`./data/changes/${fileInfo.filename}?t=${timestamp}`);

            if (!response.ok) {
                throw new Error(`Could not load ${fileInfo.filename}`);
            }

            const data = await response.json();
            const changes = data.changes || [];

            // Calculate statistics
            const serviceCount = new Set(changes.map(c => c.service)).size;
            const regionCount = new Set(changes.map(c => c.region || 'global')).size;
            const totalIPChanges = changes.reduce((sum, c) => {
                return sum + (c.added_count || 0) + (c.removed_count || 0);
            }, 0);
            const addedIPs = changes.reduce((sum, c) => sum + (c.added_count || 0), 0);
            const removedIPs = changes.reduce((sum, c) => sum + (c.removed_count || 0), 0);

            return {
                date: fileInfo.date,
                filename: fileInfo.filename,
                changeCount: changes.length,
                serviceCount,
                regionCount,
                totalIPChanges,
                addedIPs,
                removedIPs,
                hasChanges: changes.length > 0,
                changes: changes
            };
        } catch (error) {
            console.error(`Error loading timeline item ${fileInfo.filename}:`, error);
            return {
                date: fileInfo.date,
                filename: fileInfo.filename,
                error: true,
                errorMessage: error.message
            };
        }
    }

    renderTimelineItem(item) {
        if (item.error) {
            return `
                <div class="timeline-item no-changes">
                    <div class="timeline-header">
                        <div class="timeline-date">
                            <span class="date-icon">📅</span>
                            ${this.formatDate(item.date)}
                        </div>
                        <span class="timeline-badge no-changes-badge">Error</span>
                    </div>
                    <div class="timeline-details">
                        <p style="color: var(--danger-color);">⚠️ ${item.errorMessage}</p>
                    </div>
                </div>
            `;
        }

        if (!item.hasChanges) {
            return `
                <div class="timeline-item no-changes">
                    <div class="timeline-header">
                        <div class="timeline-date">
                            <span class="date-icon">📅</span>
                            ${this.formatDate(item.date)}
                        </div>
                        <span class="timeline-badge no-changes-badge">No Changes</span>
                    </div>
                    <div class="timeline-details">
                        <div class="timeline-detail-item">
                            <span>✨</span>
                            <span>No service tag updates detected</span>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="timeline-item" onclick="dashboard.showTimelineDetails('${item.filename}', '${item.date}')">
                <div class="timeline-header">
                    <div class="timeline-date">
                        <span class="date-icon">📅</span>
                        ${this.formatDate(item.date)}
                    </div>
                    <span class="timeline-badge">${item.changeCount} Changes</span>
                </div>
                
                <div class="timeline-stats">
                    <div class="timeline-stat-box">
                        <span class="timeline-stat-number">${item.serviceCount}</span>
                        <span class="timeline-stat-label">Services</span>
                    </div>
                    <div class="timeline-stat-box">
                        <span class="timeline-stat-number">${item.regionCount}</span>
                        <span class="timeline-stat-label">Regions</span>
                    </div>
                    <div class="timeline-stat-box">
                        <span class="timeline-stat-number" style="color: var(--success-color);">${item.addedIPs}</span>
                        <span class="timeline-stat-label">Added IPs</span>
                    </div>
                    <div class="timeline-stat-box">
                        <span class="timeline-stat-number" style="color: var(--danger-color);">${item.removedIPs}</span>
                        <span class="timeline-stat-label">Removed IPs</span>
                    </div>
                </div>

                <div class="timeline-action-hint">
                    👆 Click to view detailed changes
                </div>
            </div>
        `;
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            const options = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };
            return date.toLocaleDateString('en-US', options);
        } catch (error) {
            return dateString;
        }
    }

    async showTimelineDetails(filename, date) {
        try {
            // Load the specific change file
            const timestamp = new Date().getTime();
            const response = await fetch(`./data/changes/${filename}?t=${timestamp}`);

            if (!response.ok) {
                throw new Error('Could not load change details');
            }

            const data = await response.json();
            const changes = data.changes || [];

            if (changes.length === 0) {
                alert('No changes found for this date');
                return;
            }

            // Show navigation modal with Services/Regions options
            this.showTimelineNavigationModal(date, changes);

        } catch (error) {
            console.error('Error loading timeline details:', error);
            alert('Unable to load change details. Please try again.');
        }
    }

    showTimelineNavigationModal(date, changes) {
        const modal = document.createElement('div');
        modal.className = 'changes-modal-overlay';

        // Calculate statistics
        const serviceCount = new Set(changes.map(c => c.service)).size;
        const ipChanges = changes.filter(c => c.type === 'ip_changes');
        const regionCount = new Set(ipChanges.map(c => c.region || 'global')).size;
        const totalIPChanges = changes.reduce((sum, c) => {
            return sum + (c.added_count || 0) + (c.removed_count || 0);
        }, 0);
        const addedIPs = changes.reduce((sum, c) => sum + (c.added_count || 0), 0);
        const removedIPs = changes.reduce((sum, c) => sum + (c.removed_count || 0), 0);

        const formattedDate = this.formatDate(date);

        modal.innerHTML = `
            <div class="changes-modal">
                <div class="changes-modal-header">
                    <h3>📅 ${formattedDate}</h3>
                    <button onclick="this.closest('.changes-modal-overlay').remove()" class="close-modal-btn">&times;</button>
                </div>
                <div class="changes-modal-content">
                    <div class="timeline-navigation">
                        <h4>How would you like to browse these changes?</h4>
                        
                        <div class="timeline-nav-options">
                            <div class="timeline-nav-card" data-view="services">
                                <div class="nav-card-icon">🔧</div>
                                <div class="nav-card-content">
                                    <h5>Browse by Services</h5>
                                    <p>View changes organized by Azure service</p>
                                </div>
                                <div class="nav-card-arrow">→</div>
                            </div>

                            <div class="timeline-nav-card" data-view="regions">
                                <div class="nav-card-icon">🌍</div>
                                <div class="nav-card-content">
                                    <h5>Browse by Regions</h5>
                                    <p>View changes organized by geographic region</p>
                                </div>
                                <div class="nav-card-arrow">→</div>
                            </div>
                        </div>

                        <div class="timeline-summary-stats">
                            <div class="summary-stat-box">
                                <div class="summary-stat-number">${changes.length}</div>
                                <div class="summary-stat-label">Total Changes</div>
                            </div>
                            <div class="summary-stat-box">
                                <div class="summary-stat-number" style="color: var(--success-color);">${addedIPs}</div>
                                <div class="summary-stat-label">IPs Added</div>
                            </div>
                            <div class="summary-stat-box">
                                <div class="summary-stat-number" style="color: var(--danger-color);">${removedIPs}</div>
                                <div class="summary-stat-label">IPs Removed</div>
                            </div>
                        </div>
                    </div>

                    <div class="timeline-detail-view" style="display: none;">
                        <div class="back-to-navigation">
                            <button class="back-btn">← Back to Navigation</button>
                        </div>
                        <div id="timelineDetailContainer"></div>
                    </div>
                </div>
            </div>
        `;

        // Close modal when clicking overlay
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };

        document.body.appendChild(modal);
        this.currentTimelineModal = modal;

        // Store data for navigation
        modal.timelineData = {
            date: date,
            changes: changes,
            ipChanges: ipChanges
        };

        // Add event listeners for navigation cards
        const navCards = modal.querySelectorAll('.timeline-nav-card');
        navCards.forEach(card => {
            card.addEventListener('click', () => {
                const view = card.dataset.view;
                if (view === 'services') {
                    this.showTimelineServiceView(modal, formattedDate, changes);
                } else if (view === 'regions') {
                    this.showTimelineRegionView(modal, formattedDate, ipChanges);
                }
            });
        });

        // Add back button listener
        const backBtn = modal.querySelector('.back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                modal.querySelector('.timeline-navigation').style.display = 'block';
                modal.querySelector('.timeline-detail-view').style.display = 'none';
            });
        }
    }

    showTimelineServiceView(modal, date, changes) {
        // Hide navigation and show services
        modal.querySelector('.timeline-navigation').style.display = 'none';
        modal.querySelector('.timeline-detail-view').style.display = 'block';

        // Sort changes alphabetically by service
        const sortedChanges = changes.sort((a, b) => a.service.localeCompare(b.service));

        // Render all services with full details
        const servicesHtml = sortedChanges.map(change => {
            return this.renderChangeItemDetailed(change);
        }).join('');

        const container = modal.querySelector('#timelineDetailContainer');
        container.innerHTML = `
            <div class="region-services-header">
                <h4>🔧 All Services - ${date}</h4>
                <div class="search-section">
                    <input type="text" 
                           id="timelineServiceSearch" 
                           placeholder="🔍 Search by service name or IP..." 
                           class="changes-search-input">
                </div>
            </div>
            <div class="changes-list" id="timelineServicesList">
                ${servicesHtml}
            </div>
        `;

        // Add search functionality
        const searchInput = container.querySelector('#timelineServiceSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const changeItems = container.querySelectorAll('.change-item');

                changeItems.forEach(item => {
                    const text = item.textContent.toLowerCase();
                    if (text.includes(searchTerm)) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        }
    }

    showTimelineRegionView(modal, date, ipChanges) {
        // Hide navigation and show regions
        modal.querySelector('.timeline-navigation').style.display = 'none';
        modal.querySelector('.timeline-detail-view').style.display = 'block';

        // Group changes by region
        const changesByRegion = this.groupChangesByRegion(ipChanges);
        const regions = Object.keys(changesByRegion).sort();

        const container = modal.querySelector('#timelineDetailContainer');
        container.innerHTML = `
            <div class="region-services-header">
                <h4>🌍 Browse by Region - ${date}</h4>
            </div>
            <div class="region-list-container">
                <div class="region-search">
                    <input type="text" id="timelineRegionSearch" placeholder="🔍 Search regions..." />
                </div>
                <div class="region-items">
                    ${regions.map(region => {
            const displayName = region === 'Global' ? '🌐 Global Services' : getRegionDisplayName(region);
            const count = changesByRegion[region].length;
            return `
                            <div class="region-item" data-region="${region}" data-display-name="${displayName.toLowerCase()}">
                                <div class="region-name">${displayName}</div>
                                <div class="region-count">${count} service${count !== 1 ? 's' : ''} changed</div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
            <div class="services-for-region-nested" style="display: none;">
                <div class="back-to-region-list">
                    <button class="back-btn-nested">← Back to Regions</button>
                </div>
                <div id="timelineRegionServicesContainer"></div>
            </div>
        `;

        // Add event listeners for region items
        const regionItems = container.querySelectorAll('.region-item');
        regionItems.forEach(item => {
            item.addEventListener('click', () => {
                const region = item.dataset.region;
                const regionChanges = changesByRegion[region];
                this.showTimelineServicesForRegion(region, regionChanges, container, date);
            });
        });

        // Add back button for nested navigation
        const backBtnNested = container.querySelector('.back-btn-nested');
        if (backBtnNested) {
            backBtnNested.addEventListener('click', () => {
                container.querySelector('.region-list-container').style.display = 'block';
                container.querySelector('.services-for-region-nested').style.display = 'none';
            });
        }

        // Add search functionality
        const searchInput = container.querySelector('#timelineRegionSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const allRegionItems = container.querySelectorAll('.region-item');

                allRegionItems.forEach(item => {
                    const displayName = item.dataset.displayName || '';
                    const region = item.dataset.region.toLowerCase();

                    if (displayName.includes(searchTerm) || region.includes(searchTerm)) {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        }
    }

    showTimelineServicesForRegion(region, regionChanges, container, date) {
        const displayName = region === 'Global' ? '🌐 Global Services' : getRegionDisplayName(region);

        // Hide region list and show services
        container.querySelector('.region-list-container').style.display = 'none';
        container.querySelector('.services-for-region-nested').style.display = 'block';

        // Render all services with full IP details
        const servicesHtml = regionChanges.map(change => {
            return this.renderChangeItemDetailed(change);
        }).join('');

        const servicesContainer = container.querySelector('#timelineRegionServicesContainer');
        servicesContainer.innerHTML = `
            <div class="region-services-header">
                <h4>Services in ${displayName} - ${date}</h4>
                <div class="services-stats">
                    <span class="stat">🔧 ${regionChanges.length} services affected</span>
                </div>
            </div>
            <div class="changes-list">
                ${servicesHtml}
            </div>
        `;
    }

    renderChangeItem(change) {
        const changeTypeClass = change.type.replace('_', '-');
        const changeTypeLabel = this.formatChangeType(change.type);
        const changeId = `change-${Math.random().toString(36).substr(2, 9)}`;

        let detailsHtml = '';

        if (change.type === 'ip_changes') {
            const regionDisplay = change.region && change.region.trim() !== ''
                ? getRegionDisplayName(change.region)
                : '🌐 Global';

            const hasAdditions = change.added_count > 0;
            const hasRemovals = change.removed_count > 0;
            const totalChanges = (change.added_count || 0) + (change.removed_count || 0);

            detailsHtml = `
                <div class="change-details">
                    <strong>Region:</strong> ${regionDisplay}
                    ${change.system_service ? ` | <strong>System Service:</strong> ${change.system_service}` : ''}
                </div>
                <button class="view-ips-btn" onclick="dashboard.toggleIPDetails('${changeId}')">
                    📋 View IP Details (${totalChanges} changes)
                </button>
                <div id="${changeId}" class="ip-details-container" style="display: none;">
                    <div class="ip-details-content">
                        ${hasAdditions ? `
                            <div class="ip-section">
                                <div class="ip-section-header">
                                    <h4 class="ip-section-title added">✅ Added IP Ranges (${change.added_count})</h4>
                                    <button class="copy-btn-small copy-ips-btn" data-ips="${this.escapeForDataAttr(JSON.stringify(change.added_prefixes || []))}" data-label="added IPs for ${this.escapeForDataAttr(change.service)}">
                                        📋 Copy
                                    </button>
                                </div>
                                <div class="ip-list">
                                    ${(change.added_prefixes || []).slice(0, 20).map(ip =>
                `<div class="ip-item added">${ip}</div>`
            ).join('')}
                                    ${change.added_prefixes && change.added_prefixes.length > 20 ?
                        `<div class="ip-item-more">... and ${change.added_prefixes.length - 20} more</div>`
                        : ''}
                                </div>
                            </div>
                        ` : ''}
                        ${hasRemovals ? `
                            <div class="ip-section">
                                <div class="ip-section-header">
                                    <h4 class="ip-section-title removed">❌ Removed IP Ranges (${change.removed_count})</h4>
                                    <button class="copy-btn-small copy-ips-btn" data-ips="${this.escapeForDataAttr(JSON.stringify(change.removed_prefixes || []))}" data-label="removed IPs for ${this.escapeForDataAttr(change.service)}">
                                        📋 Copy
                                    </button>
                                </div>
                                <div class="ip-list">
                                    ${(change.removed_prefixes || []).slice(0, 20).map(ip =>
                            `<div class="ip-item removed">${ip}</div>`
                        ).join('')}
                                    ${change.removed_prefixes && change.removed_prefixes.length > 20 ?
                        `<div class="ip-item-more">... and ${change.removed_prefixes.length - 20} more</div>`
                        : ''}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } else if (change.type === 'service_added') {
            detailsHtml = `
                <div class="change-details">
                    <strong>Region:</strong> ${getRegionDisplayName(change.region)} | 
                    <strong>IP Ranges:</strong> ${change.ip_count} | 
                    <strong>System Service:</strong> ${change.system_service || 'N/A'}
                </div>
            `;
        } else if (change.type === 'service_removed') {
            detailsHtml = `
                <div class="change-details">
                    <strong>Region:</strong> ${getRegionDisplayName(change.region)} | 
                    <strong>System Service:</strong> ${change.system_service || 'N/A'}
                </div>
            `;
        }

        return `
            <div class="change-item">
                <div class="change-header">
                    <div class="change-service">${change.service}</div>
                    <div class="change-type ${changeTypeClass}">${changeTypeLabel}</div>
                </div>
                ${detailsHtml}
            </div>
        `;
    }

    toggleIPDetails(changeId) {
        const container = document.getElementById(changeId);
        const btn = container.previousElementSibling;

        if (container.style.display === 'none') {
            container.style.display = 'block';
            btn.textContent = btn.textContent.replace('📋 View', '🔼 Hide');
        } else {
            container.style.display = 'none';
            btn.textContent = btn.textContent.replace('🔼 Hide', '📋 View');
        }
    }

    async copyIPsToClipboard(ipsArray, label) {
        try {
            // Validate input
            if (!ipsArray || !Array.isArray(ipsArray) || ipsArray.length === 0) {
                this.showCopyFeedback('error', 'No IP addresses to copy');
                return;
            }

            // Join IPs with newlines for easy pasting
            const ipsText = ipsArray.join('\n');

            // Use Clipboard API
            await navigator.clipboard.writeText(ipsText);

            // Show success feedback
            this.showCopyFeedback('success', `Copied ${ipsArray.length} ${label} to clipboard`);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showCopyFeedback('error', 'Failed to copy. Please try again.');
        }
    }

    showCopyFeedback(type, message) {
        // Remove any existing feedback
        const existingFeedback = document.querySelector('.copy-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }

        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = `copy-feedback ${type}`;
        feedback.textContent = message;
        document.body.appendChild(feedback);

        // Auto-remove after 2 seconds
        setTimeout(() => {
            feedback.classList.add('fade-out');
            setTimeout(() => feedback.remove(), 300);
        }, 2000);
    }







    setupEventListeners() {
        // Modal close events
        const modal = document.getElementById('serviceModal');
        const closeBtn = document.getElementById('closeModal');

        // Ensure modal is hidden initially
        if (modal) {
            modal.classList.add('hidden');
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (modal) {
                    modal.classList.add('hidden');
                }
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
            }
        });

        // Event delegation for copy IP buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-ips-btn') || e.target.closest('.copy-ips-btn')) {
                const btn = e.target.classList.contains('copy-ips-btn') ? e.target : e.target.closest('.copy-ips-btn');
                const ipsJson = btn.dataset.ips;
                const label = btn.dataset.label;

                if (ipsJson && label) {
                    try {
                        const ipsArray = JSON.parse(ipsJson);
                        this.copyIPsToClipboard(ipsArray, label);
                    } catch (error) {
                        console.error('Failed to parse IPs:', error);
                        this.showCopyFeedback('error', 'Failed to copy IPs');
                    }
                }
            }
        });
    }

    showError(error) {
        console.error('Dashboard error:', error);
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('errorState').classList.remove('hidden');
    }

    // Interactive stat card methods
    showAllChanges() {
        const changes = this.changesData.changes || [];
        if (changes.length === 0) {
            // Show modal with link to timeline
            const modal = document.createElement('div');
            modal.className = 'changes-modal-overlay';
            modal.innerHTML = `
                <div class="changes-modal">
                    <div class="changes-modal-header">
                        <h3>📊 No Changes This Week</h3>
                        <button onclick="this.closest('.changes-modal-overlay').remove()" class="close-modal-btn">&times;</button>
                    </div>
                    <div class="changes-modal-body" style="text-align: center; padding: 2rem;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">✨</div>
                        <p style="font-size: 1.1rem; margin-bottom: 1rem;">No service tag changes detected this week</p>
                        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">All Azure service tags remain unchanged since the last update.</p>
                        <div style="padding: 1.5rem; background: var(--card-background); border-radius: 8px; border: 1px solid var(--border-color);">
                            <div style="font-weight: 600; margin-bottom: 0.5rem;">💡 Want to see previous updates?</div>
                            <div style="font-size: 0.9rem; margin-bottom: 1rem; color: var(--text-secondary);">
                                Browse historical changes in the Change History Timeline
                            </div>
                            <button onclick="dashboard.scrollToTimeline(); this.closest('.changes-modal-overlay').remove();" class="timeline-link-btn">
                                📅 View Change History Timeline
                            </button>
                        </div>
                    </div>
                </div>
            `;
            modal.onclick = (e) => {
                if (e.target === modal) modal.remove();
            };
            document.body.appendChild(modal);
            return;
        }

        this.showChangesModal('All Changes This Week', changes, 'all');
    }

    showRegionChanges() {
        const changes = this.changesData.changes || [];
        const ipChanges = changes.filter(change => change.type === 'ip_changes');

        if (ipChanges.length === 0) {
            // Show modal with link to timeline
            const modal = document.createElement('div');
            modal.className = 'changes-modal-overlay';
            modal.innerHTML = `
                <div class="changes-modal">
                    <div class="changes-modal-header">
                        <h3>🌍 No Region Changes This Week</h3>
                        <button onclick="this.closest('.changes-modal-overlay').remove()" class="close-modal-btn">&times;</button>
                    </div>
                    <div class="changes-modal-body" style="text-align: center; padding: 2rem;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">✨</div>
                        <p style="font-size: 1.1rem; margin-bottom: 1rem;">No regional IP changes detected this week</p>
                        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">All Azure regional service tags remain unchanged since the last update.</p>
                        <div style="padding: 1.5rem; background: var(--card-background); border-radius: 8px; border: 1px solid var(--border-color);">
                            <div style="font-weight: 600; margin-bottom: 0.5rem;">💡 Want to see previous updates?</div>
                            <div style="font-size: 0.9rem; margin-bottom: 1rem; color: var(--text-secondary);">
                                Browse historical changes by region in the Change History Timeline
                            </div>
                            <button onclick="dashboard.scrollToTimeline(); this.closest('.changes-modal-overlay').remove();" class="timeline-link-btn">
                                📅 View Change History Timeline
                            </button>
                        </div>
                    </div>
                </div>
            `;
            modal.onclick = (e) => {
                if (e.target === modal) modal.remove();
            };
            document.body.appendChild(modal);
            return;
        }

        // Show the two-level modal: regions -> services with IP details
        this.showRegionChangesModal('Region Changes This Week', ipChanges);
    }

    showServiceDetails(serviceName) {
        const changes = this.changesData.changes || [];
        const serviceChanges = changes.filter(change => change.service === serviceName);

        if (serviceChanges.length === 0) {
            alert(`No detailed changes available for ${serviceName}`);
            return;
        }

        this.showChangesModal(`${serviceName} - Changes This Week`, serviceChanges, 'service');
    }

    showChangesModal(title, changes, type) {
        const modal = document.createElement('div');
        modal.className = 'changes-modal-overlay';

        // Limit display for performance
        const displayLimit = 50;
        const displayChanges = changes.slice(0, displayLimit);

        const changesHtml = displayChanges.map(change => {
            return this.renderChangeItemDetailed(change);
        }).join('');

        // Show search bar only for "All Changes This Week" card (type='all') or "Region Changes This Week" (type='region')
        // Don't show for specific region from search (type='region-specific') or individual service details (type='service')
        const showSearch = type === 'all' || type === 'region';

        modal.innerHTML = `
            <div class="changes-modal">
                <div class="changes-modal-header">
                    <h3>📊 ${title}</h3>
                    <button onclick="this.closest('.changes-modal-overlay').remove()" class="close-modal-btn">&times;</button>
                </div>
                <div class="changes-modal-body">
                    ${showSearch ? `
                    <div class="search-section">
                        <input type="text" 
                               id="changesSearch" 
                               placeholder="🔍 Search by service name, region, or IP address..." 
                               class="changes-search-input"
                               oninput="dashboard.filterChanges(this.value)">
                        <div class="search-results-count" id="searchResultsCount" style="display: none;"></div>
                    </div>
                    ` : ''}
                    <div class="changes-list" id="changesList">
                        ${changesHtml}
                    </div>
                    ${changes.length > displayLimit ?
                `<div class="changes-footer">
                            <p><strong>Showing ${displayLimit} of ${changes.length.toLocaleString()} total changes</strong></p>
                            <a href="./data/changes/latest-changes.json" target="_blank" class="view-all-link">📄 View complete data file</a>
                        </div>` : ''
            }
                </div>
            </div>
        `;

        // Store data for filtering (only if search is enabled)
        if (showSearch) {
            modal.allChanges = changes;
            modal.displayLimit = displayLimit;
        }

        // Close modal when clicking overlay
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };

        document.body.appendChild(modal);
        this.currentModal = modal;
    }

    filterChanges(searchTerm) {
        if (!this.currentModal || !this.currentModal.allChanges) return;

        const modal = this.currentModal;
        const allChanges = modal.allChanges;
        const displayLimit = modal.displayLimit;

        let filteredChanges = allChanges;

        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filteredChanges = allChanges.filter(change => {
                // Search in service name
                if (change.service && change.service.toLowerCase().includes(searchLower)) return true;

                // Search in region
                const regionDisplay = getRegionDisplayName(change.region || '');
                if (regionDisplay.toLowerCase().includes(searchLower)) return true;

                // Search in IP addresses (for ip_changes)
                if (change.type === 'ip_changes' || change.change_type === 'ip_changes') {
                    const addedIPs = change.added_prefixes || change.added || [];
                    const removedIPs = change.removed_prefixes || change.removed || [];
                    const allIPs = [...addedIPs, ...removedIPs];

                    if (allIPs.some(ip => ip.toLowerCase().includes(searchLower))) return true;
                }

                return false;
            });
        }

        // Update the display
        const changesList = modal.querySelector('#changesList');
        const resultsCount = modal.querySelector('#searchResultsCount');

        const displayChanges = filteredChanges.slice(0, displayLimit);
        const changesHtml = displayChanges.map(change => {
            return this.renderChangeItemDetailed(change);
        }).join('');

        changesList.innerHTML = changesHtml || '<div class="no-results">No changes found matching your search.</div>';
        resultsCount.textContent = `Showing ${Math.min(displayLimit, filteredChanges.length)} of ${filteredChanges.length.toLocaleString()} changes${searchTerm.trim() ? ` (filtered from ${allChanges.length.toLocaleString()})` : ''}`;
    }

    showIPChangesModal(title, ipChanges) {
        const modal = document.createElement('div');
        modal.className = 'changes-modal-overlay';

        // Group changes by region for better organization
        const changesByRegion = this.groupChangesByRegion(ipChanges);
        const regions = Object.keys(changesByRegion).sort();

        // Generate regional navigation without default selection
        const regionNavHtml = regions.length > 1 ?
            `<div class="region-nav">
                <div class="region-nav-header">
                    <h4>Select a region to view IP changes:</h4>
                </div>
                <div class="region-buttons">
                    <button class="region-filter" onclick="dashboard.filterIPChangesByRegion('all')">All Regions (${ipChanges.length})</button>
                    ${regions.map(region => {
                const displayName = getRegionDisplayName(region);
                const count = changesByRegion[region].length;
                return `<button class="region-filter" onclick="dashboard.filterIPChangesByRegion('${region}')">${displayName} (${count})</button>`;
            }).join('')}
                </div>
            </div>` : '';

        const statsHtml = this.generateIPChangeStats(ipChanges);

        // Don't render changes initially - wait for region selection
        const initialMessage = `<div class="region-selection-prompt">
            <div class="prompt-content">
                <h3>🌍 Choose a Region</h3>
                <p>Select a region above to view detailed IP changes for that area.</p>
                <div class="prompt-stats">
                    <span class="stat">📊 ${ipChanges.length} total changes</span>
                    <span class="stat">🌐 ${regions.length} regions affected</span>
                </div>
            </div>
        </div>`;

        modal.innerHTML = `
            <div class="changes-modal ip-changes-modal">
                <div class="changes-modal-header">
                    <h3>🔄 ${title}</h3>
                    <div class="changes-modal-stats">
                        ${statsHtml}
                    </div>
                    <button onclick="this.closest('.changes-modal-overlay').remove()" class="close-modal-btn">&times;</button>
                </div>
                <div class="changes-modal-body">
                    ${regionNavHtml}
                    <div id="ipChangesContainer" class="ip-changes-container">
                        ${initialMessage}
                    </div>
                </div>
            </div>
        `;

        // Store data for filtering
        modal.changesByRegion = changesByRegion;
        modal.allChanges = ipChanges;

        // Close modal when clicking overlay
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };

        document.body.appendChild(modal);
        this.currentIPModal = modal;
    }

    showRegionChangesModal(title, ipChanges) {
        const modal = document.createElement('div');
        modal.className = 'changes-modal-overlay';

        // Group changes by region
        const changesByRegion = this.groupChangesByRegion(ipChanges);
        const regions = Object.keys(changesByRegion).sort();

        // Calculate stats
        const totalRegions = regions.length;
        const totalChanges = ipChanges.length;

        modal.innerHTML = `
            <div class="changes-modal">
                <div class="changes-modal-header">
                    <div>
                        <h3>🌍 ${title}</h3>
                        <div class="changes-modal-stats">
                            <span class="stat-item">🌍 ${totalRegions} regions affected</span>
                            <span class="stat-item">📊 ${totalChanges} total changes</span>
                        </div>
                    </div>
                    <button onclick="this.closest('.changes-modal-overlay').remove()" class="close-modal-btn">&times;</button>
                </div>
                <div class="changes-modal-content">
                    <div class="region-list">
                        <h4>Select a region to view services • Click or search below:</h4>
                        <div class="region-search">
                            <input type="text" id="regionSearchInput" placeholder="🔍 Search regions..." />
                        </div>
                        <div class="region-items">
                            ${regions.map(region => {
            const displayName = region === 'Global' ? '🌐 Global Services' : getRegionDisplayName(region);
            const count = changesByRegion[region].length;
            return `
                                    <div class="region-item" data-region="${region}" data-display-name="${displayName.toLowerCase()}">
                                        <div class="region-name">${displayName}</div>
                                        <div class="region-count">${count} service${count !== 1 ? 's' : ''} changed</div>
                                    </div>
                                `;
        }).join('')}
                        </div>
                    </div>
                    <div class="services-for-region" style="display: none;">
                        <div class="back-to-regions">
                            <button class="back-btn">← Back to Regions</button>
                        </div>
                        <div id="regionServicesContainer"></div>
                    </div>
                </div>
            </div>
        `;

        // Close modal when clicking overlay
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };

        document.body.appendChild(modal);
        this.currentRegionModal = modal;

        // Add event listeners for region items
        const regionItems = modal.querySelectorAll('.region-item');
        regionItems.forEach(item => {
            item.addEventListener('click', () => {
                const region = item.dataset.region;
                const regionChanges = changesByRegion[region];
                this.showServicesForRegion(region, regionChanges, modal);
            });
        });

        // Add back button listener
        const backBtn = modal.querySelector('.back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                modal.querySelector('.region-list').style.display = 'block';
                modal.querySelector('.services-for-region').style.display = 'none';
            });
        }

        // Add search functionality
        const searchInput = modal.querySelector('#regionSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const allRegionItems = modal.querySelectorAll('.region-item');

                allRegionItems.forEach(item => {
                    const displayName = item.dataset.displayName || '';
                    const region = item.dataset.region.toLowerCase();

                    if (displayName.includes(searchTerm) || region.includes(searchTerm)) {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        }
    }

    showServicesForRegion(region, regionChanges, modal) {
        const displayName = region === 'Global' ? '🌐 Global Services' : getRegionDisplayName(region);

        // Hide region list and show services
        modal.querySelector('.region-list').style.display = 'none';
        modal.querySelector('.services-for-region').style.display = 'block';

        // Render all services with full IP details using renderChangeItemDetailed
        const servicesHtml = regionChanges.map(change => {
            return this.renderChangeItemDetailed(change);
        }).join('');

        const container = modal.querySelector('#regionServicesContainer');
        container.innerHTML = `
            <div class="region-services-header">
                <h4>Services that changed in ${displayName}</h4>
                <div class="services-stats">
                    <span class="stat">🔧 ${regionChanges.length} services affected</span>
                    <span class="stat">📊 ${regionChanges.length} total changes</span>
                </div>
            </div>
            <div class="changes-list">
                ${servicesHtml}
            </div>
        `;
    }

    showRegionDetails(regionName, regionChanges) {
        // Close the region selector modal
        if (this.currentRegionModal) {
            this.currentRegionModal.remove();
        }

        // Show the IP changes for this specific region
        const displayName = regionName === 'Global' ? '🌐 Global Services' : getRegionDisplayName(regionName);
        this.showIPChangesModal(`${displayName} - IP Changes`, regionChanges);
    }

    groupChangesByRegion(changes) {
        const groups = {};
        changes.forEach(change => {
            const region = change.region || 'Global';
            if (!groups[region]) {
                groups[region] = [];
            }
            groups[region].push(change);
        });
        return groups;
    }

    filterIPChangesByRegion(selectedRegion) {
        if (!this.currentIPModal) return;

        const modal = this.currentIPModal;
        const container = modal.querySelector('#ipChangesContainer');

        // Update active button
        modal.querySelectorAll('.region-filter').forEach(btn => {
            btn.classList.remove('active');
        });
        const selectedButton = modal.querySelector(`[onclick="dashboard.filterIPChangesByRegion('${selectedRegion}')"]`);
        if (selectedButton) {
            selectedButton.classList.add('active');
        }

        // Filter and render changes
        let changesToShow;
        if (selectedRegion === 'all') {
            changesToShow = modal.allChanges;
        } else {
            changesToShow = modal.changesByRegion[selectedRegion] || [];
        }

        // Show loading state briefly for better UX
        container.innerHTML = '<div class="loading-changes">Loading changes...</div>';

        setTimeout(() => {
            container.innerHTML = this.renderIPChangesList(changesToShow, selectedRegion);
        }, 100);
    }

    showIPRangesHistory() {
        const modal = document.createElement('div');
        modal.className = 'changes-modal-overlay';

        // Get current IP ranges count and changes
        const currentCount = this.summaryData.total_ip_ranges || 0;
        const totalIPChanges = this.summaryData.ip_changes || 0;
        const lastUpdated = this.summaryData.last_updated || 'Unknown';

        // Calculate previous count (current - net changes)
        // We need to calculate net IP changes (added - removed)
        let netIPChange = 0;
        let addedIPs = 0;
        let removedIPs = 0;

        if (this.changesData && this.changesData.changes) {
            this.changesData.changes.forEach(change => {
                if (change.type === 'ip_changes' || change.change_type === 'ip_changes') {
                    addedIPs += change.added_count || 0;
                    removedIPs += change.removed_count || 0;
                }
            });
            netIPChange = addedIPs - removedIPs;
        }

        const previousCount = currentCount - netIPChange;
        const changeDirection = netIPChange >= 0 ? 'increase' : 'decrease';
        const changeIcon = netIPChange >= 0 ? '📈' : '📉';
        const changeColor = netIPChange >= 0 ? '#28a745' : '#dc3545';

        // Create historical data display
        const historyHtml = `
            <div class="ip-history-content">
                <div class="progression-display">
                    <div class="progression-card">
                        <h4>📊 IP Ranges Progression</h4>
                        <div class="progression-flow">
                            <div class="count-box previous">
                                <div class="count-label">Previous Total</div>
                                <div class="count-number">${previousCount.toLocaleString()}</div>
                                <div class="count-date">Before this week's update</div>
                            </div>
                            
                            <div class="progression-arrow">
                                <div class="arrow-symbol">→</div>
                                <div class="change-details">
                                    <span class="change-badge" style="background-color: ${changeColor};">
                                        ${changeIcon} ${netIPChange >= 0 ? '+' : ''}${netIPChange.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            
                            <div class="count-box current">
                                <div class="count-label">Current Total</div>
                                <div class="count-number">${currentCount.toLocaleString()}</div>
                                <div class="count-date">${new Date(lastUpdated).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="change-breakdown">
                    <h4>📊 This Week's Changes</h4>
                    <div class="breakdown-stats">
                        <div class="breakdown-item added">
                            <span class="breakdown-number">+${addedIPs.toLocaleString()}</span>
                            <span class="breakdown-label">IP ranges added</span>
                        </div>
                        <div class="breakdown-item removed">
                            <span class="breakdown-number">-${removedIPs.toLocaleString()}</span>
                            <span class="breakdown-label">IP ranges removed</span>
                        </div>
                        <div class="breakdown-item net">
                            <span class="breakdown-number" style="color: ${changeColor};">
                                ${netIPChange >= 0 ? '+' : ''}${netIPChange.toLocaleString()}
                            </span>
                            <span class="breakdown-label">Total change</span>
                        </div>
                    </div>
                </div>
        `;

        modal.innerHTML = `
            <div class="changes-modal ip-history-modal">
                <div class="changes-modal-header">
                    <h3>📊 IP Ranges History</h3>
                    <div class="changes-modal-stats">
                        <span class="stat-item">📈 Tracking ${currentCount.toLocaleString()} IP ranges</span>
                    </div>
                    <button onclick="this.closest('.changes-modal-overlay').remove()" class="close-modal-btn">&times;</button>
                </div>
                <div class="changes-modal-body">
                    ${historyHtml}
                </div>
            </div>
        `;

        // Close modal when clicking overlay
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };

        document.body.appendChild(modal);
    }

    renderIPChangesList(changes, region) {
        if (changes.length === 0) {
            return `<div class="no-changes">No IP changes found${region !== 'all' ? ` in ${getRegionDisplayName(region)}` : ''}.</div>`;
        }

        const displayLimit = 30;
        const displayChanges = changes.slice(0, displayLimit);

        const changesHtml = displayChanges.map(change => {
            return this.renderIPChangeItemDetailed(change);
        }).join('');

        return `
            <div class="ip-changes-list">
                ${changesHtml}
            </div>
            ${changes.length > displayLimit ?
                `<div class="changes-footer">
                    <p><strong>Showing ${displayLimit} of ${changes.length} changes${region !== 'all' ? ` in ${getRegionDisplayName(region)}` : ''}</strong></p>
                    <a href="./data/changes/latest-changes.json" target="_blank" class="view-all-link">📄 View complete data file</a>
                </div>` : ''
            }
        `;
    }

    generateIPChangeStats(changes) {
        const totalAdded = changes.reduce((sum, c) => sum + (c.added_count || 0), 0);
        const totalRemoved = changes.reduce((sum, c) => sum + (c.removed_count || 0), 0);
        const servicesAffected = new Set(changes.map(c => c.service)).size;
        const regionsAffected = new Set(changes.map(c => c.region || 'Global')).size;

        return `
            <div class="ip-change-stats">
                <span class="stat-item">🏷️ ${servicesAffected} services</span>
                <span class="stat-item">🌍 ${regionsAffected} regions</span>
                <span class="stat-item">➕ ${totalAdded} IPs added</span>
                <span class="stat-item">➖ ${totalRemoved} IPs removed</span>
            </div>
        `;
    }

    generateChangeStats(changes, type) {
        const stats = {
            total: changes.length,
            ipChanges: changes.filter(c => c.type === 'ip_changes').length,
            serviceAdded: changes.filter(c => c.type === 'service_added').length,
            serviceRemoved: changes.filter(c => c.type === 'service_removed').length,
            totalIPsAdded: changes.reduce((sum, c) => sum + (c.added_count || 0), 0),
            totalIPsRemoved: changes.reduce((sum, c) => sum + (c.removed_count || 0), 0)
        };

        return `
            <div class="change-stats">
                <span class="stat-item">📈 ${stats.total} total changes</span>
                <span class="stat-item">➕ ${stats.totalIPsAdded} IPs added</span>
                <span class="stat-item">➖ ${stats.totalIPsRemoved} IPs removed</span>
            </div>
        `;
    }

    renderChangeItemDetailed(change) {
        const changeTypeClass = change.type.replace('_', '-');
        const changeTypeLabel = this.formatChangeType(change.type);
        const regionDisplay = getRegionDisplayName(change.region || '');

        if (change.type === 'ip_changes') {
            const addedCount = change.added_count || 0;
            const removedCount = change.removed_count || 0;
            const addedPrefixes = change.added_prefixes || [];
            const removedPrefixes = change.removed_prefixes || [];

            // Show all IPs with expand/collapse for large lists
            const collapseThreshold = 10;
            const showAddedIPs = addedPrefixes.length > 0;
            const showRemovedIPs = removedPrefixes.length > 0;
            const uniqueId = `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            return `
                <div class="change-item detailed ${changeTypeClass}">
                    <div class="change-header">
                        <div class="change-service">
                            <strong>${change.service}</strong>
                            <span class="change-region">${regionDisplay}</span>
                        </div>
                        <div class="change-type-badge">${changeTypeLabel}</div>
                    </div>
                    <div class="change-details">
                        <div class="change-summary">
                            <span class="change-stat added">➕ ${addedCount} IPs added</span>
                            <span class="change-stat removed">➖ ${removedCount} IPs removed</span>
                        </div>
                        ${showAddedIPs ? `
                            <div class="ip-list">
                                <div class="ip-list-header">
                                    <strong>Added IPs:</strong>
                                    <button class="copy-btn-small copy-ips-btn" data-ips="${this.escapeForDataAttr(JSON.stringify(addedPrefixes))}" data-label="added IPs for ${this.escapeForDataAttr(change.service)}">
                                        📋 Copy
                                    </button>
                                </div>
                                <div class="ip-container">
                                    ${addedPrefixes.slice(0, collapseThreshold).map(ip => `<code>${ip}</code>`).join(' ')}
                                    ${addedPrefixes.length > collapseThreshold ? `
                                        <span class="ip-hidden" id="added-${uniqueId}" style="display:none;">
                                            ${addedPrefixes.slice(collapseThreshold).map(ip => `<code>${ip}</code>`).join(' ')}
                                        </span>
                                        <button class="show-more-btn" onclick="dashboard.toggleIPs('added-${uniqueId}', this)">
                                            ➕ Show ${addedPrefixes.length - collapseThreshold} more
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        ` : ''}
                        ${showRemovedIPs ? `
                            <div class="ip-list">
                                <div class="ip-list-header">
                                    <strong>Removed IPs:</strong>
                                    <button class="copy-btn-small copy-ips-btn" data-ips="${this.escapeForDataAttr(JSON.stringify(removedPrefixes))}" data-label="removed IPs for ${this.escapeForDataAttr(change.service)}">
                                        📋 Copy
                                    </button>
                                </div>
                                <div class="ip-container">
                                    ${removedPrefixes.slice(0, collapseThreshold).map(ip => `<code>${ip}</code>`).join(' ')}
                                    ${removedPrefixes.length > collapseThreshold ? `
                                        <span class="ip-hidden" id="removed-${uniqueId}" style="display:none;">
                                            ${removedPrefixes.slice(collapseThreshold).map(ip => `<code>${ip}</code>`).join(' ')}
                                        </span>
                                        <button class="show-more-btn" onclick="dashboard.toggleIPs('removed-${uniqueId}', this)">
                                            ➕ Show ${removedPrefixes.length - collapseThreshold} more
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } else {
            // Service added/removed
            return `
                <div class="change-item detailed ${changeTypeClass}">
                    <div class="change-header">
                        <div class="change-service">
                            <strong>${change.service}</strong>
                            <span class="change-region">${regionDisplay}</span>
                        </div>
                        <div class="change-type-badge">${changeTypeLabel}</div>
                    </div>
                    <div class="change-details">
                        ${change.ip_count ? `<p>${change.ip_count} IP ranges</p>` : ''}
                        ${change.system_service ? `<p>System Service: ${change.system_service}</p>` : ''}
                    </div>
                </div>
            `;
        }
    }

    renderIPChangeItemDetailed(change) {
        const regionDisplay = getRegionDisplayName(change.region);
        const addedIPs = change.added || [];
        const removedIPs = change.removed || [];

        const hasAddedIPs = addedIPs.length > 0;
        const hasRemovedIPs = removedIPs.length > 0;

        // Limit displayed IPs to prevent overwhelming UI
        const displayLimit = 10;
        const displayedAddedIPs = addedIPs.slice(0, displayLimit);
        const displayedRemovedIPs = removedIPs.slice(0, displayLimit);

        let content = `
            <div class="ip-change-header">
                <div class="service-info">
                    <span class="service-name">${change.service}</span>
                    <span class="region-tag">${regionDisplay}</span>
                </div>
                <div class="change-counts">
                    ${hasAddedIPs ? `<span class="added-count">+${addedIPs.length}</span>` : ''}
                    ${hasRemovedIPs ? `<span class="removed-count">-${removedIPs.length}</span>` : ''}
                </div>
            </div>
        `;

        if (hasAddedIPs) {
            content += `
                <div class="ip-changes-section added-section">
                    <div class="section-header">
                        <span class="section-title">➕ Added IP Ranges (${addedIPs.length})</span>
                        ${addedIPs.length > 0 ? `<button class="copy-btn-small copy-ips-btn" data-ips="${this.escapeForDataAttr(JSON.stringify(addedIPs))}" data-label="added IPs for ${this.escapeForDataAttr(change.service)}">📋 Copy</button>` : ''}
                    </div>
                    <div class="ip-list">
                        ${displayedAddedIPs.map(ip => `<code class="ip-range added">${ip}</code>`).join('')}
                        ${addedIPs.length > displayLimit ? `<span class="more-ips">... and ${addedIPs.length - displayLimit} more</span>` : ''}
                    </div>
                </div>
            `;
        }

        if (hasRemovedIPs) {
            content += `
                <div class="ip-changes-section removed-section">
                    <div class="section-header">
                        <span class="section-title">➖ Removed IP Ranges (${removedIPs.length})</span>
                        ${removedIPs.length > 0 ? `<button class="copy-btn-small copy-ips-btn" data-ips="${this.escapeForDataAttr(JSON.stringify(removedIPs))}" data-label="removed IPs for ${this.escapeForDataAttr(change.service)}">📋 Copy</button>` : ''}
                    </div>
                    <div class="ip-list">
                        ${displayedRemovedIPs.map(ip => `<code class="ip-range removed">${ip}</code>`).join('')}
                        ${removedIPs.length > displayLimit ? `<span class="more-ips">... and ${removedIPs.length - displayLimit} more</span>` : ''}
                    </div>
                </div>
            `;
        }

        return `<div class="ip-change-item detailed">${content}</div>`;
    }

    toggleIPs(elementId, button) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (element.style.display === 'none') {
            element.style.display = 'inline';
            button.textContent = '➖ Show less';
        } else {
            element.style.display = 'none';
            const match = button.textContent.match(/\d+/);
            const count = match ? match[0] : '';
            button.textContent = `➕ Show ${count} more`;
        }
    }

    // Utility methods
    truncateServiceName(name, maxLength = 25) {
        return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
    }

    formatChangeType(type) {
        const types = {
            'ip_changes': 'IP Changes',
            'service_added': 'New Service',
            'service_removed': 'Removed'
        };
        return types[type] || type;
    }

    escapeForDataAttr(str) {
        return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // Global Search Functionality
    initializeGlobalSearch() {
        const searchInput = document.getElementById('globalSearch');
        const searchClear = document.getElementById('searchClear');
        const searchResults = document.getElementById('searchResults');

        if (!searchInput || !searchResults) return;

        let searchTimeout;

        // Handle search input
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();

            // Show/hide clear button
            if (query) {
                searchClear.classList.add('visible');
            } else {
                searchClear.classList.remove('visible');
                searchResults.classList.add('hidden');
                return;
            }

            // Debounce search
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performGlobalSearch(query);
            }, 300);
        });

        // Handle clear button
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.classList.remove('visible');
            searchResults.classList.add('hidden');
            searchInput.focus();
        });

        // Handle Enter key
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    this.performGlobalSearch(query);
                }
            }
        });
    }

    async performGlobalSearch(query) {
        const searchResults = document.getElementById('searchResults');
        const queryLower = query.toLowerCase();

        // Show loading state
        searchResults.innerHTML = `
            <div class="search-loading" style="text-align: center; padding: 2rem;">
                <div class="spinner"></div>
                <p>Searching across all historical changes...</p>
            </div>
        `;
        searchResults.classList.remove('hidden');

        try {
            // Load all historical changes from manifest
            const allChanges = await this.loadAllHistoricalChanges();

            // Search in services
            const serviceMatches = new Map();

            allChanges.forEach(({ date, changes }) => {
                changes.forEach(change => {
                    const serviceName = change.service || '';
                    if (serviceName.toLowerCase().includes(queryLower)) {
                        if (!serviceMatches.has(serviceName)) {
                            serviceMatches.set(serviceName, {
                                type: 'service',
                                name: serviceName,
                                occurrences: [],
                                totalChanges: 0,
                                totalIPAdded: 0,
                                totalIPRemoved: 0
                            });
                        }
                        const match = serviceMatches.get(serviceName);
                        match.occurrences.push({
                            date: date,
                            ipAdded: change.added_count || 0,
                            ipRemoved: change.removed_count || 0,
                            change: change
                        });
                        match.totalChanges++;
                        match.totalIPAdded += (change.added_count || 0);
                        match.totalIPRemoved += (change.removed_count || 0);
                    }
                });
            });

            // Search in regions
            const regionMatches = new Map();

            allChanges.forEach(({ date, changes }) => {
                changes.forEach(change => {
                    const region = change.region || '';
                    const displayName = region ? getRegionDisplayName(region) : '🌐 Global';

                    if (region.toLowerCase().includes(queryLower) ||
                        displayName.toLowerCase().includes(queryLower)) {
                        if (!regionMatches.has(region)) {
                            regionMatches.set(region, {
                                type: 'region',
                                name: region,
                                displayName: displayName,
                                occurrences: [],
                                totalChanges: 0
                            });
                        }
                        const match = regionMatches.get(region);
                        match.occurrences.push({
                            date: date,
                            change: change
                        });
                        match.totalChanges++;
                    }
                });
            });

            // Convert Maps to Arrays
            const services = Array.from(serviceMatches.values());
            const regions = Array.from(regionMatches.values());

            // Display results
            this.displayHistoricalSearchResults(services, regions, query);

        } catch (error) {
            console.error('Error searching historical data:', error);
            searchResults.innerHTML = `
                <div class="search-no-results">
                    <div class="search-no-results-icon">⚠️</div>
                    <div>Error searching historical data</div>
                    <div style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">
                        ${error.message}
                    </div>
                </div>
            `;
        }
    }

    async loadAllHistoricalChanges() {
        // Load manifest to get all change files
        const timestamp = new Date().getTime();
        const manifestResponse = await fetch(`./data/changes/manifest.json?t=${timestamp}`);

        if (!manifestResponse.ok) {
            throw new Error('Could not load change history manifest');
        }

        const manifest = await manifestResponse.json();
        const files = manifest.files || [];

        if (files.length === 0) {
            return [];
        }

        // Filter out baseline/initial data files
        // Exclude files named with pattern like "2025-10-08-changes.json" (first snapshot)
        // Keep only files that represent actual changes after the baseline
        const changeFiles = files.filter(fileInfo => {
            // Skip the oldest file (baseline) if it's the first one
            const oldestDate = manifest.date_range?.oldest;
            return fileInfo.date !== oldestDate;
        });

        if (changeFiles.length === 0) {
            return [];
        }

        // Load all change files (limit to last 20 for performance)
        const recentFiles = changeFiles.slice(0, 20);
        const allChanges = [];

        for (const fileInfo of recentFiles) {
            try {
                const response = await fetch(`./data/changes/${fileInfo.filename}?t=${timestamp}`);
                if (response.ok) {
                    const data = await response.json();
                    allChanges.push({
                        date: fileInfo.date,
                        filename: fileInfo.filename,
                        changes: data.changes || []
                    });
                }
            } catch (error) {
                console.error(`Error loading ${fileInfo.filename}:`, error);
            }
        }

        return allChanges;
    }

    displayHistoricalSearchResults(services, regions, query) {
        const searchResults = document.getElementById('searchResults');

        if (services.length === 0 && regions.length === 0) {
            searchResults.innerHTML = `
                <div class="search-no-results">
                    <div class="search-no-results-icon">🔍</div>
                    <div>No results found for "<strong>${query}</strong>" in historical changes</div>
                    <div style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">
                        Try searching for service names like "Storage", "AzureAD" or regions like "East US"
                    </div>
                </div>
            `;
            searchResults.classList.remove('hidden');
            return;
        }

        let html = '<div class="search-results-header">Found in historical changes:</div>';

        // Store data for click handlers
        this.historicalSearchData = { services, regions };

        // Display service results
        if (services.length > 0) {
            html += '<div class="search-category-header">🔧 Services</div>';
            services.slice(0, 10).forEach((service, index) => {
                const latestDate = service.occurrences[0].date;
                const occurrenceCount = service.occurrences.length;

                html += `
                    <div class="search-result-item historical" data-type="service" data-index="${index}">
                        <div class="search-result-info">
                            <div class="search-result-name">${service.name}</div>
                            <div class="search-result-meta">
                                📊 ${service.totalChanges} change${service.totalChanges !== 1 ? 's' : ''} across ${occurrenceCount} date${occurrenceCount !== 1 ? 's' : ''}
                                <br>
                                <span style="color: var(--success-color);">+${service.totalIPAdded.toLocaleString()} IPs</span> • 
                                <span style="color: var(--danger-color);">-${service.totalIPRemoved.toLocaleString()} IPs</span> • 
                                Latest: ${this.formatDateShort(latestDate)}
                            </div>
                        </div>
                        <span class="search-result-badge service">Service</span>
                    </div>
                `;
            });
        }

        // Display region results
        if (regions.length > 0) {
            html += '<div class="search-category-header">🌍 Regions</div>';
            regions.slice(0, 10).forEach((region, index) => {
                const latestDate = region.occurrences[0].date;
                const occurrenceCount = region.occurrences.length;

                html += `
                    <div class="search-result-item historical" data-type="region" data-index="${index}">
                        <div class="search-result-info">
                            <div class="search-result-name">${region.displayName}</div>
                            <div class="search-result-meta">
                                📊 ${region.totalChanges} change${region.totalChanges !== 1 ? 's' : ''} across ${occurrenceCount} date${occurrenceCount !== 1 ? 's' : ''}
                                • Latest: ${this.formatDateShort(latestDate)}
                            </div>
                        </div>
                        <span class="search-result-badge region">Region</span>
                    </div>
                `;
            });
        }

        if (services.length > 10 || regions.length > 10) {
            html += '<div class="search-results-footer">Showing top 10 results in each category</div>';
        }

        searchResults.innerHTML = html;
        searchResults.classList.remove('hidden');

        // Add event listeners for historical results
        searchResults.querySelectorAll('.search-result-item.historical').forEach(item => {
            item.addEventListener('click', (e) => {
                const type = item.getAttribute('data-type');
                const index = parseInt(item.getAttribute('data-index'));

                console.log('Historical result clicked:', { type, index, data: this.historicalSearchData });

                if (type === 'service') {
                    const service = this.historicalSearchData.services[index];
                    console.log('Showing service details:', service);
                    this.showHistoricalServiceDetails(service.name, service.occurrences);
                } else if (type === 'region') {
                    const region = this.historicalSearchData.regions[index];
                    console.log('Showing region details:', region);
                    this.showHistoricalRegionDetails(region.name, region.occurrences);
                }
            });
        });
    }

    formatDateShort(dateString) {
        try {
            const date = new Date(dateString);
            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        } catch (error) {
            return dateString;
        }
    }

    async showServiceHistory(serviceName) {
        // Load all historical changes for this service
        try {
            const modal = document.createElement('div');
            modal.className = 'changes-modal-overlay';

            modal.innerHTML = `
                <div class="changes-modal">
                    <div class="changes-modal-header">
                        <h3>🔧 ${serviceName} - Historical Changes</h3>
                        <button onclick="this.closest('.changes-modal-overlay').remove()" class="close-modal-btn">&times;</button>
                    </div>
                    <div class="changes-modal-body">
                        <div class="timeline-loading">
                            <div class="spinner"></div>
                            <p>Loading historical data...</p>
                        </div>
                    </div>
                </div>
            `;

            modal.onclick = (e) => {
                if (e.target === modal) modal.remove();
            };

            document.body.appendChild(modal);

            // Load all historical changes for this service
            const manifestResponse = await fetch('data/changes/manifest.json');
            if (!manifestResponse.ok) {
                throw new Error('Could not load manifest');
            }

            const manifest = await manifestResponse.json();
            const oldestDate = manifest.date_range?.oldest;
            const changeFiles = manifest.files.filter(f => f.date !== oldestDate);

            const events = [];
            let totalIPAdded = 0;
            let totalIPRemoved = 0;

            // Load each file and find changes for this service
            for (const fileInfo of changeFiles) {
                try {
                    const response = await fetch(`data/changes/${fileInfo.filename}`);
                    if (response.ok) {
                        const data = await response.json();
                        const serviceChanges = (data.changes || []).filter(c => c.service === serviceName);

                        serviceChanges.forEach(change => {
                            const ipAdded = change.added_count || 0;
                            const ipRemoved = change.removed_count || 0;

                            events.push({
                                date: fileInfo.date,
                                change: change,
                                ipAdded: ipAdded,
                                ipRemoved: ipRemoved
                            });

                            totalIPAdded += ipAdded;
                            totalIPRemoved += ipRemoved;
                        });
                    }
                } catch (err) {
                    console.log(`Could not load ${fileInfo.filename}:`, err.message);
                }
            }

            // Sort by date (newest first)
            events.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Render the modal content
            const eventsHtml = events.map(event => {
                return `
                    <div class="historical-event-item">
                        <div class="historical-event-header">
                            <span class="historical-event-date">📅 ${this.formatDate(event.date)}</span>
                            <div class="historical-event-stats">
                                ${event.ipAdded > 0 ? `<span style="color: var(--success-color);">+${event.ipAdded} IPs</span>` : ''}
                                ${event.ipRemoved > 0 ? `<span style="color: var(--danger-color);">-${event.ipRemoved} IPs</span>` : ''}
                            </div>
                        </div>
                        ${this.renderChangeItemDetailed(event.change)}
                    </div>
                `;
            }).join('');

            const modalBody = modal.querySelector('.changes-modal-body');
            modalBody.innerHTML = `
                <div class="historical-summary">
                    <div class="summary-stat-box">
                        <div class="summary-stat-number">${events.length}</div>
                        <div class="summary-stat-label">Change Events</div>
                    </div>
                    <div class="summary-stat-box">
                        <div class="summary-stat-number" style="color: var(--success-color);">+${totalIPAdded.toLocaleString()}</div>
                        <div class="summary-stat-label">Total IPs Added</div>
                    </div>
                    <div class="summary-stat-box">
                        <div class="summary-stat-number" style="color: var(--danger-color);">-${totalIPRemoved.toLocaleString()}</div>
                        <div class="summary-stat-label">Total IPs Removed</div>
                    </div>
                </div>
                <div class="historical-events-list">
                    ${eventsHtml}
                </div>
            `;

        } catch (error) {
            console.error('Error loading service history:', error);
            alert('Unable to load service history. Please try again.');
        }
    }

    showHistoricalServiceDetails(serviceName, occurrences) {
        // Parse occurrences if it's a string
        const events = typeof occurrences === 'string' ? JSON.parse(occurrences) : occurrences;

        const modal = document.createElement('div');
        modal.className = 'changes-modal-overlay';

        // Calculate totals
        const totalIPAdded = events.reduce((sum, e) => sum + e.ipAdded, 0);
        const totalIPRemoved = events.reduce((sum, e) => sum + e.ipRemoved, 0);

        // Group by date and render
        const eventsHtml = events.map(event => {
            const change = event.change;
            return `
                <div class="historical-event-item">
                    <div class="historical-event-header">
                        <span class="historical-event-date">📅 ${this.formatDate(event.date)}</span>
                        <div class="historical-event-stats">
                            ${event.ipAdded > 0 ? `<span style="color: var(--success-color);">+${event.ipAdded} IPs</span>` : ''}
                            ${event.ipRemoved > 0 ? `<span style="color: var(--danger-color);">-${event.ipRemoved} IPs</span>` : ''}
                        </div>
                    </div>
                    ${this.renderChangeItemDetailed(change)}
                </div>
            `;
        }).join('');

        modal.innerHTML = `
            <div class="changes-modal">
                <div class="changes-modal-header">
                    <h3>🔧 ${serviceName} - Historical Changes</h3>
                    <button onclick="this.closest('.changes-modal-overlay').remove()" class="close-modal-btn">&times;</button>
                </div>
                <div class="changes-modal-body">
                    <div class="historical-summary">
                        <div class="summary-stat-box">
                            <div class="summary-stat-number">${events.length}</div>
                            <div class="summary-stat-label">Change Events</div>
                        </div>
                        <div class="summary-stat-box">
                            <div class="summary-stat-number" style="color: var(--success-color);">+${totalIPAdded.toLocaleString()}</div>
                            <div class="summary-stat-label">Total IPs Added</div>
                        </div>
                        <div class="summary-stat-box">
                            <div class="summary-stat-number" style="color: var(--danger-color);">-${totalIPRemoved.toLocaleString()}</div>
                            <div class="summary-stat-label">Total IPs Removed</div>
                        </div>
                    </div>
                    <div class="historical-events-list">
                        ${eventsHtml}
                    </div>
                </div>
            </div>
        `;

        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        document.body.appendChild(modal);
    }

    showHistoricalRegionDetails(regionName, occurrences) {
        // Parse occurrences if it's a string
        const events = typeof occurrences === 'string' ? JSON.parse(occurrences) : occurrences;

        const modal = document.createElement('div');
        modal.className = 'changes-modal-overlay';

        const displayName = regionName ? getRegionDisplayName(regionName) : '🌐 Global';

        // Group by date and render
        const eventsHtml = events.map(event => {
            const change = event.change;
            return `
                <div class="historical-event-item">
                    <div class="historical-event-header">
                        <span class="historical-event-date">📅 ${this.formatDate(event.date)}</span>
                    </div>
                    ${this.renderChangeItemDetailed(change)}
                </div>
            `;
        }).join('');

        modal.innerHTML = `
            <div class="changes-modal">
                <div class="changes-modal-header">
                    <h3>🌍 ${displayName} - Historical Changes</h3>
                    <button onclick="this.closest('.changes-modal-overlay').remove()" class="close-modal-btn">&times;</button>
                </div>
                <div class="changes-modal-body">
                    <div class="historical-summary">
                        <div class="summary-stat-box">
                            <div class="summary-stat-number">${events.length}</div>
                            <div class="summary-stat-label">Change Events</div>
                        </div>
                    </div>
                    <div class="historical-events-list">
                        ${eventsHtml}
                    </div>
                </div>
            </div>
        `;

        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        document.body.appendChild(modal);
    }

    displaySearchResults(services, regions, query) {
        const searchResults = document.getElementById('searchResults');

        if (services.length === 0 && regions.length === 0) {
            searchResults.innerHTML = `
                <div class="search-no-results">
                    <div class="search-no-results-icon">🔍</div>
                    <div>No results found for "<strong>${query}</strong>" in this week's changes</div>
                    <div style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">
                        Try searching for service names like "Storage", "AzureAD" or regions like "East US"
                    </div>
                    <div style="margin-top: 1rem; padding: 1rem; background: var(--card-background); border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-weight: 600; margin-bottom: 0.5rem;">💡 Looking for previous updates?</div>
                        <div style="font-size: 0.9rem; margin-bottom: 0.75rem; color: var(--text-secondary);">
                            Check the Change History Timeline below to browse historical changes
                        </div>
                        <button onclick="dashboard.scrollToTimeline()" class="timeline-link-btn">
                            📅 View Change History Timeline
                        </button>
                    </div>
                </div>
            `;
            searchResults.classList.remove('hidden');
            return;
        }

        let html = '';

        // Display service results
        if (services.length > 0) {
            services.slice(0, 10).forEach(service => {
                const ipInfo = [];
                if (service.ipAdded > 0) ipInfo.push(`+${service.ipAdded.toLocaleString()} IPs`);
                if (service.ipRemoved > 0) ipInfo.push(`-${service.ipRemoved.toLocaleString()} IPs`);

                html += `
                    <div class="search-result-item" onclick="dashboard.showServiceDetails('${service.name.replace(/'/g, "\\'")}')">
                        <div class="search-result-info">
                            <div class="search-result-name">${service.name}</div>
                            <div class="search-result-meta">
                                ${service.changeCount} change${service.changeCount !== 1 ? 's' : ''} this week
                                ${ipInfo.length > 0 ? ` • ${ipInfo.join(', ')}` : ''}
                            </div>
                        </div>
                        <span class="search-result-badge service">Service</span>
                    </div>
                `;
            });
        }

        // Display region results
        if (regions.length > 0) {
            regions.slice(0, 10).forEach(region => {
                html += `
                    <div class="search-result-item" onclick="dashboard.showRegionDetailsFromSearch('${region.name}')">
                        <div class="search-result-info">
                            <div class="search-result-name">${region.displayName}</div>
                            <div class="search-result-meta">
                                ${region.changeCount} change${region.changeCount !== 1 ? 's' : ''} this week
                            </div>
                        </div>
                        <span class="search-result-badge region">Region</span>
                    </div>
                `;
            });
        }

        // Add "showing X results" footer if there are more results
        const totalResults = services.length + regions.length;
        const displayedResults = Math.min(services.length, 10) + Math.min(regions.length, 10);
        if (totalResults > displayedResults) {
            html += `
                <div style="padding: 1rem; text-align: center; color: #666; font-size: 0.9rem; background: #f8f9fa; border-top: 1px solid #e0e0e0;">
                    Showing ${displayedResults} of ${totalResults} results
                </div>
            `;
        }

        searchResults.innerHTML = html;
        searchResults.classList.remove('hidden');
    }

    showRegionDetailsFromSearch(regionName) {
        const changes = this.changesData.changes || [];
        const regionChanges = changes.filter(change => change.region === regionName);

        if (regionChanges.length > 0) {
            const displayName = getRegionDisplayName(regionName);
            // Use showChangesModal to directly show the services and IP changes for this region
            // Pass 'region-specific' to avoid showing the search bar since user already searched
            this.showChangesModal(`🗺️ ${displayName} - Changes This Week`, regionChanges, 'region-specific');
        }

        // Clear search
        const searchInput = document.getElementById('globalSearch');
        const searchClear = document.getElementById('searchClear');
        const searchResults = document.getElementById('searchResults');

        if (searchInput) searchInput.value = '';
        if (searchClear) searchClear.classList.remove('visible');
        if (searchResults) searchResults.classList.add('hidden');
    }

    searchExample(query) {
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.value = query;
            searchInput.focus();
            this.performGlobalSearch(query);
            document.getElementById('searchClear').classList.add('visible');
        }
    }

    scrollToTimeline() {
        const timelineSection = document.querySelector('.timeline-section');
        if (timelineSection) {
            timelineSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Add a subtle highlight effect
            const timeline = document.getElementById('changeHistoryTimeline');
            if (timeline) {
                timeline.style.transition = 'box-shadow 0.3s ease';
                timeline.style.boxShadow = '0 0 20px rgba(76, 175, 80, 0.3)';
                setTimeout(() => {
                    timeline.style.boxShadow = '';
                }, 2000);
            }
        }
    }
}

// Initialize dashboard when DOM is loaded
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new AzureServiceTagsDashboard();
    // Make dashboard globally accessible for onclick handlers
    window.dashboard = dashboard;
});

// Debug function for troubleshooting
window.debugDashboard = function () {
    console.log('=== Dashboard Debug Info ===');
    console.log('Dashboard object:', dashboard);
    console.log('Summary data:', dashboard?.summaryData);
    console.log('Changes data:', dashboard?.changesData);
    console.log('Current data length:', dashboard?.currentData?.values?.length);
    alert('Debug info logged to console. Press F12 to view.');
};
