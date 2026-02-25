// Forecasting Dashboard JavaScript

let signalChart = null;
let latencyChart = null;
const mockSignalData = {};
const mockLatencyData = {};
let backendAvailable = false;

// Initialize forecasting dashboard
document.addEventListener('DOMContentLoaded', () => {
    setupTabNavigation();
    generateMockSignalData();
    generateMockLatencyData();
    setupHamburger();
    checkBackendStatus();
});

// Setup hamburger menu
function setupHamburger() {
    const hamburger = document.querySelector(".hamburger");
    const navMenu = document.querySelector(".nav-links");

    if (hamburger && navMenu) {
        hamburger.addEventListener("click", () => {
            hamburger.classList.toggle("active");
            navMenu.classList.toggle("active");
        });

        document.querySelectorAll(".nav-links li a").forEach(n => n.addEventListener("click", () => {
            hamburger.classList.remove("active");
            navMenu.classList.remove("active");
        }));
    }
}

// Tab Navigation
function setupTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');

            // Remove active class from all tabs and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            btn.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });
}

// Check Backend Status
function checkBackendStatus() {
    fetch('http://localhost:5000/models', {
        method: 'GET',
        timeout: 3000
    })
    .then(response => response.json())
    .then(data => {
        backendAvailable = true;
        console.log('✓ Backend is running');
    })
    .catch(error => {
        backendAvailable = false;
        console.warn('✗ Backend not running');
        // showBackendWarning(); // Removed red warning banner as requested
    });
}

