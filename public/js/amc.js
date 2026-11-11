// public/js/amc.js - Enterprise AMC Card & Rate Engine for Extreme Sales & Services
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

// ─── MASTER OFFICIAL RATE CATALOG (CHEMBUR SERVICE CENTER) ────────
const OFFICIAL_CATALOG = [
    // ── 1. COMPREHENSIVE (SAMC) ──────────────────────────────────
    {
        id: "amc-samc-1",
        code: "SAMC 1",
        name: "SAMC 1: Split Comprehensive (Non-Inverter)",
        category: "samc",
        ac_type: "split",
        inverter: false,
        services_per_year: 4,
        unlimited_complaints: true,
        includes_capacitor: true,
        includes_motor: true,
        includes_pcb: true,
        includes_gas: false,
        popular: false,
        badge: "Split Non-Inverter",
        prices: { "0.8_1.0": 2999, "1.5_2.2": 3999 },
        tagline: "Essential comprehensive coverage for Non-Inverter Split ACs",
        terms: "For SAMC ACs must be under 3 years from purchase. GST Extra 28% for parts coverage."
    },
    {
        id: "amc-samc-2",
        code: "SAMC 2",
        name: "SAMC 2: Split Comprehensive (+ Gas Charging)",
        category: "samc",
        ac_type: "split",
        inverter: true,
        services_per_year: 4,
        unlimited_complaints: true,
        includes_capacitor: true,
        includes_motor: true,
        includes_pcb: true,
        includes_gas: true,
        popular: true,
        badge: "★ Most Popular • Full Split Shield",
        prices: { "0.8_1.0": 4499, "1.5_2.2": 5499 },
        tagline: "Complete peace-of-mind including unlimited R32/R410A gas charging & all critical parts",
        terms: "For SAMC ACs must be under 3 years from purchase. GST Extra 28% for parts coverage."
    },
    {
        id: "amc-samc-3",
        code: "SAMC 3",
        name: "SAMC 3: Window Comprehensive (+ Gas Charging)",
        category: "samc",
        ac_type: "window",
        inverter: false,
        services_per_year: 4,
        unlimited_complaints: true,
        includes_capacitor: true,
        includes_motor: true,
        includes_pcb: true,
        includes_gas: true,
        popular: false,
        badge: "Full Window Shield",
        prices: { "0.8_1.0": 3499, "1.5_2.2": 4499 },
        tagline: "Full comprehensive protection engineered specifically for Window AC units",
        terms: "For SAMC ACs must be under 3 years from purchase. GST Extra 28% for parts coverage."
    },
    // ── 2. ORDINARY MAINTENANCE ──────────────────────────────────
    {
        id: "amc-ord-3",
        code: "ORD 3",
        name: "Ordinary 3: Periodic Care (3 Visits / Year)",
        category: "ordinary",
        ac_type: "all",
        services_per_year: 3,
        unlimited_complaints: false,
        popular: false,
        badge: "Budget Saver",
        prices: { "split": 1500, "window": 1000 },
        tagline: "3 Scheduled routine checkups and wet filter servicing per year",
        terms: "All Rates are Basic GST Applicable as per requirement."
    },
    {
        id: "amc-ord-4",
        code: "ORD 4",
        name: "Ordinary 4: Standard Care (+ Unlimited Complaints)",
        category: "ordinary",
        ac_type: "all",
        services_per_year: 4,
        unlimited_complaints: true,
        popular: true,
        badge: "★ Best Value • 4 Visits",
        prices: { "split": 1800, "window": 1300 },
        tagline: "4 Scheduled Services + Unlimited Normal Complaints (Window includes 1 Wet service)",
        terms: "All Rates are Basic GST Applicable as per requirement."
    },
    {
        id: "amc-ord-6",
        code: "ORD 6",
        name: "Ordinary 6: Premium Care (+ Unlimited Complaints)",
        category: "ordinary",
        ac_type: "all",
        services_per_year: 6,
        unlimited_complaints: true,
        popular: false,
        badge: "High-Frequency Care",
        prices: { "split": 2200, "window": 1700 },
        tagline: "6 Bi-Monthly Deep Services + Unlimited Normal Complaints for heavy summer usage",
        terms: "All Rates are Basic GST Applicable as per requirement."
    },
    // ── 3. SPECIALIZED & ON-DEMAND ──────────────────────────────
    {
        id: "amc-jacket-2",
        code: "JACKET 2",
        name: "2 Jacket Deep Wash & Unlimited Complaints",
        category: "specialized",
        ac_type: "split",
        services_per_year: 2,
        unlimited_complaints: true,
        popular: false,
        badge: "Wall-Safe Jacket Care",
        prices: { "flat": 2599 },
        price: 2599,
        tagline: "2 Indoor coil deep washes with protective water-collection jackets & breakdown cover",
        terms: "Per unit basis. All Rates are Basic GST Applicable as per requirement."
    },
    {
        id: "amc-jacket-3",
        code: "JACKET 3",
        name: "3 Jacket Deep Wash & Unlimited Complaints",
        category: "specialized",
        ac_type: "split",
        services_per_year: 3,
        unlimited_complaints: true,
        popular: true,
        badge: "★ Complete Seasonal Shield",
        prices: { "flat": 3599 },
        price: 3599,
        tagline: "3 Deep jacket chemical cleaning sessions with zero water mess on walls & furniture",
        terms: "Per unit basis. All Rates are Basic GST Applicable as per requirement."
    },
    {
        id: "amc-pump-down",
        code: "PUMP DOWN",
        name: "Refrigerant Pump Down Service",
        category: "specialized",
        ac_type: "all",
        services_per_year: 1,
        unlimited_complaints: false,
        popular: false,
        badge: "Refrigerant Lock",
        prices: { "flat": 1299 },
        price: 1299,
        tagline: "Safe gas recovery and pressure locking into outdoor compressor before renovation/shifting",
        terms: "Rate per AC unit. Gas top-up extra if required. Basic GST applicable."
    },
    {
        id: "amc-jet-wash",
        code: "JET WASH",
        name: "High-Pressure Jet Wash Deep Clean",
        category: "specialized",
        ac_type: "all",
        services_per_year: 1,
        unlimited_complaints: false,
        popular: false,
        badge: "Intense Chemical Jet",
        prices: { "flat": 1199 },
        price: 1199,
        tagline: "Full commercial-grade pressure wash of clogged cooling coils, blower fan, and drain pan",
        terms: "Rate per AC unit. All Rates are Basic GST Applicable as per requirement."
    }
];

