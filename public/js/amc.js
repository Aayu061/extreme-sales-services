// public/js/amc.js - Enterprise AMC Rate Engine for Extreme Sales & Services
// Strict conformity with 'ESS Contract Rate Chart_New Address.pdf' (Chembur Service Center)

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

// ─── STATE MANAGEMENT ──────────────────────────────────────────────
let allPlans = [];
let currentCategory = 'samc';       // 'samc' | 'ordinary' | 'specialized'
let currentAcType = 'split';        // 'split' | 'window'
let currentTonnage = '1.5_2.2';     // '0.8_1.0' | '1.5_2.2'
let acCount = 1;                    // 1 | 2 | 3+

const amcGrid = document.getElementById('amcGrid');

// ─── DATA FETCHING ─────────────────────────────────────────────────
async function loadPlans() {
    try {
        const res = await fetch(AMC_API);
        const data = await res.json();
        
        if (data && data.success && Array.isArray(data.plans)) {
            allPlans = data.plans;
            renderPlans();
        } else {
            fallbackLocalPlans();
        }
    } catch (error) {
        console.warn("Failed fetching plans from API, activating local fallback:", error.message);
        fallbackLocalPlans();
    }
}

function fallbackLocalPlans() {
    allPlans = [
        {
            id: "amc-samc-1",
            code: "SAMC 1",
            name: "SAMC 1 - Comprehensive Split (Non-Inverter)",
            category: "samc",
            ac_type: "split",
            services_per_year: 4,
            unlimited_complaints: true,
            includes_parts: true,
            includes_gas: false,
            prices: { "0.8_1.0": 2999, "1.5_2.2": 3999 },
            price: 2999,
            description: "4 Services, Unlimited Complaints Attend, Capacitor Replace, Motor Winding & PCB Repair",
            terms: "For SAMC AC's Must Have Under 3 Years from Purchase. GST Extra 28%."
        },
        {
            id: "amc-samc-2",
            code: "SAMC 2",
            name: "SAMC 2 - Comprehensive Split with Gas Charging",
            category: "samc",
            ac_type: "split",
            services_per_year: 4,
            unlimited_complaints: true,
            includes_parts: true,
            includes_gas: true,
            popular: true,
            prices: { "0.8_1.0": 4499, "1.5_2.2": 5499 },
            price: 4499,
            description: "4 Services, Unlimited Complaints Attend, Capacitor Replace, PCB Repair, Motor Winding & Gas Charging",
            terms: "For SAMC AC's Must Have Under 3 Years from Purchase. GST Extra 28%."
        },
        {
            id: "amc-samc-3",
            code: "SAMC 3",
            name: "SAMC 3 - Comprehensive Window with Gas Charging",
            category: "samc",
            ac_type: "window",
            services_per_year: 4,
            unlimited_complaints: true,
            includes_parts: true,
            includes_gas: true,
            popular: true,
            prices: { "0.8_1.0": 3499, "1.5_2.2": 4499 },
            price: 3499,
            description: "4 Services, Unlimited Complaints Attend, Capacitor Replace, PCB Repair, Motor Winding & Gas Charging",
            terms: "For SAMC AC's Must Have Under 3 Years from Purchase. GST Extra 28%."
        },
        {
            id: "amc-ord-3",
            code: "ORD 3",
            name: "Ordinary 3 Visits / 3 Services",
            category: "ordinary",
            ac_type: "all",
            services_per_year: 3,
            unlimited_complaints: false,
            prices: { "split": 1500, "window": 1000 },
            price: 1500,
            description: "Ordinary 3 Scheduled Routine Services / Visits per year",
            terms: "All Rates are Basic GST Applicable as per requirement."
        },
        {
            id: "amc-ord-4",
            code: "ORD 4",
            name: "Ordinary 4 Services & Unlimited Complaints",
            category: "ordinary",
            ac_type: "all",
            services_per_year: 4,
            unlimited_complaints: true,
            prices: { "split": 1800, "window": 1300 },
            price: 1800,
            description: "Ordinary 4 Services & Unlimited Normal Complaints Attend (Window includes 1 Wet Service)",
            terms: "All Rates are Basic GST Applicable as per requirement."
        },
        {
            id: "amc-ord-6",
            code: "ORD 6",
            name: "Ordinary 6 Services & Unlimited Complaints",
            category: "ordinary",
            ac_type: "all",
            services_per_year: 6,
            unlimited_complaints: true,
            prices: { "split": 2200, "window": 1700 },
            price: 2200,
            description: "Ordinary 6 Services & Unlimited Normal Complaints Attend (Window includes 1 Wet Service)",
            terms: "All Rates are Basic GST Applicable as per requirement."
        },
        {
            id: "amc-jacket-2",
            code: "JACKET 2",
            name: "2 Jacket Service & Unlimited Complaints",
            category: "specialized",
            ac_type: "split",
            services_per_year: 2,
            unlimited_complaints: true,
            price: 2599,
            description: "2 Jacket Deep Washing Services & Unlimited Breakdown Complaints Attend",
            terms: "All Rates are Basic GST Applicable as per requirement."
        },
        {
            id: "amc-jacket-3",
            code: "JACKET 3",
            name: "3 Jacket Service & Unlimited Complaints",
            category: "specialized",
            ac_type: "split",
            services_per_year: 3,
            unlimited_complaints: true,
            price: 3599,
            description: "3 Jacket Deep Washing Services & Unlimited Breakdown Complaints Attend",
            terms: "All Rates are Basic GST Applicable as per requirement."
        },
        {
            id: "amc-pump-down",
            code: "PUMP DOWN",
            name: "Pump Down Service",
            category: "specialized",
            ac_type: "all",
            services_per_year: 1,
            price: 1299,
            description: "Pump Down Service (Gas Top Up Not Included if required)",
            terms: "Per unit basis. All Rates are Basic GST Applicable as per requirement."
        },
        {
            id: "amc-jet-wash",
            code: "JET WASH",
            name: "Jet Wash Deep Service",
            category: "specialized",
            ac_type: "all",
            services_per_year: 1,
            price: 1199,
            description: "Full High-Pressure Jet Wash Deep Cleaning for Indoor & Outdoor Coils",
            terms: "Per unit basis. All Rates are Basic GST Applicable as per requirement."
        }
    ];
    renderPlans();
}