// Show Backend Not Running Warning
function showBackendWarning() {
    const container = document.querySelector('.forecasting-container');
    if (!container) return;
    
    const warning = document.createElement('div');
    warning.style.cssText = `
        background: linear-gradient(135deg, rgba(244, 67, 54, 0.15), rgba(233, 30, 99, 0.15));
        border: 2px solid #f44336;
        border-radius: 10px;
        padding: 20px;
        margin-bottom: 30px;
        color: #ff5252;
    `;
    warning.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 15px;">
            <div style="font-size: 1.5rem;">⚠️</div>
            <div style="flex: 1;">
                <h3 style="margin: 0 0 10px 0; color: #ff1744;">Backend Server Not Running</h3>
                <p style="margin: 0 0 15px 0; color: #ccc;">The ML prediction server is not running. Start it to get real model predictions. Otherwise, simulated predictions will be used.</p>
                <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 5px; font-family: monospace; font-size: 0.85rem; margin-bottom: 12px; border-left: 3px solid #ff6b6b;">
                    <p style="margin: 0; margin-bottom: 5px;">📂 Navigate to: <strong>backend/churn_server</strong></p>
                    <p style="margin: 0; margin-bottom: 5px;">▶️ Run: <strong>python app.py</strong></p>
                    <p style="margin: 0;">Or double-click: <strong>START_SERVER.bat</strong> (Windows)</p>
                </div>
                <button onclick="location.reload()" style="padding: 8px 20px; background: #ff6b6b; border: none; border-radius: 5px; color: white; font-weight: 500; cursor: pointer; transition: 0.2s;">🔄 Refresh Status</button>
            </div>
        </div>
    `;
    container.insertBefore(warning, container.firstChild);
}

// ============================================
// CHURN PREDICTION LOGIC
// ============================================

// Load predefined scenarios
function loadScenario(scenario) {
    if (scenario === 'good') {
        document.getElementById('mobileAge').value = 2.5;
        document.getElementById('networkType').value = 4;
        document.getElementById('downloadSpeed').value = 45.8;
        document.getElementById('uploadSpeed').value = 15.5;
        document.getElementById('satisfactionLevel').value = 8.5;
        document.getElementById('monthsActive').value = 24;
    } else if (scenario === 'risk') {
        document.getElementById('mobileAge').value = 0.5;
        document.getElementById('networkType').value = 4;
        document.getElementById('downloadSpeed').value = 12.0;
        document.getElementById('uploadSpeed').value = 3.5;
        document.getElementById('satisfactionLevel').value = 2.5;
        document.getElementById('monthsActive').value = 3;
    }

    // Auto-run prediction after loading scenario
    setTimeout(() => runChurnPrediction(), 500);
}

// Run Churn Prediction
function runChurnPrediction() {
    const features = buildChurnFeatureVector();

    // Show loading state
    const resultsContainer = document.getElementById('churnResults');
    resultsContainer.style.display = 'block';

    const rfResult = document.getElementById('rfResult');
    const xgbResult = document.getElementById('xgbResult');

    rfResult.innerHTML = '<h4>Random Forest Model</h4><div class="loading"></div>';
    xgbResult.innerHTML = '<h4>XGBoost Model</h4><div class="loading"></div>';

    // Try to fetch from backend
    Promise.all([
        fetchPredictionFromBackend(features, 'rf'),
        fetchPredictionFromBackend(features, 'xgb')
    ])
    .then(([rfPred, xgbPred]) => {
        const predictions = {
            rf: rfPred,
            xgb: xgbPred
        };
        displayChurnResults(predictions);
    })
    .catch(error => {
        console.warn('Backend not available, using mock predictions:', error);
        // Fallback to mock data
        setTimeout(() => {
            const predictions = generateChurnPredictions(features);
            displayChurnResultsWithWarning(predictions);
        }, 800);
    });
}

// Fetch prediction from backend API
function fetchPredictionFromBackend(features, modelKey) {
    const backendURL = 'http://localhost:5000/predict';
    
    // Build feature vector array (25 features as per test_predictions.py)
    const featureArray = [
        features.mobileAge,      // [0]
        features.networkType,    // [1]
        features.uploadSpeed,    // [2]
        features.downloadSpeed,  // [3]
        features.jitter,         // [4]
        features.packetLoss,     // [5]
        features.towerDensity,   // [6]
        features.signalStrength, // [7]
        features.congestion,     // [8]
        features.totalCalls,     // [9]
        features.issuesResolved, // [10]
        features.satisfactionLevel, // [11]
        features.monthsActive,   // [12]
        features.latencyScore,   // [13]
        1, 0,                    // [14-15] Device OS: Android=1
        0, 0, 1, 0,              // [16-19] Operator: Jio=1
        0, 0, 1,                 // [20-22] Plan Type: Yearly=1
        1, 0                     // [23-24] Payment: Postpaid=1
    ];

    return fetch(backendURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: modelKey,
            features: featureArray
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        const result = data.results[0];
        const churnProb = result.proba ? result.proba[1] : (result.prediction === 1 ? 0.7 : 0.3);
        
        return {
            prediction: result.label_telugu === 'ha' ? 'CHURN RISK' : 'SAFE',
            confidence: `Stay: ${((1 - churnProb) * 100).toFixed(1)}% | Churn: ${(churnProb * 100).toFixed(1)}%`,
            prob: churnProb
        };
    });
}

// Build feature vector from input values
function buildChurnFeatureVector() {
    const mobileAge = parseFloat(document.getElementById('mobileAge').value);
    const networkType = parseInt(document.getElementById('networkType').value);
    const uploadSpeed = parseFloat(document.getElementById('uploadSpeed').value);
    const downloadSpeed = parseFloat(document.getElementById('downloadSpeed').value);
    const jitter = 12.5;
    const packetLoss = 0.5;
    const towerDensity = 25.3;
    const signalStrength = -90;
    const congestion = 0.6;
    const totalCalls = 150;
    const issuesResolved = 140;
    const satisfactionLevel = parseFloat(document.getElementById('satisfactionLevel').value);
    const monthsActive = parseInt(document.getElementById('monthsActive').value);
    const latencyScore = 75.5;

    // Return feature array (matching test_predictions.py format)
    return {
        mobileAge,
        networkType,
        uploadSpeed,
        downloadSpeed,
        jitter,
        packetLoss,
        towerDensity,
        signalStrength,
        congestion,
        totalCalls,
        issuesResolved,
        satisfactionLevel,
        monthsActive,
        latencyScore
    };
}

// Generate mock churn predictions (simulating test_predictions.py)
function generateChurnPredictions(features) {
    // Calculate risk score based on features
    let riskScore = 0;

    // Negative factors increase risk
    riskScore += (features.mobileAge < 1) ? 25 : 0;
    riskScore += (features.downloadSpeed < 20) ? 20 : 0;
    riskScore += (features.satisfactionLevel < 4) ? 30 : 0;
    riskScore += (features.monthsActive < 6) ? 20 : 0;
    riskScore += (features.signalStrength < -100) ? 15 : 0;

    // Positive factors reduce risk
    riskScore -= (features.monthsActive > 24) ? 15 : 0;
    riskScore -= (features.satisfactionLevel > 7) ? 20 : 0;
    riskScore -= (features.downloadSpeed > 40) ? 15 : 0;

    riskScore = Math.max(0, Math.min(100, riskScore));

    // Random Forest prediction
    const rfChurnProb = riskScore / 100;
    const rfPrediction = rfChurnProb > 0.5 ? 1 : 0;
    const rfLabel = rfPrediction === 1 ? 'CHURN RISK' : 'SAFE';

    // XGBoost prediction (slightly different)
    const xgbChurnProb = (riskScore * 0.9 + 10) / 100;
    const xgbPrediction = xgbChurnProb > 0.55 ? 1 : 0;
    const xgbLabel = xgbPrediction === 1 ? 'CHURN RISK' : 'SAFE';

    return {
        rf: {
            prediction: rfLabel,
            confidence: `Stay: ${((1 - rfChurnProb) * 100).toFixed(1)}% | Churn: ${(rfChurnProb * 100).toFixed(1)}%`,
            prob: rfChurnProb
        },
        xgb: {
            prediction: xgbLabel,
            confidence: `Stay: ${((1 - xgbChurnProb) * 100).toFixed(1)}% | Churn: ${(xgbChurnProb * 100).toFixed(1)}%`,
            prob: xgbChurnProb
        }
    };
}

// Display churn prediction results
function displayChurnResults(predictions) {
    const rfResult = document.getElementById('rfResult');
    const xgbResult = document.getElementById('xgbResult');

    const rfColor = predictions.rf.prediction === 'CHURN RISK' ? '#f44336' : '#4caf50';
    const xgbColor = predictions.xgb.prediction === 'CHURN RISK' ? '#f44336' : '#4caf50';

    rfResult.innerHTML = `
        <h4>Random Forest Model</h4>
        <div class="prediction-output">
            <p style="font-size: 1.3rem; font-weight: bold; color: ${rfColor};">
                ${predictions.rf.prediction}
            </p>
            <p style="color: #888;">${predictions.rf.confidence}</p>
        </div>
    `;

    xgbResult.innerHTML = `
        <h4>XGBoost Model</h4>
        <div class="prediction-output">
            <p style="font-size: 1.3rem; font-weight: bold; color: ${xgbColor};">
                ${predictions.xgb.prediction}
            </p>
            <p style="color: #888;">${predictions.xgb.confidence}</p>
        </div>
    `;

    // Display summary
    const avgRisk = (predictions.rf.prob + predictions.xgb.prob) / 2;
    const summaryClass = avgRisk > 0.5 ? 'risk' : '';
    const summaryText = avgRisk > 0.5
        ? `⚠️ HIGH RISK: This customer profile shows a ${(avgRisk * 100).toFixed(1)}% probability of churn. Recommended actions: Personalized retention offer, Priority support tier, Network quality improvement check.`
        : `✓ LOW RISK: This customer profile shows a ${((1 - avgRisk) * 100).toFixed(1)}% probability of retention. Continue monitoring satisfaction levels and network quality.`;

    const summary = document.getElementById('churnSummary');
    summary.innerHTML = `<p>${summaryText}</p>`;
    summary.className = `result-summary ${summaryClass}`;
}

// Display churn results with backend warning
function displayChurnResultsWithWarning(predictions) {
    displayChurnResults(predictions);
    
//     // Add warning banner
//     const resultsContainer = document.getElementById('churnResults');
//     const warning = document.createElement('div');
//     warning.style.cssText = `
//         background: rgba(244, 152, 35, 0.2);
//         border: 2px solid #f89823;
//         border-radius: 8px;
//         padding: 15px;
//         margin-top: 20px;
//         color: #ffa500;
//         font-weight: 500;
//     `;
//     warning.innerHTML = `
//         <p style="margin: 0; margin-bottom: 10px;">⚠️ <strong>Backend Not Running - Using Simulated Predictions</strong></p>
//         <p style="margin: 0; font-size: 0.9rem; color: #ccc; margin-bottom: 10px;">For accurate ML model predictions, start the backend server:</p>
//         <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px; font-family: monospace; font-size: 0.85rem; margin-top: 8px;">
//             <p style="margin: 0;">cd backend/churn_server</p>
//             <p style="margin: 5px 0 0 0;">python app.py</p>
//         </div>
//         <p style="margin: 8px 0 0 0; font-size: 0.9rem;">Then refresh this page and run the prediction again.</p>
//     `;
//     resultsContainer.appendChild(warning);
}