// ─── ACTIVE CONTROLS STATE ─────────────────────────────────────────
let currentCategory = 'samc';       // 'all' | 'samc' | 'ordinary' | 'specialized'
let currentAcType = 'split';        // 'all' | 'split' | 'window'
let currentTonnage = '1.5_2.2';     // '0.8_1.0' | '1.5_2.2'
let acCount = 1;                    // 1 | 2 | 3+

const amcGrid = document.getElementById('amcGrid');

// ─── LOAD DATA (ROBUST DUAL-SOURCE) ────────────────────────────────
function loadPlans() {
    renderPlans(); // Immediate render from official catalog (zero delay)

    // Background sync with API if available
    fetch(AMC_API)
        .then(res => res.json())
        .then(data => {
            if (data && data.success && Array.isArray(data.plans) && data.plans.length >= 8) {
                // Merge API plans if matching official catalog
                renderPlans();
            }
        })
        .catch(err => {
            console.log("Operating in offline/direct catalog mode:", err.message);
        });
}

// ─── FILTER CONTROLS ───────────────────────────────────────────────
window.setAmcCategory = function(cat) {
    currentCategory = cat;

    ['all', 'samc', 'ordinary', 'specialized'].forEach(c => {
        const tab = document.getElementById(`catTab-${c}`);
        if (!tab) return;
        if (c === cat) {
            tab.className = "amc-cat-tab active px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-2 shadow-sm cursor-pointer bg-[#A05B3A] text-[#F2EDE3]";
        } else {
            tab.className = "amc-cat-tab px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer bg-[#FDFBF7] dark:bg-[#27211D] text-[#655448] dark:text-[#B8AA98] border border-[#B8AA98]/40 dark:border-[#B8AA98]/20 hover:text-[#342C27] dark:hover:text-[#F2EDE3]";
        }
    });

    const samcBanner = document.getElementById('samcAdvisoryBanner');
    if (samcBanner) {
        samcBanner.style.display = (cat === 'samc' || cat === 'all') ? 'flex' : 'none';
    }

    renderPlans();
};

