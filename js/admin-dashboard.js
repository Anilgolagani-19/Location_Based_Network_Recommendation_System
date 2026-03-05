// Import Analytics for My Insights view
import { analytics } from './analytics.js';

export default class AdminDashboardController {
    constructor() {
        this.service = window.telecomDataService;
        this.charts = {};
        this.filters = {
            state: 'All',
            city: 'All',
            operator: 'All',
            network_type: 'All',
            pincode: 'All',
            area: 'All',
            years: [],
            month_start: 1
        };
        this.stateToCities = {};
        this.allPincodes = [];
        this.selectedPlan = 'quarterly';
        this.selectedAmount = 24999;

        // Revenue State
        this.revenueState = {
            totalRevenue: 0,
            subscriptionCount: 0,
            daily: 0,
            monthly: 0,
            yearly: 0
        };

        // Initialize
        this.setChartDefaults();
        this.loadRevenueState(); // Load stored revenue
        this.init();
    }

    setChartDefaults() {
        Chart.defaults.color = '#ffffff';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
        Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.1)';
    }

    loadRevenueState() {
        const stored = localStorage.getItem('adminRevenueState');
        if (stored) {
            this.revenueState = JSON.parse(stored);
        } else {
            // Initialize default structure if not present
            this.revenueState = {
                totalRevenue: 0,
                subscriptionCount: 0,
                daily: 0,
                monthly: 0,
                yearly: 0
            };
        }
    }

    saveRevenueState() {
        localStorage.setItem('adminRevenueState', JSON.stringify(this.revenueState));
        this.updateRevenueUI();
    }

    updateRevenueUI() {
        // Update KPIs
        const dailyEl = document.getElementById('kpi-daily-revenue');
        const subCountEl = document.getElementById('kpi-subscription-count');

        // Reset Daily Revenue if simpler logic is desired, but for now we accumulating based on manual payments
        // In a real app, we'd check dates. For this demo, we assume the user just made the payment "today".

        if (dailyEl) dailyEl.textContent = '₹' + this.revenueState.daily.toLocaleString();
        if (subCountEl) subCountEl.textContent = this.revenueState.subscriptionCount;

        // Update Chart
        this.renderRevenueChart();
    }

    renderRevenueChart() {
        const ctx = this.getChartContext('chartRevenue');
        if (!ctx) return;

        // Simple accumulated data for demo purposes
        // "Daily" = current accumulated today
        // "Monthly" = some base + daily
        // "Yearly" = some base + monthly
        const daily = this.revenueState.daily;
        const monthly = this.revenueState.monthly;
        const yearly = this.revenueState.yearly;

        this.charts['chartRevenue'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Daily', 'Monthly', 'Yearly'],
                datasets: [{
                    label: 'Revenue (₹)',
                    data: [daily, monthly, yearly],
                    backgroundColor: [
                        '#10B981', // Daily - Emerald
                        '#3B82F6', // Monthly - Blue
                        '#8B5CF6'  // Yearly - Purple
                    ],
                    borderRadius: 6,
                    barThickness: 50
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `₹${context.parsed.y.toLocaleString()}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    async init() {
        // Show loading
        const overlay = document.getElementById('loading-overlay');

        try {
            await this.service.loadData();
            this.initFilters();
            this.initEventListeners();
            this.updateRevenueUI(); // Initialize Revenue UI

            // Check for Operator role
            const userEmail = localStorage.getItem('userEmail');
            if (userEmail === 'operators@gmail.com') {
                console.log("[AdminDashboard] Operator role detected. Restricting view.");
                const dashNav = document.getElementById('side-nav-dashboard');
                const insightsNav = document.getElementById('side-nav-insights');
                const sightsNav = document.getElementById('side-nav-sights');

                if (dashNav) dashNav.style.display = 'none';
                if (insightsNav) insightsNav.style.display = 'none';

                // Force switch to My Sights
                this.switchView('sights', sightsNav);
            } else {
                this.updateDashboard();
            }
        } catch (err) {
            console.error('Init Error:', err);
            alert('Failed to load dashboard data.');
        } finally {
            // Hide loading
            if (overlay) overlay.style.display = 'none';
        }
    }

    initFilters() {
        const options = this.service.getFilterOptions();
        this.stateToCities = this.service.getStateToCitiesMap();

        // Populate Dropdowns
        this.populateSelect('stateFilter', options.states);
        this.populateSelect('cityFilter', options.cities);
        this.populateSelect('areaFilter', options.areas);
        this.populateSelect('operatorFilter', options.operators);
        this.populateSelect('networkFilter', options.networkTypes);
        this.allPincodes = options.pincodes;
        this.populateSelect('pincodeFilter', this.allPincodes);

        // Populate Year Tiles
        const yearContainer = document.getElementById('year-filters');
        if (yearContainer) {
            yearContainer.innerHTML = '';
            options.years.forEach(year => {
                const btn = document.createElement('div');
                btn.className = 'year-tile';
                btn.textContent = year;
                btn.dataset.year = year;
                btn.onclick = () => this.toggleYear(year, btn);
                yearContainer.appendChild(btn);
            });
        }
    }

    populateSelect(id, items) {
        const select = document.getElementById(id);
        if (!select) return;
        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            opt.textContent = item;
            select.appendChild(opt);
        });
    }

    initEventListeners() {
        // State Filter - Special handling for cascading
        const stateF = document.getElementById('stateFilter');
        if (stateF) {
            stateF.addEventListener('change', (e) => {
                this.filters.state = e.target.value;
                this.handleFilterCascade('state');
                this.updateDashboard();
            });
        }

        // City Filter
        const cityF = document.getElementById('cityFilter');
        if (cityF) {
            cityF.addEventListener('change', (e) => {
                this.filters.city = e.target.value;
                this.handleFilterCascade('city');
                this.updateDashboard();
            });
        }

        // Area Filter
        const areaF = document.getElementById('areaFilter');
        if (areaF) {
            areaF.addEventListener('change', (e) => {
                this.filters.area = e.target.value;
                this.handleFilterCascade('area');
                this.updateDashboard();
            });
        }

        // Other Dropdowns
        ['cityFilter', 'operatorFilter', 'networkFilter'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', (e) => {
                    const mapKey = id === 'cityFilter' ? 'city' :
                        id === 'operatorFilter' ? 'operator' : 'network_type';

                    this.filters[mapKey] = e.target.value;
                    this.updateDashboard();
                });
            }
        });

        // Pincode Filter
        if (document.getElementById('pincodeFilter')) {
            document.getElementById('pincodeFilter').addEventListener('change', (e) => {
                const selectedPincode = e.target.value;
                this.filters.pincode = selectedPincode;

                // FIX: Ensure State, City, and Area filters don't conflict with the selected pincode
                if (selectedPincode !== 'All') {
                    const location = this.service.getPincodeLocation(selectedPincode);
                    if (location) {
                        let needsSync = false;
                        if (this.filters.state !== location.state) { this.filters.state = location.state; needsSync = true; }
                        if (this.filters.city !== location.city) { this.filters.city = location.city; needsSync = true; }
                        if (this.filters.area !== location.area) { this.filters.area = location.area; needsSync = true; }

                        if (needsSync) {
                            this.syncFilterUI();
                            // Re-filter options to match the new location context
                            this.refreshFilterOptions();
                        }
                    }
                }

                this.updateDashboard();
            });
        }

        // Pincode Search
        const pSearch = document.getElementById('pincodeSearch');
        if (pSearch) {
            pSearch.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = this.allPincodes.filter(p => p.toString().includes(term));

                const select = document.getElementById('pincodeFilter');
                if (select) {
                    // Keep "All" option
                    select.innerHTML = '<option value="All">All</option>';
                    filtered.forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p;
                        opt.textContent = p;
                        select.appendChild(opt);
                    });
                }
            });
        }

        // Month Slider
        const mFilter = document.getElementById('monthFilter');
        const mLabel = document.getElementById('month-val');

        if (mFilter && mLabel) {
            const updateMonth = () => {
                let val = parseInt(mFilter.value);
                this.filters.month_start = val;
                mLabel.textContent = val;
                this.updateDashboard();
            };
            mFilter.addEventListener('input', updateMonth);
        }
    }

    handleFilterCascade(level) {
        if (level === 'state') {
            this.filters.city = 'All';
            this.filters.area = 'All';
            this.filters.pincode = 'All';
        } else if (level === 'city') {
            this.filters.area = 'All';
            this.filters.pincode = 'All';
        } else if (level === 'area') {
            this.filters.pincode = 'All';
        }

        this.syncFilterUI();
        this.refreshFilterOptions();
    }

    syncFilterUI() {
        if (document.getElementById('stateFilter')) document.getElementById('stateFilter').value = this.filters.state;
        if (document.getElementById('cityFilter')) document.getElementById('cityFilter').value = this.filters.city;
        if (document.getElementById('areaFilter')) document.getElementById('areaFilter').value = this.filters.area;
        if (document.getElementById('pincodeFilter')) document.getElementById('pincodeFilter').value = this.filters.pincode;

        // Reset search input when pincode changes via cascade
        if (this.filters.pincode === 'All' && document.getElementById('pincodeSearch')) {
            document.getElementById('pincodeSearch').value = '';
        }
    }

    refreshFilterOptions() {
        const options = this.service.getOptionsForFilters(this.filters);

        this.updateSelectOptions('cityFilter', options.cities, this.filters.city);
        this.updateSelectOptions('areaFilter', options.areas, this.filters.area);

        // Update Pincode List
        this.allPincodes = options.pincodes;
        this.updateSelectOptions('pincodeFilter', this.allPincodes, this.filters.pincode, true);
    }

    updateSelectOptions(id, items, selectedValue, isMulti = false) {
        const select = document.getElementById(id);
        if (!select) return;
        const prevValue = selectedValue;

        select.innerHTML = `<option value="All">${isMulti ? 'All' : 'All ' + id.replace('Filter', '')}</option>`;
        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            opt.textContent = item;
            select.appendChild(opt);
        });

        // Try to restore previous value if it still exists in the list
        if (items.includes(prevValue)) {
            select.value = prevValue;
        } else {
            select.value = 'All';
            const key = id.replace('Filter', '').replace('network', 'network_type');
            if (this.filters[key]) this.filters[key] = 'All';
        }
    }

    toggleYear(year, btn) {
        if (this.filters.years.includes(year)) {
            this.filters.years = this.filters.years.filter(y => y !== year);
            btn.classList.remove('active');
        } else {
            this.filters.years.push(year);
            btn.classList.add('active');
        }
        this.updateDashboard();
    }

    updateDashboard() {
        const filteredData = this.service.filterData(this.filters);
        const aggregated = this.service.getAggregatedMetrics(filteredData);
        const chartData = this.service.getChartData(filteredData);

        this.updateKPIs(aggregated);
        this.renderCharts(chartData);

        // Update Sights if active
        const sightsView = document.getElementById('sights-view');
        if (sightsView && sightsView.classList.contains('active')) {
            this.renderSightsView();
        }
    }

    updateKPIs(metrics) {
        if (!metrics) return;

        const mainKpi = document.getElementById('main-kpi-upload');
        if (mainKpi) {
            mainKpi.textContent = metrics.avgUpload;
        }
    }

    renderCharts(data) {
        this.renderDownloadOpChart(data.downloadByOpPeak);
        this.renderLatencyCityChart(data.latencyByCityNet);
        this.renderCoverageGrowthChart(data.coverageGrowth);
        this.renderDownloadYearChart(data.downloadByYearOp);
        this.renderLatencyYearChart(data.latencyByYearPeak);
        this.renderScoreOpChart(data.scoreByOp);
    }

    // --- Chart Helpers ---

    getChartContext(id) {
        const el = document.getElementById(id);
        if (!el) return null;
        const ctx = el.getContext('2d');
        if (this.charts[id]) {
            this.charts[id].destroy();
        }
        return ctx;
    }

    renderDownloadOpChart(data) {
        const labels = Object.keys(data);
        const peakData = labels.map(op => data[op].peakCount ? (data[op].peakSum / data[op].peakCount) : 0);
        const nonPeakData = labels.map(op => data[op].nonPeakCount ? (data[op].nonPeakSum / data[op].nonPeakCount) : 0);

        const ctx = this.getChartContext('chartDownloadOp');
        if (!ctx) return;
        this.charts['chartDownloadOp'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'peak', data: peakData, backgroundColor: '#1E3A8A', borderRadius: 5 },
                    { label: 'non-peak', data: nonPeakData, backgroundColor: '#3B82F6', borderRadius: 5 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 15 } } }
            }
        });
    }

    renderLatencyCityChart(data) {
        const cities = Object.keys(data).slice(0, 5);
        const labels = cities;
        const data4G = cities.map(c => data[c]['4G'].count ? (data[c]['4G'].sum / data[c]['4G'].count) : 0);
        const data5G = cities.map(c => data[c]['5G'].count ? (data[c]['5G'].sum / data[c]['5G'].count) : 0);

        const ctx = this.getChartContext('chartLatencyCity');
        if (!ctx) return;
        this.charts['chartLatencyCity'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: '4G', data: data4G, backgroundColor: '#4CAF50', borderRadius: 5 },
                    { label: '5G', data: data5G, backgroundColor: '#E27D4A', borderRadius: 5 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { boxWidth: 12 } } }
            }
        });
    }

    renderCoverageGrowthChart(data) {
        const years = Object.keys(data).sort();
        const data4G = years.map(y => data[y]['4G'] || 0);
        const data5G = years.map(y => data[y]['5G'] || 0);

        const ctx = this.getChartContext('chartCoverageGrowth');
        if (!ctx) return;
        this.charts['chartCoverageGrowth'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: years,
                datasets: [
                    { label: '4G', data: data4G, backgroundColor: '#4A90E2', borderRadius: 5 },
                    { label: '5G', data: data5G, backgroundColor: '#E27D4A', borderRadius: 5 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { stacked: true }, y: { stacked: true } },
                plugins: { legend: { position: 'top', labels: { boxWidth: 12 } } }
            }
        });
    }

    renderDownloadYearChart(data) {
        const years = Object.keys(data).sort();
        const operators = new Set();
        Object.values(data).forEach(yearData => Object.keys(yearData).forEach(op => operators.add(op)));

        const datasets = Array.from(operators).map((op, i) => {
            const values = years.map(y => {
                const item = data[y][op];
                return item ? (item.sum / item.count) : 0;
            });
            const colors = {
                'JIO': '#E11D48',
                'AIRTEL': '#3B82F6',
                'VI': '#6366F1',
                'BSNL': '#1E3A8A'
            };
            const opUpper = op.toUpperCase();
            const color = colors[opUpper] || '#94A3B8';

            return {
                label: op,
                data: values,
                borderColor: color,
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: color,
                tension: 0.4,
                fill: false
            };
        });

        const ctx = this.getChartContext('chartDownloadYear');
        if (!ctx) return;
        this.charts['chartDownloadYear'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { boxWidth: 12 } } }
            }
        });
    }

    renderLatencyYearChart(data) {
        const years = Object.keys(data).sort();
        const peakVals = years.map(y => data[y].peakCount ? (data[y].peakSum / data[y].peakCount) : 0);
        const nonPeakVals = years.map(y => data[y].nonPeakCount ? (data[y].nonPeakSum / data[y].nonPeakCount) : 0);

        const ctx = this.getChartContext('chartLatencyYear');
        if (!ctx) return;
        this.charts['chartLatencyYear'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [
                    {
                        label: 'peak',
                        data: peakVals,
                        borderColor: '#1E3A8A',
                        backgroundColor: '#1E3A8A',
                        borderWidth: 3,
                        pointRadius: 5,
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'non-peak',
                        data: nonPeakVals,
                        borderColor: '#3B82F6',
                        backgroundColor: '#3B82F6',
                        borderWidth: 3,
                        pointRadius: 5,
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { boxWidth: 12 } } }
            }
        });
    }

    renderScoreOpChart(data) {
        const labels = Object.keys(data);
        const values = labels.map(op => data[op].count ? (data[op].sum / data[op].count) : 0);

        const ctx = this.getChartContext('chartScoreOp');
        if (!ctx) return;
        this.charts['chartScoreOp'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Final Network Score',
                    data: values,
                    backgroundColor: labels.map(op => {
                        const opUpper = op.toUpperCase();
                        if (opUpper === 'JIO') return '#E11D48';
                        if (opUpper === 'AIRTEL') return '#3B82F6';
                        if (opUpper === 'VI') return '#6366F1';
                        return '#1E3A8A';
                    }),
                    borderRadius: 8,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const val = context.parsed.y;
                                return `Score: ${val.toFixed(2)} (${this.service.getScoreLabel(val)})`;
                            }
                        }
                    }
                }
            }
        });
    }

    switchView(viewId, navElement) {
        // Role Guard: Operators are strictly locked to 'sights'
        const userEmail = localStorage.getItem('userEmail');
        if (userEmail === 'operators@gmail.com' && viewId !== 'sights') {
            console.warn("[AdminDashboard] Operator attempted to access restricted view:", viewId);
            return; // Prevent switching
        }

        // Toggle Active Nav
        document.querySelectorAll('.sidebar .nav-item').forEach(item => item.classList.remove('active'));
        if (navElement) {
            navElement.classList.add('active');
        } else if (viewId === 'dashboard') {
            const dashNav = document.querySelector('.sidebar .nav-item:first-child');
            if (dashNav) dashNav.classList.add('active');
        }

        // Toggle Views
        document.querySelectorAll('.view-section').forEach(view => {
            view.classList.remove('active');
            view.style.display = 'none';
        });
        const activeView = document.getElementById(`${viewId}-view`);
        if (activeView) {
            activeView.style.display = 'block';
            activeView.classList.add('active');
        }

        if (viewId === 'sights') {
            this.renderSightsView();
        }

        if (viewId === 'insights' && window.insightsManager && !window.insightsManager.insights) {
            window.insightsManager.fetchInsights();
        }
    }

    async renderSightsView() {
        // Fetch real analytics data
        const data = await analytics.getDashboardMetrics();

        // Update KPIs
        this.updateSightsKPI('kpi-total-users', data.totalUsers);
        this.updateSightsKPI('kpi-avg-session', `${Math.floor(data.avgSessionTime / 60)}m ${data.avgSessionTime % 60}s`);
        this.updateSightsKPI('kpi-location-sub', data.locationSubmissions);
        this.updateSightsKPI('kpi-more-clicks', data.totalPlanViews);
        this.updateSightsKPI('kpi-plan-views', data.totalPlanViews);
        this.updateSightsKPI('kpi-get-sim', data.totalGetSimClicks);

        // Render Sights Charts
        this.renderFunnel(data);
        this.renderSessionTrend(data);
        this.renderOpPlanViews(data);
        this.renderOpGetSim(data);
    }

    updateSightsKPI(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = typeof value === 'number' ? value.toLocaleString() : value;
        }
    }

    renderFunnel(data) {
        const ctx = this.getChartContext('chartFunnel');
        if (!ctx) return;

        const login = data.totalUsers || 0;
        const submit = data.locationSubmissions || 0;
        const more = data.totalPlanViews || 0;
        const planView = Math.round(more * 0.8);
        const redirect = data.totalGetSimClicks || 0;

        this.charts['chartFunnel'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Login', 'Submit', 'More', 'Plan View', 'Redirect'],
                datasets: [{
                    label: 'Users',
                    data: [login, submit, more, planView, redirect],
                    backgroundColor: '#3B82F6',
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }

    renderSessionTrend(data) {
        const ctx = this.getChartContext('chartSessionTrend');
        if (!ctx) return;

        this.charts['chartSessionTrend'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.charts.dates,
                datasets: [{
                    label: 'Avg Session (sec)',
                    data: data.charts.avgSessionTrend,
                    borderColor: '#4A90E2',
                    backgroundColor: 'rgba(74, 144, 226, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }

    renderOpPlanViews(data) {
        const ctx = this.getChartContext('chartOpPlanViews');
        if (!ctx) return;
        const ops = data.charts.opPlanViews;

        this.charts['chartOpPlanViews'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jio', 'Airtel', 'VI', 'BSNL'],
                datasets: [{
                    label: 'Views',
                    data: [ops.jio, ops.airtel, ops.vi, ops.bsnl],
                    backgroundColor: ['#0057ae', '#e40000', '#f4a900', '#008542'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }

    renderOpGetSim(data) {
        const ctx = this.getChartContext('chartOpGetSim');
        if (!ctx) return;
        const ops = data.charts.opGetSimClicks;

        this.charts['chartOpGetSim'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jio', 'Airtel', 'VI', 'BSNL'],
                datasets: [{
                    label: 'Clicks',
                    data: [ops.jio, ops.airtel, ops.vi, ops.bsnl],
                    backgroundColor: ['#0057ae', '#e40000', '#f4a900', '#008542'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }

    selectPlan(element, plan) {
        document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
        element.classList.add('selected');
        this.selectedPlan = plan;

        if (plan === 'monthly') this.selectedAmount = 9999;
        else if (plan === 'quarterly') this.selectedAmount = 24999;
        else this.selectedAmount = 89999;

        document.getElementById('payBtn').textContent = `Pay ₹${this.selectedAmount.toLocaleString()} and Boost`;
    }

    handlePayment() {
        const _this = this; // Capture 'this' context

        const options = {
            "key": "rzp_test_S7Gb21AIbAKorp",
            "amount": this.selectedAmount * 100,
            "currency": "INR",
            "name": "TeleSignal",
            "description": `Boost Operator - ${this.selectedPlan} Plan`,
            "image": "https://cdn-icons-png.flaticon.com/512/3616/3616927.png",
            "handler": function (response) {
                // Payment Success Handler
                alert(`Payment Successful!\nPayment ID: ${response.razorpay_payment_id}\n\nYour operator boost is now active.`);

                // Update Revenue State
                const amount = _this.selectedAmount;
                _this.revenueState.totalRevenue += amount;
                _this.revenueState.daily += amount;
                _this.revenueState.monthly += amount;
                _this.revenueState.yearly += amount;
                _this.revenueState.subscriptionCount += 1;

                // Save and Update UI
                _this.saveRevenueState();

                // Close Modal
                const modalEl = document.getElementById('subscriptionModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();

                // Redirect user if needed, or just let them explore
                console.log("Revenue Updated:", _this.revenueState);
            },
            "prefill": {
                "name": "Operator Admin",
                "email": "operator@telesignal.com",
                "contact": "9999999999"
            },
            "theme": {
                "color": "#8b5cf6"
            }
        };

        const rzp1 = new Razorpay(options);
        rzp1.open();
    }
}


// Start Controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.adminController = new AdminDashboardController();
});