// ============================================
// SIGNAL STRENGTH FORECASTING LOGIC
// ============================================

// Generate mock signal strength data (from untitled5.py)
function generateMockSignalData() {
    const operators = ['Airtel', 'Jio', 'Vi', 'BSNL'];
    const today = new Date();

    operators.forEach(op => {
        mockSignalData[op] = [];
        const baseSignal = Math.random() * 40 - 100; // Between -100 and -60 dBm

        for (let i = 0; i < 90; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);

            // Add realistic variation (SARIMAX-like pattern)
            const seasonalFactor = Math.sin(i / 7) * 5; // Weekly pattern
            const randomNoise = (Math.random() - 0.5) * 8; // Random noise
            const trend = -0.1 * i; // Slight degradation trend

            const signal = baseSignal + seasonalFactor + randomNoise + trend;

            mockSignalData[op].push({
                date: date.toISOString().split('T')[0],
                signal: parseFloat(signal.toFixed(2))
            });
        }
    });
}

// Generate mock latency data (from untitled5.py time-series analysis)
function generateMockLatencyData() {
    const operators = ['Airtel', 'Jio', 'Vi', 'BSNL'];
    const today = new Date();

    operators.forEach(op => {
        mockLatencyData[op] = [];
        const baseLatency = Math.random() * 80 + 20; // Between 20-100 ms

        for (let i = 0; i < 90; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);

            // Add realistic variation (SARIMAX-like pattern)
            const seasonalFactor = Math.sin(i / 7) * 8; // Weekly pattern - peak during weekends
            const randomNoise = (Math.random() - 0.5) * 12; // Random noise
            const trend = 0.05 * i; // Slight increase trend (network load)
            const peakHours = (Math.sin(i / 4) * 15); // Peak hours effect

            const latency = baseLatency + seasonalFactor + randomNoise + trend + peakHours;

            mockLatencyData[op].push({
                date: date.toISOString().split('T')[0],
                latency: parseFloat(Math.max(5, latency).toFixed(2)) // Min 5ms
            });
        }
    });
}