window.setAmcAcType = function(type) {
    currentAcType = type;

    const allBtn = document.getElementById('acTypeAllBtn');
    const splitBtn = document.getElementById('acTypeSplitBtn');
    const windowBtn = document.getElementById('acTypeWindowBtn');

    [allBtn, splitBtn, windowBtn].forEach(b => {
        if (b) b.className = "px-3 py-1.5 text-xs font-bold rounded-lg transition text-[#655448] dark:text-[#B8AA98] hover:text-[#342C27] dark:hover:text-[#F2EDE3]";
    });

    if (type === 'all' && allBtn) {
        allBtn.className = "px-3 py-1.5 text-xs font-extrabold rounded-lg transition bg-[#A05B3A] text-white shadow-2xs";
    } else if (type === 'split' && splitBtn) {
        splitBtn.className = "px-3 py-1.5 text-xs font-extrabold rounded-lg transition bg-[#A05B3A] text-white shadow-2xs";
    } else if (type === 'window' && windowBtn) {
        windowBtn.className = "px-3 py-1.5 text-xs font-extrabold rounded-lg transition bg-[#A05B3A] text-white shadow-2xs";
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
    let unitBase = 2999;

    if (plan.category === 'samc') {
        if (plan.prices && plan.prices[currentTonnage] !== undefined) {
            unitBase = Number(plan.prices[currentTonnage]);
        } else {
            unitBase = plan.prices ? (plan.prices['1.5_2.2'] || 3999) : 2999;
        }
    } else if (plan.category === 'ordinary') {
        const typeKey = (currentAcType === 'window') ? 'window' : 'split';
        unitBase = plan.prices ? (plan.prices[typeKey] || 1500) : 1500;
    } else {
        unitBase = plan.price || (plan.prices ? plan.prices.flat : 2599) || 1299;
    }

    let discountMultiplier = 1.0;
    if (acCount === 2) discountMultiplier = 0.90;
    else if (acCount >= 3) discountMultiplier = 0.85;

    const total = Math.round(unitBase * acCount * discountMultiplier);
    return {
        unitBase,
        total,
        discountApplied: discountMultiplier < 1.0,
        discountMultiplier
    };
}

// ─── CARD RENDERER (BEAUTIFULLY STYLED) ─────────────────────────────
function renderPlans() {
    if (!amcGrid) return;
    amcGrid.innerHTML = '';

    // Smart filter:
    // If category is 'all': shows all 10 plans.
    // If category is 'samc': shows SAMC 1, SAMC 2, and SAMC 3.
    // If category is 'ordinary': shows ORD 3, ORD 4, ORD 6.
    // If category is 'specialized': shows Jacket 2, Jacket 3, Pump down, Jet wash.
    const plansToShow = OFFICIAL_CATALOG.filter(plan => {
        if (currentCategory !== 'all' && plan.category !== currentCategory) {
            return false;
        }

        // When user explicitly clicks Split or Window in the top bar:
        if (currentAcType === 'split') {
            if (plan.ac_type === 'window') return false;
        } else if (currentAcType === 'window') {
            if (plan.ac_type === 'split') return false;
        }
        return true;
    });

    // Fallback: If strict AC type filtered everything, show the category's plans
    const effectivePlans = (plansToShow.length > 0)
        ? plansToShow
        : OFFICIAL_CATALOG.filter(p => currentCategory === 'all' || p.category === currentCategory);

    effectivePlans.forEach((plan, idx) => {
        const priceInfo = calculatePrice(plan);
        const isPopular = plan.popular;
        const tonnageLabel = (currentTonnage === '0.8_1.0') ? '0.8Tr – 1.0Tr' : '1.5Tr – 2.2Tr';
        const acTypeLabel = (plan.ac_type === 'split') ? 'Split AC' : (plan.ac_type === 'window' ? 'Window AC' : 'Split & Window');

        const card = document.createElement('div');
        card.className = `amc-plan-card relative flex flex-col rounded-3xl transition-all duration-300 overflow-hidden ${
            isPopular
            ? 'bg-[#27211D] text-[#F2EDE3] shadow-2xl md:-translate-y-2.5 z-10 border-2 border-[#A05B3A]'
            : 'bg-[#FDFBF7] dark:bg-[#27211D] text-[#342C27] dark:text-[#F2EDE3] border border-[#B8AA98]/40 dark:border-[#B8AA98]/20 shadow-md hover:shadow-xl hover:-translate-y-1'
        }`;

        // Top Header Ribbon
        const badgeColor = isPopular
            ? 'bg-[#E4C99A] text-[#27211D] font-black'
            : (plan.category === 'samc'
                ? 'bg-[#A05B3A] text-white font-extrabold'
                : (plan.category === 'ordinary'
                    ? 'bg-[#77B89A]/20 text-[#1D3D2B] dark:text-[#77B89A] border border-[#77B89A]/40 font-bold'
                    : 'bg-[#D97706]/20 text-[#D97706] border border-[#D97706]/40 font-bold'));

        // Feature Checklist
        let features = [];
        if (plan.category === 'samc') {
            features.push({ text: `<strong>4 Scheduled Services</strong> (Deep Jet Wash Cleaning)`, icon: "✓", highlight: false });
            features.push({ text: `<strong>Unlimited Breakdown Visits</strong> attended with priority`, icon: "✓", highlight: false });
            features.push({ text: `<strong>Capacitor Replacement</strong> covered (Heavy duty OEM)`, icon: "✓", highlight: false });
            features.push({ text: `<strong>Motor Winding &amp; PCB Repair</strong> covered`, icon: "✓", highlight: false });
            if (plan.includes_gas) {
                features.push({ text: `<strong>❄️ FULL Gas Charging Included</strong> (R32 / R410A)`, icon: "❄️", highlight: true });
            } else {
                features.push({ text: `<span class="text-amber-600 dark:text-amber-400 font-semibold">Gas Top-up at discounted labor rate</span>`, icon: "ℹ️", highlight: false });
            }
            features.push({ text: `<em>Units under 3 years old • GST extra 28%</em>`, icon: "🛡️", highlight: false });
        } else if (plan.category === 'ordinary') {
            features.push({ text: `<strong>${plan.services_per_year} Scheduled Routine Services</strong> per year`, icon: "✓", highlight: false });
            if (plan.unlimited_complaints) {
                features.push({ text: `<strong>Unlimited Normal Complaints</strong> attended promptly`, icon: "✓", highlight: false });
            } else {
                features.push({ text: `Basic Routine Periodic Servicing visits`, icon: "✓", highlight: false });
            }
            if (currentAcType === 'window' && plan.services_per_year >= 4) {
                features.push({ text: `Includes <strong>1 Wet Chemical Deep Service</strong>`, icon: "💧", highlight: true });
            }
            features.push({ text: `Electrical amps, temperature &amp; airflow diagnostics`, icon: "✓", highlight: false });
            features.push({ text: `Genuine OEM spare parts with upfront 15% discount`, icon: "✓", highlight: false });
        } else {
            features.push({ text: `<strong>${plan.name}</strong>`, icon: "✓", highlight: false });
            features.push({ text: `Chemical coil foaming &amp; high-pressure jet wash`, icon: "✓", highlight: false });
            features.push({ text: `Zero wall mess &amp; protective indoor collection jacket`, icon: "✓", highlight: true });
            features.push({ text: `Trained Chembur certified technician fleet`, icon: "✓", highlight: false });
        }

        const featureHtml = features.map(f => `
            <li class="flex items-start gap-2.5 text-xs leading-relaxed ${f.highlight ? 'font-bold text-[#A05B3A] dark:text-[#E4C99A]' : (isPopular ? 'text-[#E6DFD3]' : 'text-[#655448] dark:text-[#B8AA98]')}">
                <span class="${f.highlight ? 'text-[#A05B3A] dark:text-[#E4C99A]' : 'text-[#77B89A]'} font-bold shrink-0 text-sm">${f.icon}</span>
                <span>${f.text}</span>
            </li>
        `).join('');

        // Interactive Price Comparison Box Inside Card
        let rateMatrixBox = '';
        if (plan.category === 'samc') {
            const pSmall = Number(plan.prices['0.8_1.0']);
            const pLarge = Number(plan.prices['1.5_2.2']);
            rateMatrixBox = `
                <div class="grid grid-cols-2 gap-2 p-2 rounded-xl bg-[#EAE3D6]/70 dark:bg-[#1A1412] my-3 text-center border border-[#B8AA98]/30">
                    <button type="button" onclick="setAmcTonnage('0.8_1.0')" class="p-2 rounded-lg transition cursor-pointer ${currentTonnage === '0.8_1.0' ? 'bg-[#A05B3A] text-white shadow-2xs font-black' : 'text-[#655448] dark:text-[#B8AA98] font-bold hover:text-[#342C27] dark:hover:text-[#F2EDE3]'}">
                        <span class="block text-[10px] uppercase tracking-wider">0.8T – 1.0T</span>
                        <span class="text-sm font-mono font-black">₹${pSmall.toLocaleString('en-IN')}</span>
                    </button>
                    <button type="button" onclick="setAmcTonnage('1.5_2.2')" class="p-2 rounded-lg transition cursor-pointer ${currentTonnage === '1.5_2.2' ? 'bg-[#A05B3A] text-white shadow-2xs font-black' : 'text-[#655448] dark:text-[#B8AA98] font-bold hover:text-[#342C27] dark:hover:text-[#F2EDE3]'}">
                        <span class="block text-[10px] uppercase tracking-wider">1.5T – 2.2T</span>
                        <span class="text-sm font-mono font-black">₹${pLarge.toLocaleString('en-IN')}</span>
                    </button>
                </div>
            `;
        } else if (plan.category === 'ordinary') {
            const pSplit = Number(plan.prices.split);
            const pWindow = Number(plan.prices.window);
            rateMatrixBox = `
                <div class="grid grid-cols-2 gap-2 p-2 rounded-xl bg-[#EAE3D6]/70 dark:bg-[#1A1412] my-3 text-center border border-[#B8AA98]/30">
                    <button type="button" onclick="setAmcAcType('split')" class="p-2 rounded-lg transition cursor-pointer ${currentAcType === 'split' ? 'bg-[#A05B3A] text-white shadow-2xs font-black' : 'text-[#655448] dark:text-[#B8AA98] font-bold hover:text-[#342C27] dark:hover:text-[#F2EDE3]'}">
                        <span class="block text-[10px] uppercase tracking-wider">Split AC</span>
                        <span class="text-sm font-mono font-black">₹${pSplit.toLocaleString('en-IN')}</span>
                    </button>
                    <button type="button" onclick="setAmcAcType('window')" class="p-2 rounded-lg transition cursor-pointer ${currentAcType === 'window' ? 'bg-[#A05B3A] text-white shadow-2xs font-black' : 'text-[#655448] dark:text-[#B8AA98] font-bold hover:text-[#342C27] dark:hover:text-[#F2EDE3]'}">
                        <span class="block text-[10px] uppercase tracking-wider">Window AC</span>
                        <span class="text-sm font-mono font-black">₹${pWindow.toLocaleString('en-IN')}</span>
                    </button>
                </div>
            `;
        }

        const encodedData = encodeURIComponent(JSON.stringify({
            ...plan,
            selectedTonnage: tonnageLabel,
            selectedAcType: acTypeLabel,
            calculatedPrice: priceInfo.total,
            unitPrice: priceInfo.unitBase,
            unitCount: acCount
        }));

        const textMain = isPopular ? 'text-[#F2EDE3]' : 'text-[#342C27] dark:text-[#F2EDE3]';
        const textMuted = isPopular ? 'text-[#B8AA98]' : 'text-[#655448] dark:text-[#B8AA98]';
        const btnClass = isPopular
            ? 'bg-[#A05B3A] hover:bg-[#8D4B2D] text-white shadow-[0_4px_14px_rgba(160,91,58,0.4)]'
            : 'bg-[#342C27] hover:bg-[#27211D] dark:bg-[#F2EDE3] dark:hover:bg-white text-white dark:text-[#342C27] shadow-sm';

        card.innerHTML = `
            <!-- Top Badge Header -->
            <div class="px-6 pt-6 pb-2 flex items-center justify-between">
                <span class="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${badgeColor}">
                    ${plan.badge}
                </span>
                <span class="text-[10px] font-mono font-bold text-[#A05B3A] dark:text-[#E4C99A] uppercase tracking-widest">
                    ${plan.code}
                </span>
            </div>

            <!-- Card Body / Pricing -->
            <div class="px-6 py-4 text-center">
                <h3 class="text-xl font-black ${textMain} mb-1.5 leading-snug">${escapeHtml(plan.name)}</h3>
                <p class="text-xs ${textMuted} font-medium mb-3 min-h-[32px]">${escapeHtml(plan.tagline)}</p>

                ${rateMatrixBox}

                <!-- Active Calculated Price Hero -->
                <div class="flex items-baseline justify-center gap-1.5 mt-2">
                    <span class="text-xl font-bold ${textMuted}">₹</span>
                    <span class="text-4xl sm:text-5xl font-black ${textMain} tracking-tight font-mono">${priceInfo.total.toLocaleString('en-IN')}</span>
                    <span class="text-xs font-bold ${textMuted}">/ yr</span>
                </div>

                ${priceInfo.discountApplied ? `
                    <div class="mt-1 inline-block bg-[#77B89A]/20 text-[#1D3D2B] dark:text-[#77B89A] border border-[#77B89A]/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        ${acCount} Units • Save ${acCount === 2 ? '10%' : '15%'} Volume Discount
                    </div>
                ` : `
                    <div class="text-[11px] font-medium ${textMuted} mt-1">
                        ${acCount > 1 ? `${acCount} Units Coverage` : 'Single AC Unit Care'}
                    </div>
                `}

                <p class="text-[10px] uppercase font-bold tracking-wider ${isPopular ? 'text-[#E4C99A]' : 'text-[#655448] dark:text-[#B8AA98]'} mt-1.5">
                    Basic Rate + GST Applicable
                </p>
            </div>

            <!-- Feature Scope & Inclusions -->
            <div class="px-6 pb-6 pt-2 flex flex-col flex-grow border-t ${isPopular ? 'border-[#B8AA98]/20' : 'border-[#B8AA98]/30 dark:border-[#B8AA98]/20'}">
                <span class="text-[10px] uppercase tracking-widest font-black text-[#A05B3A] dark:text-[#E4C99A] my-3 block">
                    Service Scope &amp; Deliverables
                </span>
                <ul class="space-y-3 mb-6 flex-grow">
                    ${featureHtml}
                </ul>

                <button
                    type="button"
                    onclick="openAmcModal('${encodedData}')"
                    class="w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 ${btnClass}"
                >
                    <span>Book Contract</span>
                    <span>&rarr;</span>
                </button>
            </div>
        `;

        amcGrid.appendChild(card);
    });

    // GSAP entrance stagger
    if (typeof gsap !== 'undefined' && amcGrid.children.length > 0) {
        gsap.fromTo(amcGrid.children,
            { opacity: 0, y: 20, scale: 0.96 },
            { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.08, ease: 'power2.out' }
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

// ─── INITIALIZATION ON DOM READY ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadPlans();
    if (window.onRoiSliderChange) window.onRoiSliderChange();
});
