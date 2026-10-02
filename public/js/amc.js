// frontend/js/amc.js

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL !== undefined)
    ? window.APP_CONFIG.BACKEND_URL
    : (isLocal ? 'http://localhost:5000' : '');

const escapeHtml = (window.APP_CONFIG && window.APP_CONFIG.escapeHtml) || function(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};
const AMC_API = `${API_BASE}/api/amc-plans`;
const PURCHASE_API = `${API_BASE}/api/amc/purchase`;

const amcGrid = document.getElementById('amcGrid');

async function loadPlans() {
    try {
        const res = await fetch(AMC_API);
        const data = await res.json();
        
        if (data.success) {
            renderPlans(data.plans);
        } else {
            amcGrid.innerHTML = `<div class="col-span-full text-center text-red-500 font-bold py-12">Failed to load AMC packages.</div>`;
        }
    } catch (error) {
        amcGrid.innerHTML = `<div class="col-span-full text-center text-gray-500 font-bold py-12">Unable to connect to server.</div>`;
    }
}

function renderPlans(plans) {
    amcGrid.innerHTML = '';
    
    if (plans.length === 0) {
        amcGrid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-12 font-medium">Currently updating our Maintenance Plans. Check back soon!</div>`;
        return;
    }

    plans.forEach((plan, index) => {
        const isPopular = index === 1 || plan.name.toLowerCase().includes('standard') || plan.name.toLowerCase().includes('premium');
        
        const card = document.createElement('div');
        card.className = `relative flex flex-col rounded-2xl transition-all duration-300 overflow-hidden ${
            isPopular 
            ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/40 md:-translate-y-5 scale-105 z-10' 
            : 'glass-panel shadow-lg hover:shadow-xl hover:-translate-y-1'
        }`;

        const badge = isPopular 
            ? `<span class="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow">Most Popular</span>` 
            : '';

        const encodedData = encodeURIComponent(JSON.stringify(plan));
        const textMuted = isPopular ? 'text-blue-200' : 'text-gray-500';
        const textMain = isPopular ? 'text-white' : 'text-gray-900';
        const textFeature = isPopular ? 'text-blue-100' : 'text-gray-600';
        const checkColor = isPopular ? 'text-green-300' : 'text-green-500';
        const badgeClass = isPopular ? 'bg-white/20 text-white border-white/20' : 'bg-blue-50 text-blue-700 border-blue-200';
        const btnClass = isPopular 
            ? 'bg-white text-blue-700 hover:bg-blue-50 font-black' 
            : 'bg-blue-600 text-white hover:bg-blue-700 font-black';

        const safePlanName = escapeHtml(plan.name || '');
        const safePlanDesc = escapeHtml(plan.description || 'Full part inspection & cleaning');

        card.innerHTML = `
            ${badge}
            <div class="p-8 text-center border-b ${isPopular ? 'border-white/20' : 'border-gray-100'}">
                <p class="${textMuted} text-xs font-bold uppercase tracking-widest mb-2">${isPopular ? '⭐ Recommended' : 'AC Protection Plan'}</p>
                <h3 class="text-2xl font-extrabold ${textMain} mb-4">${safePlanName}</h3>
                <div class="flex items-end justify-center gap-1 mb-4">
                    <span class="text-2xl font-bold ${textMuted}">₹</span>
                    <span class="text-5xl font-black ${textMain} tracking-tighter">${Number(plan.price) || 0}</span>
                    <span class="text-sm font-bold ${textMuted} mb-1">/year</span>
                </div>
                <span class="text-xs font-bold py-1.5 px-4 rounded-full border ${badgeClass}">${Number(plan.services_per_year) || 3} Free Services Included</span>
            </div>
            
            <div class="p-8 flex flex-col flex-grow">
                <ul class="space-y-3 mb-8 text-sm flex-grow">
                    <li class="flex items-center gap-2 ${textFeature}"><span class="${checkColor} font-bold">✓</span> Priority Emergency Support</li>
                    <li class="flex items-center gap-2 ${textFeature}"><span class="${checkColor} font-bold">✓</span> Gas Level Checks Included</li>
                    <li class="flex items-center gap-2 ${textFeature}"><span class="${checkColor} font-bold">✓</span> ${safePlanDesc}</li>
                    <li class="flex items-center gap-2 ${textFeature}"><span class="${checkColor} font-bold">✓</span> Automated service tracking</li>
                    <li class="flex items-center gap-2 ${textFeature}"><span class="${checkColor} font-bold">✓</span> 1-Year Contract, Upfront Pricing</li>
                </ul>
                <button onclick="openAmcModal('${encodedData}')" class="w-full py-4 rounded-xl shadow-md transition-all text-sm uppercase tracking-wider ${btnClass}">
                    Choose This Plan →
                </button>
            </div>
        `;
        
        amcGrid.appendChild(card);
    });
}