// ─── FILTER CONTROLS ───────────────────────────────────────────────
window.setAmcCategory = function(cat) {
    currentCategory = cat;
    
    // Update tabs
    ['samc', 'ordinary', 'specialized'].forEach(c => {
        const tab = document.getElementById(`catTab-${c}`);
        if (!tab) return;
        if (c === cat) {
            tab.className = "amc-cat-tab active px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-2 shadow-sm cursor-pointer bg-[#A05B3A] text-[#F2EDE3]";
        } else {
            tab.className = "amc-cat-tab px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer bg-[#FDFBF7] dark:bg-[#27211D] text-[#655448] dark:text-[#B8AA98] border border-[#B8AA98]/40 dark:border-[#B8AA98]/20 hover:text-[#342C27] dark:hover:text-[#F2EDE3]";
        }
    });

    // Toggle SAMC advisory banner visibility
    const samcBanner = document.getElementById('samcAdvisoryBanner');
    if (samcBanner) {
        samcBanner.style.display = (cat === 'samc') ? 'flex' : 'none';
    }

    renderPlans();
};

window.setAmcAcType = function(type) {
    currentAcType = type;
    const splitBtn = document.getElementById('acTypeSplitBtn');
    const windowBtn = document.getElementById('acTypeWindowBtn');

    if (type === 'split') {
        if (splitBtn) splitBtn.className = "px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition bg-[#A05B3A] text-white shadow-2xs";
        if (windowBtn) windowBtn.className = "px-3.5 py-1.5 text-xs font-bold rounded-lg transition text-[#655448] dark:text-[#B8AA98] hover:text-[#342C27] dark:hover:text-[#F2EDE3]";
    } else {
        if (splitBtn) splitBtn.className = "px-3.5 py-1.5 text-xs font-bold rounded-lg transition text-[#655448] dark:text-[#B8AA98] hover:text-[#342C27] dark:hover:text-[#F2EDE3]";
        if (windowBtn) windowBtn.className = "px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition bg-[#A05B3A] text-white shadow-2xs";
    }

    renderPlans();
};