// Run Latency Forecast
function runSignalForecast() {
    const selectedOperator = document.getElementById('operatorSelect').value;
    const forecastDays = parseInt(document.getElementById('forecastDays').value);

    // Show loading state
    document.getElementById('signalChartContainer').style.display = 'none';
    document.getElementById('signalTableContainer').style.display = 'none';

    // Simulate processing
    setTimeout(() => {
        updateSignalChart();
    }, 1000);
}

// Update Signal Strength Chart
function updateSignalChart() {
    const selectedOperator = document.getElementById('operatorSelect').value;
    const forecastDays = parseInt(document.getElementById('forecastDays').value);

    const chartContainer = document.getElementById('signalChartContainer');
    const tableContainer = document.getElementById('signalTableContainer');

    chartContainer.style.display = 'block';
    tableContainer.style.display = 'block';

    // Prepare data for chart
    let datasets = [];
    const colors = {
        'Airtel': '#FF6B35',
        'Jio': '#004687',
        'Vi': '#FF0000',
        'BSNL': '#004D40'
    };

    if (selectedOperator === 'all') {
        Object.keys(mockSignalData).forEach(op => {
            const data = mockSignalData[op].slice(0, forecastDays);
            datasets.push({
                label: op,
                data: data.map(d => d.signal),
                borderColor: colors[op],
                backgroundColor: colors[op] + '20',
                borderWidth: 2,
                tension: 0.4,
                fill: false
            });
        });
    } else {
        const data = mockSignalData[selectedOperator].slice(0, forecastDays);
        datasets.push({
            label: selectedOperator,
            data: data.map(d => d.signal),
            borderColor: colors[selectedOperator],
            backgroundColor: colors[selectedOperator] + '40',
            borderWidth: 3,
            tension: 0.4,
            fill: true
        });
    }

    // Get labels (dates)
    const labels = mockSignalData[Object.keys(mockSignalData)[0]]
        .slice(0, forecastDays)
        .map(d => d.date);

    // Destroy previous chart if exists
    if (signalChart) {
        signalChart.destroy();
    }

    // Create chart
    const ctx = document.getElementById('signalChart').getContext('2d');
    signalChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#ccc',
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#666',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + ' dBm';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: -130,
                    max: -50,
                    reverse: true, // Signal strength is better when less negative
                    ticks: {
                        color: '#888',
                        font: { size: 11 }
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.05)'
                    },
                    title: {
                        display: true,
                        text: 'Signal Strength (dBm)'
                    }
                },
                x: {
                    ticks: {
                        color: '#888',
                        font: { size: 10 },
                        maxTicksLimit: 10
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.05)'
                    }
                }
            }
        }
    });

    // Update table
    updateSignalTable(selectedOperator, forecastDays);
}

