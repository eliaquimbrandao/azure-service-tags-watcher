/**
 * Azure Service Tags Dashboard
 * Interactive dashboard for monitoring Azure service tag changes
 */

class AzureServiceTagsDashboard {
    constructor() {
        this.currentData = null;
        this.summaryData = null;
        this.changesData = null;
        this.filteredServices = [];

        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.renderDashboard();
            this.setupEventListeners();
        } catch (error) {
            this.showError(error);
        }
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
    }

    renderLastUpdated() {
        const lastUpdated = this.summaryData.last_updated;
        if (lastUpdated) {
            const date = new Date(lastUpdated);
            document.getElementById('lastUpdated').textContent =
                date.toLocaleString();
        }
    }

    renderCharts() {
        this.renderActiveServicesChart();
        this.renderRegionalChart();
    }

    renderActiveServicesChart() {
        const ctx = document.getElementById('activeServicesChart').getContext('2d');
        const topServices = this.summaryData.top_active_services || [];

        if (topServices.length === 0) {
            ctx.canvas.parentElement.innerHTML = '<p>No service activity data available</p>';
            return;
        }

        new Chart(ctx, {
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

    renderRegionalChart() {
        const ctx = document.getElementById('regionalChart').getContext('2d');
        const regionalData = this.summaryData.regional_changes || {};

        if (Object.keys(regionalData).length === 0) {
            ctx.canvas.parentElement.innerHTML = '<p>No regional change data available</p>';
            return;
        }

        const sortedRegions = Object.entries(regionalData)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: sortedRegions.map(([region]) => region || 'Global'),
                datasets: [{
                    data: sortedRegions.map(([, count]) => count),
                    backgroundColor: [
                        '#0078d4', '#106ebe', '#005a9e', '#004578',
                        '#003152', '#107c10', '#498205', '#107c10',
                        '#ff8c00', '#d13438'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderRecentChanges() {
        const changesContainer = document.getElementById('recentChanges');
        const changes = this.changesData.changes || [];

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

        const changesHtml = changes.slice(0, 20).map(change => {
            return this.renderChangeItem(change);
        }).join('');

        changesContainer.innerHTML = changesHtml;

        if (changes.length > 20) {
            changesContainer.innerHTML += `
                <div class="change-item">
                    <div class="change-details">
                        ... and ${changes.length - 20} more changes. 
                        <a href="./data/changes/latest-changes.json" target="_blank">View full data</a>
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
                    <strong>Region:</strong> ${change.region || 'Global'} | 
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
                    <strong>Region:</strong> ${change.region || 'Global'} | 
                    <strong>IP Ranges:</strong> ${change.ip_count} | 
                    <strong>System Service:</strong> ${change.system_service || 'N/A'}
                </div>
            `;
        } else if (change.type === 'service_removed') {
            detailsHtml = `
                <div class="change-details">
                    <strong>Region:</strong> ${change.region || 'Global'} | 
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
                        Region: ${props.region || 'Global'} | 
                        System Service: ${props.systemService || 'N/A'} | 
                        IP Ranges: ${ipCount}
                    </div>
                </div>
            `;
        }).join('');

        resultsContainer.innerHTML = resultsHtml;
    }

    showServiceDetails(serviceName) {
        const service = this.currentData.values.find(s => s.name === serviceName);
        if (!service) return;

        const modal = document.getElementById('serviceModal');
        const props = service.properties || {};

        document.getElementById('modalServiceName').textContent = serviceName;
        document.getElementById('modalRegion').textContent = props.region || 'Global';
        document.getElementById('modalSystemService').textContent = props.systemService || 'N/A';
        document.getElementById('modalIPCount').textContent =
            (props.addressPrefixes?.length || 0).toLocaleString();

        const ipRanges = props.addressPrefixes || [];
        const ipRangesHtml = ipRanges.length > 0 ?
            ipRanges.map(ip => `<div>${ip}</div>`).join('') :
            '<div>No IP ranges available</div>';

        document.getElementById('modalIPRanges').innerHTML = ipRangesHtml;

        modal.classList.remove('hidden');
    }

    setupEventListeners() {
        // Modal close events
        const modal = document.getElementById('serviceModal');
        const closeBtn = document.getElementById('closeModal');

        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modal.classList.add('hidden');
            }
        });
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