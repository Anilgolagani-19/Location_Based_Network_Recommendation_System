// Dashboard Controller Module
// Main controller that coordinates all dashboard components

class DashboardController {
    constructor() {
        this.isInitialized = false;
        this.filterElements = {};
        this.profileDropdownActive = false;
    }

    // Initialize the dashboard
    async initialize() {


        // Show loading state
        this.showLoading();

        try {
            // Load data
            const loaded = await dataProcessor.loadData();

            if (!loaded) {
                this.showError('Failed to load data. Please refresh the page.');
                return;
            }

            // Initialize filter elements
            this.initializeFilters();

            // Check if we should attempt location detection (mobile only, no saved filters)
            const shouldDetectLocation = locationService.isMobileDevice() &&
                !localStorage.getItem('dashboardFilters') &&
                !window.location.search;

            if (shouldDetectLocation) {
                // Attempt location detection
                await this.initializeLocationDetection();
            } else {
                // Handle URL Parameters (from user-filters.html)
                this.handleUrlParameters();

                // Initialize all components
                mapManager.initializeMap();
                chartManager.initializeCharts();
                tableManager.initializeTable();

                // Initial data load
                this.updateDashboard();

                // Setup profile dropdown toggle
                this.setupProfileDropdown();

                this.isInitialized = true;
            }

        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showError('An error occurred while initializing the dashboard.');
        }
    }

    // Initialize filter dropdowns
    initializeFilters() {
        // Get filter elements
        this.filterElements = {
            state: document.getElementById('filter-state'),
            city: document.getElementById('filter-city'),
            area: document.getElementById('filter-area'),
            network: document.getElementById('filter-network'),
            pincode: document.getElementById('filter-pincode'),
            metric: document.getElementById('filter-metric'),
            pincodeSearch: document.getElementById('pincodeSearch')
        };

        // Populate filter options
        this.populateStateFilter();
        this.populateNetworkFilter();

        // Initialize Pincode Search
        this.initPincodeSearch();

        // Helper to save filters
        const saveFilters = () => {
            localStorage.setItem('dashboardFilters', JSON.stringify(dataProcessor.filters));
        };

        // Add event listeners with safety checks
        if (this.filterElements.state) {
            this.filterElements.state.addEventListener('change', (e) => {
                dataProcessor.updateFilter('state', e.target.value);
                this.populateCityFilter();
                this.updateDashboard();
                saveFilters();
            });
        }

        if (this.filterElements.city) {
            this.filterElements.city.addEventListener('change', (e) => {
                dataProcessor.updateFilter('city', e.target.value);
                this.populateAreaFilter();
                this.updateDashboard();
                saveFilters();
            });
        }

        if (this.filterElements.area) {
            this.filterElements.area.addEventListener('change', (e) => {
                dataProcessor.updateFilter('area', e.target.value);
                this.updateDashboard();
                saveFilters();
            });
        }

        if (this.filterElements.network) {
            this.filterElements.network.addEventListener('change', (e) => {
                dataProcessor.updateFilter('network', e.target.value);
                this.updateDashboard();
                saveFilters();
            });
        }

        if (this.filterElements.pincode) {
            this.filterElements.pincode.addEventListener('change', (e) => {
                dataProcessor.updateFilter('pincode', e.target.value);

                // Sync UI for bidirectional flow
                if (e.target.value !== 'All') {
                    if (this.filterElements.state) this.filterElements.state.value = dataProcessor.filters.state;
                    this.populateCityFilter(); // Repopulate and then set value
                    if (this.filterElements.city) this.filterElements.city.value = dataProcessor.filters.city;
                    this.populateAreaFilter();
                    if (this.filterElements.area) this.filterElements.area.value = dataProcessor.filters.area;
                }

                this.updateDashboard();
                saveFilters();
            });
        }

        if (this.filterElements.metric) {
            this.filterElements.metric.addEventListener('change', (e) => {
                this.updateDashboard();
            });
        }
    }