// Update Signal Table
function updateSignalTable(operator, days) {
    const tableBody = document.getElementById('signalTableBody');
    tableBody.innerHTML = '';

    const operators = operator === 'all' ? ['Airtel', 'Jio', 'Vi', 'BSNL'] : [operator];

    // Get the first N days
    for (let i = 0; i < days; i += Math.ceil(days / 10)) { // Show 10 rows max
        if (i >= days) break;

        const row = document.createElement('tr');
        const date = mockSignalData['Airtel'][i].date;

        let dateCell = `<td>${date}</td>`;

        operators.forEach(op => {
            const signal = mockSignalData[op][i].signal;
            let quality = '';

            if (signal > -80) quality = '<span style="color: #4CAF50;">Excellent</span>';
            else if (signal > -100) quality = '<span style="color: #FFC107;">Good</span>';
            else if (signal > -120) quality = '<span style="color: #FF9800;">Fair</span>';
            else quality = '<span style="color: #F44336;">Poor</span>';

            dateCell += `<td>${signal} dBm<br>${quality}</td>`;
        });

        row.innerHTML = dateCell;
        tableBody.appendChild(row);
    }
}

// ============================================
// LATENCY FORECASTING LOGIC
// ============================================

// Run Latency Forecast
function runLatencyForecast() {
    const selectedOperator = document.getElementById('latencyOperatorSelect').value;
    const forecastDays = parseInt(document.getElementById('latencyForecastDays').value);

    // Show loading state
    document.getElementById('latencyChartContainer').style.display = 'none';
    document.getElementById('latencyTableContainer').style.display = 'none';

    // Simulate processing
    setTimeout(() => {
        updateLatencyChart();
    }, 1000);
}