// ------ BOOKING MODAL LOGIC ------ //
const modal = document.getElementById('amcModal');
const modalContent = document.getElementById('amcModalContent');
const form = document.getElementById('amcForm');

function openAmcModal(encodedData) {
    const plan = JSON.parse(decodeURIComponent(encodedData));
    
    document.getElementById('modalPlanId').value = plan.id;
    document.getElementById('modalPlanName').innerText = plan.name;
    document.getElementById('modalPlanPrice').innerText = `₹${plan.price} / year`;
    document.getElementById('successMsg').classList.add('hidden'); 
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');
    }, 10);
    
    setTimeout(() => document.getElementById('custName').focus(), 150);
}

function closeAmcModal() {
    modal.classList.add('opacity-0');
    modalContent.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        form.reset(); 
    }, 300);
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
        plan_id: document.getElementById('modalPlanId').value,
        plan_name: document.getElementById('modalPlanName').innerText,
        customer_name: document.getElementById('custName').value,
        email: document.getElementById('custEmail').value,
        phone: document.getElementById('custPhone').value
    };

    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = "Processing...";
    btn.disabled = true;

    try {
        const res = await fetch(PURCHASE_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            btn.classList.add('hidden');
            document.getElementById('successMsg').classList.remove('hidden');
            setTimeout(() => {
                closeAmcModal();
                btn.classList.remove('hidden');
            }, 3000);
        } else {
            alert("Something went wrong requesting this subscription.");
        }
    } catch (e) {
        alert("Network error.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});

// Close modal visually safely
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeAmcModal();
});

// ─── Pricing Toggle & Savings Calculator ─────────────────────────
let isAnnual  = true;   // true = annual (default), false = monthly
let acCount   = 1;      // number of AC units
let rawPlans  = [];     // cache loaded plans

// Toggle annual/monthly
window.toggleAmcBilling = function() {
    isAnnual = !isAnnual;
    const track = document.getElementById('amcToggleTrack');
    if (track) track.classList.toggle('on', isAnnual);
    const label = document.getElementById('amcBillingLabel');
    if (label) label.textContent = isAnnual ? 'Annual Billing' : 'Monthly Billing';
    updatePricingDisplay();
};

// AC count buttons
window.setAcCount = function(n, btn) {
    acCount = n;
    document.querySelectorAll('.ac-count-btn').forEach(b => {
        b.classList.toggle('bg-blue-600', false);
        b.classList.toggle('text-white', false);
        b.classList.toggle('bg-slate-100', true);
        b.classList.toggle('text-slate-700', true);
    });
    if (btn) {
        btn.classList.add('bg-blue-600','text-white');
        btn.classList.remove('bg-slate-100','text-slate-700');
    }
    updatePricingDisplay();
};

function updatePricingDisplay() {
    rawPlans.forEach((plan, idx) => {
        const basePrice  = Number(plan.price);
        const multiplied = basePrice * acCount;
        const final      = isAnnual ? multiplied : Math.round(multiplied / 12);
        const suffix     = isAnnual ? '/yr' : '/mo';
        const savings    = isAnnual ? Math.round(multiplied * 0.20) : 0;

        const priceEl   = document.getElementById(`plan-price-${idx}`);
        const suffixEl  = document.getElementById(`plan-suffix-${idx}`);
        const savingsEl = document.getElementById(`plan-savings-${idx}`);

        if (priceEl)   priceEl.textContent   = final.toLocaleString('en-IN');
        if (suffixEl)  suffixEl.textContent  = suffix;
        if (savingsEl) {
            savingsEl.textContent = isAnnual && savings > 0
                ? `Save ₹${savings.toLocaleString('en-IN')} vs monthly`
                : acCount > 1 ? `${acCount} AC units included` : '';
        }
    });
}

