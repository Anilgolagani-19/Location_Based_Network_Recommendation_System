document.addEventListener('DOMContentLoaded', () => {
    let allPlans = [];
    let operatorData = null;
    let currentCategory = 'True 5G Unlimited Plans';
    let isViewAll = false; // Track View All state
    const PLANS_TO_SHOW = 6;

    const plansContainer = document.getElementById('plansContainer');
    const categoryList = document.getElementById('categoryList');
    const categoryTitle = document.getElementById('selectedCategoryTitle');

    // Add "View All" container if not exists
    let viewAllContainer = document.getElementById('viewAllContainer');
    if (!viewAllContainer) {
        viewAllContainer = document.createElement('div');
        viewAllContainer.id = 'viewAllContainer';
        viewAllContainer.style.textAlign = 'center';
        viewAllContainer.style.marginTop = '2rem';
        viewAllContainer.style.gridColumn = '1 / -1';
        plansContainer.parentElement.appendChild(viewAllContainer);
    }

    // Add "Official Website" button container if not exists (in header)
    const headerDetails = document.querySelector('.header-details');
    if (headerDetails) {
        // Check if button already exists
        if (!headerDetails.querySelector('.official-site-btn')) {
            const btn = document.createElement('button');
            btn.className = 'btn-recharge official-site-btn';
            btn.textContent = 'Visit Official Website';
            btn.style.marginTop = '10px';
            btn.style.marginLeft = '0';
            btn.style.backgroundColor = 'transparent';
            btn.style.border = '1px solid rgba(255,255,255,0.3)';

            btn.addEventListener('click', () => {
                if (operatorData && operatorData.officialWebsite) {
                    window.open(operatorData.officialWebsite, '_blank');
                } else {
                    alert('Website link not available');
                }
            });
            headerDetails.appendChild(btn);
        }
    }


    fetch('data/operators.json')
        .then(response => response.json())
        .then(data => {
            operatorData = data.operators.find(op => op.id === 'jio');
            if (operatorData && operatorData.plans) {
                allPlans = operatorData.plans;

                // Initialize Category
                if (operatorData.planCategories && operatorData.planCategories.length > 0) {
                    // Try to match specific default
                    if (operatorData.planCategories.includes('True 5G Unlimited')) {
                        currentCategory = 'True 5G Unlimited';
                    } else {
                        currentCategory = operatorData.planCategories[0];
                    }
                }

                // Render Categories (if list is empty in HTML, populate it)
                if (categoryList.children.length === 0 && operatorData.planCategories) {
                    operatorData.planCategories.forEach(cat => {
                        const li = document.createElement('li');
                        li.className = 'category-item';
                        if (cat === currentCategory) li.classList.add('active');
                        li.setAttribute('data-category', cat);
                        li.textContent = cat;
                        categoryList.appendChild(li);
                    });
                } else {
                    // Just set active class
                    document.querySelectorAll('.category-item').forEach(item => {
                        if (item.textContent.trim() === currentCategory) item.classList.add('active');
                    });
                }

                categoryTitle.textContent = currentCategory;
                renderPlans();
            } else {
                console.error('Jio data not found');
                plansContainer.innerHTML = '<p>Error loading plans.</p>';
            }
        })
        .catch(err => console.error('Error loading plans:', err));

    function renderPlans() {
        plansContainer.innerHTML = '';
        viewAllContainer.innerHTML = '';

        // Filter logic
        const filteredPlans = allPlans.filter(plan => {
            // Flexible matching
            return plan.category === currentCategory ||
                (currentCategory.includes('5G') && plan.category && plan.category.includes('5G')) ||
                (currentCategory === 'Popular Plans' && (plan.popular || plan.category === 'Popular Plans'));
        });

        if (filteredPlans.length === 0) {
            plansContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #fff;">No plans found for this category.</div>';
            return;
        }

        const plansToRender = isViewAll ? filteredPlans : filteredPlans.slice(0, PLANS_TO_SHOW);

        plansToRender.forEach(plan => {
            const card = document.createElement('div');
            card.className = 'plan-card';

            // Badge logic
            let badgeHtml = '';
            if (plan.badge) {
                badgeHtml = `<div class="card-badge ${plan.badge.includes("HERO") ? 'hero' : ''}">${plan.badge}</div>`;
            } else if (plan.tag) {
                badgeHtml = `<div class="card-badge">${plan.tag}</div>`;
            } else if (plan.isRecommended) {
                badgeHtml = `<div class="card-badge">RECOMMENDED</div>`;
            }

            // Benefits tags
            const benefitsHtml = plan.features ? plan.features.map(f => `<span class="benefit-tag">${f}</span>`).join('') : '';

            // OTT Icons
            let ottHtml = '';
            if (plan.features) {
                if (plan.features.some(f => f.toLowerCase().includes('netflix'))) ottHtml += `<div class="ott-icon" style="background:#E50914; color:white">N</div>`;
                if (plan.features.some(f => f.toLowerCase().includes('hotstar'))) ottHtml += `<div class="ott-icon" style="background:#0c1d63; color:white">H</div>`;
                if (plan.features.some(f => f.toLowerCase().includes('prime'))) ottHtml += `<div class="ott-icon" style="background:#00A8E1; color:white">P</div>`;
                if (plan.features.some(f => f.toLowerCase().includes('jio'))) ottHtml += `<div class="ott-icon" style="background:#0f3cc9; color:white">J</div>`;
            }

            card.innerHTML = `
                ${badgeHtml}
                <div class="plan-header">
                    <div class="plan-price">${plan.price}</div>
                    <div class="plan-validity">
                        <span class="val-days">${plan.validity}</span>
                        Validity
                    </div>
                </div>
                <div class="plan-details">
                    <div>
                        <div class="data-info">${plan.data}</div>
                        <div class="voice-info">Data</div>
                    </div>
                    <div style="text-align:right">
                        <div class="data-info">Unlimited</div>
                        <div class="voice-info">Voice</div>
                    </div>
                </div>
                <div class="plan-benefits">
                    <div style="margin-bottom:0.5rem; font-size:0.85rem; color:rgba(255,255,255,0.7); font-weight:500;">Subscriptions & Benefits</div>
                    ${benefitsHtml}
                    <div class="ott-icons">
                        ${ottHtml}
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn-recharge" onclick="window.location.href='https://www.jio.com/selfcare/recharge/mobility/'">Recharge</button>
                    <button class="btn-details">View Details</button>
                </div>
            `;
            plansContainer.appendChild(card);
        });

        // View All Button Logic
        if (filteredPlans.length > PLANS_TO_SHOW) {
            const viewAllBtn = document.createElement('button');
            viewAllBtn.className = 'btn-recharge'; // Use button style
            viewAllBtn.style.width = 'auto';
            viewAllBtn.style.padding = '12px 40px';
            viewAllBtn.style.margin = '2rem auto';
            viewAllBtn.style.display = 'block';
            viewAllBtn.style.backgroundColor = 'transparent';
            viewAllBtn.style.border = '1px solid rgba(255,255,255,0.3)';
            viewAllBtn.style.color = 'white';
            viewAllBtn.textContent = isViewAll ? 'Show Fewer Plans' : `View All ${filteredPlans.length} Plans`;

            viewAllBtn.addEventListener('click', () => {
                isViewAll = !isViewAll;
                renderPlans();

                // Smooth scroll to top of plans if viewing all
                if (isViewAll) {
                    plansContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });

            viewAllContainer.appendChild(viewAllBtn);
        }
    }

    // Category Click Handling
    categoryList.addEventListener('click', (e) => {
        if (e.target.classList.contains('category-item')) {
            // Update UI
            document.querySelectorAll('.category-item').forEach(item => item.classList.remove('active'));
            e.target.classList.add('active');

            // Update State
            currentCategory = e.target.getAttribute('data-category') || e.target.textContent;
            categoryTitle.textContent = currentCategory;
            isViewAll = false; // Reset view all on category switch

            // Re-render
            renderPlans();
        }
    });

});
