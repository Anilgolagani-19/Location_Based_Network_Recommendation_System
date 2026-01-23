document.addEventListener('DOMContentLoaded', () => {
    let allPlans = [];
    let operatorData = null;
    let currentCategory = 'Unlimited 5G';
    let isViewAll = false;
    const PLANS_TO_SHOW = 6;

    const plansContainer = document.getElementById('plansContainer');
    const categoryList = document.getElementById('categoryList');

    // Check if category title element exists, if not create/find it
    let categoryTitle = document.getElementById('selectedCategoryTitle');
    if (!categoryTitle) {
        // Fallback or insert if needed. Usually it should be in HTML.
    }

    // Add "View All" container
    let viewAllContainer = document.getElementById('viewAllContainer');
    if (!viewAllContainer) {
        viewAllContainer = document.createElement('div');
        viewAllContainer.id = 'viewAllContainer';
        viewAllContainer.style.textAlign = 'center';
        viewAllContainer.style.marginTop = '2rem';
        viewAllContainer.style.gridColumn = '1 / -1';
        plansContainer.parentElement.appendChild(viewAllContainer);
    }

    // Add "Official Website" button in header
    const headerContent = document.querySelector('.header-content');
    if (headerContent) {
        if (!headerContent.querySelector('.official-site-btn')) {
            const btn = document.createElement('button');
            btn.className = 'btn-recharge official-site-btn'; // Use existing class for styling
            btn.textContent = 'Visit Official Website';
            btn.style.marginTop = '15px';
            btn.style.backgroundColor = 'white';
            btn.style.color = '#E63946'; // Airtel Red
            btn.style.border = 'none';
            btn.style.padding = '10px 20px';
            btn.style.borderRadius = '5px';
            btn.style.fontWeight = '600';
            btn.style.cursor = 'pointer';

            btn.addEventListener('click', () => {
                if (operatorData && operatorData.officialWebsite) {
                    window.open(operatorData.officialWebsite, '_blank');
                } else {
                    alert('Website link not available');
                }
            });
            headerContent.appendChild(btn);
        }
    }

    fetch('data/operators.json')
        .then(res => res.json())
        .then(data => {
            operatorData = data.operators.find(op => op.id === 'airtel');
            if (operatorData && operatorData.plans) {
                allPlans = operatorData.plans;

                // Initialize Category
                if (operatorData.planCategories && operatorData.planCategories.length > 0) {
                    currentCategory = operatorData.planCategories[0];
                }

                // Render Categories
                if (categoryList.children.length === 0 && operatorData.planCategories) {
                    operatorData.planCategories.forEach((cat, index) => {
                        const li = document.createElement('li');
                        li.className = index === 0 ? 'active' : '';
                        li.setAttribute('data-category', cat);
                        li.textContent = cat;
                        categoryList.appendChild(li);
                    });
                }

                renderPlans();
            }
        })
        .catch(err => console.error("Error loading airtel plans", err));

    function renderPlans() {
        plansContainer.innerHTML = '';
        viewAllContainer.innerHTML = '';

        const filtered = allPlans.filter(p => p.category === currentCategory || (currentCategory === 'Unlimited 5G' && p.features.some(f => f.includes('5G'))));

        if (filtered.length === 0) {
            plansContainer.innerHTML = '<p style="color:white; text-align:center; grid-column:1/-1;">No plans found for this category.</p>';
            return;
        }

        const plansToRender = isViewAll ? filtered : filtered.slice(0, PLANS_TO_SHOW);

        plansToRender.forEach(plan => {
            const div = document.createElement('div');
            div.className = 'plan-card';

            // Badge logic
            let badgeHtml = '';
            if (plan.isBestValue) {
                badgeHtml = `<div class="badge" style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #000;">BEST VALUE</div>`;
            } else if (plan.isRecommended) {
                badgeHtml = `<div class="badge">RECOMMENDED</div>`;
            }

            // Benefits
            const featuresHtml = plan.features.slice(0, 4).map(f => `<div class="feature">✓ ${f}</div>`).join('');

            div.innerHTML = `
                ${badgeHtml}
                <div class="price">${plan.price}</div>
                <div class="validity" style="color: #ccc; margin-bottom: 15px;">
                    VALIDITY: <strong style="color: white">${plan.validity}</strong> • DATA: <strong style="color: white">${plan.data}</strong>
                </div>
                <div class="features">
                    ${featuresHtml}
                </div>
                <button class="buy-btn" onclick="window.location.href='https://www.airtel.in/recharge/prepaid'">Recharge Now</button>
            `;
            plansContainer.appendChild(div);
        });

        // View All Button Logic
        if (filtered.length > PLANS_TO_SHOW) {
            const viewAllBtn = document.createElement('button');
            viewAllBtn.className = 'btn-recharge'; // Use button style
            viewAllBtn.style.width = 'auto';
            viewAllBtn.style.padding = '12px 40px';
            viewAllBtn.style.margin = '2rem auto';
            viewAllBtn.style.display = 'block';
            viewAllBtn.style.backgroundColor = 'transparent';
            viewAllBtn.style.border = '1px solid rgba(255,255,255,0.3)';
            viewAllBtn.style.color = 'white';
            viewAllBtn.textContent = isViewAll ? 'Show Fewer Plans' : `View All ${filtered.length} Plans`;

            viewAllBtn.addEventListener('click', () => {
                isViewAll = !isViewAll;
                renderPlans();

                // Smooth scroll to top divider if viewing all
                if (isViewAll) {
                    plansContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });

            viewAllContainer.appendChild(viewAllBtn);
        }
    }

    // Category switching logic
    categoryList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            document.querySelectorAll('#categoryList li').forEach(li => li.classList.remove('active'));
            e.target.classList.add('active');

            currentCategory = e.target.getAttribute('data-category') || e.target.textContent;
            isViewAll = false;
            renderPlans();
        }
    });
});
