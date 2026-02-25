import { analytics } from './analytics.js';

// Initialize Charts
let chartFunnel, chartSessionTrend, chartOpPlanViews, chartOpGetSim;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log("[MySights] Initializing...");

        // Safety: Check dependencies
        if (typeof Chart === 'undefined') {
            console.error("❌ Chart.js not loaded");
            return;
        }

        // Check if analytics module is loaded
        if (!analytics || !analytics.getDashboardMetrics) {
            console.error("❌ Analytics module not properly loaded");
            return;
        }

        console.log("[MySights] ✅ All dependencies ready");

        // Fetch Data
        console.log("[MySights] Fetching metrics from analytics...");
        const data = await analytics.getDashboardMetrics();
        console.log("[MySights] ✅ Data received:", data);

        // Check if data is valid
        if (!data) {
            console.error("❌ Analytics returned no data");
            throw new Error("No data from analytics service");
        }

        // Update KPIs with safety
        updateKPI('kpi-total-users', data.totalUsers);

        // Format minutes/seconds for avg session
        const duration = data.avgSessionTime || 0;
        const avgMin = Math.floor(duration / 60);
        const avgSec = duration % 60;
        updateKPI('kpi-avg-session', `${avgMin}m ${avgSec}s`);

        updateKPI('kpi-location-sub', data.locationSubmissions);
        updateKPI('kpi-more-clicks', data.totalPlanViews);
        updateKPI('kpi-plan-views', data.totalPlanViews);
        updateKPI('kpi-get-sim', data.totalGetSimClicks);

        console.log("[MySights] ✅ KPIs updated");

        // Render Charts with Element Checks
        renderFunnel(data);
        renderSessionTrend(data);
        renderSessionCount(data);
        renderSubmissionsCount(data);
        renderOpPlanViews(data);
        renderOpGetSim(data);

        console.log("[MySights] ✅ All charts rendered successfully");

    } catch (e) {
        console.error("[MySights] ❌ Critical Error:", e);
        console.error("[MySights] Stack Trace:", e.stack);
        
        // Show error message to user
        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 16px;
            border-radius: 8px;
            z-index: 1000;
            max-width: 400px;
        `;
        errorMsg.innerHTML = `
            <strong>⚠️ Error Loading Insights</strong><br>
            ${e.message}<br>
            <small>Check browser console for details</small>
        `;
        document.body.appendChild(errorMsg);
    }
});

function updateKPI(id, value) {
    const el = document.getElementById(id);
    if (el) {
        if (typeof value === 'string' && isNaN(parseInt(value))) {
            el.textContent = value;
            return;
        }

        let start = 0;
        const end = parseInt(value) || 0;
        if (end === 0) { el.textContent = '0'; return; }

        const duration = 1000;
        const timer = setInterval(() => {
            start += Math.ceil(end / 20) || 1;
            if (start >= end) start = end;
            el.textContent = start.toLocaleString();
            if (start === end) clearInterval(timer);
        }, 50);

        // Immediate set for mixed strings
        if (typeof value === 'string' && /[a-zA-Z]/.test(value)) {
            el.textContent = value;
            clearInterval(timer);
        }
    }
}

function renderFunnel(data) {
    const canvas = document.getElementById('chartFunnel');
    if (!canvas) return;

    // Ensure parent has relative positioning for responsiveness
    if (canvas.parentElement) canvas.parentElement.style.position = 'relative';

    const login = data.totalUsers || 0;
    const submit = data.locationSubmissions || 0;
    const more = data.totalPlanViews || 0;
    const planView = Math.round(more * 0.8);
    const redirect = data.totalGetSimClicks || 0;

    chartFunnel = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: ['Login', 'Submit', 'More', 'Plan View', 'Redirect'],
            datasets: [{
                label: 'Users',
                data: [login, submit, more, planView, redirect],
                backgroundColor: '#1E88E5',
                borderRadius: 4,
                barPercentage: 0.6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff' } },
                y: { grid: { display: false }, ticks: { color: '#fff' } }
            }
        }
    });
}

function renderSessionTrend(data) {
    const canvas = document.getElementById('chartSessionTrend');
    if (!canvas) return;

    // Filter out dates with no data (0 values) to avoid cluttering the graph
    const dates = data.charts.dates || [];
    const avgSessionTrend = data.charts.avgSessionTrend || [];
    
    // Create filtered arrays to show only dates with data
    const filteredDates = [];
    const filteredTrend = [];
    
    for (let i = 0; i < dates.length; i++) {
        if (avgSessionTrend[i] > 0 || (data.charts.dailySessions && data.charts.dailySessions[i] > 0)) {
            filteredDates.push(dates[i]);
            filteredTrend.push(avgSessionTrend[i]);
        }
    }

    console.log("[MySights] Session Trend Data:", {
        dates: filteredDates,
        avgSessionTrend: filteredTrend,
        rawData: data.charts
    });

    chartSessionTrend = new Chart(canvas, {
        type: 'line',
        data: {
            labels: filteredDates.length > 0 ? filteredDates : dates,
            datasets: [{
                label: 'Avg Session (sec)',
                data: filteredTrend.length > 0 ? filteredTrend : avgSessionTrend,
                borderColor: '#4A90E2',
                backgroundColor: 'rgba(74, 144, 226, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff' } },
                x: { grid: { display: false }, ticks: { color: '#fff' } }
            }
        }
    });
}

function renderSessionCount(data) {
    const canvas = document.getElementById('chartSessionCount');
    if (!canvas) return;

    // Filter out dates with no sessions to avoid cluttering the graph
    const dates = data.charts.dates || [];
    const sessionsData = data.charts.dailySessions || [];
    
    // Create filtered arrays to show only dates with data
    const filteredDates = [];
    const filteredSessions = [];
    
    for (let i = 0; i < dates.length; i++) {
        if (sessionsData[i] > 0) {
            filteredDates.push(dates[i]);
            filteredSessions.push(sessionsData[i]);
        }
    }

    console.log("[MySights] Sessions Count Data:", {
        dates: filteredDates,
        sessions: filteredSessions,
        rawData: sessionsData
    });

    const chartSessionCount = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: filteredDates.length > 0 ? filteredDates : dates,
            datasets: [{
                label: 'Sessions',
                data: filteredSessions.length > 0 ? filteredSessions : sessionsData,
                backgroundColor: '#10b981',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff' } },
                x: { grid: { display: false }, ticks: { color: '#fff' } }
            }
        }
    });
}

function renderSubmissionsCount(data) {
    const canvas = document.getElementById('chartSubmissionsCount');
    if (!canvas) return;

    // Filter out dates with no submissions to avoid cluttering the graph
    const dates = data.charts.dates || [];
    const submissionsData = data.charts.dailySubmissions || [];
    
    // Create filtered arrays to show only dates with data
    const filteredDates = [];
    const filteredSubmissions = [];
    
    for (let i = 0; i < dates.length; i++) {
        if (submissionsData[i] > 0) {
            filteredDates.push(dates[i]);
            filteredSubmissions.push(submissionsData[i]);
        }
    }

    console.log("[MySights] Submissions Count Data:", {
        dates: filteredDates,
        submissions: filteredSubmissions,
        rawData: submissionsData
    });

    const chartSubmissionsCount = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: filteredDates.length > 0 ? filteredDates : dates,
            datasets: [{
                label: 'Submissions',
                data: filteredSubmissions.length > 0 ? filteredSubmissions : submissionsData,
                backgroundColor: '#f59e0b',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff' } },
                x: { grid: { display: false }, ticks: { color: '#fff' } }
            }
        }
    });
}

function renderOpPlanViews(data) {
    const canvas = document.getElementById('chartOpPlanViews');
    if (!canvas) return;

    const ops = data.charts.opPlanViews || { jio: 0, airtel: 0, vi: 0, bsnl: 0 };

    chartOpPlanViews = new Chart(canvas, {
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
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff' } },
                x: { grid: { display: false }, ticks: { color: '#fff' } }
            }
        }
    });
}

function renderOpGetSim(data) {
    const canvas = document.getElementById('chartOpGetSim');
    if (!canvas) return;

    const ops = data.charts.opGetSimClicks || { jio: 0, airtel: 0, vi: 0, bsnl: 0 };

    chartOpGetSim = new Chart(canvas, {
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
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff' } },
                x: { grid: { display: false }, ticks: { color: '#fff' } }
            }
        }
    });
}

// Razorpay Integration
window.initiateRazorpay = function (amount, planName) {
    const options = {
        "key": "rzp_test_S7Gb21AIbAKorp",
        "amount": amount * 100,
        "currency": "INR",
        "name": "TeleSignal",
        "description": `Boost Operator - ${planName} Plan`,
        "image": "https://cdn-icons-png.flaticon.com/512/3616/3616927.png",
        "handler": function (response) {
            alert(`Payment Successful!\nPayment ID: ${response.razorpay_payment_id}\n\nYour operator boost is now active.`);
            const modalEl = document.getElementById('subscriptionModal');
            let modal = bootstrap.Modal.getInstance(modalEl);
            if (!modal && typeof bootstrap !== 'undefined') {
                modal = new bootstrap.Modal(modalEl);
            }
            if (modal) modal.hide();
        },
        "prefill": {
            "name": localStorage.getItem('userName') || "Admin User",
            "email": localStorage.getItem('userEmail') || "admin@telesignal.com",
            "contact": "9999999999"
        },
        "theme": {
            "color": "#1e3a8a"
        }
    };

    try {
        const rzp1 = new Razorpay(options);
        rzp1.open();
    } catch (e) {
        alert("Razorpay Error: Ensure you are connected to the internet. (Using Dummy Mode)");
    }
};
