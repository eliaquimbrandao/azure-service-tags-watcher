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
        console.log('All modals hidden on initialization');
    }

    async loadData() {
        const loadingEl = document.getElementById('loadingState');
        loadingEl.classList.remove('hidden');

        try {
            // Load all required data files
            const [currentResponse, summaryResponse, changesResponse] = await Promise.all([
                fetch('./data/current.json'),
                fetch('./data/summary.json'),
                fetch('./data/changes/latest-changes.json')
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

            console.log('Data loaded successfully', {
                services: this.currentData.values?.length,
                changes: this.changesData.total_changes
            });

        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        } finally {
            loadingEl.classList.add('hidden');
        }
    }

    renderDashboard() {
        const dashboardEl = document.getElementById('dashboard');
        dashboardEl.classList.remove('hidden');

        this.renderStats();
        this.renderLastUpdated();
        this.renderCharts();
        this.renderRecentChanges();
        this.setupSearch();
    }

    renderStats() {
        // Update stat cards
        document.getElementById('totalServices').textContent =
            this.summaryData.total_services?.toLocaleString() || '0';

        document.getElementById('totalIPRanges').textContent =
            this.summaryData.total_ip_ranges?.toLocaleString() || '0';

        document.getElementById('changesThisWeek').textContent =
            this.summaryData.changes_this_week?.toLocaleString() || '0';

        document.getElementById('ipChanges').textContent =
            this.summaryData.ip_changes?.toLocaleString() || '0';

        // Update hero stats
        document.getElementById('heroTotalServices').textContent =
            this.summaryData.total_services?.toLocaleString() || '...';

        document.getElementById('heroTotalRanges').textContent =
            this.summaryData.total_ip_ranges?.toLocaleString() || '...';

        // Calculate actual region count from regional data
        const regionalData = this.summaryData.regional_changes || {};
        const regionCount = Object.keys(regionalData).length;
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
        const ctx = document.getElementById('activeServicesChart').getContext('2d');
        const topServices = this.summaryData.top_active_services || [];

        if (topServices.length === 0) {
            ctx.canvas.parentElement.innerHTML = '<p>No service activity data available</p>';
            return;
        }

        // Destroy existing chart if it exists
        if (this.activeServicesChart) {
            this.activeServicesChart.destroy();
        }

        this.activeServicesChart = new Chart(ctx, {
            type: 'horizontalBar',
            data: {
                labels: topServices.map(s => this.truncateServiceName(s.service)),
                datasets: [{
                    label: 'IP Range Changes',
                    data: topServices.map(s => s.change_count),
                    backgroundColor: 'rgba(0, 120, 212, 0.6)',
                    borderColor: 'rgba(0, 120, 212, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function (tooltipItems) {
                                const index = tooltipItems[0].dataIndex;
                                return topServices[index].service;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    renderRegionalList() {
        const regionalContainer = document.getElementById('regionalChart').parentElement;
        const regionalData = this.summaryData.regional_changes || {};

        console.log(`Regional data entries: ${Object.keys(regionalData).length}`);

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

        // Create interactive regional list
        const regionsHtml = sortedRegions.map(([region, count]) => {
            const displayName = getRegionDisplayName(region);

            return `
                <div class="region-item" data-region="${region}" onclick="dashboard.showRegionChanges('${region}', '${displayName}', ${count})">
                    <div class="region-info">
                        <span class="region-name">${displayName}</span>
                    </div>
                    <div class="region-count">
                        <span class="change-badge">${count}</span>
                    </div>
                </div>
            `;
        }).join(''); regionalContainer.innerHTML = `
            <h3>🗺️ Changes by Region</h3>
            <div class="regions-list">
                ${regionsHtml}
            </div>
            <div class="region-help">
                💡 Click on a region to see its specific changes
            </div>
        `;
    }

    showRegionChanges(region, displayName, changeCount) {
        const changes = this.changesData.changes || [];
        const regionChanges = changes.filter(change =>
            (change.region || '') === region
        );

        if (regionChanges.length === 0) {
            alert(`No detailed changes available for ${displayName}`);
            return;
        }

        // Create modal content
        const changesHtml = regionChanges.slice(0, 20).map(change => {
            return this.renderChangeItem(change);
        }).join('');

        const modalContent = `
            <div class="region-modal">
                <div class="region-modal-header">
                    <h3>🗺️ ${displayName}</h3>
                    <p>${changeCount} total changes</p>
                    <button onclick="dashboard.closeRegionModal()" class="close-modal-btn">&times;</button>
                </div>
                <div class="region-modal-body">
                    ${changesHtml}
                    ${regionChanges.length > 20 ? `<p><strong>... and ${regionChanges.length - 20} more changes</strong></p>` : ''}
                </div>
            </div>
        `;

        // Show modal
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'region-modal-overlay';
        modalOverlay.innerHTML = modalContent;
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) {
                this.closeRegionModal();
            }
        };

        document.body.appendChild(modalOverlay);
        this.currentModal = modalOverlay;
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

        console.log(`Rendering ${changes.length} changes`);

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

        // Limit to first 10 changes for better performance
        const displayLimit = 10;

        // Safety check for very large datasets
        if (changes.length > 5000) {
            changesContainer.innerHTML = `
                <div class="change-item">
                    <div class="change-header">
                        <div class="change-service">🚀 Initial Data Load Complete</div>
                    </div>
                    <div class="change-details">
                        Successfully loaded ${changes.length.toLocaleString()} Azure service tags in the initial setup.
                        <br><br>
                        <strong>Future updates will show incremental changes only.</strong>
                        <br>
                        <a href="./data/changes/latest-changes.json" target="_blank" style="color: var(--primary-color);">📄 View complete data file</a>
                    </div>
                </div>
            `;
            return;
        }

        const displayChanges = changes.slice(0, displayLimit);

        const changesHtml = displayChanges.map(change => {
            return this.renderChangeItem(change);
        }).join('');

        changesContainer.innerHTML = changesHtml;

        if (changes.length > displayLimit) {
            const remainingChanges = changes.length - displayLimit;
            changesContainer.innerHTML += `
                <div class="change-item">
                    <div class="change-details">
                        <strong>📊 Showing ${displayLimit} of ${changes.length.toLocaleString()} total changes</strong>
                        <br>
                        ${remainingChanges >= 1000 ?
                    `This appears to be an initial data load with ${changes.length.toLocaleString()} service additions.` :
                    `... and ${remainingChanges.toLocaleString()} more changes.`
                }
                        <br>
                        <a href="./data/changes/latest-changes.json" target="_blank" style="color: var(--primary-color);">📄 View complete data file</a>
                    </div>
                </div>
            `;
        }
    }

    renderChangeItem(change) {
        const changeTypeClass = change.type.replace('_', '-');
        const changeTypeLabel = this.formatChangeType(change.type);

        let detailsHtml = '';

        if (change.type === 'ip_changes') {
            detailsHtml = `
                <div class="change-details">
                    <strong>Region:</strong> ${getRegionDisplayName(change.region)} | 
                    <strong>System Service:</strong> ${change.system_service || 'N/A'}
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

    setupSearch() {
        const searchInput = document.getElementById('serviceSearch');
        const clearButton = document.getElementById('clearSearch');
        const resultsContainer = document.getElementById('searchResults');

        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value, resultsContainer);
            }, 300);
        });

        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            resultsContainer.innerHTML = '';
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                resultsContainer.innerHTML = '';
            }
        });
    }

    performSearch(query, resultsContainer) {
        if (!query || query.length < 2) {
            resultsContainer.innerHTML = '';
            return;
        }

        const services = this.currentData.values || [];
        const lowerQuery = query.toLowerCase();

        const matches = services.filter(service =>
            service.name.toLowerCase().includes(lowerQuery) ||
            (service.properties?.region &&
                service.properties.region.toLowerCase().includes(lowerQuery)) ||
            (service.properties?.systemService &&
                service.properties.systemService.toLowerCase().includes(lowerQuery))
        ).slice(0, 50);

        if (matches.length === 0) {
            resultsContainer.innerHTML = '<p>No services found matching your search.</p>';
            return;
        }

        const resultsHtml = matches.map(service => {
            const props = service.properties || {};
            const ipCount = props.addressPrefixes?.length || 0;

            return `
                <div class="service-item" onclick="dashboard.showServiceDetails('${service.name}')">
                    <div class="service-name">${service.name}</div>
                    <div class="service-details">
                        Region: ${getRegionDisplayName(props.region)} | 
                        System Service: ${props.systemService || 'N/A'} | 
                        IP Ranges: ${ipCount}
                    </div>
                </div>
            `;
        }).join('');

        resultsContainer.innerHTML = resultsHtml;
    }

    showServiceDetails(serviceName) {
        // Validate inputs
        if (!serviceName || !this.currentData || !this.currentData.values) {
            console.warn('Invalid service name or data not loaded');
            return;
        }

        const service = this.currentData.values.find(s => s.name === serviceName);
        if (!service) {
            console.warn('Service not found:', serviceName);
            return;
        }

        const modal = document.getElementById('serviceModal');
        if (!modal) {
            console.error('Service modal not found in DOM');
            return;
        }

        const props = service.properties || {};

        // Update modal content
        const elements = {
            modalServiceName: serviceName,
            modalRegion: getRegionDisplayName(props.region),
            modalSystemService: props.systemService || 'N/A',
            modalIPCount: (props.addressPrefixes?.length || 0).toLocaleString()
        };

        // Safely update each element
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });

        // Update IP ranges
        const ipRangesElement = document.getElementById('modalIPRanges');
        if (ipRangesElement) {
            const ipRanges = props.addressPrefixes || [];
            const ipRangesHtml = ipRanges.length > 0 ?
                ipRanges.map(ip => `<div>${ip}</div>`).join('') :
                '<div>No IP ranges available</div>';
            ipRangesElement.innerHTML = ipRangesHtml;
        }

        // Show modal
        modal.classList.remove('hidden');
        console.log('Service modal opened for:', serviceName);
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
                console.log('Close button clicked');
                if (modal) {
                    modal.classList.add('hidden');
                }
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    console.log('Modal backdrop clicked');
                    modal.classList.add('hidden');
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                console.log('Escape key pressed');
                modal.classList.add('hidden');
            }
        });

        // Add a global close function for debugging
        window.closeServiceModal = () => {
            if (modal) {
                modal.classList.add('hidden');
                console.log('Modal closed via global function');
            }
        };
    }

    showError(error) {
        console.error('Dashboard error:', error);
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('errorState').classList.remove('hidden');
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
});

// Make dashboard globally accessible for onclick handlers
window.dashboard = dashboard;