    // Initialize real-time pincode search
    initPincodeSearch() {
        if (this.filterElements.pincodeSearch && this.filterElements.pincode) {
            this.filterElements.pincodeSearch.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const area = dataProcessor.filters.area;
                const pincodes = dataProcessor.getPincodesForArea(area);
                const filtered = pincodes.filter(p => p.toString().includes(term));
                this.populateDropdown(this.filterElements.pincode, filtered, 'All Pincodes');
            });
        }
    }

    // Handle incoming URL parameters from the filter landing page
    handleUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const params = ['state', 'city', 'area', 'network', 'pincode'];
        let hasParams = false;

        params.forEach(param => {
            const val = urlParams.get(param);
            if (val) {
                dataProcessor.updateFilter(param, val);
                if (this.filterElements[param]) {
                    this.filterElements[param].value = val;
                }
                hasParams = true;
            }
        });

        if (hasParams) {
            // Save initial URL params to localStorage so they persist on refresh
            localStorage.setItem('dashboardFilters', JSON.stringify(dataProcessor.filters));

            this.populateCityFilter();
            if (this.filterElements.pincodeSearch) {
                this.filterElements.pincodeSearch.value = '';
            }
            this.populateAreaFilter();

            // Re-sync UI values
            params.forEach(param => {
                const val = urlParams.get(param);
                if (val && this.filterElements[param]) {
                    this.filterElements[param].value = val;
                }
            });
        } else {
            // Check localStorage if no URL params
            const savedFilters = localStorage.getItem('dashboardFilters');
            if (savedFilters) {
                try {
                    const parsed = JSON.parse(savedFilters);
                    // Apply saved filters
                    Object.keys(parsed).forEach(key => {
                        dataProcessor.updateFilter(key, parsed[key]);
                        if (this.filterElements[key]) {
                            this.filterElements[key].value = parsed[key];
                        }
                    });

                    // Trigger populations to ensure dependent dropdowns are correct
                    this.populateCityFilter();
                    if (this.filterElements.city && parsed.city) this.filterElements.city.value = parsed.city;

                    this.populateAreaFilter();
                    if (this.filterElements.area && parsed.area) this.filterElements.area.value = parsed.area;

                } catch (e) {
                    console.error("Failed to load saved filters", e);
                }
            }
        }
    }

    // Initialize location detection for mobile users
    async initializeLocationDetection() {
        console.log('[Dashboard] Starting location detection...');

        // Show detecting state
        this.showLocationMessage('detecting');

        try {
            // Attempt to detect and match location
            const result = await locationService.detectAndMatchLocation(dataProcessor);

            if (result.success) {
                // Location detected and matched
                console.log('[Dashboard] Location matched:', result.location);

                // Apply filters
                Object.keys(result.location).forEach(key => {
                    dataProcessor.updateFilter(key, result.location[key]);
                    if (this.filterElements[key]) {
                        this.filterElements[key].value = result.location[key];
                    }
                });

                // Save to localStorage
                localStorage.setItem('dashboardFilters', JSON.stringify(result.location));

                // Show success message briefly
                this.showLocationMessage('success', result.detectedLocation);

                // Hide overlay and show dashboard after 2 seconds
                setTimeout(() => {
                    this.hideLocationOverlay();
                    this.finalizeDashboardInitialization();
                }, 2000);

            } else {
                // Handle different error types
                if (result.error === 'permission_denied') {
                    this.showLocationMessage('permission_denied');
                } else if (result.error === 'incomplete_detection') {
                    // GPS detected but couldn't get city from geocoding
                    this.showLocationMessage('incomplete_detection');
                } else if (result.error === 'city_not_available') {
                    // City detected but not in database
                    this.showLocationMessage('city_not_available', result.detectedLocation);
                } else if (result.error === 'incomplete_data' || result.error === 'city_data_not_available') {
                    // City found but area/pincode not available
                    this.showLocationMessage('incomplete_data', result.detectedLocation, result.matchedCity, result.missingFields);
                } else {
                    // Generic error
                    this.showLocationMessage('error');
                }
            }

        } catch (error) {
            console.error('[Dashboard] Location detection failed:', error);
            this.showLocationMessage('error');
        }
    }

    // Finalize dashboard initialization (after location detection or skip)
    finalizeDashboardInitialization() {
        // Handle URL Parameters (from user-filters.html)
        this.handleUrlParameters();

        // Initialize all components
        mapManager.initializeMap();
        chartManager.initializeCharts();
        tableManager.initializeTable();

        // Initial data load
        this.updateDashboard();

        // Setup profile dropdown toggle
        this.setupProfileDropdown();

        this.isInitialized = true;
    }

    // Show location message overlay
    showLocationMessage(state, locationInfo = null, matchedCity = null, missingFields = null) {
        const overlay = document.getElementById('locationOverlay');
        const card = document.getElementById('locationMessageCard');

        if (!overlay || !card) return;

        // Remove all state classes
        card.className = 'location-message-card';
        card.classList.add(`location-state-${state}`);

        let content = '';

        switch (state) {
            case 'detecting':
                content = `
                    <div class="location-spinner"></div>
                    <h2 class="location-message-title">Detecting Your Location</h2>
                    <p class="location-message-text">Please allow location access to view network data for your area.</p>
                `;
                break;

            case 'permission_denied':
                content = `
                    <div class="location-icon">🔒</div>
                    <h2 class="location-message-title">Location Access Required</h2>
                    <p class="location-message-text">Please enable location access to view location-based dashboard data.</p>
                    <button class="location-btn" onclick="dashboardController.retryLocationDetection()">
                        <i class="bi bi-arrow-clockwise"></i> Try Again
                    </button>
                    <button class="location-btn secondary" onclick="dashboardController.skipToManualSelection()">
                        Select Manually
                    </button>
                `;
                break;

            case 'incomplete_detection':
                content = `
                    <div class="location-icon">⚠️</div>
                    <h2 class="location-message-title">Unable to Detect Complete Location Details</h2>
                    <p class="location-message-text">We couldn't determine your city from GPS. Please try again.</p>
                    <button class="location-btn" onclick="dashboardController.retryLocationDetection()">
                        <i class="bi bi-arrow-clockwise"></i> Retry
                    </button>
                    <button class="location-btn secondary" onclick="dashboardController.skipToManualSelection()">
                        Select Manually
                    </button>
                `;
                break;

            case 'city_not_available':
                const cityName = locationInfo ? locationInfo.city : 'your location';
                content = `
                    <div class="location-icon">📍</div>
                    <h2 class="location-message-title">Service Not Available</h2>
                    <p class="location-message-text">We detected you're in ${cityName}, but our service is not available in your area yet.</p>
                    <button class="location-btn" onclick="dashboardController.skipToManualSelection()">
                        Select Different Location
                    </button>
                `;
                break;

            case 'incomplete_data':
                const detectedCityName = locationInfo ? locationInfo.city : matchedCity || 'your city';
                const missing = missingFields && missingFields.length > 0 ? missingFields.join(' or ') : 'area or pincode';
                content = `
                    <div class="location-icon">📊</div>
                    <h2 class="location-message-title">Data Not Available</h2>
                    <p class="location-message-text">We found ${detectedCityName}, but data for your ${missing} is not available in our database.</p>
                    <p class="location-message-text" style="font-size: 0.9rem; margin-top: 0.5rem; opacity: 0.8;">Dashboard requires complete location data (city + area + pincode) to display analytics.</p>
                    <button class="location-btn" onclick="dashboardController.skipToManualSelection()">
                        Select Different Location
                    </button>
                `;
                break;

            case 'error':
                content = `
                    <div class="location-icon">⚠️</div>
                    <h2 class="location-message-title">Unable to Detect Location</h2>
                    <p class="location-message-text">We couldn't detect your location. Please try again or select manually.</p>
                    <button class="location-btn" onclick="dashboardController.retryLocationDetection()">
                        <i class="bi bi-arrow-clockwise"></i> Retry
                    </button>
                    <button class="location-btn secondary" onclick="dashboardController.skipToManualSelection()">
                        Select Manually
                    </button>
                `;
                break;

            case 'success':
                const detectedCity = locationInfo ? locationInfo.city : 'your area';
                content = `
                    <div class="location-icon">✅</div>
                    <h2 class="location-message-title">Location Detected!</h2>
                    <p class="location-message-text">Loading dashboard for ${detectedCity}...</p>
                `;
                break;
        }

        card.innerHTML = content;
        overlay.classList.add('active');
    }

    // Hide location overlay
    hideLocationOverlay() {
        const overlay = document.getElementById('locationOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    // Retry location detection
    async retryLocationDetection() {
        locationService.reset();
        await this.initializeLocationDetection();
    }

    // Skip to manual selection (redirect to filters page)
    skipToManualSelection() {
        window.location.href = 'user-filters.html';
    }


    // Populate state filter
    populateStateFilter() {
        const states = dataProcessor.getUniqueValues('state');
        this.populateDropdown(this.filterElements.state, states, 'All');
    }

    // Populate city filter
    populateCityFilter() {
        const cities = dataProcessor.getCitiesForState(dataProcessor.filters.state);
        this.populateDropdown(this.filterElements.city, cities, 'All');
    }

    // Populate area filter
    populateAreaFilter() {
        if (this.filterElements.pincodeSearch) {
            this.filterElements.pincodeSearch.value = '';
        }
        const areas = dataProcessor.getAreasForCity(dataProcessor.filters.city);
        this.populateDropdown(this.filterElements.area, areas, 'All');
        this.populatePincodeFilter();
    }

    // Populate pincode filter
    populatePincodeFilter() {
        const pincodes = dataProcessor.getPincodesForArea(dataProcessor.filters.area);
        this.populateDropdown(this.filterElements.pincode, pincodes, 'All');
    }

    // Populate network type filter
    populateNetworkFilter() {
        const networks = dataProcessor.getUniqueValues('network_type');
        this.populateDropdown(this.filterElements.network, networks, 'All');
    }

    // Generic dropdown population
    populateDropdown(element, values, allLabel) {
        if (!element) return;

        const currentValue = element.value;
        element.innerHTML = `<option value="All">${allLabel}</option>`;

        values.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            element.appendChild(option);
        });

        // Restore previous value if it still exists
        if (values.includes(currentValue)) {
            element.value = currentValue;
        } else {
            element.value = 'All';
        }
    }

    // Update all dashboard components
    updateDashboard() {


        // Update KPIs
        this.updateKPIs();

        // Update visualizations
        chartManager.updateAllCharts();
        mapManager.updateMap();
        tableManager.updateTable();

        // Update Insights context
        if (window.insightsManager) {
            const metric = this.filterElements.metric ? this.filterElements.metric.value : 'score';
            const kpis = dataProcessor.calculateKPIs(metric);
            window.insightsManager.updateContext(dataProcessor.filters, kpis);
        }


    }

    // Update KPI cards
    updateKPIs() {
        const kpis = dataProcessor.calculateKPIs(this.filterElements.metric ? this.filterElements.metric.value : 'score');

        // Update Best Operator
        const bestOpElement = document.getElementById('kpi-best-operator');
        if (bestOpElement) {
            const opClass = kpis.bestOperator.toLowerCase();
            bestOpElement.innerHTML = `
                    <div class="best-op-container">
                    <span class="operator-badge ${opClass}">${kpis.bestOperator}</span>
                    <button onclick="window.location.href='recommendations.html'" class="btn-more mt-2">More <i class="bi bi-chevron-right"></i></button>
                </div>
            `;
        }

        // Update Avg Download Speed (with smaller Mbps unit)
        const avgDownloadElement = document.getElementById('kpi-avg-download');
        if (avgDownloadElement) {
            avgDownloadElement.innerHTML = `${kpis.avgDownload} <span style="font-size: 1rem; font-weight: 400; opacity: 0.7;">Mbps</span>`;
        }

        // Update Avg Upload Speed (with smaller Mbps unit)
        const avgUploadElement = document.getElementById('kpi-avg-upload');
        if (avgUploadElement) {
            avgUploadElement.innerHTML = `${kpis.avgUpload} <span style="font-size: 1rem; font-weight: 400; opacity: 0.7;">Mbps</span>`;
        }

        // Update Network Score
        const networkScoreElement = document.getElementById('kpi-network-score');
        if (networkScoreElement) {
            networkScoreElement.textContent = dataProcessor.getScoreLabel(kpis.avgScore);
        }

        // Operators Section
        this.updateOperators();
    }

    // Helper to get operator page link
    getOperatorLink(id) {
        const map = {
            'jio': '../jio-plans.html',
            'reliance jio': '../jio-plans.html',
            'airtel': '../airtel-plans.html',
            'bharti airtel': '../airtel-plans.html',
            'vi': '../vi-plans.html',
            'vodafone idea': '../vi-plans.html',
            'bsnl': '../bsnl-plans.html'
        };
        return map[id.toLowerCase()] || '../operators.html';
    }

    // Update the operators section with data from operators.json
    async updateOperators() {
        const operatorsContainer = document.getElementById('operators-container');
        if (!operatorsContainer) return;

        try {
            // Fetch operators data
            const response = await fetch('../data/operators.json');
            const data = await response.json();
            const operators = data.operators;

            operatorsContainer.innerHTML = '';
            operators.forEach(operator => {
                const operatorCard = document.createElement('div');
                operatorCard.className = `operator-mini-card ${operator.id}`;
                operatorCard.innerHTML = `
                    <div class="operator-header">
                        <div class="operator-logo">${operator.logo}</div>
                        <div class="operator-name">${operator.name}</div>
                    </div>
                    <div class="operator-stats">
                        <div class="stat-item">
                            <span class="stat-label">Avg Speed</span>
                            <span class="stat-value">${operator.stats.avgSpeed}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Coverage</span>
                            <span class="stat-value">${operator.stats.coverage}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Latency</span>
                            <span class="stat-value">${operator.stats.latency}</span>
                        </div>
                    </div>
                    <button class="operator-view-btn" onclick="window.location.href='${this.getOperatorLink(operator.id)}'">
                        View More <i class="bi bi-arrow-right"></i>
                    </button>
                `;
                operatorsContainer.appendChild(operatorCard);
            });
        } catch (error) {
            console.error('Error loading operators:', error);
            operatorsContainer.innerHTML = '<div class="loading">Failed to load operators. Please refresh.</div>';
        }
    }

    // Show loading state
    showLoading() {
        const tableBody = document.getElementById('table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="loading">Loading data...</td>
                </tr>
            `;
        }
    }

    // Show error message
    showError(message) {
        const tableBody = document.getElementById('table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #F44336;">
                        ⚠️ ${message}
                    </td>
                </tr>
            `;
        }
    }

    // Reset all filters
    resetFilters() {
        dataProcessor.filters = {
            state: 'All',
            city: 'All',
            area: 'All',
            network: 'All',
            operator: 'All'
        };

        // Reset dropdown values
        Object.values(this.filterElements).forEach(element => {
            if (element) element.value = 'All';
        });

        // Repopulate dependent filters
        this.populateCityFilter();
        this.populateAreaFilter();

        // Update dashboard
        dataProcessor.applyFilters();
        this.updateDashboard();
    }

    // Setup profile dropdown interactions
    setupProfileDropdown() {
        const avatar = document.getElementById('userAvatar');
        const dropdown = document.getElementById('userDropdown');
        const logoutBtn = document.getElementById('logoutBtn');

        // Dynamic User Info Elements
        const userNameEl = document.querySelector('.user-name');
        const userEmailEl = document.querySelector('.user-email');

        if (!avatar || !dropdown) {
            console.error('Profile trigger or dropdown not found');
            return;
        }

        // Populate dynamic user info from localStorage
        const storedName = localStorage.getItem('userName') || 'User';
        const storedEmail = localStorage.getItem('userEmail') || 'user@telesignal.com';

        if (userNameEl) userNameEl.textContent = storedName;
        if (userEmailEl) userEmailEl.textContent = storedEmail;
        if (avatar) avatar.textContent = storedName.charAt(0).toUpperCase();

        // Toggle dropdown on avatar click
        avatar.addEventListener('click', (e) => {
            e.stopPropagation();
            this.profileDropdownActive = !this.profileDropdownActive;
            dropdown.classList.toggle('active', this.profileDropdownActive);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (this.profileDropdownActive && !dropdown.contains(e.target) && !avatar.contains(e.target)) {
                this.profileDropdownActive = false;
                dropdown.classList.remove('active');
            }
        });

        // Logout functionality
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }

    // Handle logout
    logout() {
        if (window.handleLogout) {
            window.handleLogout();
        } else {
            console.warn('Auth utility not found, performing local cleanup');
            localStorage.removeItem('userLoggedIn');
            window.location.href = '../index.html';
        }
    }
}

// Initialize dashboard when DOM is ready
const dashboardController = new DashboardController();

// Start initialization when page loads
document.addEventListener('DOMContentLoaded', () => {
    dashboardController.initialize();
});

// Handle window resize for map
window.addEventListener('resize', () => {
    if (mapManager.map) {
        mapManager.resize();
    }
});