window.setAmcTonnage = function(tonnage) {
    currentTonnage = tonnage;
    const smallBtn = document.getElementById('tonnageSmallBtn');
    const largeBtn = document.getElementById('tonnageLargeBtn');

    if (tonnage === '0.8_1.0') {
        if (smallBtn) smallBtn.className = "px-3 py-1.5 text-xs font-extrabold rounded-lg transition bg-[#A05B3A] text-white shadow-2xs";
        if (largeBtn) largeBtn.className = "px-3 py-1.5 text-xs font-bold rounded-lg transition text-[#655448] dark:text-[#B8AA98] hover:text-[#342C27] dark:hover:text-[#F2EDE3]";
    } else {
        if (smallBtn) smallBtn.className = "px-3 py-1.5 text-xs font-bold rounded-lg transition text-[#655448] dark:text-[#B8AA98] hover:text-[#342C27] dark:hover:text-[#F2EDE3]";
        if (largeBtn) largeBtn.className = "px-3 py-1.5 text-xs font-extrabold rounded-lg transition bg-[#A05B3A] text-white shadow-2xs";
    }

    renderPlans();
};

window.setAcCount = function(n, btn) {
    acCount = n;
    document.querySelectorAll('.ac-count-btn').forEach(b => {
        b.className = "ac-count-btn bg-[#F2EDE3] dark:bg-[#1A1412] border border-[#B8AA98]/40 dark:border-[#B8AA98]/20 text-[#655448] dark:text-[#B8AA98] hover:text-[#342C27] dark:hover:text-[#F2EDE3] text-xs font-bold w-8 h-8 rounded-xl transition";
    });
    if (btn) {
        btn.className = "ac-count-btn bg-[#A05B3A] text-[#F2EDE3] text-xs font-black w-8 h-8 rounded-xl transition shadow-xs";
    }

    const badge = document.getElementById('volumeDiscountBadge');
    if (badge) {
        if (acCount === 2) {
            badge.innerText = "10% Volume Off";
            badge.classList.remove('hidden');
        } else if (acCount >= 3) {
            badge.innerText = "15% Fleet Off";
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    renderPlans();
};

// ─── PRICE CALCULATION LOGIC ───────────────────────────────────────
function calculatePrice(plan) {
    let unitBase = Number(plan.price) || 2999;

    if (plan.prices) {
        if (plan.prices[currentTonnage] !== undefined) {
            unitBase = Number(plan.prices[currentTonnage]);
        } else if (plan.prices[currentAcType] !== undefined) {
            unitBase = Number(plan.prices[currentAcType]);
        }
    }

    let discount = 1.0;
    if (acCount === 2) discount = 0.90;
    else if (acCount >= 3) discount = 0.85;

    const total = Math.round(unitBase * acCount * discount);
    return {
        unitBase,
        total,
        discountApplied: discount < 1.0
    };
}

// ─── RENDER PLANS FUNCTION ─────────────────────────────────────────
function renderPlans() {
    if (!amcGrid) return;
    amcGrid.innerHTML = '';

    // Filter plans according to category & active AC type
    const filtered = allPlans.filter(p => {
        const cat = p.category || 'samc';
        if (cat !== currentCategory) return false;

        // AC type compatibility filter
        if (currentCategory === 'samc') {
            if (currentAcType === 'split') {
                return p.ac_type === 'split' || p.ac_type === 'all';
            } else {
                return p.ac_type === 'window' || p.ac_type === 'all';
            }
        }
        return true;
    });

    if (filtered.length === 0) {
        amcGrid.innerHTML = `
            <div class="col-span-full py-16 text-center text-[#655448] dark:text-[#B8AA98]">
                <p class="text-sm font-bold">No packages match the selected criteria.</p>
                <button type="button" onclick="setAmcAcType('split')" class="mt-3 text-xs text-[#A05B3A] font-extrabold hover:underline">
                    Switch to Split AC →
                </button>
            </div>
        `;
        return;
    }

    filtered.forEach((plan, idx) => {
        const priceInfo = calculatePrice(plan);
        const isPopular = plan.popular || (plan.code === 'SAMC 2') || (plan.code === 'SAMC 3');
        const tonnageLabel = currentTonnage === '0.8_1.0' ? '0.8Tr – 1.0Tr' : '1.5Tr – 2.2Tr';
        const acTypeLabel = currentAcType === 'split' ? 'Split AC' : 'Window AC';

        const card = document.createElement('div');
        card.className = `amc-plan-card relative flex flex-col rounded-3xl transition-all duration-300 overflow-hidden ${
            isPopular
            ? 'bg-[#27211D] text-[#F2EDE3] shadow-xl md:-translate-y-2 z-10 border-2 border-[#A05B3A]'
            : 'bg-[#FDFBF7] dark:bg-[#27211D] text-[#342C27] dark:text-[#F2EDE3] border border-[#B8AA98]/40 dark:border-[#B8AA98]/20 shadow-sm hover:shadow-md hover:-translate-y-1'
        }`;

        const badgeHtml = isPopular
            ? `<span class="absolute top-4 right-4 bg-[#E4C99A] text-[#27211D] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">★ Recommended</span>`
            : `<span class="absolute top-4 right-4 bg-[#B8AA98]/20 text-[#655448] dark:text-[#B8AA98] text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">${plan.code || 'PLAN'}</span>`;

        const encodedData = encodeURIComponent(JSON.stringify({
            ...plan,
            selectedTonnage: tonnageLabel,
            selectedAcType: acTypeLabel,
            calculatedPrice: priceInfo.total,
            unitPrice: priceInfo.unitBase,
            unitCount: acCount
        }));

        const textMuted = isPopular ? 'text-[#B8AA98]' : 'text-[#655448] dark:text-[#B8AA98]';
        const textMain = isPopular ? 'text-[#F2EDE3]' : 'text-[#342C27] dark:text-[#F2EDE3]';
        const textFeature = isPopular ? 'text-[#E6DFD3]' : 'text-[#655448] dark:text-[#B8AA98]';
        const checkColor = 'text-[#77B89A]';
        const btnClass = isPopular
            ? 'bg-[#A05B3A] hover:bg-[#8D4B2D] text-white shadow-[0_4px_14px_rgba(160,91,58,0.35)]'
            : 'bg-[#342C27] hover:bg-[#27211D] dark:bg-[#F2EDE3] dark:hover:bg-white text-white dark:text-[#342C27]';

        // Feature list generation based on rate chart specifications
        let featureItems = [];
        if (plan.category === 'samc') {
            featureItems.push(`<strong>4 Scheduled Services</strong> (Deep Jet Wash)`);
            featureItems.push(`<strong>Unlimited Breakdown Complaints</strong> attended`);
            featureItems.push(`<strong>Capacitor Replacement</strong> covered`);
            featureItems.push(`<strong>Motor Winding &amp; PCB Repair</strong> covered`);
            if (plan.includes_gas) {
                featureItems.push(`<strong>Full Gas Charging</strong> included (R32 / R410A)`);
            } else {
                featureItems.push(`<span class="text-amber-500">Gas charging chargeable at standard rate</span>`);
            }
            featureItems.push(`<span class="text-[11px] italic">Must be under 3 years from purchase</span>`);
        } else if (plan.category === 'ordinary') {
            featureItems.push(`<strong>${plan.services_per_year} Scheduled Services</strong> per year`);
            if (plan.unlimited_complaints) {
                featureItems.push(`<strong>Unlimited Normal Complaints</strong> attend`);
            } else {
                featureItems.push(`Basic Routine Maintenance Only`);
            }
            if (currentAcType === 'window' && plan.services_per_year >= 4) {
                featureItems.push(`Includes <strong>1 Wet Chemical Service</strong>`);
            }
            featureItems.push(`Labor and diagnosis covered`);
            featureItems.push(`Spare parts chargeable at discounted rate`);
        } else {
            featureItems.push(`<strong>${plan.name}</strong>`);
            featureItems.push(`High-pressure chemical wash of coils &amp; drain tray`);
            featureItems.push(`Trained OEM technicians with safety harnesses`);
            featureItems.push(`Complete diagnostic pressure &amp; amp test`);
        }

        const featureHtml = featureItems.map(f => `
            <li class="flex items-start gap-2.5 ${textFeature} text-xs leading-relaxed">
                <span class="${checkColor} font-bold text-sm shrink-0">✓</span>
                <span>${f}</span>
            </li>
        `).join('');

        card.innerHTML = `
            ${badgeHtml}
            <div class="p-7 text-center border-b ${isPopular ? 'border-[#B8AA98]/20' : 'border-[#B8AA98]/30 dark:border-[#B8AA98]/20'}">
                <div class="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider mb-2 ${isPopular ? 'text-[#E4C99A]' : 'text-[#A05B3A] dark:text-[#E4C99A]'}">
                    <span>${plan.category === 'samc' ? '🛡️ Comprehensive AMC' : (plan.category === 'ordinary' ? '🛠️ Maintenance Contract' : '🧰 Standalone Service')}</span>
                </div>
                <h3 class="text-xl font-black ${textMain} mb-2 leading-tight">${escapeHtml(plan.name)}</h3>
                <div class="flex items-center justify-center gap-2 mb-3">
                    <span class="text-[11px] font-bold bg-[#EAE3D6]/70 dark:bg-[#1A1412] px-2.5 py-0.5 rounded-full ${textMuted}">
                        ${acTypeLabel} • ${tonnageLabel}
                    </span>
                </div>

                <div class="flex items-baseline justify-center gap-1 my-3">
                    <span class="text-xl font-bold ${textMuted}">₹</span>
                    <span class="text-4xl sm:text-5xl font-black ${textMain} tracking-tight font-mono">${priceInfo.total.toLocaleString('en-IN')}</span>
                    <span class="text-xs font-bold ${textMuted}">/ yr</span>
                </div>

                ${priceInfo.discountApplied ? `
                    <div class="text-[11px] font-bold text-[#77B89A] mb-1">
                        Applied volume discount for ${acCount} units (₹${priceInfo.unitBase.toLocaleString('en-IN')} / unit)
                    </div>
                ` : `
                    <div class="text-[11px] ${textMuted} mb-1">
                        ${acCount > 1 ? `${acCount} Units • ₹${priceInfo.unitBase.toLocaleString('en-IN')} / unit` : 'Single Unit Coverage'}
                    </div>
                `}

                <div class="mt-2 text-[10px] uppercase font-bold tracking-wider ${isPopular ? 'text-[#E4C99A]' : 'text-[#655448] dark:text-[#B8AA98]'}">
                    All Rates Basic + GST Extra
                </div>
            </div>

            <div class="p-7 flex flex-col flex-grow">
                <ul class="space-y-3 mb-6 flex-grow">
                    ${featureHtml}
                </ul>

                <button
                    type="button"
                    onclick="openAmcModal('${encodedData}')"
                    class="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 ${btnClass}"
                >
                    <span>Select Contract</span>
                    <span>&rarr;</span>
                </button>
            </div>
        `;

        amcGrid.appendChild(card);
    });

    // GSAP entrance stagger
    if (typeof gsap !== 'undefined' && amcGrid.children.length > 0) {
        gsap.fromTo(amcGrid.children,
            { opacity: 0, y: 18, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.06, ease: 'power2.out' }
        );
    }
}

// ─── MODAL CONTROLS & SUBMISSION ───────────────────────────────────
const modal = document.getElementById('amcModal');
const modalContent = document.getElementById('amcModalContent');
const form = document.getElementById('amcForm');

window.openAmcModal = function(encodedData) {
    const data = JSON.parse(decodeURIComponent(encodedData));

    document.getElementById('modalPlanId').value = data.id || '';
    document.getElementById('modalAcType').value = currentAcType;
    document.getElementById('modalTonnage').value = currentTonnage;
    document.getElementById('modalPrice').value = data.calculatedPrice || 0;
    document.getElementById('modalServicesCount').value = data.services_per_year || 4;

    document.getElementById('modalPlanName').innerText = data.name;
    document.getElementById('modalPlanBadge').innerText = data.code || 'AMC';
    document.getElementById('modalConfigTag').innerText = `${data.selectedAcType} • ${data.selectedTonnage}`;
    document.getElementById('modalUnitsTag').innerText = `${data.unitCount} Unit${data.unitCount > 1 ? 's' : ''}`;
    document.getElementById('modalPlanPrice').innerText = `₹${(data.calculatedPrice || 0).toLocaleString('en-IN')} / year`;
    document.getElementById('modalTermsNote').innerText = data.terms || "All Rates are Basic + GST Applicable as per requirement.";

    const successMsg = document.getElementById('successMsg');
    if (successMsg) successMsg.classList.add('hidden');

    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            if (modalContent) modalContent.classList.remove('scale-95');
        }, 10);
    }

    setTimeout(() => {
        const input = document.getElementById('custName');
        if (input) input.focus();
    }, 150);
};