// Override renderPlans to capture rawPlans and add IDs for dynamic pricing
const _origRenderPlans = renderPlans;
renderPlans = function(plans) {
    rawPlans = plans;
    amcGrid.innerHTML = '';

    if (!plans.length) {
        amcGrid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-12 font-medium">Currently updating our Maintenance Plans. Check back soon!</div>`;
        return;
    }

    plans.forEach((plan, index) => {
        const isPopular = index === 1 || plan.name.toLowerCase().includes('standard') || plan.name.toLowerCase().includes('premium');
        const card = document.createElement('div');
        card.className = `amc-plan-card relative flex flex-col rounded-2xl transition-all duration-300 overflow-hidden ${
            isPopular
            ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/40 md:-translate-y-5 scale-105 z-10'
            : 'glass-panel shadow-lg'
        }`;

        const badge      = isPopular ? `<span class="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow animate-pulse">Most Popular</span>` : '';
        const encodedData = encodeURIComponent(JSON.stringify(plan));
        const textMuted   = isPopular ? 'text-blue-200' : 'text-gray-500';
        const textMain    = isPopular ? 'text-white' : 'text-gray-900';
        const textFeature = isPopular ? 'text-blue-100' : 'text-gray-600';
        const checkColor  = isPopular ? 'text-green-300' : 'text-green-500';
        const badgeClass  = isPopular ? 'bg-white/20 text-white border-white/20' : 'bg-blue-50 text-blue-700 border-blue-200';
        const btnClass    = isPopular ? 'bg-white text-blue-700 hover:bg-blue-50 font-black' : 'bg-blue-600 text-white hover:bg-blue-700 font-black';

        const ppvSavings = Math.round(plan.price * 0.35); // vs pay-per-visit

        card.innerHTML = `
            ${badge}
            <div class="p-8 text-center border-b ${isPopular ? 'border-white/20' : 'border-gray-100'}">
                <p class="${textMuted} text-xs font-bold uppercase tracking-widest mb-2">${isPopular ? '⭐ Recommended' : 'AC Protection Plan'}</p>
                <h3 class="text-2xl font-extrabold ${textMain} mb-4">${plan.name}</h3>
                <div class="flex items-end justify-center gap-1 mb-2">
                    <span class="text-2xl font-bold ${textMuted}">₹</span>
                    <span id="plan-price-${index}" class="text-5xl font-black ${textMain} tracking-tighter">${plan.price}</span>
                    <span id="plan-suffix-${index}" class="text-sm font-bold ${textMuted} mb-1">/yr</span>
                </div>
                <p id="plan-savings-${index}" class="text-xs font-bold ${isPopular ? 'text-yellow-300' : 'text-emerald-600'} mb-3 min-h-[1.2rem]"></p>
                <span class="text-xs font-bold py-1.5 px-4 rounded-full border ${badgeClass}">${plan.services_per_year} Free Services Included</span>
            </div>
            <div class="p-8 flex flex-col flex-grow">
                <ul class="space-y-3 mb-4 text-sm flex-grow">
                    <li class="flex items-center gap-2 ${textFeature}"><span class="${checkColor} font-bold">✓</span> Priority Emergency Support</li>
                    <li class="flex items-center gap-2 ${textFeature}"><span class="${checkColor} font-bold">✓</span> Gas Level Checks Included</li>
                    <li class="flex items-center gap-2 ${textFeature}"><span class="${checkColor} font-bold">✓</span> ${plan.description || 'Full part inspection & cleaning'}</li>
                    <li class="flex items-center gap-2 ${textFeature}"><span class="${checkColor} font-bold">✓</span> Automated service tracking</li>
                    <li class="flex items-center gap-2 ${textFeature}"><span class="${checkColor} font-bold">✓</span> 1-Year Contract, Upfront Pricing</li>
                </ul>
                <div class="${isPopular ? 'bg-white/10' : 'bg-emerald-50'} rounded-xl p-3 mb-4 text-center">
                    <span class="text-xs font-extrabold ${isPopular ? 'text-yellow-300' : 'text-emerald-700'}">
                        💰 Save ₹${ppvSavings.toLocaleString('en-IN')} vs Pay-Per-Visit
                    </span>
                </div>
                <button onclick="openAmcModal('${encodedData}')" class="w-full py-4 rounded-xl shadow-md transition-all text-sm uppercase tracking-wider ${btnClass}">
                    Choose This Plan →
                </button>
                <a href="service.html?plan=${encodeURIComponent(plan.name)}" class="text-center text-xs ${isPopular ? 'text-blue-200' : 'text-slate-400'} hover:underline mt-3 block">
                    Or book a demo service first
                </a>
            </div>
        `;
        amcGrid.appendChild(card);
    });

    // Init display
    setTimeout(updatePricingDisplay, 100);
};

// Init
loadPlans();