// Update Latency Chart
function updateLatencyChart() {
    const selectedOperator = document.getElementById('latencyOperatorSelect').value;
    const forecastDays = parseInt(document.getElementById('latencyForecastDays').value);

    const chartContainer = document.getElementById('latencyChartContainer');
    const tableContainer = document.getElementById('latencyTableContainer');

    chartContainer.style.display = 'block';
    tableContainer.style.display = 'block';

    // Prepare data for chart
    let datasets = [];
    const colors = {
        'Airtel': '#FF6B35',
        'Jio': '#004687',
        'Vi': '#FF0000',
        'BSNL': '#004D40'
    };

    if (selectedOperator === 'all') {
        Object.keys(mockLatencyData).forEach(op => {
            const data = mockLatencyData[op].slice(0, forecastDays);
            datasets.push({
                label: op,
                data: data.map(d => d.latency),
                borderColor: colors[op],
                backgroundColor: colors[op] + '20',
                borderWidth: 2,
                tension: 0.4,
                fill: false
            });
        });
    } else {
        const data = mockLatencyData[selectedOperator].slice(0, forecastDays);
        datasets.push({
            label: selectedOperator,
            data: data.map(d => d.latency),
            borderColor: colors[selectedOperator],
            backgroundColor: colors[selectedOperator] + '40',
            borderWidth: 3,
            tension: 0.4,
            fill: true
        });
    }

    // Get labels (dates)
    const labels = mockLatencyData[Object.keys(mockLatencyData)[0]]
        .slice(0, forecastDays)
        .map(d => d.date);

    // Destroy previous chart if exists
    if (latencyChart) {
        latencyChart.destroy();
    }

    // Create chart
    const ctx = document.getElementById('latencyChart').getContext('2d');
    latencyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#ccc',
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#666',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + ' ms';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 200,
                    ticks: {
                        color: '#888',
                        font: { size: 11 }
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.05)'
                    },
                    title: {
                        display: true,
                        text: 'Latency (ms)'
                    }
                },
                x: {
                    ticks: {
                        color: '#888',
                        font: { size: 10 },
                        maxTicksLimit: 10
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.05)'
                    }
                }
            }
        }
    });

    // Update table
    updateLatencyTable(selectedOperator, forecastDays);
}

// Update Latency Table
function updateLatencyTable(operator, days) {
    const tableBody = document.getElementById('latencyTableBody');
    tableBody.innerHTML = '';

    const operators = operator === 'all' ? ['Airtel', 'Jio', 'Vi', 'BSNL'] : [operator];

    // Get the first N days
    for (let i = 0; i < days; i += Math.ceil(days / 10)) { // Show 10 rows max
        if (i >= days) break;

        const row = document.createElement('tr');
        const date = mockLatencyData['Airtel'][i].date;

        let dateCell = `<td>${date}</td>`;

        operators.forEach(op => {
            const latency = mockLatencyData[op][i].latency;
            let quality = '';

            if (latency < 20) quality = '<span style="color: #4CAF50;">Excellent</span>';
            else if (latency < 50) quality = '<span style="color: #8BC34A;">Good</span>';
            else if (latency < 100) quality = '<span style="color: #FFC107;">Fair</span>';
            else quality = '<span style="color: #F44336;">Poor</span>';

            dateCell += `<td>${latency} ms<br>${quality}</td>`;
        });

        row.innerHTML = dateCell;
        tableBody.appendChild(row);
    }
}

// Export utility functions
window.runChurnPrediction = runChurnPrediction;
window.loadScenario = loadScenario;
window.runSignalForecast = runSignalForecast;
window.updateSignalChart = updateSignalChart;
window.runLatencyForecast = runLatencyForecast;
window.updateLatencyChart = updateLatencyChart;
window.toggleProfileDropdown = toggleProfileDropdown;

// Profile dropdown handler
function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('profileDropdown');
    const profileCircle = document.getElementById('navProfileCircle');

    if (!dropdown.contains(e.target) && !profileCircle.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});
