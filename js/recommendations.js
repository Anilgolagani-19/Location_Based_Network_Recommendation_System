// Recommendations Logic
document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('recommendations-grid');

    try {
        // Load data
        await dataProcessor.loadData();

        // Load filters from localStorage
        const savedFilters = localStorage.getItem('dashboardFilters');
        if (savedFilters) {
            const parsed = JSON.parse(savedFilters);
            Object.keys(parsed).forEach(key => {
                dataProcessor.updateFilter(key, parsed[key]);
            });
        }

        // Calculate best operator for the area
        // We use the same logic as dashboard but specifically for the recommendation context
        const kpis = dataProcessor.calculateKPIs('score');
        const bestOperator = kpis.bestOperator.toUpperCase();

        // Get actual performance stats for these filters
        const opPerformance = dataProcessor.getOperatorPerformance();

        // Load all operators info from operators.json
        const response = await fetch('../data/operators.json');
        const data = await response.json();
        const operators = data.operators;

        grid.innerHTML = '';

        operators.forEach(op => {
            const opId = op.id.toUpperCase();
            const isBest = opId === bestOperator || op.name.toUpperCase() === bestOperator;

            // Get performance data
            const perf = opPerformance[opId] || { avgDownload: 'N/A', rawScore: 0 };
            const speed = perf.avgDownload !== 'N/A' ? `${perf.avgDownload} Mbps` : op.stats.avgSpeed;
            const scoreLabel = perf.avgDownload !== 'N/A' ? dataProcessor.getScoreLabel(perf.rawScore) : 'N/A';
            const scoreValue = perf.avgDownload !== 'N/A' ? (perf.rawScore * 100).toFixed(0) + '%' : 'N/A';

            // Find starting price from plans (Minimum 28 days validity, excluding Data Only)
            const validPlans = op.plans.filter(p => {
                const validityStr = p.validity.toLowerCase();
                const categoryStr = p.category.toLowerCase();
                const nameStr = p.name.toLowerCase();

                const isDataOnly = categoryStr.includes('data') || nameStr.includes('data') || validityStr.includes('active plan') || validityStr === '1 day';
                const isLongEnough = validityStr.includes('days') && parseInt(validityStr) >= 28 || validityStr.includes('month');
                return isLongEnough && !isDataOnly;
            });

            // ... (rest of filtering)
            const prices = validPlans.map(p => parseInt(p.price.replace('₹', '')));
            const minPrice = prices.length > 0 ? Math.min(...prices) : null;
            const startingPrice = minPrice ? `₹${minPrice}` : 'N/A';

            const card = document.createElement('div');
            card.className = `recommendation-card ${op.id} ${isBest ? 'is-best' : ''}`;

            card.innerHTML = `
                <div class="recommended-badge">RECOMMENDED</div>
                <div class="op-header">
                    <div class="op-logo">${op.logo}</div>
                    <div class="op-name" ${opId === 'BSNL' ? 'style="display:none;"' : ''}>${op.name}</div>
                </div>
                <div class="op-stats">
                    <div class="stat-box">
                        <span class="stat-label">Avg Speed</span>
                        <span class="stat-value">${speed}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Plans start from</span>
                        <span class="stat-value">${startingPrice}</span>
                    </div>
                    <div class="stat-box" style="grid-column: span 2;">
                        <span class="stat-label">Network Score</span>
                        <span class="stat-value ${scoreLabel.toLowerCase()}">${scoreLabel}</span>
                    </div>
                </div>
                <p style="font-size: 0.9rem; color: rgba(255, 255, 255, 0.6); margin-bottom: 25px; line-height: 1.5;">
                    Highly rated for ${op.id === 'jio' ? '5G speeds' : op.id === 'airtel' ? 'consistency' : 'value plans'} in ${dataProcessor.filters.area !== 'All' ? dataProcessor.filters.area : dataProcessor.filters.city || 'your area'}.
                </p>
                <button class="view-plans-btn" onclick="window.location.href='${getOperatorLink(op.id)}'">
                    Explore Plans <i class="bi bi-arrow-right"></i>
                </button>
            `;

            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading recommendations:', error);
        grid.innerHTML = '<div class="error">Failed to load recommendations. Please try again.</div>';
    }
});

// Helper to get operator page link
function getOperatorLink(id) {
    const map = {
        'jio': '../jio-plans.html',
        'airtel': '../airtel-plans.html',
        'vi': '../vi-plans.html',
        'bsnl': '../bsnl-plans.html'
    };
    return map[id.toLowerCase()] || '../operators.html';
}
