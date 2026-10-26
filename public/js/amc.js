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
    rawPlans = plans;
    amcGrid.innerHTML = '';
    
    if (!plans || plans.length === 0) {
        amcGrid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-12 font-medium">Currently updating our Maintenance Plans. Check back soon!</div>`;
        return;
    }

    plans.forEach((plan, index) => {
        const isPopular = index === 1 || (plan.name && (plan.name.toLowerCase().includes('standard') || plan.name.toLowerCase().includes('comprehensive') || plan.name.toLowerCase().includes('premium')));
        
        const card = document.createElement('div');
        card.className = `amc-plan-card relative flex flex-col rounded-2xl transition-all duration-300 overflow-hidden ${
            isPopular 
            ? 'bg-[#27211D] text-[#F2EDE3] shadow-xl md:-translate-y-3 z-10 border-2 border-[#A05B3A]' 
            : 'bg-[#FDFBF7] dark:bg-[#27211D] text-[#342C27] dark:text-[#F2EDE3] border border-[#B8AA98]/40 dark:border-[#B8AA98]/20 shadow-sm hover:shadow-md hover:-translate-y-1'
        }`;

        const badge = isPopular 
            ? `<span class="absolute top-4 right-4 bg-[#E4C99A] text-[#27211D] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">★ Most Popular</span>` 
            : '';

        const encodedData = encodeURIComponent(JSON.stringify(plan));
        const textMuted = isPopular ? 'text-[#B8AA98]' : 'text-[#655448] dark:text-[#B8AA98]';
        const textMain = isPopular ? 'text-[#F2EDE3]' : 'text-[#342C27] dark:text-[#F2EDE3]';
        const textFeature = isPopular ? 'text-[#E6DFD3]' : 'text-[#655448] dark:text-[#B8AA98]';
        const checkColor = 'text-[#77B89A]';
        const badgeClass = isPopular ? 'bg-[#342C27] text-[#E4C99A] border-[#B8AA98]/40' : 'bg-[#77B89A]/15 text-[#1D3D2B] dark:text-[#77B89A] border-[#77B89A]/40 dark:border-[#77B89A]/30';
        const btnClass = 'bg-[#A05B3A] hover:bg-[#8B4D2F] text-[#F2EDE3] font-bold shadow-md';

        const safePlanName = escapeHtml(plan.name || '');
        const safePlanDesc = escapeHtml(plan.description || 'Full part inspection & cleaning');
        const ppvSavings = Math.round((Number(plan.price) || 2999) * 0.35);

        card.innerHTML = `
            ${badge}
            <div class="p-8 text-center border-b ${isPopular ? 'border-[#B8AA98]/20' : 'border-[#B8AA98]/30 dark:border-[#B8AA98]/20'}">
                <p class="${textMuted} text-xs font-bold uppercase tracking-widest mb-2">${isPopular ? 'Recommended Choice' : 'Annual AC Care'}</p>
                <h3 class="text-2xl font-black ${textMain} mb-4">${safePlanName}</h3>
                <div class="flex items-end justify-center gap-1 mb-2">
                    <span class="text-2xl font-bold ${textMuted}">₹</span>
                    <span id="plan-price-${index}" class="text-5xl font-black ${textMain} tracking-tighter">${Number(plan.price) || 0}</span>
                    <span id="plan-suffix-${index}" class="text-sm font-bold ${textMuted} mb-1">/yr</span>
                </div>
                <p id="plan-savings-${index}" class="text-xs font-bold ${isPopular ? 'text-[#E4C99A]' : 'text-[#1D3D2B] dark:text-[#77B89A]'} mb-3 min-h-[1.2rem]"></p>
                <span class="text-xs font-bold py-1.5 px-4 rounded-full border ${badgeClass}">${Number(plan.services_per_year) || 3} Free Visits Included</span>
            </div>
            
            <div class="p-8 flex flex-col flex-grow">
                <ul class="space-y-3 mb-6 text-sm flex-grow">
                    <li class="flex items-center gap-2 ${textFeature}"><span class="${checkColor} font-bold">✓</span> Priority Emergency Response</li>
                    <li class="flex items-center gap-2 ${textFeature}"><span class="${checkColor} font-bold">✓</span> Gas Level & Leakage Check Included</li>
                    <li class="flex items-center gap-2 ${textFeature}"><span class="${checkColor} font-bold">✓</span> ${safePlanDesc}</li>
                    <li class="flex items-center gap-2 ${textFeature}"><span class="${checkColor} font-bold">✓</span> Automated Periodic Reminders</li>
                    <li class="flex items-center gap-2 ${textFeature}"><span class="${checkColor} font-bold">✓</span> Upfront Genuine Spares Discount</li>
                </ul>
                <div class="${isPopular ? 'bg-[#342C27]' : 'bg-[#77B89A]/10 dark:bg-[#77B89A]/20'} rounded-xl p-3 mb-4 text-center">
                    <span class="text-xs font-extrabold ${isPopular ? 'text-[#E4C99A]' : 'text-[#1D3D2B] dark:text-[#77B89A]'}">
                        💰 Save ~₹${ppvSavings.toLocaleString('en-IN')} vs Pay-Per-Visit
                    </span>
                </div>
                <button onclick="openAmcModal('${encodedData}')" class="w-full py-4 rounded-xl shadow-md transition-all text-sm uppercase tracking-wider ${btnClass}">
                    Select This Plan →
                </button>
            </div>
        `;
        
        amcGrid.appendChild(card);
    });

    if (typeof gsap !== 'undefined' && amcGrid.children.length > 0) {
        gsap.fromTo(amcGrid.children,
            { opacity: 0, y: 24, scale: 0.96 },
            { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.08, ease: 'power2.out' }
        );
    }

    if (typeof updateAllPlanCards === 'function') {
        updateAllPlanCards();
    }
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
    
    if (typeof window.openGsapModal === 'function') {
        window.openGsapModal(modal);
    } else {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modalContent.classList.remove('scale-95');
        }, 10);
    }
    
    setTimeout(() => document.getElementById('custName').focus(), 150);
}

