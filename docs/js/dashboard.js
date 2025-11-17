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

    // Try to get the display name from the mapping
    const displayName = AZURE_REGIONS[cleanName];

    // If not found in mapping, format the programmatic name nicely
    if (!displayName) {
        // Convert "brazilsouth" to "Brazil South", "eastus2" to "East US 2", etc.
        return programmaticName
            .replace(/([a-z])([A-Z])/g, '$1 $2') // Handle camelCase
            .replace(/([a-z])(\d)/g, '$1 $2')    // Handle numbers
            .split(/(?=[A-Z])|\s+/)               // Split on capitals or spaces
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
            .trim();
    }

    return displayName;
}

class AzureServiceTagsDashboard {
    constructor() {
        this.currentData = null;
        this.summaryData = null;
        this.changesData = null;
        this.filteredServices = [];
        this.activeServicesChart = null;
        this.regionalChart = null;
        this.updateTimelineChart = null;
        this.serviceTrendsChart = null;
        this.weeklyActivityChart = null;
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

    async renderDashboard() {
        // Prevent multiple renderings
        if (this.isRendered) {
            console.log('Dashboard already rendered, skipping...');
            return;
        }

        const dashboardEl = document.getElementById('dashboard');
        dashboardEl.classList.remove('hidden');

        this.renderStats();
        this.renderLastUpdated();

        // Only render charts if analytics section exists (on analytics.html)
        if (document.querySelector('.analytics-section')) {
            this.renderCharts();
        }

        // Only render timeline if timeline section exists (on history.html)
        if (document.querySelector('.timeline-section')) {
            await this.renderChangeHistoryTimeline();
        }

        // Always render recent changes and search (on all pages)
        this.renderRecentChanges();
        this.initializeGlobalSearch();

        this.isRendered = true;
    }

    renderStats() {
        // Update stat cards (only if they exist on this page)
        const totalIPRangesEl = document.getElementById('totalIPRanges');
        if (totalIPRangesEl) {
            totalIPRangesEl.textContent = this.summaryData.total_ip_ranges?.toLocaleString() || '0';
        }

        const changesThisWeekEl = document.getElementById('changesThisWeek');
        if (changesThisWeekEl) {
            changesThisWeekEl.textContent = this.summaryData.changes_this_week?.toLocaleString() || '0';
        }

        // Calculate number of regions with changes
        const regionsWithChanges = this.summaryData.regional_changes ?
            Object.keys(this.summaryData.regional_changes).length : 0;

        const ipChangesEl = document.getElementById('ipChanges');
        if (ipChangesEl) {
            ipChangesEl.textContent = regionsWithChanges.toLocaleString();
        }

        // Update hero stats
        const heroTotalRangesEl = document.getElementById('heroTotalRanges');
        if (heroTotalRangesEl) {
            heroTotalRangesEl.textContent = this.summaryData.total_ip_ranges?.toLocaleString() || '...';
        }

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

        const heroRegionsEl = document.getElementById('heroRegions');
        if (heroRegionsEl) {
            heroRegionsEl.textContent = regionCount > 0 ? regionCount.toLocaleString() : '...';
        }
    }

    renderLastUpdated() {
        const lastUpdated = this.summaryData.last_updated;
        if (lastUpdated) {
            const date = new Date(lastUpdated);
            const formattedDate = date.toLocaleString();

            // Update both hero and main sections (only if element exists)
            const lastUpdatedEl = document.getElementById('lastUpdated');
            if (lastUpdatedEl) {
                lastUpdatedEl.textContent = formattedDate;
            }
        }
    }

    renderCharts() {
        // Check if we're on the analytics page
        if (document.querySelector('.analytics-section')) {
            this.renderUpdateTimelineChart();
            this.renderServiceTrendsChart();
            this.renderWeeklyActivityChart();
            this.renderActiveServicesChart();
            this.renderRegionalChart();
            this.renderAnalyticsInfo();
        } else {
            // Home page charts
            this.renderActiveServicesChart();
            this.renderRegionalList();
            this.renderAnalyticsInfo();
        }
    }

    async renderAnalyticsInfo() {
        // Populate analytics info cards if they exist
        const dataPointsEl = document.getElementById('analyticsDataPoints');
        const durationEl = document.getElementById('analyticsDuration');

        if (dataPointsEl || durationEl) {
            try {
                // Load manifest to get actual data coverage
                const manifestResponse = await fetch('data/changes/manifest.json');
                const manifest = await manifestResponse.json();

                // Exclude baseline (oldest date) from counts
                const totalFiles = manifest.total_files || 0;
                const actualDataWeeks = Math.max(0, totalFiles - 1); // Subtract baseline

                if (dataPointsEl) {
                    const totalServices = this.summaryData?.total_services || 0;
                    dataPointsEl.textContent = `${actualDataWeeks} week${actualDataWeeks !== 1 ? 's' : ''} tracking ${totalServices.toLocaleString()} services`;
                }

                if (durationEl) {
                    const dateRange = manifest.date_range;
                    if (dateRange && actualDataWeeks > 0) {
                        // Get the second oldest date (first actual change, not baseline)
                        const files = manifest.files || [];
                        const sortedFiles = files.sort((a, b) => new Date(a.date) - new Date(b.date));

                        // Skip the oldest (baseline) and use the second oldest as start
                        const firstChangeDate = sortedFiles.length > 1 ? new Date(sortedFiles[1].date) : new Date(dateRange.oldest);
                        const newestDate = new Date(dateRange.newest);

                        const daysDiff = Math.floor((newestDate - firstChangeDate) / (1000 * 60 * 60 * 24));
                        const weeksDiff = Math.max(1, Math.ceil(daysDiff / 7));

                        const formattedFirst = firstChangeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        const formattedNewest = newestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                        durationEl.textContent = `${formattedFirst} - ${formattedNewest} (${weeksDiff} week${weeksDiff !== 1 ? 's' : ''})`;
                    } else {
                        durationEl.textContent = 'Collecting baseline data...';
                    }
                }
            } catch (error) {
                console.error('Error loading analytics info:', error);
                if (dataPointsEl && this.summaryData) {
                    const totalServices = this.summaryData.total_services || 0;
                    dataPointsEl.textContent = totalServices.toLocaleString();
                }
                if (durationEl) {
                    durationEl.textContent = 'recent weeks';
                }
            }
        }

        // Populate AzureCloud summary if on analytics page
        await this.renderAzureCloudSummary();
    }

    async renderAzureCloudSummary() {
        const summaryEl = document.getElementById('azureCloudSummary');
        if (!summaryEl) return;

        try {
            const manifestResponse = await fetch('data/changes/manifest.json');
            const manifest = await manifestResponse.json();
            const changeFiles = manifest.files.filter(f => f.date !== manifest.date_range.oldest);

            let azureCloudTotal = 0;
            let azureCloudGlobal = 0;
            const regionStats = {};

            for (const fileInfo of changeFiles) {
                try {
                    const changeResponse = await fetch(`data/changes/${fileInfo.filename}`);
                    const changeData = await changeResponse.json();

                    (changeData.changes || []).forEach(change => {
                        const serviceName = change.service;

                        // Only count AzureCloud tags
                        if (serviceName.startsWith('AzureCloud')) {
                            const addedCount = (change.added_prefixes || change.added || []).length;
                            const removedCount = (change.removed_prefixes || change.removed || []).length;
                            const totalChange = addedCount + removedCount;
                            azureCloudTotal += totalChange;

                            if (serviceName === 'AzureCloud') {
                                azureCloudGlobal += totalChange;
                            } else {
                                // Extract region from service name (e.g., AzureCloud.WestUS2 -> WestUS2)
                                const region = serviceName.replace('AzureCloud.', '');
                                if (!regionStats[region]) {
                                    regionStats[region] = 0;
                                }
                                regionStats[region] += totalChange;
                            }
                        }
                    });
                } catch (err) {
                    console.log(`Could not load ${fileInfo.filename}`);
                }
            }

            const regionCount = Object.keys(regionStats).length;

            // Sort regions by change count and get top 5
            const topRegions = Object.entries(regionStats)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([region, count]) => {
                    const displayName = this.regionDisplayNames[region] || region;
                    return `<span class="region-stat">${displayName} (${count})</span>`;
                })
                .join(', ');

            summaryEl.innerHTML = `
                Azure's global IP infrastructure had <strong>${azureCloudTotal.toLocaleString()} total IP changes</strong> across all tracked weeks. 
                This includes <strong>${azureCloudGlobal.toLocaleString()} global changes</strong> and updates across <strong>${regionCount} regional zones</strong>.
                ${topRegions ? `<br><br><strong>Most affected regions:</strong> ${topRegions}` : ''}
            `;

        } catch (error) {
            console.error('Error loading AzureCloud summary:', error);
            summaryEl.textContent = 'Unable to load AzureCloud statistics.';
        }
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

        // Load historical data to calculate true "activity" across ALL weeks
        this.loadHistoricalActivity().then(historicalActivity => {
            // Build services list from ALL historical data, not just current week
            const allServices = Object.entries(historicalActivity)
                .map(([service, stats]) => {
                    // Calculate activity score combining:
                    // 1. Historical frequency (how many times this service changed across all weeks)
                    // 2. Total IP impact (cumulative IPs changed across all weeks)
                    const changeFrequency = stats.changeCount || 0;
                    const totalIPChange = stats.totalIPChange || 0;
                    const activityScore = (changeFrequency * 100) + (totalIPChange * 0.1);

                    return {
                        service,
                        change_count: changeFrequency,
                        ip_added: stats.totalIPsAdded || 0,
                        ip_removed: stats.totalIPsRemoved || 0,
                        net_ip_change: (stats.totalIPsAdded || 0) - (stats.totalIPsRemoved || 0),
                        historical_weeks: changeFrequency,
                        activity_score: activityScore
                    };
                })
                // Sort by activity score (highest = most active over time)
                .sort((a, b) => b.activity_score - a.activity_score);

            console.log(`Rendering ${allServices.length} services from historical data`);
            this.renderServicesList(container, allServices);
        }).catch(error => {
            console.error('Error loading historical activity:', error);
            
            // Fallback: use current week data only if historical loading fails
            const changes = this.changesData.changes || [];
            const serviceCounts = {};
            const serviceIPCounts = {};

            changes.forEach(change => {
                const serviceName = change.service;

                // Skip AzureCloud tags - they're infrastructure, not services
                if (serviceName.startsWith('AzureCloud')) {
                    return;
                }

                if (!serviceCounts[serviceName]) {
                    serviceCounts[serviceName] = 0;
                    serviceIPCounts[serviceName] = { added: 0, removed: 0 };
                }
                serviceCounts[serviceName]++;

                if (change.added_count) {
                    serviceIPCounts[serviceName].added += change.added_count;
                }
                if (change.removed_count) {
                    serviceIPCounts[serviceName].removed += change.removed_count;
                }
            });

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

            console.warn('Using fallback: current week data only');
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

                                // Skip AzureCloud tags - they're infrastructure, not services
                                if (serviceName.startsWith('AzureCloud')) {
                                    return;
                                }

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

    async showTopHistoricalServices(container) {
        // Show top historically active services without "No Changes" messaging
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
                .slice(0, 5);  // Show top 5

            if (services.length === 0) {
                container.innerHTML = `
                    <div class="analytics-card">
                        <p style="text-align: center; color: var(--text-secondary);">
                            📊 No historical data available yet. Check back after the next update.
                        </p>
                    </div>
                `;
                return;
            }

            // Show ranked list of top services
            const topServicesHtml = services.map((item, index) => `
                <div class="service-rank-item" 
                     onclick="dashboard.showServiceHistory('${item.service.replace(/'/g, "\\'")}')"
                     title="Click to view ${item.service} history">
                    <div class="rank-number">${index + 1}</div>
                    <div class="service-details">
                        <div class="service-name">${item.service}</div>
                        <div class="service-meta">
                            <span class="frequency-badge">🔥 ${item.changeCount} change${item.changeCount !== 1 ? 's' : ''}</span>
                            <span class="ip-stats">
                                ${item.totalIPChange.toLocaleString()} IPs affected 
                                <span class="ip-added">+${item.totalIPsAdded.toLocaleString()}</span> • 
                                <span class="ip-removed">-${item.totalIPsRemoved.toLocaleString()}</span>
                            </span>
                        </div>
                    </div>
                </div>
            `).join('');

            container.innerHTML = `
                <div class="services-rank-list">
                    ${topServicesHtml}
                </div>
            `;
        } catch (error) {
            console.error('Error showing top historical services:', error);
            container.innerHTML = `
                <div class="analytics-card">
                    <p style="text-align: center; color: var(--text-secondary);">
                        Unable to load historical data. Please try refreshing the page.
                    </p>
                </div>
            `;
        }
    }

    renderServicesList(container, allServices) {

        if (allServices.length === 0) {
            // When no current data, show historical top services without "No Changes" header
            this.showTopHistoricalServices(container);
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

            // Calculate total IPs changed (added + removed across all weeks)
            const totalIPsChanged = service.ip_added + service.ip_removed;

            // Show frequency with fire badge for visual emphasis and hover effect
            const activityBadge = `<span class="frequency-badge activity-fire">🔥 ${service.change_count} week${service.change_count !== 1 ? 's' : ''}</span>`;

            return `
                <div class="service-rank-item-static">
                    <div class="service-details">
                        <div class="service-name">
                            <span class="rank-number-inline">${actualRank}.</span> ${service.service}
                            ${activityBadge}
                        </div>
                        <div class="change-count">
                            ${totalIPsChanged.toLocaleString()} total IP changes across all updates
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
            <h3>🏆 Most Active Services</h3>
            <div class="services-rank-list">
                ${servicesHtml}
            </div>
            ${paginationHtml}
        `;

        // Remove event listeners - no clicking functionality
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

    // New Analytics Charts

    async renderUpdateTimelineChart() {
        const canvas = document.getElementById('updateTimelineChart');
        if (!canvas) return;

        try {
            // Load all historical data files to get changeNumber timeline
            const manifestResponse = await fetch('data/changes/manifest.json');
            const manifest = await manifestResponse.json();

            const timelineData = [];

            // Load historical files with Microsoft metadata
            for (const fileInfo of manifest.files) {
                try {
                    const historyResponse = await fetch(`data/history/${fileInfo.date}.json`);
                    const changesResponse = await fetch(`data/changes/${fileInfo.date}-changes.json`);

                    if (historyResponse.ok) {
                        const historyData = await historyResponse.json();
                        if (historyData.changeNumber) {
                            const item = {
                                date: fileInfo.date,
                                changeNumber: parseInt(historyData.changeNumber),
                                collectionDate: new Date(fileInfo.date)
                            };

                            // Try to get Microsoft's publish date from changes file
                            if (changesResponse.ok) {
                                try {
                                    const changesData = await changesResponse.json();
                                    if (changesData.metadata && changesData.metadata.date_published) {
                                        // Parse date explicitly: "10/09/2025" -> MM/DD/YYYY
                                        const dateStr = changesData.metadata.date_published;
                                        const parts = dateStr.split('/');
                                        if (parts.length === 3) {
                                            const month = parseInt(parts[0], 10) - 1; // 0-indexed
                                            const day = parseInt(parts[1], 10);
                                            const year = parseInt(parts[2], 10);
                                            // Use UTC to avoid timezone shifts
                                            item.microsoftPublished = new Date(Date.UTC(year, month, day));
                                        }
                                    }
                                } catch (err) {
                                    console.log(`Could not parse changes file for ${fileInfo.date}`);
                                }
                            }

                            timelineData.push(item);
                        }
                    }
                } catch (err) {
                    console.log(`Could not load history file for ${fileInfo.date}`);
                }
            }

            // Sort by collection date
            timelineData.sort((a, b) => a.collectionDate - b.collectionDate);

            if (timelineData.length === 0) {
                canvas.parentElement.innerHTML = '<p class="no-data">No update timeline data available yet</p>';
                return;
            }

            // Filter to only show data points when changeNumber actually changed
            const filteredData = [];
            let lastChangeNumber = null;

            for (const item of timelineData) {
                if (lastChangeNumber === null || item.changeNumber !== lastChangeNumber) {
                    filteredData.push(item);
                    lastChangeNumber = item.changeNumber;
                }
            }

            if (filteredData.length === 0) {
                canvas.parentElement.innerHTML = '<p class="no-data">No Microsoft updates detected yet</p>';
                return;
            }

            // Prepare data - collect all unique dates for x-axis
            const allDates = new Set();
            const eventsByDate = {};

            filteredData.forEach((item, index) => {
                const changeNum = item.changeNumber;

                // First item is the baseline - ONLY show baseline marker, no Microsoft published
                if (index === 0) {
                    const dateKey = item.collectionDate.toISOString().split('T')[0];
                    allDates.add(dateKey);
                    if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
                    eventsByDate[dateKey].push({
                        type: 'baseline',
                        changeNumber: changeNum,
                        date: item.collectionDate
                    });
                    return; // Skip everything else for baseline
                }

                // For subsequent updates (index > 0), show Microsoft published event ONLY if it's AFTER baseline
                if (item.microsoftPublished) {
                    const baselineDate = filteredData[0].collectionDate;

                    // Only show Microsoft published if it's after the baseline date
                    if (item.microsoftPublished > baselineDate) {
                        const dateKey = item.microsoftPublished.toISOString().split('T')[0];
                        allDates.add(dateKey);
                        if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
                        eventsByDate[dateKey].push({
                            type: 'microsoft',
                            changeNumber: changeNum,
                            date: item.microsoftPublished
                        });
                    }
                }

                // Our collection event (for all non-baseline items)
                const collDateKey = item.collectionDate.toISOString().split('T')[0];
                allDates.add(collDateKey);
                if (!eventsByDate[collDateKey]) eventsByDate[collDateKey] = [];
                eventsByDate[collDateKey].push({
                    type: 'collection',
                    changeNumber: changeNum,
                    date: item.collectionDate
                });
            });

            // Sort dates and create labels
            const sortedDates = Array.from(allDates).sort();
            const labels = sortedDates.map(dateStr => {
                const date = new Date(dateStr);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });

            // Build dataset arrays for each event type
            const baselineData = sortedDates.map(dateKey => {
                const events = eventsByDate[dateKey] || [];
                const baselineEvent = events.find(e => e.type === 'baseline');
                return baselineEvent ? 0 : null;
            });

            const microsoftData = sortedDates.map(dateKey => {
                const events = eventsByDate[dateKey] || [];
                const msEvent = events.find(e => e.type === 'microsoft');
                return msEvent ? 1 : null;
            });

            const collectionData = sortedDates.map(dateKey => {
                const events = eventsByDate[dateKey] || [];
                const collEvent = events.find(e => e.type === 'collection');
                return collEvent ? 2 : null;
            });

            // Store metadata for tooltips
            const metadata = sortedDates.map(dateKey => {
                const events = eventsByDate[dateKey] || [];
                return events;
            });

            // Destroy existing chart
            if (this.updateTimelineChart) {
                this.updateTimelineChart.destroy();
            }

            // Create line chart with distinct markers (no connecting lines)
            this.updateTimelineChart = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Baseline',
                        data: baselineData,
                        backgroundColor: '#10b981',
                        borderColor: '#10b981',
                        borderWidth: 0,
                        pointRadius: 10,
                        pointHoverRadius: 12,
                        pointStyle: 'circle',
                        showLine: false
                    }, {
                        label: 'Microsoft Published',
                        data: microsoftData,
                        backgroundColor: '#3b82f6',
                        borderColor: '#3b82f6',
                        borderWidth: 0,
                        pointRadius: 8,
                        pointHoverRadius: 10,
                        pointStyle: 'triangle',
                        showLine: false
                    }, {
                        label: 'Data Collected',
                        data: collectionData,
                        backgroundColor: '#ef4444',
                        borderColor: '#ef4444',
                        borderWidth: 0,
                        pointRadius: 8,
                        pointHoverRadius: 10,
                        pointStyle: 'rectRot',
                        showLine: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 15,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                title: (items) => {
                                    const index = items[0].dataIndex;
                                    return sortedDates[index];
                                },
                                label: (context) => {
                                    const index = context.dataIndex;
                                    const events = metadata[index] || [];
                                    const datasetType = ['baseline', 'microsoft', 'collection'][context.datasetIndex];
                                    const event = events.find(e => e.type === datasetType);

                                    if (event) {
                                        const typeLabel = {
                                            'baseline': 'Baseline Start',
                                            'microsoft': 'Microsoft Published',
                                            'collection': 'Data Collected'
                                        }[event.type];
                                        return `${typeLabel}: ChangeNumber ${event.changeNumber}`;
                                    }
                                    return '';
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            },
                            grid: {
                                display: true,
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        y: {
                            min: -0.5,
                            max: 2.5,
                            ticks: {
                                stepSize: 1,
                                callback: function (value) {
                                    const labels = ['Baseline', 'Microsoft Published', 'Data Collected'];
                                    return labels[value] || '';
                                }
                            },
                            grid: {
                                display: true,
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        }
                    }
                }
            });

            const msCount = microsoftData.filter(v => v !== null).length;
            const collCount = collectionData.filter(v => v !== null).length;
            console.log(`✅ Update Timeline rendered with ${filteredData.length} updates (${msCount} Microsoft publishes, ${collCount} collections)`);
        } catch (error) {
            console.error('Error rendering update timeline chart:', error);
            canvas.parentElement.innerHTML = '<p class="no-data">Error loading update timeline data</p>';
        }
    }

    async renderServiceTrendsChart() {
        const canvas = document.getElementById('serviceTrendsChart');
        if (!canvas) return;

        try {
            // Load all historical changes to track AzureCloud regions over time
            const manifestResponse = await fetch('data/changes/manifest.json');
            const manifest = await manifestResponse.json();

            // Exclude baseline (oldest date)
            const changeFiles = manifest.files.filter(f => f.date !== manifest.date_range.oldest);

            if (changeFiles.length === 0) {
                canvas.parentElement.innerHTML = '<p class="no-data">Not enough historical data yet (need at least 2 weeks)</p>';
                return;
            }

            // Track total changes per AzureCloud region
            const regionStats = {};

            for (const fileInfo of changeFiles) {
                try {
                    const changeResponse = await fetch(`data/changes/${fileInfo.filename}`);
                    const changeData = await changeResponse.json();

                    (changeData.changes || []).forEach(change => {
                        const serviceName = change.service;

                        // ONLY include AzureCloud and regional variants (AzureCloud.WestUS2, etc.)
                        if (!serviceName.startsWith('AzureCloud')) {
                            return;
                        }

                        // Extract region from service name
                        let region;
                        if (serviceName === 'AzureCloud') {
                            region = 'Global';
                        } else {
                            // Extract region: AzureCloud.WestUS2 → WestUS2
                            region = serviceName.replace('AzureCloud.', '');
                        }

                        const addedCount = (change.added_prefixes || change.added || []).length;
                        const removedCount = (change.removed_prefixes || change.removed || []).length;
                        const totalChanges = addedCount + removedCount;

                        // Track total changes per region
                        if (!regionStats[region]) {
                            regionStats[region] = 0;
                        }
                        regionStats[region] += totalChanges;
                    });
                } catch (err) {
                    console.log(`Could not load ${fileInfo.filename}`);
                }
            }

            // Get Top 10 most affected AzureCloud regions
            const topRegions = Object.entries(regionStats)
                .map(([region, totalChanges]) => ({ region, totalChanges }))
                .sort((a, b) => b.totalChanges - a.totalChanges)
                .slice(0, 10);

            if (topRegions.length === 0) {
                canvas.parentElement.innerHTML = '<p class="no-data">No AzureCloud infrastructure changes detected yet</p>';
                return;
            }

            // Map region codes to display names
            const regionDisplayNames = {
                'Global': 'Global Infrastructure',
                'EastUS': 'East US',
                'EastUS2': 'East US 2',
                'WestUS': 'West US',
                'WestUS2': 'West US 2',
                'WestUS3': 'West US 3',
                'CentralUS': 'Central US',
                'NorthCentralUS': 'North Central US',
                'SouthCentralUS': 'South Central US',
                'WestCentralUS': 'West Central US',
                'NorthEurope': 'North Europe',
                'WestEurope': 'West Europe',
                'UKSouth': 'UK South',
                'UKWest': 'UK West',
                'FranceCentral': 'France Central',
                'FranceSouth': 'France South',
                'GermanyWestCentral': 'Germany West Central',
                'NorwayEast': 'Norway East',
                'SwedenCentral': 'Sweden Central',
                'SwitzerlandNorth': 'Switzerland North',
                'EastAsia': 'East Asia',
                'SoutheastAsia': 'Southeast Asia',
                'AustraliaEast': 'Australia East',
                'AustraliaSoutheast': 'Australia Southeast',
                'AustraliaCentral': 'Australia Central',
                'JapanEast': 'Japan East',
                'JapanWest': 'Japan West',
                'KoreaCentral': 'Korea Central',
                'KoreaSouth': 'Korea South',
                'ChinaEast': 'China East',
                'ChinaNorth': 'China North',
                'IndiaWest': 'India West',
                'IndiaCentral': 'India Central',
                'IndiaSouth': 'India South',
                'CanadaCentral': 'Canada Central',
                'CanadaEast': 'Canada East',
                'BrazilSouth': 'Brazil South',
                'SouthAfricaNorth': 'South Africa North',
                'SouthAfricaWest': 'South Africa West',
                'UAENorth': 'UAE North',
                'UAECentral': 'UAE Central'
            };

            // Prepare pie chart data
            const colors = [
                '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
                '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
            ];

            const labels = topRegions.map(r => regionDisplayNames[r.region] || r.region);
            const data = topRegions.map(r => r.totalChanges);
            const backgroundColors = colors.slice(0, topRegions.length);

            // Destroy existing chart
            if (this.serviceTrendsChart) {
                this.serviceTrendsChart.destroy();
            }

            // Create pie chart
            this.serviceTrendsChart = new Chart(canvas, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'right',
                            onClick: null, // Disable legend click to prevent hiding slices
                            labels: {
                                boxWidth: 15,
                                padding: 10,
                                font: {
                                    size: 11
                                },
                                generateLabels: (chart) => {
                                    const data = chart.data;
                                    return data.labels.map((label, i) => ({
                                        text: `${label} (${data.datasets[0].data[i]})`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        hidden: false,
                                        index: i
                                    }));
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${label}: ${value} IP changes (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });

            console.log(`✅ AzureCloud Regional Infrastructure Chart rendered with ${topRegions.length} regions`);
        } catch (error) {
            console.error('Error rendering AzureCloud regional chart:', error);
            canvas.parentElement.innerHTML = '<p class="no-data">Error loading service trends data</p>';
        }
    }

    showServiceRegionalBreakdown(serviceName, serviceData) {
        // Group by region
        const regionStats = {};

        serviceData.forEach(change => {
            change.regions.forEach(region => {
                if (!regionStats[region]) {
                    regionStats[region] = { added: 0, removed: 0, occurrences: 0 };
                }
                regionStats[region].added += change.added;
                regionStats[region].removed += change.removed;
                regionStats[region].occurrences++;
            });
        });

        // Sort by total changes
        const sortedRegions = Object.entries(regionStats)
            .map(([region, stats]) => ({
                region: this.regionDisplayNames[region] || region,
                ...stats,
                total: stats.added + stats.removed
            }))
            .sort((a, b) => b.total - a.total);

        // Create modal
        const overlay = document.createElement('div');
        overlay.className = 'changes-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'changes-modal';
        modal.style.maxWidth = '700px';

        let regionsHTML = '';
        if (sortedRegions.length === 0) {
            regionsHTML = '<p class="no-data">No regional data available for this service</p>';
        } else {
            regionsHTML = `
                <div class="region-breakdown-list">
                    ${sortedRegions.map(r => `
                        <div class="region-breakdown-item">
                            <div class="region-breakdown-header">
                                <span class="region-name">${r.region}</span>
                                <span class="region-total">${r.total} total changes</span>
                            </div>
                            <div class="region-breakdown-stats">
                                <span class="stat-added">+${r.added} added</span>
                                <span class="stat-removed">-${r.removed} removed</span>
                                <span class="stat-occurrences">${r.occurrences} week${r.occurrences > 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        modal.innerHTML = `
            <div class="modal-header">
                <h3>📍 Regional Breakdown: ${serviceName}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <p class="modal-description">Changes by region across all tracked weeks</p>
                ${regionsHTML}
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // ESC key handler
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Override remove to clean up
        const originalRemove = overlay.remove.bind(overlay);
        overlay.remove = function () {
            document.removeEventListener('keydown', escapeHandler);
            originalRemove();
        };

        // Close handlers
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        modal.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
    }

    async renderWeeklyActivityChart() {
        const canvas = document.getElementById('weeklyActivityChart');
        if (!canvas) return;

        try {
            // Load all historical changes
            const manifestResponse = await fetch('data/changes/manifest.json');
            const manifest = await manifestResponse.json();

            // Exclude baseline
            const changeFiles = manifest.files.filter(f => f.date !== manifest.date_range.oldest);

            if (changeFiles.length === 0) {
                canvas.parentElement.innerHTML = '<p class="no-data">Not enough historical data yet</p>';
                return;
            }

            const weeklyData = [];

            for (const fileInfo of changeFiles) {
                try {
                    const changeResponse = await fetch(`data/changes/${fileInfo.filename}`);
                    const changeData = await changeResponse.json();

                    let addedIPs = 0;
                    let removedIPs = 0;

                    (changeData.changes || []).forEach(change => {
                        addedIPs += change.added_count || 0;
                        removedIPs += change.removed_count || 0;
                    });

                    weeklyData.push({
                        date: fileInfo.date,
                        added: addedIPs,
                        removed: removedIPs
                    });
                } catch (err) {
                    console.log(`Could not load ${fileInfo.filename}`);
                }
            }

            // Sort by date
            weeklyData.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Limit to last 24 weeks (approximately 6 months) for readability
            const maxWeeksToShow = 24;
            const limitedData = weeklyData.length > maxWeeksToShow
                ? weeklyData.slice(-maxWeeksToShow)
                : weeklyData;

            const labels = limitedData.map(item => {
                const date = new Date(item.date);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });

            // Destroy existing chart
            if (this.weeklyActivityChart) {
                this.weeklyActivityChart.destroy();
            }

            // Custom plugin to draw vertical 'No changes' markers for zero-activity weeks
            const zeroChangePlugin = {
                id: 'zeroChangeVerticalMarker',
                afterDatasetsDraw: (chart) => {
                    const { ctx, chartArea } = chart;
                    const meta = chart.getDatasetMeta(0);
                    if (!meta || !meta.data) return;

                    ctx.save();
                    ctx.font = '10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
                    ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
                    ctx.textAlign = 'center';

                    meta.data.forEach((bar, index) => {
                        const total = (limitedData[index]?.added || 0) + (limitedData[index]?.removed || 0);
                        if (!bar || total !== 0) return;

                        const x = bar.x;
                        const midY = (chartArea.top + chartArea.bottom) / 2;

                        // Draw a subtle vertical line as a watermark
                        ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([4, 4]);
                        ctx.beginPath();
                        ctx.moveTo(x, chartArea.top + 4);
                        ctx.lineTo(x, chartArea.bottom - 4);
                        ctx.stroke();
                        ctx.setLineDash([]);

                        // Draw rotated 'No changes' text along the line
                        ctx.save();
                        ctx.translate(x, midY);
                        ctx.rotate(-Math.PI / 2);
                        ctx.fillText('No changes', 0, -6);
                        ctx.restore();
                    });

                    ctx.restore();
                }
            };

            // Create chart
            this.weeklyActivityChart = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Added IPs',
                            data: limitedData.map(item => item.added),
                            backgroundColor: 'rgba(76, 175, 80, 0.7)',
                            borderColor: 'rgba(76, 175, 80, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Removed IPs',
                            data: limitedData.map(item => item.removed),
                            backgroundColor: 'rgba(244, 67, 54, 0.7)',
                            borderColor: 'rgba(244, 67, 54, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            callbacks: {
                                title: (items) => {
                                    const index = items[0].dataIndex;
                                    const date = new Date(limitedData[index].date);
                                    return date.toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    });
                                },
                                label: (context) => {
                                    return `${context.dataset.label}: ${context.parsed.y.toLocaleString()}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            stacked: false,
                            title: {
                                display: true,
                                text: 'Week'
                            }
                        },
                        y: {
                            stacked: false,
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of IP Ranges'
                            }
                        }
                    }
                },
                plugins: [zeroChangePlugin]
            });

            console.log(`✅ Weekly Activity Chart rendered with ${limitedData.length} weeks (last ${maxWeeksToShow} weeks shown)`);
        } catch (error) {
            console.error('Error rendering weekly activity chart:', error);
            canvas.parentElement.innerHTML = '<p class="no-data">Error loading weekly activity data</p>';
        }
    }

    async renderRegionalChart() {
        const canvas = document.getElementById('regionalChart');
        if (!canvas) return;

        try {
            // Load all historical changes to get regional distribution
            const manifestResponse = await fetch('data/changes/manifest.json');
            const manifest = await manifestResponse.json();

            const regionalCounts = {};

            for (const fileInfo of manifest.files) {
                try {
                    const changeResponse = await fetch(`data/changes/${fileInfo.filename}`);
                    const changeData = await changeResponse.json();

                    (changeData.changes || []).forEach(change => {
                        const region = change.region || 'Global';
                        regionalCounts[region] = (regionalCounts[region] || 0) + 1;
                    });
                } catch (err) {
                    console.log(`Could not load ${fileInfo.filename}`);
                }
            }

            // Sort and get top regions
            const sortedRegions = Object.entries(regionalCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 15); // Top 15 regions

            if (sortedRegions.length === 0) {
                canvas.parentElement.innerHTML = '<p class="no-data">No regional data available</p>';
                return;
            }

            const labels = sortedRegions.map(([region]) => getRegionDisplayName(region));
            const data = sortedRegions.map(([, count]) => count);

            // Calculate total for percentages
            const total = data.reduce((a, b) => a + b, 0);

            // Generate colors
            const colors = sortedRegions.map((_, index) => {
                const hue = (index * 360 / sortedRegions.length);
                return `hsl(${hue}, 70%, 60%)`;
            });

            // Destroy existing chart
            if (this.regionalChart) {
                this.regionalChart.destroy();
            }

            // Create chart
            this.regionalChart = new Chart(canvas, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const regionDisplayName = labels[index];
                            // Find original region key from display name
                            const regionKey = sortedRegions[index][0];
                            this.showRegionalChangesModal(regionKey, regionDisplayName, regionalCounts[regionKey]);
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'right',
                            onClick: (event, legendItem, legend) => {
                                // Make legend items clickable to show regional details
                                const index = legendItem.index;
                                const regionDisplayName = labels[index];
                                const regionKey = sortedRegions[index][0];
                                this.showRegionalChangesModal(regionKey, regionDisplayName, regionalCounts[regionKey]);
                            },
                            labels: {
                                boxWidth: 12,
                                padding: 8,
                                font: {
                                    size: 11
                                },
                                generateLabels: (chart) => {
                                    const data = chart.data;
                                    if (data.labels.length && data.datasets.length) {
                                        return data.labels.map((label, i) => {
                                            const value = data.datasets[0].data[i];
                                            const percentage = ((value / total) * 100).toFixed(1);
                                            return {
                                                text: `${label} (${percentage}%)`,
                                                fillStyle: data.datasets[0].backgroundColor[i],
                                                strokeStyle: data.datasets[0].borderColor,
                                                lineWidth: data.datasets[0].borderWidth,
                                                hidden: false,
                                                index: i
                                            };
                                        });
                                    }
                                    return [];
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return `${context.label}: ${context.parsed} changes (${percentage}%) - Click to view details`;
                                }
                            }
                        }
                    }
                }
            });

            console.log(`✅ Regional Chart rendered with ${sortedRegions.length} regions`);

            // Add summary statistics and recent activity to the chart footer
            const chartCard = canvas.closest('.chart-card');
            const footer = chartCard.querySelector('.chart-footer');
            if (footer) {
                const totalRegions = Object.keys(regionalCounts).length;
                const totalChanges = Object.values(regionalCounts).reduce((a, b) => a + b, 0);
                const topRegion = sortedRegions[0];

                // Get last 5 weeks (excluding baseline) and then keep only those with regional changes
                const candidateWeeks = manifest.files
                    .filter(f => f.date !== manifest.date_range.oldest)
                    .sort((a, b) => new Date(b.date) - new Date(a.date));

                // Build recent activity HTML from weeks that actually have regional changes
                let recentActivityHTML = '';
                let includedWeeks = 0;

                for (const weekFile of candidateWeeks) {
                    if (includedWeeks >= 5) break;

                    try {
                        const weekResponse = await fetch(`data/changes/${weekFile.filename}`);
                        const weekData = await weekResponse.json();

                        const weekRegions = new Set();
                        (weekData.changes || []).forEach(change => {
                            const region = change.region || 'Global';
                            if (region) {
                                weekRegions.add(region);
                            }
                        });

                        // Skip weeks that ended up with no regions (no regional changes)
                        if (weekRegions.size === 0) {
                            continue;
                        }

                        const weekDate = new Date(weekFile.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        });

                        recentActivityHTML += `
                            <div style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: 600; color: var(--text-color);">${weekDate}</span>
                                    <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">
                                        ${weekRegions.size} region${weekRegions.size !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
                                    ${Array.from(weekRegions).slice(0, 3).map(r => getRegionDisplayName(r)).join(', ')}${weekRegions.size > 3 ? ` +${weekRegions.size - 3} more` : ''}
                                </div>
                            </div>
                        `;

                        includedWeeks += 1;
                    } catch (err) {
                        console.log(`Could not load ${weekFile.filename} for recent activity`);
                    }
                }

                footer.innerHTML = `
                    <div style="padding: 0.5rem 0;">
                        <div style="margin-bottom: 0.75rem;">
                            <h4 style="font-size: 0.95rem; margin-bottom: 0.75rem; color: var(--text-color);">
                                📅 Recent Regional Activity (Last 5 Updates)
                            </h4>
                            <div style="background: var(--bg-color); border-radius: 8px; padding: 0.75rem; max-height: 300px; overflow-y: auto;">
                                ${recentActivityHTML || '<p style="text-align: center; color: var(--text-muted); padding: 1rem;">No recent data available</p>'}
                            </div>
                        </div>
                        
                        <div style="color: var(--primary-color); font-size: 0.85rem; text-align: center;">
                            💡 Chart shows top 15 most active regions • Click on regions or legend to see detailed changes
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error rendering regional chart:', error);
            canvas.parentElement.innerHTML = '<p class="no-data">Error loading regional data</p>';
        }
    }

    async showRegionalChangesModal(regionKey, regionDisplayName, totalChanges) {
        // Create and show modal with all changes for this region
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex'; // Ensure flex display for centering
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px;">
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                <div style="padding: 2rem;">
                    <h2 style="margin: 0 0 0.5rem 0; color: var(--primary-color);">🌍 ${regionDisplayName}</h2>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem; font-size: 0.95rem;">
                        Total change events: <strong style="color: var(--primary-color);">${totalChanges}</strong>
                    </p>
                    <div id="regional-changes-content" style="max-height: 500px; overflow-y: auto; padding-right: 0.5rem;">
                        <p style="text-align: center; padding: 3rem;">
                            <span style="font-size: 2.5rem;">⏳</span><br>
                            <span style="color: var(--text-muted); margin-top: 1rem; display: block;">Loading changes...</span>
                        </p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        });

        // Close modal with ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Update close button to also remove event listener
        modal.querySelector('.close').addEventListener('click', () => {
            document.removeEventListener('keydown', escHandler);
        });

        // Load detailed changes for this region
        try {
            const manifestResponse = await fetch('data/changes/manifest.json');
            const manifest = await manifestResponse.json();

            // Exclude baseline (oldest date)
            const sortedFiles = [...manifest.files].sort((a, b) =>
                new Date(a.date) - new Date(b.date)
            );

            // Skip the first file (baseline)
            const filesToProcess = sortedFiles.length > 1 ? sortedFiles.slice(1) : [];

            const regionalChanges = [];

            for (const fileInfo of filesToProcess) {
                try {
                    const changeResponse = await fetch(`data/changes/${fileInfo.filename}`);
                    const changeData = await changeResponse.json();

                    (changeData.changes || []).forEach(change => {
                        const changeRegion = change.region || 'Global';
                        if (changeRegion === regionKey) {
                            regionalChanges.push({
                                date: fileInfo.date,
                                service: change.service,
                                addedCount: (change.addedIPs || []).length,
                                removedCount: (change.removedIPs || []).length,
                                addedIPs: change.addedIPs || [],
                                removedIPs: change.removedIPs || []
                            });
                        }
                    });
                } catch (err) {
                    console.log(`Could not load ${fileInfo.filename}`);
                }
            }

            // Sort by date (newest first)
            regionalChanges.sort((a, b) => new Date(b.date) - new Date(a.date));

            const contentDiv = document.getElementById('regional-changes-content');

            if (regionalChanges.length === 0) {
                contentDiv.innerHTML = '<p style="text-align: center; padding: 2rem;">No changes found for this region.</p>';
                return;
            }

            // Group by date
            const changesByDate = {};
            regionalChanges.forEach(change => {
                if (!changesByDate[change.date]) {
                    changesByDate[change.date] = [];
                }
                changesByDate[change.date].push(change);
            });

            let html = '';
            Object.entries(changesByDate).forEach(([date, changes]) => {
                const dateObj = new Date(date);
                const formattedDate = dateObj.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                html += `
                    <div class="date-group" style="margin-bottom: 0.5rem;">
                        <h3 style="font-size: 0.95rem; color: var(--primary); border-bottom: 1px solid var(--primary); padding-bottom: 0.3rem; margin-bottom: 0.5rem;">
                            📅 ${formattedDate}
                        </h3>
                        <div class="changes-list">
                            ${changes.map(change => `
                                <div class="service-change-item" style="background: var(--card-bg); padding: 0.4rem 0.75rem; margin-bottom: 0.25rem; border-radius: 6px; border-left: 3px solid var(--primary); cursor: default; transition: none;">
                                    <div style="font-weight: 600; margin-bottom: 0.25rem; font-size: 0.9rem;">
                                        ${change.service}
                                    </div>
                                    <div style="display: flex; gap: 1rem; font-size: 0.85rem; color: var(--text-secondary);">
                                        ${change.addedCount > 0 ? `<span class="ip-added">+${change.addedCount} IPs</span>` : ''}
                                        ${change.removedCount > 0 ? `<span class="ip-removed">-${change.removedCount} IPs</span>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            });

            contentDiv.innerHTML = html;
        } catch (error) {
            console.error('Error loading regional changes:', error);
            const contentDiv = document.getElementById('regional-changes-content');
            contentDiv.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--danger);">Error loading changes. Please try again.</p>';
        }
    }

    async renderRecentChanges() {
        const changesContainer = document.getElementById('recentChanges');

        if (!changesContainer) {
            // Recent changes container doesn't exist on all pages (e.g., History page)
            return;
        }

        try {
            // Load manifest to get the recent change files
            const timestamp = new Date().getTime();
            const manifestResponse = await fetch(`./data/changes/manifest.json?t=${timestamp}`);

            if (!manifestResponse.ok) {
                throw new Error('Could not load change history');
            }

            const manifest = await manifestResponse.json();
            const files = manifest.files || [];

            // Filter out baseline (oldest date) and sort newest first
            const oldestDate = manifest.date_range?.oldest;
            const changeFiles = files
                .filter(f => f.date !== oldestDate)
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            if (changeFiles.length === 0) {
                changesContainer.innerHTML = `
                    <div class="change-item">
                        <div class="change-header">
                            <div class="change-service">✨ No Changes Yet</div>
                        </div>
                        <div class="change-details">
                            Change tracking started. Updates will appear here weekly.
                        </div>
                    </div>
                `;
                return;
            }

            // Walk through files from newest to oldest until we collect up to 3
            const weeksWithChanges = [];

            for (const file of changeFiles) {
                if (weeksWithChanges.length >= 3) break;

                const response = await fetch(`./data/changes/${file.filename}?t=${timestamp}`);
                if (!response.ok) continue;

                const data = await response.json();
                const changes = data.changes || [];

                if (!Array.isArray(changes) || changes.length === 0) {
                    // Keep zero-change weeks only for the full history view, skip them here
                    continue;
                }

                weeksWithChanges.push({
                    date: file.date,
                    filename: file.filename,
                    changes,
                    metadata: data.metadata || {}
                });
            }

            // If none of the recent runs had changes, show a friendly message instead
            if (weeksWithChanges.length === 0) {
                changesContainer.innerHTML = `
                    <div class="timeline-container">
                        <div class="timeline-item">
                            <div class="timeline-header">
                                <div class="timeline-date">
                                    <span class="date-icon">✨</span>
                                    No Recent Changes
                                </div>
                            </div>
                            <div class="timeline-body">
                                <p style="text-align: center; color: #6b7280; padding: 1rem;">
                                    The most recent collection runs did not include any Azure service tag changes.
                                    You can still browse all historical updates on the full <a href="history.html">Change History</a> page.
                                </p>
                            </div>
                        </div>
                    </div>
                `;
                return;
            }

            // Render each week's changes with timeline wrapper
            const changesHtml = `
                <div class="timeline-container">
                    ${weeksWithChanges
                    .map(weekData => this.renderWeekChanges(weekData))
                    .join('')}
                </div>
            `;

            changesContainer.innerHTML = changesHtml;

        } catch (error) {
            console.error('Error loading recent changes:', error);
            changesContainer.innerHTML = `
                <div class="change-item">
                    <div class="change-header">
                        <div class="change-service">⚠️ Unable to load changes</div>
                    </div>
                    <div class="change-details">
                        ${error.message}
                    </div>
                </div>
            `;
        }
    }

    renderWeekChanges(weekData) {
        const { date, filename, changes, metadata = {} } = weekData;

        // Format the date
        const changeDate = new Date(date);
        const formattedDate = changeDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Format published date if available
        let publishedDateHtml = '';
        if (metadata.date_published) {
            const pubDate = new Date(metadata.date_published);
            const formattedPubDate = pubDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            publishedDateHtml = `<div class="timeline-published-date">📤 Published by Microsoft: ${formattedPubDate}</div>`;
        }

        // Calculate statistics
        const serviceCount = new Set(changes.map(c => c.service)).size;
        const regionCount = new Set(changes.map(c => c.region || 'global')).size;
        const addedIPs = changes.reduce((sum, c) => sum + (c.added_count || 0), 0);
        const removedIPs = changes.reduce((sum, c) => sum + (c.removed_count || 0), 0);

        if (changes.length === 0) {
            return `
                <div class="timeline-item">
                    <div class="timeline-header">
                        <div class="timeline-date">
                            <span class="date-icon">📅</span>
                            ${formattedDate}
                        </div>
                        <span class="timeline-badge no-changes">No Changes</span>
                    </div>
                    <div class="timeline-body">
                        <p style="text-align: center; color: #6b7280; padding: 1rem;">
                            All Azure service tags remained unchanged this week.
                        </p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="timeline-item" onclick="dashboard.showTimelineDetails('${filename}', '${date}')">
                <div class="timeline-header">
                    <div class="timeline-date">
                        <span class="date-icon">📅</span>
                        <div>
                            ${formattedDate}
                            ${publishedDateHtml}
                        </div>
                    </div>
                    <span class="timeline-badge">${changes.length} Changes</span>
                </div>
                
                <div class="timeline-stats">
                    <div class="timeline-stat-box">
                        <span class="timeline-stat-number">${serviceCount}</span>
                        <span class="timeline-stat-label">Services</span>
                    </div>
                    <div class="timeline-stat-box">
                        <span class="timeline-stat-number">${regionCount}</span>
                        <span class="timeline-stat-label">Regions</span>
                    </div>
                    <div class="timeline-stat-box">
                        <span class="timeline-stat-number" style="color: var(--success-color);">${addedIPs}</span>
                        <span class="timeline-stat-label">Added IPs</span>
                    </div>
                    <div class="timeline-stat-box">
                        <span class="timeline-stat-number" style="color: var(--danger-color);">${removedIPs}</span>
                        <span class="timeline-stat-label">Removed IPs</span>
                    </div>
                </div>

                <div class="timeline-action-hint">
                    👆 Click to view detailed changes
                </div>
            </div>
        `;
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

            // Filter out baseline (oldest date - it's just the initial snapshot)
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

            // Load summary data for each change file
            const timelineItems = await Promise.all(
                sortedFiles.map(file => this.loadTimelineItem(file))
            );

            // Store all timeline data for filtering
            this.allTimelineData = timelineItems;
            this.filteredTimelineData = timelineItems;

            // Initialize filters with the data
            this.initializeHistoryFilters(timelineItems);

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
            const metadata = data.metadata || {};

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
                changes: changes,
                metadata: metadata
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

        // Format published date if available
        let publishedDateHtml = '';
        if (item.metadata && item.metadata.date_published) {
            const pubDate = new Date(item.metadata.date_published);
            const formattedPubDate = pubDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            publishedDateHtml = `<div class="timeline-published-date">📤 Published by Microsoft: ${formattedPubDate}</div>`;
        }

        return `
            <div class="timeline-item" data-date="${item.date}" onclick="dashboard.showTimelineDetails('${item.filename}', '${item.date}')">
                <div class="timeline-header">
                    <div class="timeline-date">
                        <span class="date-icon">📅</span>
                        <div>
                            ${this.formatDate(item.date)}
                            ${publishedDateHtml}
                        </div>
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

        // Close modal when pressing ESC key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Clean up event listener when modal is removed
        const originalRemove = modal.remove.bind(modal);
        modal.remove = function () {
            document.removeEventListener('keydown', escapeHandler);
            originalRemove();
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
            // Get the last updated date
            const lastUpdated = this.summaryData.last_updated
                ? new Date(this.summaryData.last_updated).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
                : 'the last update';

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
                        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No service tag changes detected this week</p>
                        <p style="color: var(--text-secondary); margin-bottom: 2rem;">All Azure service tags remain unchanged since ${lastUpdated}.</p>
                        
                        <div style="padding: 1.5rem; background: var(--card-background); border-radius: 8px; border: 1px solid var(--border-color);">
                            <div style="font-weight: 600; margin-bottom: 0.5rem;">💡 Want to see previous updates?</div>
                            <div style="font-size: 0.9rem; margin-bottom: 1rem; color: var(--text-secondary);">
                                Browse historical changes in the Change History Timeline
                            </div>
                            <a href="history.html" class="timeline-link-btn" style="display: inline-block; text-decoration: none;">
                                📅 View Change History Timeline
                            </a>
                        </div>
                    </div>
                </div>
            `;
            modal.onclick = (e) => {
                if (e.target === modal) modal.remove();
            };

            // Close modal when pressing ESC key
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', escapeHandler);
                }
            };
            document.addEventListener('keydown', escapeHandler);

            // Clean up event listener when modal is removed
            const originalRemove = modal.remove.bind(modal);
            modal.remove = function () {
                document.removeEventListener('keydown', escapeHandler);
                originalRemove();
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
            // Get the last updated date
            const lastUpdated = this.summaryData.last_updated
                ? new Date(this.summaryData.last_updated).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
                : 'the last update';

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
                        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No regional IP changes detected this week</p>
                        <p style="color: var(--text-secondary); margin-bottom: 2rem;">All Azure regional service tags remain unchanged since ${lastUpdated}.</p>
                        
                        <div style="padding: 1.5rem; background: var(--card-background); border-radius: 8px; border: 1px solid var(--border-color);">
                            <div style="font-weight: 600; margin-bottom: 0.5rem;">💡 Want to see previous updates?</div>
                            <div style="font-size: 0.9rem; margin-bottom: 1rem; color: var(--text-secondary);">
                                Browse historical changes by region in the Change History Timeline
                            </div>
                            <a href="history.html" class="timeline-link-btn" style="display: inline-block; text-decoration: none;">
                                📅 View Change History Timeline
                            </a>
                        </div>
                    </div>
                </div>
            `;
            modal.onclick = (e) => {
                if (e.target === modal) modal.remove();
            };

            // Close modal when pressing ESC key
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', escapeHandler);
                }
            };
            document.addEventListener('keydown', escapeHandler);

            // Clean up event listener when modal is removed
            const originalRemove = modal.remove.bind(modal);
            modal.remove = function () {
                document.removeEventListener('keydown', escapeHandler);
                originalRemove();
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

        // Close modal when pressing ESC key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Clean up event listener when modal is removed
        const originalRemove = modal.remove.bind(modal);
        modal.remove = function () {
            document.removeEventListener('keydown', escapeHandler);
            originalRemove();
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

        // Close modal when pressing ESC key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Clean up event listener when modal is removed
        const originalRemove = modal.remove.bind(modal);
        modal.remove = function () {
            document.removeEventListener('keydown', escapeHandler);
            originalRemove();
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

    async showIPRangesHistory() {
        const modal = document.createElement('div');
        modal.className = 'changes-modal-overlay';

        try {
            // Get current IP ranges count
            const currentCount = this.summaryData.total_ip_ranges || 0;
            const lastUpdated = this.summaryData.last_updated || 'Unknown';

            // Calculate this week's changes
            let thisWeekAddedIPs = 0;
            let thisWeekRemovedIPs = 0;

            if (this.changesData && this.changesData.changes) {
                this.changesData.changes.forEach(change => {
                    if (change.type === 'ip_changes' || change.change_type === 'ip_changes') {
                        thisWeekAddedIPs += change.added_count || 0;
                        thisWeekRemovedIPs += change.removed_count || 0;
                    }
                });
            }

            const thisWeekNetChange = thisWeekAddedIPs - thisWeekRemovedIPs;
            const hasChangesThisWeek = thisWeekNetChange !== 0;

            // Load manifest to find historical changes
            let historicalData = null;
            let previousCount = currentCount - thisWeekNetChange;

            if (!hasChangesThisWeek) {
                // Load manifest to find the last week with actual changes
                try {
                    const manifestResponse = await fetch('data/changes/manifest.json');
                    const manifest = await manifestResponse.json();

                    // Sort files by date (newest first)
                    const sortedFiles = manifest.files
                        .sort((a, b) => new Date(b.date) - new Date(a.date));

                    // Look through previous weeks to find the last one with changes
                    for (const file of sortedFiles) {
                        const fileResponse = await fetch(`data/changes/${file.filename}`);
                        const fileData = await fileResponse.json();

                        // Calculate IP changes for this week
                        let weekAddedIPs = 0;
                        let weekRemovedIPs = 0;

                        if (fileData.changes) {
                            fileData.changes.forEach(change => {
                                if (change.type === 'ip_changes' || change.change_type === 'ip_changes') {
                                    weekAddedIPs += change.added_count || 0;
                                    weekRemovedIPs += change.removed_count || 0;
                                }
                            });
                        }

                        const weekNetChange = weekAddedIPs - weekRemovedIPs;

                        // If this week had changes, use it as our historical reference
                        if (weekNetChange !== 0) {
                            historicalData = {
                                date: file.date,
                                addedIPs: weekAddedIPs,
                                removedIPs: weekRemovedIPs,
                                netChange: weekNetChange,
                                totalChanges: file.total_changes
                            };

                            // Calculate what the IP count was before this historical change
                            previousCount = currentCount - weekNetChange;
                            break;
                        }
                    }
                } catch (error) {
                    console.error('Error loading historical data:', error);
                }
            }

            // Create the display message
            let statusMessage = '';
            let changeIcon = '📊';
            let changeColor = '#6b7280';
            let displayAddedIPs = thisWeekAddedIPs;
            let displayRemovedIPs = thisWeekRemovedIPs;
            let displayNetChange = thisWeekNetChange;
            let displayTotalChanges = thisWeekAddedIPs + thisWeekRemovedIPs; // Total activity
            let changeDate = new Date(lastUpdated).toLocaleDateString();

            if (hasChangesThisWeek) {
                changeIcon = thisWeekNetChange > 0 ? '📈' : '📉';
                changeColor = thisWeekNetChange > 0 ? '#059669' : '#dc2626';
                statusMessage = `This week: ${displayTotalChanges.toLocaleString()} total changes (${thisWeekNetChange > 0 ? '+' : ''}${thisWeekNetChange.toLocaleString()} net)`;
            } else if (historicalData) {
                // Show the last week that had changes
                displayAddedIPs = historicalData.addedIPs;
                displayRemovedIPs = historicalData.removedIPs;
                displayNetChange = historicalData.netChange;
                displayTotalChanges = historicalData.addedIPs + historicalData.removedIPs;
                changeIcon = historicalData.netChange > 0 ? '📈' : '📉';
                changeColor = historicalData.netChange > 0 ? '#059669' : '#dc2626';
                changeDate = new Date(historicalData.date).toLocaleDateString();
                statusMessage = `Last change: ${displayTotalChanges.toLocaleString()} total changes on ${changeDate}`;
            } else {
                statusMessage = 'No changes detected in recent weeks';
            }

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
                                    <div class="count-date">${hasChangesThisWeek ? 'Before this week\'s update' : (historicalData ? `Before ${changeDate}` : 'Baseline')}</div>
                                </div>
                                
                                <div class="progression-arrow">
                                    <div class="arrow-symbol">→</div>
                                    <div class="change-details">
                                        <span class="change-badge" style="background-color: ${changeColor};">
                                            ${changeIcon} ${displayNetChange >= 0 ? '+' : ''}${displayNetChange.toLocaleString()}
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
                        <h4>📊 ${hasChangesThisWeek ? 'This Week\'s Changes' : (historicalData ? `Last Changes (${changeDate})` : 'Recent Changes')}</h4>
                        ${(hasChangesThisWeek || historicalData) ? `
                            <div class="breakdown-stats">
                                <div class="breakdown-item added">
                                    <span class="breakdown-number">+${displayAddedIPs.toLocaleString()}</span>
                                    <span class="breakdown-label">IP ranges added</span>
                                </div>
                                <div class="breakdown-item removed">
                                    <span class="breakdown-number">-${displayRemovedIPs.toLocaleString()}</span>
                                    <span class="breakdown-label">IP ranges removed</span>
                                </div>
                                <div class="breakdown-item total">
                                    <span class="breakdown-number" style="color: var(--primary-color);">
                                        ${displayTotalChanges.toLocaleString()}
                                    </span>
                                    <span class="breakdown-label">Total changes (add + remove)</span>
                                </div>
                                <div class="breakdown-item net">
                                    <span class="breakdown-number" style="color: ${changeColor};">
                                        ${displayNetChange >= 0 ? '+' : ''}${displayNetChange.toLocaleString()}
                                    </span>
                                    <span class="breakdown-label">Net change (growth)</span>
                                </div>
                            </div>
                            ${!hasChangesThisWeek && historicalData ? `
                                <div class="info-note" style="background: #fffbeb; border-left-color: #f59e0b;">
                                    <p><strong>ℹ️ Note:</strong> No changes were detected this week. Showing the most recent update from <strong>${changeDate}</strong>.</p>
                                </div>
                            ` : ''}
                        ` : `
                            <div class="no-changes-message">
                                <p style="text-align: center; color: #6b7280; padding: 2rem;">
                                    ✨ All IP ranges have remained stable in recent weeks
                                </p>
                            </div>
                        `}
                    </div>

                    <div class="info-note">
                        <p><strong>ℹ️ About IP Ranges:</strong></p>
                        <p>This tracks the total count of ALL IP address ranges across ALL Azure services and regions combined. 
                        Each service (like Storage, SQL, etc.) in each region has its own set of IP ranges that Azure uses for that service.</p>
                        <p>Microsoft updates this data regularly when they add new datacenters, expand services, or decommission old infrastructure.</p>
                    </div>
                </div>
            `;

            modal.innerHTML = `
                <div class="changes-modal ip-history-modal">
                    <div class="changes-modal-header">
                        <h3>📊 IP Ranges History</h3>
                        <div class="changes-modal-stats">
                            <span class="stat-item">${statusMessage}</span>
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

            // Close modal when pressing ESC key
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', escapeHandler);
                }
            };
            document.addEventListener('keydown', escapeHandler);

            // Clean up event listener when modal is removed
            const originalRemove = modal.remove.bind(modal);
            modal.remove = function () {
                document.removeEventListener('keydown', escapeHandler);
                originalRemove();
            };

            document.body.appendChild(modal);

        } catch (error) {
            console.error('Error showing IP ranges history:', error);
            modal.innerHTML = `
                <div class="changes-modal">
                    <div class="changes-modal-header">
                        <h3>📊 IP Ranges History</h3>
                        <button onclick="this.closest('.changes-modal-overlay').remove()" class="close-modal-btn">&times;</button>
                    </div>
                    <div class="changes-modal-body">
                        <p style="color: var(--danger-color); text-align: center; padding: 2rem;">
                            ⚠️ Unable to load IP ranges history
                        </p>
                    </div>
                </div>
            `;

            // Close modal when clicking overlay (error case)
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            };

            // Close modal when pressing ESC key (error case)
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', escapeHandler);
                }
            };
            document.addEventListener('keydown', escapeHandler);

            // Clean up event listener when modal is removed (error case)
            const originalRemove = modal.remove.bind(modal);
            modal.remove = function () {
                document.removeEventListener('keydown', escapeHandler);
                originalRemove();
            };

            document.body.appendChild(modal);
        }
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
                            <div class="ip-list-section">
                                <div class="ip-section-title">
                                    <strong>Added IPs:</strong>
                                </div>
                                <div class="ip-list-styled">
                                    ${addedPrefixes.slice(0, collapseThreshold).map(ip => `<div class="ip-item added-ip">${ip}</div>`).join('')}
                                    ${addedPrefixes.length > collapseThreshold ? `
                                        <div class="ip-hidden" id="added-${uniqueId}" style="display:none;">
                                            ${addedPrefixes.slice(collapseThreshold).map(ip => `<div class="ip-item added-ip">${ip}</div>`).join('')}
                                        </div>
                                        <button class="show-more-btn" onclick="dashboard.toggleIPs('added-${uniqueId}', this)">
                                            ➕ Show ${addedPrefixes.length - collapseThreshold} more
                                        </button>
                                    ` : ''}
                                </div>
                                <div class="ip-copy-actions">
                                    <button class="copy-btn-small copy-ips-btn" data-ips="${this.escapeForDataAttr(JSON.stringify(addedPrefixes))}" data-label="added IPs for ${this.escapeForDataAttr(change.service)}">
                                        📋 Copy All Added
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                        ${showRemovedIPs ? `
                            <div class="ip-list-section">
                                <div class="ip-section-title">
                                    <strong>Removed IPs:</strong>
                                </div>
                                <div class="ip-list-styled">
                                    ${removedPrefixes.slice(0, collapseThreshold).map(ip => `<div class="ip-item removed-ip">${ip}</div>`).join('')}
                                    ${removedPrefixes.length > collapseThreshold ? `
                                        <div class="ip-hidden" id="removed-${uniqueId}" style="display:none;">
                                            ${removedPrefixes.slice(collapseThreshold).map(ip => `<div class="ip-item removed-ip">${ip}</div>`).join('')}
                                        </div>
                                        <button class="show-more-btn" onclick="dashboard.toggleIPs('removed-${uniqueId}', this)">
                                            ➕ Show ${removedPrefixes.length - collapseThreshold} more
                                        </button>
                                    ` : ''}
                                </div>
                                <div class="ip-copy-actions">
                                    <button class="copy-btn-small copy-ips-btn" data-ips="${this.escapeForDataAttr(JSON.stringify(removedPrefixes))}" data-label="removed IPs for ${this.escapeForDataAttr(change.service)}">
                                        📋 Copy All Removed
                                    </button>
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

        // Load all change files
        const allChanges = [];

        for (const fileInfo of changeFiles) {
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
            services.forEach((service, index) => {
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
            regions.forEach((region, index) => {
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

    // ========== HISTORY PAGE FEATURES ==========

    // Store all timeline data for filtering
    allTimelineData = [];
    filteredTimelineData = [];
    compareMode = false;
    selectedCompareItems = [];  // For Compare Mode (max 2 items)
    selectedWeeksForExport = [];  // For week selector export (unlimited)

    // Initialize history page filters
    initializeHistoryFilters(allData) {
        console.log('🔧 initializeHistoryFilters called with', allData.length, 'items');

        // Extract unique regions from the loaded timeline data
        const regions = new Set();
        const dates = [];

        allData.forEach((item, index) => {
            console.log(`Item ${index}:`, {
                date: item.date,
                hasChanges: item.hasChanges,
                changesLength: item.changes ? item.changes.length : 0
            });

            // Collect dates for date range calculation
            if (item.date) {
                dates.push(new Date(item.date));
            }

            if (item.changes && Array.isArray(item.changes)) {
                item.changes.forEach(change => {
                    if (change.region && change.region.trim() !== '') {
                        regions.add(change.region);
                        if (regions.size <= 5) {
                            console.log('  → Found region:', change.region);
                        }
                    }
                });
            }
        });

        console.log(`✅ Found ${regions.size} unique regions in timeline data`);
        console.log('Regions:', Array.from(regions).slice(0, 10));

        // Populate region filter dropdown
        const regionFilter = document.getElementById('regionFilter');
        console.log('regionFilter element:', regionFilter);

        if (regionFilter) {
            // Clear existing options except "All Regions"
            regionFilter.innerHTML = '<option value="">All Regions</option>';

            if (regions.size === 0) {
                console.warn('⚠️ No regions found in data');
            } else {
                // Sort regions by display name for better UX
                const sortedRegions = Array.from(regions).sort((a, b) => {
                    const nameA = getRegionDisplayName(a);
                    const nameB = getRegionDisplayName(b);
                    return nameA.localeCompare(nameB);
                });

                console.log('📋 Adding', sortedRegions.length, 'regions to dropdown');

                sortedRegions.forEach((region, index) => {
                    const option = document.createElement('option');
                    option.value = region;
                    option.textContent = getRegionDisplayName(region);
                    regionFilter.appendChild(option);

                    if (index < 5) {
                        console.log(`  Added: ${region} → ${getRegionDisplayName(region)}`);
                    }
                });

                console.log(`✅ Dropdown now has ${regionFilter.options.length} options total`);
            }
        } else {
            console.error('❌ regionFilter element not found!');
        }

        // Set up adaptive date range dropdown
        const dateRangeFilter = document.getElementById('dateRangeFilter');
        if (dateRangeFilter && dates.length > 0) {
            dates.sort((a, b) => a - b);
            const oldestDate = dates[0];
            const newestDate = dates[dates.length - 1];
            const daysDiff = Math.floor((newestDate - oldestDate) / (1000 * 60 * 60 * 24));

            console.log(`📅 Data spans ${daysDiff} days (${oldestDate.toISOString().split('T')[0]} to ${newestDate.toISOString().split('T')[0]})`);

            // Clear existing options
            dateRangeFilter.innerHTML = '<option value="all">All Time</option>';

            // Define potential date range options
            const dateRangeOptions = [
                { days: 7, label: 'Last 7 Days' },
                { days: 14, label: 'Last 14 Days' },
                { days: 21, label: 'Last 21 Days' },
                { days: 30, label: 'Last 30 Days' },
                { days: 45, label: 'Last 45 Days' },
                { days: 60, label: 'Last 60 Days' },
                { days: 90, label: 'Last 90 Days' },
                { days: 180, label: 'Last 6 Months' },
                { days: 365, label: 'Last Year' }
            ];

            // Only add options where we have enough data
            dateRangeOptions.forEach(option => {
                if (option.days <= daysDiff) {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.days;
                    optionElement.textContent = option.label;
                    dateRangeFilter.appendChild(optionElement);
                    console.log(`  ✓ Added option: ${option.label} (${option.days} days)`);
                } else {
                    console.log(`  ✗ Skipped option: ${option.label} (${option.days} days) - not enough data`);
                }
            });

            console.log(`✅ Date range dropdown populated with ${dateRangeFilter.options.length} options`);
        } else {
            console.warn('⚠️ No dates found in data or dateRangeFilter not found');
        }
    }

    // Filter history based on search and filters
    filterHistory() {
        const searchTerm = document.getElementById('historySearch')?.value.toLowerCase() || '';
        const regionFilter = document.getElementById('regionFilter')?.value || '';
        const dateRangeFilter = document.getElementById('dateRangeFilter')?.value || 'all';

        // Calculate date range
        let dateThreshold = null;
        if (dateRangeFilter !== 'all') {
            const daysAgo = parseInt(dateRangeFilter);
            dateThreshold = new Date();
            dateThreshold.setDate(dateThreshold.getDate() - daysAgo);
        }

        // Filter the timeline data
        this.filteredTimelineData = this.allTimelineData.filter(item => {
            const itemDate = new Date(item.date);

            // Date range filter
            if (dateThreshold && itemDate < dateThreshold) {
                return false;
            }

            // Search filter - search across service names, regions, and dates
            if (searchTerm) {
                const dateStr = itemDate.toLocaleDateString().toLowerCase();
                const hasMatch = dateStr.includes(searchTerm) ||
                    (item.changes || []).some(change =>
                        (change.service && change.service.toLowerCase().includes(searchTerm)) ||
                        (change.region && change.region.toLowerCase().includes(searchTerm)) ||
                        (change.region && getRegionDisplayName(change.region).toLowerCase().includes(searchTerm))
                    );
                if (!hasMatch) return false;
            }

            // Region filter
            if (regionFilter) {
                const hasRegion = (item.changes || []).some(change => change.region === regionFilter);
                if (!hasRegion) return false;
            }

            return true;
        });

        // Re-render timeline with filtered data
        this.renderFilteredTimeline();

        // Update results count
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            const total = this.allTimelineData.length;
            const filtered = this.filteredTimelineData.length;
            if (filtered === total) {
                resultsCount.textContent = `Showing all ${total} weeks`;
            } else {
                resultsCount.textContent = `Showing ${filtered} of ${total} weeks`;
            }
        }
    }

    // Render filtered timeline
    renderFilteredTimeline() {
        const timelineContainer = document.getElementById('changeHistoryTimeline');
        if (!timelineContainer) return;

        if (this.filteredTimelineData.length === 0) {
            timelineContainer.innerHTML = `
                <div class="timeline-empty">
                    <p>🔍 No results found</p>
                    <p>Try adjusting your filters or search terms</p>
                </div>
            `;
            return;
        }

        // Get current search and filter values
        const searchTerm = document.getElementById('historySearch')?.value.toLowerCase() || '';
        const regionFilter = document.getElementById('regionFilter')?.value || '';

        // Render timeline items with optional highlighting
        const timelineHtml = this.filteredTimelineData
            .map(item => {
                // If search or region filter is active, add matched details
                if (searchTerm || regionFilter) {
                    return this.renderTimelineItemWithDetails(item, searchTerm, regionFilter);
                } else {
                    return this.renderTimelineItem(item);
                }
            })
            .join('');
        timelineContainer.innerHTML = timelineHtml;

        // Add compare mode styling if active
        if (this.compareMode) {
            this.applyCompareMode();
        }
    }

    // Render timeline item with search/filter highlights and details
    renderTimelineItemWithDetails(item, searchTerm, regionFilter) {
        if (item.error || !item.hasChanges) {
            return this.renderTimelineItem(item);
        }

        // Find matching changes
        let matchedChanges = item.changes || [];
        if (regionFilter) {
            matchedChanges = matchedChanges.filter(change => change.region === regionFilter);
        }
        if (searchTerm) {
            matchedChanges = matchedChanges.filter(change =>
                (change.service && change.service.toLowerCase().includes(searchTerm)) ||
                (change.region && change.region.toLowerCase().includes(searchTerm)) ||
                (change.region && getRegionDisplayName(change.region).toLowerCase().includes(searchTerm))
            );
        }

        // Count matched items by region/service
        const regionCounts = {};
        const serviceCounts = {};
        let totalMatchedAdded = 0;
        let totalMatchedRemoved = 0;

        matchedChanges.forEach(change => {
            if (change.region) {
                const regionName = getRegionDisplayName(change.region);
                regionCounts[regionName] = (regionCounts[regionName] || 0) + 1;
            }
            if (change.service) {
                serviceCounts[change.service] = (serviceCounts[change.service] || 0) + 1;
            }
            totalMatchedAdded += change.added_count || 0;
            totalMatchedRemoved += change.removed_count || 0;
        });

        // Format published date if available
        let publishedDateHtml = '';
        if (item.metadata && item.metadata.date_published) {
            const pubDate = new Date(item.metadata.date_published);
            const formattedPubDate = pubDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            publishedDateHtml = `<div class="timeline-published-date">📤 Published by Microsoft: ${formattedPubDate}</div>`;
        }

        // Build matched details HTML with full service list
        let matchedDetailsHtml = '';
        if (matchedChanges.length > 0) {
            // Build detailed service list with clickable items
            const servicesList = matchedChanges
                .sort((a, b) => (b.added_count + b.removed_count) - (a.added_count + a.removed_count))
                .map((change, index) => {
                    const addedBadge = change.added_count > 0 ?
                        `<span class="ip-badge added">+${change.added_count}</span>` : '';
                    const removedBadge = change.removed_count > 0 ?
                        `<span class="ip-badge removed">-${change.removed_count}</span>` : '';

                    // Create unique ID for this change item
                    const changeId = `change-${item.date}-${index}`;

                    // Build IP lists
                    const addedIPsList = (change.added_prefixes || []).map(ip =>
                        `<div class="ip-item">${ip}</div>`
                    ).join('');

                    const removedIPsList = (change.removed_prefixes || []).map(ip =>
                        `<div class="ip-item removed-ip">${ip}</div>`
                    ).join('');

                    // Create copy buttons that copy all IPs at once
                    const addedCopyBtn = change.added_prefixes && change.added_prefixes.length > 0 ?
                        `<button class="ip-copy-all-btn" onclick="event.stopPropagation(); navigator.clipboard.writeText('${change.added_prefixes.join('\\n')}'); this.textContent='✓ Copied!'; setTimeout(() => this.textContent='📋 Copy All Added', 1500)">📋 Copy All Added</button>` : '';

                    const removedCopyBtn = change.removed_prefixes && change.removed_prefixes.length > 0 ?
                        `<button class="ip-copy-all-btn removed" onclick="event.stopPropagation(); navigator.clipboard.writeText('${change.removed_prefixes.join('\\n')}'); this.textContent='✓ Copied!'; setTimeout(() => this.textContent='📋 Copy All Removed', 1500)">📋 Copy All Removed</button>` : '';

                    return `
                        <div class="matched-service-item" onclick="event.stopPropagation(); document.getElementById('${changeId}').classList.toggle('expanded')">
                            <div class="service-header">
                                <span class="service-name">🏷️ ${change.service}</span>
                                <span class="service-changes">${addedBadge} ${removedBadge}</span>
                            </div>
                            <div id="${changeId}" class="service-ip-details">
                                ${addedIPsList ? `
                                    <div class="ip-section">
                                        <div class="ip-section-header">
                                            <strong>Added IPs:</strong>
                                            ${addedCopyBtn}
                                        </div>
                                        <div class="ip-list">${addedIPsList}</div>
                                    </div>` : ''}
                                ${removedIPsList ? `
                                    <div class="ip-section">
                                        <div class="ip-section-header">
                                            <strong>Removed IPs:</strong>
                                            ${removedCopyBtn}
                                        </div>
                                        <div class="ip-list">${removedIPsList}</div>
                                    </div>` : ''}
                            </div>
                        </div>
                    `;
                })
                .join('');

            const regionName = regionFilter ? getRegionDisplayName(regionFilter) : 'matching your search';

            matchedDetailsHtml = `
                <div class="timeline-matched-details">
                    <div class="matched-summary">
                        <strong>🔍 ${matchedChanges.length} service${matchedChanges.length !== 1 ? 's' : ''} changed in ${regionName}</strong>
                        <span class="matched-ips">
                            <span style="color: var(--success-color);">+${totalMatchedAdded}</span> / 
                            <span style="color: var(--danger-color);">-${totalMatchedRemoved}</span> IPs
                        </span>
                    </div>
                    <div class="matched-services-list">
                        ${servicesList}
                    </div>
                </div>
            `;
        }

        return `
            <div class="timeline-item timeline-item-highlighted" data-date="${item.date}">
                <div class="timeline-header">
                    <div class="timeline-date">
                        <span class="date-icon">📅</span>
                        <div>
                            ${this.formatDate(item.date)}
                            ${publishedDateHtml}
                        </div>
                    </div>
                    <span class="timeline-badge">${matchedChanges.length} Matching Changes</span>
                </div>
                
                ${matchedDetailsHtml}
            </div>
        `;
    }

    // Reset all filters
    resetFilters() {
        // Reset all filter inputs
        document.getElementById('historySearch').value = '';
        document.getElementById('regionFilter').value = '';
        document.getElementById('dateRangeFilter').value = 'all';

        // Reset compare mode if active
        if (this.compareMode) {
            this.toggleCompareMode();
        }

        // Clear week selections
        this.clearAllWeeks();

        // Reset week selector button text
        const weekSelectorBtn = document.querySelector('[onclick*="toggleWeekSelector"]');
        if (weekSelectorBtn) {
            weekSelectorBtn.childNodes[0].textContent = '📅 Select Weeks (0) ';
        }

        // Apply filters (will show all data)
        this.filterHistory();

        // Visual feedback
        const resetBtn = event?.target;
        if (resetBtn) {
            const originalText = resetBtn.innerHTML;
            resetBtn.innerHTML = '✅ Filters Reset';
            resetBtn.style.pointerEvents = 'none';

            setTimeout(() => {
                resetBtn.innerHTML = originalText;
                resetBtn.style.pointerEvents = 'auto';
            }, 1500);
        }
    }

    // Toggle compare mode
    toggleCompareMode() {
        this.compareMode = !this.compareMode;
        this.selectedCompareItems = [];

        const compareBtn = document.getElementById('compareBtn');
        const timelineContainer = document.getElementById('changeHistoryTimeline');

        if (this.compareMode) {
            compareBtn.textContent = '❌ Cancel Compare';
            compareBtn.classList.add('active');
            this.showCompareBanner();
            this.applyCompareMode();
        } else {
            compareBtn.textContent = '📊 Compare Weeks';
            compareBtn.classList.remove('active');
            this.hideCompareBanner();
            this.removeCompareMode();
        }
    }

    // Show compare banner
    showCompareBanner() {
        const existingBanner = document.querySelector('.compare-banner');
        if (existingBanner) return;

        const banner = document.createElement('div');
        banner.className = 'compare-banner';
        banner.innerHTML = `
            <div class="compare-banner-text">
                <strong>📊 Compare Mode Active</strong><br>
                <span>Select 2 weeks to compare (0/2 selected)</span>
            </div>
            <div class="compare-banner-actions">
                <button onclick="dashboard.performComparison()">Compare Selected</button>
                <button onclick="dashboard.toggleCompareMode()">Cancel</button>
            </div>
        `;

        const timelineSection = document.querySelector('.timeline-section');
        timelineSection.insertBefore(banner, timelineSection.firstChild);
    }

    // Hide compare banner
    hideCompareBanner() {
        const banner = document.querySelector('.compare-banner');
        if (banner) banner.remove();
    }

    // Apply compare mode styling
    applyCompareMode() {
        const timelineItems = document.querySelectorAll('.timeline-item');
        timelineItems.forEach(item => {
            item.classList.add('compare-mode');
            item.onclick = (e) => {
                if (!e.target.closest('button')) {
                    this.toggleCompareSelection(item);
                }
            };
        });
    }

    // Remove compare mode styling
    removeCompareMode() {
        const timelineItems = document.querySelectorAll('.timeline-item');
        timelineItems.forEach(item => {
            item.classList.remove('compare-mode', 'compare-selected');
            item.onclick = null;
        });
    }

    // Toggle item selection for comparison
    toggleCompareSelection(item) {
        const date = item.dataset.date;

        if (item.classList.contains('compare-selected')) {
            // Deselect
            item.classList.remove('compare-selected');
            this.selectedCompareItems = this.selectedCompareItems.filter(d => d !== date);
        } else {
            // Select (max 2)
            if (this.selectedCompareItems.length < 2) {
                item.classList.add('compare-selected');
                this.selectedCompareItems.push(date);
            }
        }

        // Update banner
        const bannerText = document.querySelector('.compare-banner-text span');
        if (bannerText) {
            bannerText.textContent = `Select 2 weeks to compare (${this.selectedCompareItems.length}/2 selected)`;
        }
    }

    // Perform comparison
    performComparison() {
        if (this.selectedCompareItems.length !== 2) {
            alert('Please select exactly 2 weeks to compare');
            return;
        }

        const [date1, date2] = this.selectedCompareItems.sort();
        const item1 = this.allTimelineData.find(item => item.date === date1);
        const item2 = this.allTimelineData.find(item => item.date === date2);

        if (!item1 || !item2) {
            alert('Error loading comparison data');
            return;
        }

        this.showComparisonModal(item1, item2);
    }

    // Show comparison modal
    showComparisonModal(item1, item2) {
        // Create comparison analysis
        const date1 = new Date(item1.date).toLocaleDateString();
        const date2 = new Date(item2.date).toLocaleDateString();

        const modal = document.createElement('div');
        modal.className = 'changes-modal-overlay';
        modal.innerHTML = `
            <div class="changes-modal comparison-modal">
                <div class="changes-modal-header">
                    <h3>📊 Week Comparison</h3>
                    <button onclick="this.closest('.changes-modal-overlay').remove()" class="close-modal-btn">&times;</button>
                </div>
                <div class="changes-modal-body">
                    <div class="comparison-grid">
                        <div class="comparison-column">
                            <h4>📅 ${date1}</h4>
                            <div class="comparison-stats">
                                <div class="stat-box">
                                    <span class="stat-number">${item1.changeCount}</span>
                                    <span class="stat-label">Total Changes</span>
                                </div>
                                <div class="stat-box">
                                    <span class="stat-number">${item1.serviceCount}</span>
                                    <span class="stat-label">Services</span>
                                </div>
                                <div class="stat-box">
                                    <span class="stat-number">${item1.totalIPChanges.toLocaleString()}</span>
                                    <span class="stat-label">IP Changes</span>
                                </div>
                            </div>
                        </div>
                        <div class="comparison-divider">vs</div>
                        <div class="comparison-column">
                            <h4>📅 ${date2}</h4>
                            <div class="comparison-stats">
                                <div class="stat-box">
                                    <span class="stat-number">${item2.changeCount}</span>
                                    <span class="stat-label">Total Changes</span>
                                </div>
                                <div class="stat-box">
                                    <span class="stat-number">${item2.serviceCount}</span>
                                    <span class="stat-label">Services</span>
                                </div>
                                <div class="stat-box">
                                    <span class="stat-number">${item2.totalIPChanges.toLocaleString()}</span>
                                    <span class="stat-label">IP Changes</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="comparison-insights">
                        <h4>📈 Insights</h4>
                        <ul>
                            <li>Change Volume: ${this.getChangeDirection(item1.changeCount, item2.changeCount)}</li>
                            <li>Service Activity: ${this.getChangeDirection(item1.serviceCount, item2.serviceCount)}</li>
                            <li>IP Modifications: ${this.getChangeDirection(item1.totalIPChanges, item2.totalIPChanges)}</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        document.body.appendChild(modal);
    }

    // Get change direction text
    getChangeDirection(val1, val2) {
        const diff = val2 - val1;
        const pct = val1 > 0 ? ((diff / val1) * 100).toFixed(1) : 0;

        if (diff > 0) {
            return `📈 Increased by ${Math.abs(diff)} (${Math.abs(pct)}%)`;
        } else if (diff < 0) {
            return `📉 Decreased by ${Math.abs(diff)} (${Math.abs(pct)}%)`;
        } else {
            return `➡️ No change (same value)`;
        }
    }

    // Show export menu
    showExportMenu() {
        const menu = document.getElementById('exportMenu');
        if (menu) {
            menu.classList.toggle('hidden');
        }

        // Close menu when clicking outside
        document.addEventListener('click', function closeMenu(e) {
            if (!e.target.closest('.export-group')) {
                menu?.classList.add('hidden');
                document.removeEventListener('click', closeMenu);
            }
        });
    }

    // Week Selector Functions
    toggleWeekSelector(event) {
        event.stopPropagation();
        const dropdown = document.getElementById('weekSelector');
        const button = event.currentTarget;

        // Populate week list if empty
        if (!dropdown.hasAttribute('data-populated')) {
            this.populateWeekSelector();
            dropdown.setAttribute('data-populated', 'true');
        }

        const isOpening = !dropdown.classList.contains('show');
        dropdown.classList.toggle('show');
        button.classList.toggle('active');

        // Close dropdown when clicking outside (but not inside the dropdown)
        if (isOpening) {
            // Remove any existing handler first
            if (this.weekSelectorCloseHandler) {
                document.removeEventListener('click', this.weekSelectorCloseHandler);
            }

            setTimeout(() => {
                this.weekSelectorCloseHandler = (e) => {
                    // Don't close if clicking inside the dropdown or button
                    if (!dropdown.contains(e.target) && !button.contains(e.target)) {
                        dropdown.classList.remove('show');
                        button.classList.remove('active');
                        document.removeEventListener('click', this.weekSelectorCloseHandler);
                        this.weekSelectorCloseHandler = null;
                    }
                };
                document.addEventListener('click', this.weekSelectorCloseHandler);
            }, 0);
        } else {
            // Manually closing, remove the handler
            if (this.weekSelectorCloseHandler) {
                document.removeEventListener('click', this.weekSelectorCloseHandler);
                this.weekSelectorCloseHandler = null;
            }
        }
    }

    populateWeekSelector() {
        const listContainer = document.getElementById('weekCheckboxList');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        // Create checkbox for each week
        this.filteredTimelineData.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'week-checkbox-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `week-${index}`;
            checkbox.value = item.date;
            checkbox.onchange = () => this.onWeekCheckboxChange();

            const label = document.createElement('label');
            label.className = 'week-checkbox-label';
            label.htmlFor = `week-${index}`;

            const dateSpan = document.createElement('span');
            dateSpan.className = 'week-date';
            dateSpan.textContent = item.date;

            const statsSpan = document.createElement('span');
            statsSpan.className = 'week-stats';
            statsSpan.innerHTML = `
                <span class="week-stats-badge"><strong>${item.changeCount}</strong> changes</span>
                <span class="week-stats-badge"><strong>${item.addedIPs}</strong> IPs added</span>
                <span class="week-stats-badge"><strong>${item.removedIPs}</strong> IPs removed</span>
            `;

            label.appendChild(dateSpan);
            label.appendChild(statsSpan);

            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(label);
            listContainer.appendChild(itemDiv);
        });
    }

    onWeekCheckboxChange() {
        // Update selected weeks array (separate from compare mode)
        const checkboxes = document.querySelectorAll('#weekCheckboxList input[type="checkbox"]:checked');
        this.selectedWeeksForExport = Array.from(checkboxes).map(cb => cb.value);

        // Update button text
        const button = document.querySelector('[onclick*="toggleWeekSelector"]');
        if (button) {
            button.childNodes[0].textContent = `📅 Select Weeks (${this.selectedWeeksForExport.length}) `;
        }

        // Update export dropdown state
        this.updateExportDropdownState();
    }

    selectAllWeeks() {
        const checkboxes = document.querySelectorAll('#weekCheckboxList input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = true);
        this.onWeekCheckboxChange();
    }

    clearAllWeeks() {
        const checkboxes = document.querySelectorAll('#weekCheckboxList input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
        this.onWeekCheckboxChange();
    }

    closeWeekSelector() {
        const dropdown = document.getElementById('weekSelector');
        const button = document.querySelector('[onclick*="toggleWeekSelector"]');
        if (dropdown) dropdown.classList.remove('show');
        if (button) button.classList.remove('active');

        // Clean up the event listener
        if (this.weekSelectorCloseHandler) {
            document.removeEventListener('click', this.weekSelectorCloseHandler);
            this.weekSelectorCloseHandler = null;
        }
    }

    // Toggle export dropdown
    toggleExportDropdown(event) {
        event.stopPropagation();
        const dropdown = document.getElementById('exportDropdown');
        const button = event.currentTarget;

        // Update dropdown state based on active filters
        this.updateExportDropdownState();

        const isOpening = !dropdown.classList.contains('show');
        dropdown.classList.toggle('show');
        button.classList.toggle('active');

        // Close dropdown when clicking outside
        if (isOpening) {
            // Remove any existing handler first
            if (this.exportDropdownCloseHandler) {
                document.removeEventListener('click', this.exportDropdownCloseHandler);
            }

            setTimeout(() => {
                this.exportDropdownCloseHandler = (e) => {
                    // Don't close if clicking inside the dropdown or button
                    if (!dropdown.contains(e.target) && !button.contains(e.target)) {
                        dropdown.classList.remove('show');
                        button.classList.remove('active');
                        document.removeEventListener('click', this.exportDropdownCloseHandler);
                        this.exportDropdownCloseHandler = null;
                    }
                };
                document.addEventListener('click', this.exportDropdownCloseHandler);
            }, 0);
        } else {
            // Manually closing, remove the handler
            if (this.exportDropdownCloseHandler) {
                document.removeEventListener('click', this.exportDropdownCloseHandler);
                this.exportDropdownCloseHandler = null;
            }
        }
    }

    // Update export dropdown based on active filters
    updateExportDropdownState() {
        const searchTerm = document.getElementById('historySearch')?.value.toLowerCase() || '';
        const regionFilter = document.getElementById('regionFilter')?.value || '';
        const hasActiveFilters = searchTerm || regionFilter;
        const hasSelectedWeeks = this.selectedWeeksForExport && this.selectedWeeksForExport.length > 0;

        // Update Filtered JSON option
        const filteredOption = document.getElementById('exportFilteredOption');
        const filteredText = filteredOption?.querySelector('.dropdown-text strong');
        const filteredDescription = filteredOption?.querySelector('.dropdown-text small');

        if (filteredOption) {
            if (hasActiveFilters) {
                // Enable and update text
                filteredOption.disabled = false;
                filteredOption.style.opacity = '1';
                filteredOption.style.cursor = 'pointer';
                if (filteredText) {
                    filteredText.textContent = 'Export Filtered Data (JSON)';
                }
                if (filteredDescription) {
                    let desc = 'Export only what you see: ';
                    if (searchTerm && regionFilter) {
                        desc += `search "${searchTerm}" in ${getRegionDisplayName(regionFilter)}`;
                    } else if (searchTerm) {
                        desc += `search "${searchTerm}"`;
                    } else if (regionFilter) {
                        desc += `${getRegionDisplayName(regionFilter)} region`;
                    }
                    filteredDescription.textContent = desc;
                }
            } else {
                // Disable when no filters
                filteredOption.disabled = true;
                filteredOption.style.opacity = '0.5';
                filteredOption.style.cursor = 'not-allowed';
                if (filteredText) {
                    filteredText.textContent = 'Export Filtered Data (JSON)';
                }
                if (filteredDescription) {
                    filteredDescription.textContent = 'Apply a search or region filter first to use this option';
                }
            }
        }

        // Update CSV option (same requirements as filtered JSON)
        const csvOption = document.getElementById('exportCSVOption');
        const csvText = csvOption?.querySelector('.dropdown-text strong');
        const csvDescription = csvOption?.querySelector('.dropdown-text small');

        if (csvOption) {
            if (hasActiveFilters) {
                // Enable and update text
                csvOption.disabled = false;
                csvOption.style.opacity = '1';
                csvOption.style.cursor = 'pointer';
                if (csvDescription) {
                    let desc = 'Export detailed IP changes for: ';
                    if (searchTerm && regionFilter) {
                        desc += `search "${searchTerm}" in ${getRegionDisplayName(regionFilter)}`;
                    } else if (searchTerm) {
                        desc += `search "${searchTerm}"`;
                    } else if (regionFilter) {
                        desc += `${getRegionDisplayName(regionFilter)} region`;
                    }
                    csvDescription.textContent = desc;
                }
            } else {
                // Disable when no filters
                csvOption.disabled = true;
                csvOption.style.opacity = '0.5';
                csvOption.style.cursor = 'not-allowed';
                if (csvDescription) {
                    csvDescription.textContent = 'Apply a search or region filter first to use this option';
                }
            }
        }

        // Update Export Selected Weeks (JSON) option
        const selectedJSONOption = document.getElementById('exportSelectedJSON');
        const selectedJSONDescription = selectedJSONOption?.querySelector('.dropdown-text small');

        if (selectedJSONOption) {
            if (hasSelectedWeeks) {
                selectedJSONOption.disabled = false;
                selectedJSONOption.style.opacity = '1';
                selectedJSONOption.style.cursor = 'pointer';
                if (selectedJSONDescription) {
                    selectedJSONDescription.textContent = `Export complete data for ${this.selectedWeeksForExport.length} selected week${this.selectedWeeksForExport.length > 1 ? 's' : ''}`;
                }
            } else {
                selectedJSONOption.disabled = true;
                selectedJSONOption.style.opacity = '0.5';
                selectedJSONOption.style.cursor = 'not-allowed';
                if (selectedJSONDescription) {
                    selectedJSONDescription.textContent = 'Use "Select Weeks" to choose specific weeks first';
                }
            }
        }

        // Update Export Selected Weeks (CSV) option
        const selectedCSVOption = document.getElementById('exportSelectedCSV');
        const selectedCSVDescription = selectedCSVOption?.querySelector('.dropdown-text small');

        if (selectedCSVOption) {
            if (hasSelectedWeeks) {
                selectedCSVOption.disabled = false;
                selectedCSVOption.style.opacity = '1';
                selectedCSVOption.style.cursor = 'pointer';
                if (selectedCSVDescription) {
                    selectedCSVDescription.textContent = `Export detailed IP changes for ${this.selectedWeeksForExport.length} selected week${this.selectedWeeksForExport.length > 1 ? 's' : ''}`;
                }
            } else {
                selectedCSVOption.disabled = true;
                selectedCSVOption.style.opacity = '0.5';
                selectedCSVOption.style.cursor = 'not-allowed';
                if (selectedCSVDescription) {
                    selectedCSVDescription.textContent = 'Use "Select Weeks" to choose specific weeks first';
                }
            }
        }
    }

    closeExportDropdown() {
        const dropdown = document.getElementById('exportDropdown');
        const button = document.querySelector('.dropdown-toggle');
        if (dropdown) dropdown.classList.remove('show');
        if (button) button.classList.remove('active');
    }

    // Export filtered data (what user sees on screen)
    exportFilteredJSON() {
        this.closeExportDropdown();

        const searchTerm = document.getElementById('historySearch')?.value.toLowerCase() || '';
        const regionFilter = document.getElementById('regionFilter')?.value || '';

        // Prevent export if no filters are active
        if (!searchTerm && !regionFilter) {
            alert('⚠️ No filters applied!\n\nPlease use a search term or select a region filter first.\n\nTo export all data without filters, use "Export All Data (JSON)" instead.');
            return;
        }

        const dataToExport = {
            exported: new Date().toISOString(),
            filters: {
                search: searchTerm || null,
                region: regionFilter ? getRegionDisplayName(regionFilter) : null,
                dateRange: {
                    from: this.filteredTimelineData[this.filteredTimelineData.length - 1]?.date,
                    to: this.filteredTimelineData[0]?.date
                }
            },
            totalWeeks: this.filteredTimelineData.length,
            changes: []
        };

        // Process each week
        this.filteredTimelineData.forEach(item => {
            let matchedChanges = item.changes || [];

            // Filter by region
            if (regionFilter) {
                matchedChanges = matchedChanges.filter(change => change.region === regionFilter);
            }

            // Filter by search term
            if (searchTerm) {
                matchedChanges = matchedChanges.filter(change =>
                    (change.service && change.service.toLowerCase().includes(searchTerm)) ||
                    (change.region && change.region.toLowerCase().includes(searchTerm)) ||
                    (change.region && getRegionDisplayName(change.region).toLowerCase().includes(searchTerm))
                );
            }

            // Extract only the essential data
            matchedChanges.forEach(change => {
                const exportItem = {
                    date: item.date,
                    service: change.service,
                    region: change.region ? getRegionDisplayName(change.region) : null,
                    added: change.added_prefixes || [],
                    removed: change.removed_prefixes || []
                };

                // Only include if there are actual IP changes
                if (exportItem.added.length > 0 || exportItem.removed.length > 0) {
                    dataToExport.changes.push(exportItem);
                }
            });
        });

        dataToExport.totalChanges = dataToExport.changes.length;

        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const filterSuffix = regionFilter ? `-${regionFilter}` : (searchTerm ? '-filtered' : '-current-view');
        this.downloadFile(blob, `azure-service-tags-filtered${filterSuffix}-${this.getDateString()}.json`);
    }

    // Export selected weeks as JSON
    exportSelectedWeeksJSON() {
        this.closeExportDropdown();

        // Check if weeks are selected
        if (!this.selectedWeeksForExport || this.selectedWeeksForExport.length === 0) {
            alert('⚠️ No weeks selected!\n\nPlease use "Select Weeks" to choose specific weeks first.\n\nClick the "📅 Select Weeks" button and check the weeks you want to export.');
            return;
        }

        // Get data only for selected weeks
        const selectedData = this.filteredTimelineData.filter(item =>
            this.selectedWeeksForExport.includes(item.date)
        );

        const dataToExport = {
            exported: new Date().toISOString(),
            description: "Selected Azure Service Tags change history",
            selectedWeeks: this.selectedWeeksForExport.length,
            totalWeeks: this.filteredTimelineData.length,
            dateRange: {
                from: selectedData[selectedData.length - 1]?.date,
                to: selectedData[0]?.date
            },
            data: selectedData
        };

        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        this.downloadFile(blob, `azure-service-tags-selected-weeks-${this.getDateString()}.json`);
    }

    // Export selected weeks as CSV
    exportSelectedWeeksCSV() {
        this.closeExportDropdown();

        // Check if weeks are selected
        if (!this.selectedWeeksForExport || this.selectedWeeksForExport.length === 0) {
            alert('⚠️ No weeks selected!\n\nPlease use "Select Weeks" to choose specific weeks first.\n\nClick the "📅 Select Weeks" button and check the weeks you want to export.');
            return;
        }

        // CSV Header
        let csv = 'Date,Service,Region,Change Type,IP Address/Prefix\n';

        let rowCount = 0;
        const maxRows = 50000;

        // Process only selected weeks
        const selectedData = this.filteredTimelineData.filter(item =>
            this.selectedWeeksForExport.includes(item.date)
        );

        selectedData.forEach(item => {
            if (rowCount >= maxRows) return;

            const changes = item.changes || [];

            // Export each IP change as a separate row
            changes.forEach(change => {
                if (rowCount >= maxRows) return;

                const service = this.escapeCSV(change.service || 'N/A');
                const region = this.escapeCSV(change.region ? getRegionDisplayName(change.region) : 'Global');
                const date = item.date;

                // Added IPs
                if (change.added_prefixes && change.added_prefixes.length > 0) {
                    change.added_prefixes.forEach(ip => {
                        if (rowCount >= maxRows) return;
                        csv += `${date},${service},${region},Added,${this.escapeCSV(ip)}\n`;
                        rowCount++;
                    });
                }

                // Removed IPs
                if (change.removed_prefixes && change.removed_prefixes.length > 0) {
                    change.removed_prefixes.forEach(ip => {
                        if (rowCount >= maxRows) return;
                        csv += `${date},${service},${region},Removed,${this.escapeCSV(ip)}\n`;
                        rowCount++;
                    });
                }
            });
        });

        if (rowCount === 0) {
            alert('⚠️ No IP changes found in selected weeks!');
            return;
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        this.downloadFile(blob, `azure-service-tags-selected-weeks-${this.getDateString()}.csv`);

        console.log(`Exported ${rowCount} IP change records from ${selectedData.length} weeks to CSV`);
    }

    // Legacy function for backwards compatibility
    exportAllJSON() {
        this.exportSelectedWeeksJSON();
    }

    // Legacy export function (keeping for backwards compatibility)
    exportAsJSON() {
        // Default to filtered export
        this.exportFilteredJSON();
    }

    // Export as CSV with detailed IP changes
    exportAsCSV() {
        this.closeExportDropdown();

        const searchTerm = document.getElementById('historySearch')?.value.toLowerCase() || '';
        const regionFilter = document.getElementById('regionFilter')?.value || '';

        // Prevent export if no filters are active
        if (!searchTerm && !regionFilter) {
            alert('⚠️ No filters applied!\n\nPlease use a search term or select a region filter first.\n\nThis ensures you export only the data you need.');
            return;
        }

        // CSV Header
        let csv = 'Date,Service,Region,Change Type,IP Address/Prefix\n';

        let rowCount = 0;
        const maxRows = 50000; // Prevent massive files

        // Process each week
        this.filteredTimelineData.forEach(item => {
            if (rowCount >= maxRows) return;

            let matchedChanges = item.changes || [];

            // Filter by region
            if (regionFilter) {
                matchedChanges = matchedChanges.filter(change => change.region === regionFilter);
            }

            // Filter by search term
            if (searchTerm) {
                matchedChanges = matchedChanges.filter(change =>
                    (change.service && change.service.toLowerCase().includes(searchTerm)) ||
                    (change.region && change.region.toLowerCase().includes(searchTerm)) ||
                    (change.region && getRegionDisplayName(change.region).toLowerCase().includes(searchTerm))
                );
            }

            // Export each IP change as a separate row
            matchedChanges.forEach(change => {
                if (rowCount >= maxRows) return;

                const service = this.escapeCSV(change.service || 'N/A');
                const region = this.escapeCSV(change.region ? getRegionDisplayName(change.region) : 'Global');
                const date = item.date;

                // Added IPs
                if (change.added_prefixes && change.added_prefixes.length > 0) {
                    change.added_prefixes.forEach(ip => {
                        if (rowCount >= maxRows) return;
                        csv += `${date},${service},${region},Added,${this.escapeCSV(ip)}\n`;
                        rowCount++;
                    });
                }

                // Removed IPs
                if (change.removed_prefixes && change.removed_prefixes.length > 0) {
                    change.removed_prefixes.forEach(ip => {
                        if (rowCount >= maxRows) return;
                        csv += `${date},${service},${region},Removed,${this.escapeCSV(ip)}\n`;
                        rowCount++;
                    });
                }
            });
        });

        if (rowCount === 0) {
            alert('⚠️ No data to export!\n\nThe current filters don\'t match any IP changes.');
            return;
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const filterSuffix = regionFilter ? `-${regionFilter}` : (searchTerm ? '-filtered' : '');
        this.downloadFile(blob, `azure-service-tags-details${filterSuffix}-${this.getDateString()}.csv`);

        console.log(`Exported ${rowCount} IP change records to CSV`);
    }

    // Helper to escape CSV fields
    escapeCSV(field) {
        if (field === null || field === undefined) return '';
        const str = String(field);
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }

    // Export summary
    exportSummary() {
        const summary = {
            generated: new Date().toISOString(),
            totalWeeks: this.filteredTimelineData.length,
            totalChanges: this.filteredTimelineData.reduce((sum, item) => sum + item.changeCount, 0),
            totalIPChanges: this.filteredTimelineData.reduce((sum, item) => sum + item.totalIPChanges, 0),
            averageChangesPerWeek: (this.filteredTimelineData.reduce((sum, item) => sum + item.changeCount, 0) / this.filteredTimelineData.length).toFixed(2),
            dateRange: {
                from: this.filteredTimelineData[this.filteredTimelineData.length - 1]?.date,
                to: this.filteredTimelineData[0]?.date
            }
        };

        const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
        this.downloadFile(blob, `azure-service-tags-summary-${this.getDateString()}.json`);
    }

    // Download file helper
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Get date string for filename
    getDateString() {
        return new Date().toISOString().split('T')[0];
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
