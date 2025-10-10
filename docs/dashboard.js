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
        this.renderRecentChanges();

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

        // Calculate all active services from changes data
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

        // Convert to array and sort by change count
        const allServices = Object.entries(serviceCounts)
            .map(([service, count]) => ({
                service,
                change_count: count,
                ip_added: serviceIPCounts[service].added,
                ip_removed: serviceIPCounts[service].removed,
                net_ip_change: serviceIPCounts[service].added - serviceIPCounts[service].removed
            }))
            .sort((a, b) => b.change_count - a.change_count);

        if (allServices.length === 0) {
            container.innerHTML = '<p>No service activity data available</p>';
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
            const netChange = service.net_ip_change;

            // Determine status based on both additions and removals
            let ipIndicator;
            if (service.ip_added > 0 && service.ip_removed > 0) {
                // Mixed changes - both additions and removals
                ipIndicator = `🟡 ±${Math.abs(netChange).toLocaleString()} (+${service.ip_added.toLocaleString()} -${service.ip_removed.toLocaleString()})`;
            } else if (netChange > 0) {
                // Only additions
                ipIndicator = `🟢 +${netChange.toLocaleString()}`;
            } else if (netChange < 0) {
                // Only removals
                ipIndicator = `🔴 ${netChange.toLocaleString()}`;
            } else {
                // No net change
                ipIndicator = '⚪ 0';
            }

            return `
                <div class="service-rank-item" onclick="dashboard.showServiceDetails('${service.service.replace(/'/g, "\\'")}')">
                    <div class="rank-number">${actualRank}</div>
                    <div class="service-details">
                        <div class="service-name">${service.service}</div>
                        <div class="change-count">
                            ${service.change_count} change${service.change_count !== 1 ? 's' : ''} • ${ipIndicator} IPs
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
            regionalContainer.innerHTML = '<p>No regional change data available</p>';
            return;
        }

        // Sort regions alphabetically (Global first, then alphabetical)
        const sortedRegions = Object.entries(regionalData)
            .sort(([a], [b]) => {
                // Put "Global" (empty string) first
                if (!a && b) return -1;
                if (a && !b) return 1;
                if (!a && !b) return 0;
                // Then sort alphabetically
                return a.localeCompare(b);
            });

        // Filter to only show regions with more than 3 changes
        const significantRegions = sortedRegions.filter(([region, count]) => count > 3);

        if (significantRegions.length === 0) {
            regionalContainer.innerHTML = `
                <h3>🗺️ Most Impacted Regions</h3>
                <p>No regions with significant changes (more than 3 services) this week</p>
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
            <h3>🗺️ Most Impacted Regions</h3>
            <div class="regions-list">
                ${regionsHtml}
            </div>
            <div class="region-help">
                💡 Showing regions with more than 3 service changes
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

    renderRecentChanges() {
        const changesContainer = document.getElementById('recentChanges');
        const changes = this.changesData.changes || [];

        if (!changesContainer) {
            console.error('recentChanges container not found!');
            return;
        }

        if (changes.length === 0) {
            changesContainer.innerHTML = `
                <div class="change-item">
                    <div class="change-header">
                        <div class="change-service">✨ No Changes This Week</div>
                    </div>
                    <div class="change-details">
                        All Azure service tags remain unchanged since the last update.
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

    renderChangeItem(change) {
        const changeTypeClass = change.type.replace('_', '-');
        const changeTypeLabel = this.formatChangeType(change.type);

        let detailsHtml = '';

        if (change.type === 'ip_changes') {
            const regionDisplay = change.region && change.region.trim() !== ''
                ? getRegionDisplayName(change.region)
                : '🌐 Global';

            detailsHtml = `
                <div class="change-details">
                    <strong>Region:</strong> ${regionDisplay}
                    ${change.system_service ? ` | <strong>System Service:</strong> ${change.system_service}` : ''}
                </div>
                <div class="ip-change-summary">
                    ${change.added_count > 0 ?
                    `<span class="ip-added">+${change.added_count} IP ranges added</span>` : ''}
                    ${change.removed_count > 0 ?
                    `<span class="ip-removed">-${change.removed_count} IP ranges removed</span>` : ''}
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
            alert('No changes detected this week');
            return;
        }

        this.showChangesModal('All Changes This Week', changes, 'all');
    }

    showRegionChanges() {
        const changes = this.changesData.changes || [];
        const ipChanges = changes.filter(change => change.type === 'ip_changes');

        if (ipChanges.length === 0) {
            alert('No region changes detected this week');
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

        const statsHtml = this.generateChangeStats(changes, type);

        modal.innerHTML = `
            <div class="changes-modal">
                <div class="changes-modal-header">
                    <h3>📊 ${title}</h3>
                    <div class="changes-modal-stats">
                        ${statsHtml}
                    </div>
                    <button onclick="this.closest('.changes-modal-overlay').remove()" class="close-modal-btn">&times;</button>
                </div>
                <div class="changes-modal-body">
                    <div class="search-section">
                        <input type="text" 
                               id="changesSearch" 
                               placeholder="🔍 Search by service name, region, or IP address..." 
                               class="changes-search-input"
                               oninput="dashboard.filterChanges(this.value)">
                        <div class="search-results-count" id="searchResultsCount">Showing ${Math.min(displayLimit, changes.length)} of ${changes.length.toLocaleString()} changes</div>
                    </div>
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

        // Store data for filtering
        modal.allChanges = changes;
        modal.displayLimit = displayLimit;

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
                        <h4>Click a region to see services that changed:</h4>
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
                            <span class="breakdown-label">Net change</span>
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
                                <strong>Added IPs:</strong>
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
                                <strong>Removed IPs:</strong>
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
                        ${addedIPs.length > 0 ? `<button class="copy-ips-btn" onclick="dashboard.copyIPsToClipboard(${JSON.stringify(addedIPs).replace(/"/g, '&quot;')}, 'added IPs for ${change.service}')">📋 Copy</button>` : ''}
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
                        ${removedIPs.length > 0 ? `<button class="copy-ips-btn" onclick="dashboard.copyIPsToClipboard(${JSON.stringify(removedIPs).replace(/"/g, '&quot;')}, 'removed IPs for ${change.service}')">📋 Copy</button>` : ''}
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

    copyIPsToClipboard(ips, description) {
        const text = ips.join('\n');
        navigator.clipboard.writeText(text).then(() => {
            // Show temporary feedback
            const feedback = document.createElement('div');
            feedback.textContent = `✅ Copied ${ips.length} ${description}`;
            feedback.style.cssText = `
                position: fixed; top: 20px; right: 20px; 
                background: #28a745; color: white; 
                padding: 10px 15px; border-radius: 5px; 
                z-index: 10001; font-size: 14px;
            `;
            document.body.appendChild(feedback);
            setTimeout(() => feedback.remove(), 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
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