function closeAmcModal() {
    if (typeof window.closeGsapModal === 'function') {
        window.closeGsapModal(modal, () => {
            form.reset();
        });
    } else {
        modal.classList.add('opacity-0');
        modalContent.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            form.reset(); 
        }, 300);
    }
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
        b.classList.remove('bg-[#A05B3A]', 'text-[#F2EDE3]', 'bg-blue-600', 'text-white', 'shadow-xs');
        b.classList.add('bg-[#F2EDE3]', 'text-[#655448]');
    });
    if (btn) {
        btn.classList.add('bg-[#A05B3A]', 'text-[#F2EDE3]', 'shadow-xs');
        btn.classList.remove('bg-[#F2EDE3]', 'text-[#655448]', 'bg-slate-100', 'text-slate-700');
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

        if (priceEl) {
            priceEl.textContent = final.toLocaleString('en-IN');
            if (typeof gsap !== 'undefined') {
                gsap.fromTo(priceEl, { scale: 1.12 }, { scale: 1, duration: 0.25, ease: 'back.out(2)' });
            }
        }
        if (suffixEl)  suffixEl.textContent  = suffix;
        if (savingsEl) {
            savingsEl.textContent = isAnnual && savings > 0
                ? `Save ₹${savings.toLocaleString('en-IN')} vs monthly`
                : acCount > 1 ? `${acCount} AC units included` : '';
        }
    });
}

// Trigger initial dynamic pricing calculation
setTimeout(updatePricingDisplay, 100);

// Init
loadPlans();

// ─── Thermodynamic ROI & Energy Savings Calculator ─────────
let currentRoiState = {
    savings: 4200,
    kwh: 458,
    roi: 168,
    co2: 375
};

