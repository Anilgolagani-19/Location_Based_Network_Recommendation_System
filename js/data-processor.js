// Data Processor Module
// Handles loading, filtering, and aggregating telecom data

class DataProcessor {
    constructor() {
        this.rawData = [];
        this.filteredData = [];
        this.filters = {
            state: 'All',
            city: 'All',
            area: 'All',
            pincode: 'All',
            network: 'All',
            operator: 'All'
        };
        this.isLoaded = false;
    }

    // Load data from JSON file
    async loadData() {
        try {

            // Added cache buster to ensure new dataset loads
            const response = await fetch(`../data/dataset.json?t=${new Date().getTime()}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            this.rawData = data;
            this.filteredData = [...this.rawData];
            this.isLoaded = true;


            return true;
        } catch (error) {
            console.error('Error loading data:', error);
            return false;
        }
    }

    // Helper to get score label
    getScoreLabel(score) {
        const scoreNum = parseFloat(score);
        if (scoreNum >= 0.65) return 'Good';
        if (scoreNum >= 0.45) return 'Average';
        return 'Poor';
    }

    // Get unique values for filter dropdowns
    getUniqueValues(field) {
        const values = [...new Set(this.rawData.map(item => item[field]))];
        return values.sort();
    }

    // Apply filters to data
    applyFilters() {
        this.filteredData = this.rawData.filter(record => {
            if (this.filters.state !== 'All' && record.state !== this.filters.state) return false;
            if (this.filters.city !== 'All' && record.city !== this.filters.city) return false;
            if (this.filters.area !== 'All' && record.area !== this.filters.area) return false;
            if (this.filters.pincode !== 'All' && record.pincode.toString() !== this.filters.pincode.toString()) return false;
            if (this.filters.network !== 'All' && record.network_type !== this.filters.network) return false;
            if (this.filters.operator !== 'All' && record.operator !== this.filters.operator) return false;
            return true;
        });


        return this.filteredData;
    }

    // Update a specific filter
    updateFilter(filterName, value) {
        this.filters[filterName] = value;

        // Reset/Update dependent filters
        if (filterName === 'state') {
            this.filters.city = 'All';
            this.filters.area = 'All';
            this.filters.pincode = 'All';
        } else if (filterName === 'city') {
            this.filters.area = 'All';
            this.filters.pincode = 'All';
        } else if (filterName === 'area') {
            this.filters.pincode = 'All';
        } else if (filterName === 'pincode' && value !== 'All') {
            // Bidirectional: Pincode sets State, City, Area
            const location = this.getLocationForPincode(value);
            if (location) {
                this.filters.state = location.state;
                this.filters.city = location.city;
                this.filters.area = location.area;
            }
        }

        this.applyFilters();
    }

    // New: Handle bidirectional lookup
    getLocationForPincode(pincode) {
        const match = this.rawData.find(r => r.pincode.toString() === pincode.toString());
        if (match) {
            return {
                state: match.state,
                city: match.city,
                area: match.area
            };
        }
        return null;
    }

    // Get cities for selected state
    getCitiesForState(state) {
        if (state === 'All') {
            return this.getUniqueValues('city');
        }
        const cities = [...new Set(
            this.rawData
                .filter(r => r.state === state)
                .map(r => r.city)
        )];
        return cities.sort();
    }

    // Get areas for selected city
    getAreasForCity(city) {
        if (city === 'All') {
            return this.getUniqueValues('area');
        }
        const areas = [...new Set(
            this.rawData
                .filter(r => r.city === city)
                .map(r => r.area)
        )];
        return areas.sort();
    }

    // Get state for a given city (for location service)
    getStateForCity(city) {
        const match = this.rawData.find(r => r.city === city);
        return match ? match.state : null;
    }

    // Get pincodes for selected area
    // Get pincodes for selected area or higher-level context
    // Get pincodes for selected area or higher-level context
    getPincodesForArea(area) {
        let baseData = this.rawData;

        // 1. Filter by State if selected
        if (this.filters.state !== 'All') {
            baseData = baseData.filter(r => r.state === this.filters.state);
        }

        // 2. Filter by City if selected
        if (this.filters.city !== 'All') {
            baseData = baseData.filter(r => r.city === this.filters.city);
        }

        // 3. Filter by Area if chosen (and not All)
        if (area !== 'All') {
            baseData = baseData.filter(r => r.area === area);
        }

        const pincodes = [...new Set(baseData.map(r => r.pincode))];
        return pincodes.sort((a, b) => a - b);
    }

    calculateKPIs(metric = 'score') {
        if (this.filteredData.length === 0) {
            return {
                bestOperator: 'N/A',
                avgDownload: 0,
                avgUpload: 0,
                avgScore: 0,
                avgLatency: 0
            };
        }

        // Calculate averages
        const avgDownload = this.filteredData.reduce((sum, r) => sum + (parseFloat(r.download_mbps) || 0), 0) / this.filteredData.length;
        const avgUpload = this.filteredData.reduce((sum, r) => sum + (parseFloat(r.upload_mbps) || 0), 0) / this.filteredData.length;
        const avgScore = this.filteredData.reduce((sum, r) => sum + (parseFloat(r.confidence_score) || 0), 0) / this.filteredData.length;
        const avgLatency = this.filteredData.reduce((sum, r) => sum + (parseFloat(r.latency_ms) || 0), 0) / this.filteredData.length;

        // Find best operator by selected metric
        const operatorMetrics = {};
        this.filteredData.forEach(r => {
            const op = (r.operator || 'Unknown').toUpperCase();
            if (!operatorMetrics[op]) {
                operatorMetrics[op] = { total: 0, count: 0 };
            }

            let val = 0;
            if (metric === 'download') val = parseFloat(r.download_mbps) || 0;
            else if (metric === 'upload') val = parseFloat(r.upload_mbps) || 0;
            else if (metric === 'latency') val = parseFloat(r.latency_ms) || 0;
            else val = parseFloat(r.confidence_score) || 0;

            operatorMetrics[op].total += val;
            operatorMetrics[op].count += 1;
        });

        let bestOperator = 'AIRTEL'; // Default to Airtel
        let bestVal = metric === 'latency' ? Infinity : -Infinity;

        for (const [operator, data] of Object.entries(operatorMetrics)) {
            const avgVal = data.total / data.count;
            if (metric === 'latency') {
                if (avgVal < bestVal) {
                    bestVal = avgVal;
                    bestOperator = operator;
                }
            } else {
                if (avgVal > bestVal) {
                    bestVal = avgVal;
                    bestOperator = operator;
                }
            }
        }

        // Business Logic Override: If JIO is in top performance, prioritize it for monetization pitch
        if (operatorMetrics['JIO']) {
            const jioAvg = operatorMetrics['JIO'].total / operatorMetrics['JIO'].count;
            if (metric === 'latency') {
                if (jioAvg < (bestVal * 1.1)) { // Within 10% of best (lower is better)
                    bestOperator = 'JIO';
                }
            } else {
                if (jioAvg > (bestVal * 0.9)) { // Within 10% of best (higher is better)
                    bestOperator = 'JIO';
                }
            }
        }

        return {
            bestOperator,
            avgDownload: avgDownload.toFixed(2),
            avgUpload: avgUpload.toFixed(2),
            avgScore: avgScore.toFixed(2),
            avgLatency: avgLatency.toFixed(0)
        };
    }

    getDownloadSpeedByOperatorCity() {
        const data = {};
        const allOperators = new Set();

        this.filteredData.forEach(r => {
            const city = `${r.city}`;
            const op = (r.operator || 'Unknown').toUpperCase();
            allOperators.add(op);

            if (!data[city]) {
                data[city] = {};
            }
            if (!data[city][op]) {
                data[city][op] = { total: 0, count: 0 };
            }
            const speed = parseFloat(r.download_mbps) || 0;
            data[city][op].total += speed;
            data[city][op].count += 1;
        });

        // Convert to chart format
        const cities = Object.keys(data).slice(0, 5); // Top 5 cities
        const operators = Array.from(allOperators).sort();

        const datasets = operators.map(op => {
            return {
                label: op,
                data: cities.map(city => {
                    if (data[city][op]) {
                        return (data[city][op].total / data[city][op].count).toFixed(2);
                    }
                    return 0;
                })
            };
        });

        return { labels: cities, datasets };
    }

    getLatencyByPeakHour() {
        const data = {
            'Non-Peak': {},
            'Peak': {}
        };
        const allOperators = new Set();

        this.filteredData.forEach(r => {
            const isPeak = (r.is_peak_hour === 'peak' || r.is_peak_hour === 1);
            const hourType = isPeak ? 'Peak' : 'Non-Peak';
            const op = (r.operator || 'Unknown').toUpperCase();
            allOperators.add(op);

            if (!data[hourType][op]) {
                data[hourType][op] = { total: 0, count: 0 };
            }
            const lat = parseFloat(r.latency_ms) || 0;
            data[hourType][op].total += lat;
            data[hourType][op].count += 1;
        });

        const labels = ['Non-Peak', 'Peak'];
        const operators = Array.from(allOperators).sort();

        const datasets = operators.map(op => {
            return {
                label: op,
                data: labels.map(label => {
                    if (data[label][op]) {
                        return (data[label][op].total / data[label][op].count).toFixed(2);
                    }
                    return 0;
                })
            };
        });

        return { labels, datasets };
    }

    getHourlyDownloadSpeed() {
        const data = {};
        const allOperators = new Set();

        this.filteredData.forEach(r => {
            const hour = r.hour;
            const op = (r.operator || 'Unknown').toUpperCase();
            allOperators.add(op);

            if (!data[hour]) {
                data[hour] = {};
            }
            if (!data[hour][op]) {
                data[hour][op] = { total: 0, count: 0 };
            }
            const speed = parseFloat(r.download_mbps) || 0;
            data[hour][op].total += speed;
            data[hour][op].count += 1;
        });

        const hours = Array.from({ length: 24 }, (_, i) => i);
        const operators = Array.from(allOperators).sort();

        const datasets = operators.map(op => {
            return {
                label: op,
                data: hours.map(hour => {
                    if (data[hour] && data[hour][op]) {
                        return (data[hour][op].total / data[hour][op].count).toFixed(2);
                    }
                    return 0;
                })
            };
        });

        return { labels: hours, datasets };
    }

    // Get data for area-wise table
    getAreaWiseData() {
        const data = {};

        this.filteredData.forEach(r => {
            const key = `${r.area}_${r.operator}`;
            if (!data[key]) {
                data[key] = {
                    area: r.area,
                    operator: r.operator,
                    downloadTotal: 0,
                    uploadTotal: 0,
                    scoreTotal: 0,
                    count: 0
                };
            }
            data[key].downloadTotal += parseFloat(r.download_mbps) || 0;
            data[key].uploadTotal += parseFloat(r.upload_mbps) || 0;
            data[key].scoreTotal += parseFloat(r.confidence_score) || 0;
            data[key].count += 1;
        });

        // Convert to array and calculate averages
        const tableData = Object.values(data).map(item => ({
            area: item.area,
            operator: item.operator,
            avgDownload: (item.downloadTotal / item.count).toFixed(2),
            avgUpload: (item.uploadTotal / item.count).toFixed(2),
            avgScore: (item.scoreTotal / item.count).toFixed(2)
        }));

        // Sort by score descending
        tableData.sort((a, b) => parseFloat(b.avgScore) - parseFloat(a.avgScore));

        return tableData;
    }

    // Get map data (area locations with scores)
    getMapData() {
        const data = {};

        this.filteredData.forEach(r => {
            if (!data[r.area]) {
                data[r.area] = {
                    area: r.area,
                    city: r.city,
                    state: r.state,
                    lat: r.latitude,
                    lng: r.longitude,
                    scoreTotal: 0,
                    count: 0,
                    operators: new Set()
                };
            }
            data[r.area].scoreTotal += parseFloat(r.confidence_score) || 0;
            data[r.area].count += 1;
            data[r.area].operators.add(r.operator);
        });

        return Object.values(data).map(item => ({
            ...item,
            avgScore: (item.scoreTotal / item.count).toFixed(2),
            operators: Array.from(item.operators).join(', ')
        }));
    }

    // Get performance metrics for all operators based on current filtered data
    getOperatorPerformance() {
        const stats = {};

        // Initialize stats for each operator present in rawData to ensure we have a fallback
        const allOperators = this.getUniqueValues('operator');
        allOperators.forEach(op => {
            stats[op.toUpperCase()] = {
                avgDownload: 0,
                avgUpload: 0,
                avgLatency: 0,
                avgScore: 0,
                avgSignal: 0,
                count: 0
            };
        });

        this.filteredData.forEach(r => {
            const op = (r.operator || 'Unknown').toUpperCase();
            if (!stats[op]) {
                stats[op] = { avgDownload: 0, avgUpload: 0, avgLatency: 0, avgScore: 0, avgSignal: 0, count: 0 };
            }
            stats[op].avgDownload += parseFloat(r.download_mbps) || 0;
            stats[op].avgUpload += parseFloat(r.upload_mbps) || 0;
            stats[op].avgLatency += parseFloat(r.latency_ms) || 0;
            stats[op].avgScore += parseFloat(r.final_network_score) || 0;
            stats[op].avgSignal += parseFloat(r.signal_score) || 0;
            stats[op].count += 1;
        });

        // Finalize averages
        Object.keys(stats).forEach(op => {
            const data = stats[op];
            if (data.count > 0) {
                data.avgDownload = (data.avgDownload / data.count).toFixed(1);
                data.avgUpload = (data.avgUpload / data.count).toFixed(1);
                data.avgLatency = (data.avgLatency / data.count).toFixed(0);
                // Return numeric score for labeling, and signal as percentage
                data.rawScore = data.avgScore / data.count;
                data.avgScore = ((data.avgScore / data.count) * 100).toFixed(0) + '%';
                data.avgSignal = ((data.avgSignal / data.count) * 100).toFixed(0) + '%';
            } else {
                data.avgDownload = 'N/A';
                data.avgUpload = 'N/A';
                data.avgLatency = 'N/A';
                data.rawScore = 0;
                data.avgScore = 'N/A';
                data.avgSignal = 'N/A';
            }
        });

        return stats;
    }
}

// Export for use in other modules
const dataProcessor = new DataProcessor();

