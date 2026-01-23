document.addEventListener('DOMContentLoaded', () => {
    fetch('data/operators.json').then(r => r.json()).then(d => {
        const op = d.operators.find(o => o.id === 'vi');
        if (op) {
            // Inject Hero
            const hero = document.getElementById('heroBanner');
            if (hero) {
                hero.innerHTML = `
                    <div class="hero-slide" style="background-image: url('${op.heroSlides[0].image}');">
                         <div>
                            <h1>${op.name}</h1>
                            <p>${op.longDescription || op.description}</p>
                         </div>
                    </div>
                `;
            }
            renderViPlans(op.plans, 'Hero Unlimited');
        }

        document.querySelectorAll('.pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
                e.target.classList.add('active');
                isViewAll = false; // Reset on category switch
                renderViPlans(op.plans, e.target.dataset.cat);
            });
        });
    });
});

let isViewAll = false;
const PLANS_TO_SHOW = 6;

function renderViPlans(plans, category) {
    const list = document.getElementById('viPlans');
    list.innerHTML = '';

    // Add view-all container if missing
    let viewAllContainer = document.getElementById('viewAllContainer');
    if (!viewAllContainer) {
        viewAllContainer = document.createElement('div');
        viewAllContainer.id = 'viewAllContainer';
        viewAllContainer.style.cssText = 'grid-column: 1/-1; text-align: center; margin-top: 2rem;';
        list.parentElement.appendChild(viewAllContainer);
    }
    viewAllContainer.innerHTML = '';

    const filtered = plans.filter(p => {
        if (category === 'Hero Unlimited') return p.category.includes('Hero');
        if (category === 'Talktime') return p.category.includes('Talktime') || p.price < 200;
        return true;
    });

    const toRender = isViewAll ? filtered : filtered.slice(0, PLANS_TO_SHOW);

    toRender.forEach(p => {
        const div = document.createElement('div');
        div.className = 'vi-card';
        div.innerHTML = `
            ${p.popular ? '<div class="hero-badge">BEST SELLER</div>' : ''}
            <h3>${p.price}</h3>
            <div class="details-row">
                <span>${p.data}</span>
                <span>${p.validity}</span>
            </div>
            <div class="benefit-list">
                ${p.features.slice(0, 3).map(f => `<div class="b-item">★ ${f}</div>`).join('')}
            </div>
            <button class="vi-btn" onclick="window.location.href='https://www.myvi.in/prepaid/online-recharge'">Select Plan</button>
        `;
        list.appendChild(div);
    });

    if (filtered.length > PLANS_TO_SHOW) {
        const btn = document.createElement('button');
        btn.className = 'vi-btn';
        btn.style.width = 'auto';
        btn.style.padding = '10px 40px';
        btn.style.backgroundColor = 'transparent';
        btn.style.border = '1px solid rgba(255,255,255,0.3)';
        btn.textContent = isViewAll ? 'View Less' : `View All ${filtered.length} Plans`;
        btn.onclick = () => {
            isViewAll = !isViewAll;
            renderViPlans(plans, category);
            if (isViewAll) list.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        viewAllContainer.appendChild(btn);
    }
}