window.onRoiSliderChange = function() {
    const acSlider = document.getElementById('roiAcSlider');
    const hoursSlider = document.getElementById('roiHoursSlider');
    const acDisplay = document.getElementById('roiAcDisplay');
    const hoursDisplay = document.getElementById('roiHoursDisplay');

    if (!acSlider || !hoursSlider) return;

    const count = Number(acSlider.value) || 1;
    const hours = Number(hoursSlider.value) || 8;

    if (acDisplay) acDisplay.textContent = `${count} ${count === 1 ? 'Unit' : 'Units'}`;
    if (hoursDisplay) hoursDisplay.textContent = `${hours} Hours/Day`;

    // Try fetching real-time calculation from pricing engine API
    fetch(`${API_BASE}/api/pricing/amc-roi?acCount=${count}&avgHours=${hours}&tier=comfort`)
        .then(res => res.json())
        .then(data => {
            if (data && data.success) {
                renderRoiValues(data);
            } else {
                calculateLocalRoi(count, hours);
            }
        })
        .catch(() => calculateLocalRoi(count, hours));
};

function renderRoiValues(data) {
    const savingsEl = document.getElementById('roiAnnualSavings');
    const kwhEl = document.getElementById('roiKwhSaved');
    const roiEl = document.getElementById('roiPercent');
    const co2El = document.getElementById('roiCo2Saved');

    const targetSavings = Number(data.annualBreakdown?.netAnnualSavings) || 0;
    const targetKwh = Number(data.environmentalImpact?.kwhSavedPerYear) || 0;
    const targetRoi = parseInt(String(data.annualBreakdown?.roiPercentage || '0').replace('%', ''), 10) || 0;
    const targetCo2 = Number(data.environmentalImpact?.co2ReductionKg) || 0;

    if (typeof gsap !== 'undefined') {
        gsap.to(currentRoiState, {
            savings: targetSavings,
            kwh: targetKwh,
            roi: targetRoi,
            co2: targetCo2,
            duration: 0.35,
            ease: 'power2.out',
            overwrite: 'auto',
            onUpdate: () => {
                if (savingsEl) savingsEl.textContent = `₹${Math.round(currentRoiState.savings).toLocaleString('en-IN')}`;
                if (kwhEl) kwhEl.textContent = `${Math.round(currentRoiState.kwh).toLocaleString('en-IN')} kWh`;
                if (roiEl) roiEl.textContent = `${Math.round(currentRoiState.roi)}%`;
                if (co2El) co2El.textContent = `${Math.round(currentRoiState.co2).toLocaleString('en-IN')} kg`;
            }
        });
    } else {
        if (savingsEl) savingsEl.textContent = `₹${targetSavings.toLocaleString('en-IN')}`;
        if (kwhEl) kwhEl.textContent = `${targetKwh.toLocaleString('en-IN')} kWh`;
        if (roiEl) roiEl.textContent = `${targetRoi}%`;
        if (co2El) co2El.textContent = `${targetCo2.toLocaleString('en-IN')} kg`;
    }
}

function calculateLocalRoi(count, hours) {
    const tariff = 9.5;
    const days = 260;
    const kwhPerYear = Math.round(hours * 0.22 * days * count);
    const powerBillSaved = Math.round(kwhPerYear * tariff);
    const repairsSaved = 3200 * count;
    const amcCost = 2499 * count;
    const netSavings = Math.max(0, (powerBillSaved + repairsSaved) - amcCost);
    const roiPct = Math.round((netSavings / amcCost) * 100);

    renderRoiValues({
        annualBreakdown: {
            netAnnualSavings: netSavings,
            roiPercentage: `${roiPct}%`
        },
        environmentalImpact: {
            kwhSavedPerYear: kwhPerYear,
            co2ReductionKg: Math.round(kwhPerYear * 0.82)
        }
    });
}

// Init calculator on load
window.addEventListener('DOMContentLoaded', () => {
    if (window.onRoiSliderChange) window.onRoiSliderChange();
});