window.closeAmcModal = function() {
    if (modal) {
        modal.classList.add('opacity-0');
        if (modalContent) modalContent.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            if (form) form.reset();
        }, 300);
    }
};

if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeAmcModal();
    });
}

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('custName').value.trim();
        const phone = document.getElementById('custPhone').value.trim();
        const email = document.getElementById('custEmail').value.trim();
        const address = document.getElementById('custAddress').value.trim();
        const plan_name = document.getElementById('modalPlanName').innerText;
        const plan_id = document.getElementById('modalPlanId').value;
        const ac_type = document.getElementById('modalAcType').value;
        const tonnage = document.getElementById('modalTonnage').value;
        const price = document.getElementById('modalPrice').value;
        const services_per_year = document.getElementById('modalServicesCount').value;

        const payload = {
            name,
            customer_name: name,
            phone,
            email,
            address,
            plan_name,
            plan_id,
            ac_type,
            tonnage,
            price,
            services_per_year
        };

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = `
            <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <span>Registering Contract...</span>
        `;
        submitBtn.disabled = true;

        try {
            const res = await fetch(PURCHASE_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data.success) {
                submitBtn.classList.add('hidden');
                const successMsg = document.getElementById('successMsg');
                if (successMsg) successMsg.classList.remove('hidden');

                if (window.showToast) {
                    window.showToast("AMC subscription registered! Our Chembur desk will call you shortly.", "success");
                }

                setTimeout(() => {
                    closeAmcModal();
                    submitBtn.classList.remove('hidden');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }, 3000);
            } else {
                if (window.showToast) window.showToast(data.message || "Failed to register AMC.", "error");
                else alert(data.message || "Failed to register AMC.");
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        } catch(err) {
            console.error("AMC Purchase Network Error:", err);
            if (window.showToast) window.showToast("Network error submitting subscription.", "error");
            else alert("Network error submitting subscription.");
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ─── THERMODYNAMIC ROI CALCULATOR ──────────────────────────────────
let currentRoiState = { savings: 4200, kwh: 458, roi: 168, co2: 375 };

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

    // Real-time calculation from pricing engine API
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
    const amcCost = 2999 * count;
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

// ─── INITIALIZATION ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadPlans();
    if (window.onRoiSliderChange) window.onRoiSliderChange();
});
