// public/js/vendor.js
// ═══════════════════════════════════════════════════════════════════════════
// VENDOR PARTNER PORTAL LOGIC & COMMERCIAL MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

let allProducts = [];
let vendorInventory = {};
let activeInquiryForBid = null;

const DEFAULT_SPARES = [
    { id: 'sp-1', name: '1.5 Ton Rotary Compressor (R32)', brand: 'Daikin / Highly', cost: 7200, warranty: '1 Year', qty: 14 },
    { id: 'sp-2', name: '1.0 Ton Rotary Compressor (R410A)', brand: 'GMCC / Voltas', cost: 5800, warranty: '1 Year', qty: 8 },
    { id: 'sp-3', name: 'Indoor Cross-Flow Blower Motor', brand: 'Universal OEM', cost: 1850, warranty: '6 Months', qty: 25 },
    { id: 'sp-4', name: 'Outdoor Condenser Fan Motor', brand: 'Panasonic / LG', cost: 2200, warranty: '6 Months', qty: 18 },
    { id: 'sp-5', name: 'Universal Inverter Dual PCB Board Set', brand: 'Multi-Brand', cost: 4200, warranty: '6 Months', qty: 12 },
    { id: 'sp-6', name: '45µF Dual Run Motor Capacitor', brand: 'Epcos / Tibcon', cost: 380, warranty: '1 Year', qty: 65 },
    { id: 'sp-7', name: 'R32 Refrigerant Gas Cylinder (3kg)', brand: 'Floron / Refron', cost: 2450, warranty: 'Sealed', qty: 30 },
    { id: 'sp-8', name: 'R410A Refrigerant Cylinder (2.5kg)', brand: 'Mafron / Chemours', cost: 2600, warranty: 'Sealed', qty: 22 }
];

const MOCK_INQUIRIES = [
    {
        id: 'INQ-B2B-101',
        client: 'Kiran Logistics Chembur',
        requirement: '5x 1.5 Ton 5-Star Inverter Split ACs for Ground Office',
        preferredBrand: 'Daikin or Voltas',
        targetDate: 'Within 48 Hours',
        status: 'Open for Bids'
    },
    {
        id: 'INQ-B2B-102',
        client: 'Greenfield Diagnostic Clinic',
        requirement: '2x 2.0 Ton Heavy Duty Split ACs for Server & Scanning Room',
        preferredBrand: 'Blue Star / Daikin',
        targetDate: 'Urgent (Same Day)',
        status: 'Open for Bids'
    }
];

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    checkVendorAuth();
    initTheme();
    loadCatalog();
    renderSpares();
    renderInquiries();

    document.getElementById('refreshBtn')?.addEventListener('click', () => {
        const icon = document.getElementById('refreshIcon');
        if (icon) icon.classList.add('rotate-180');
        loadCatalog().finally(() => {
            setTimeout(() => icon?.classList.remove('rotate-180'), 500);
            showToast('Catalog synchronized', 'success');
        });
    });
});

function checkVendorAuth() {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!token || !userStr) {
        window.location.href = 'login.html';
        return;
    }
    try {
        const user = JSON.parse(userStr);
        if (user.role !== 'vendor' && user.role !== 'admin') {
            window.location.href = 'login.html';
        }
    } catch (_) {
        window.location.href = 'login.html';
    }
}

function handleVendorLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

function initTheme() {
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateThemeIcons(isDark);
        });
    });
    updateThemeIcons(document.documentElement.classList.contains('dark'));
}

function updateThemeIcons(isDark) {
    document.querySelectorAll('.theme-icon-moon').forEach(el => el.classList.toggle('hidden', isDark));
    document.querySelectorAll('.theme-icon-sun').forEach(el => el.classList.toggle('hidden', !isDark));
}

// Switch navigation tabs
function switchVendorTab(tabId) {
    const tabs = ['products', 'spares', 'inquiries', 'profile'];
    tabs.forEach(t => {
        const sec = document.getElementById(`section${capitalize(t)}`);
        const btn = document.getElementById(`tabBtn${capitalize(t)}`);
        if (sec && btn) {
            if (t === tabId) {
                sec.classList.remove('hidden');
                btn.className = 'vendor-tab active px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer bg-[#A05B3A] text-white shadow-xs';
            } else {
                sec.classList.add('hidden');
                btn.className = 'vendor-tab px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer text-[#655448] dark:text-[#B8AA98] hover:text-[#342C27] dark:hover:text-[#F2EDE3]';
            }
        }
    });
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Load products
async function loadCatalog() {
    try {
        const res = await fetch('/api/products');
        if (res.ok) {
            const data = await res.json();
            allProducts = Array.isArray(data) ? data : (data.products || []);
        }
    } catch (_) {
        // Fallback demo catalog if offline
        allProducts = [
            { id: 'p1', name: 'Daikin 1.5 Ton 5 Star Inverter Split AC', brand: 'Daikin', price: 46990, capacity: '1.5 Ton', starRating: 5 },
            { id: 'p2', name: 'Voltas 1.5 Ton 3 Star Inverter Split AC', brand: 'Voltas', price: 34990, capacity: '1.5 Ton', starRating: 3 },
            { id: 'p3', name: 'Blue Star 1.5 Ton 5 Star Inverter Split AC', brand: 'Blue Star', price: 44990, capacity: '1.5 Ton', starRating: 5 },
            { id: 'p4', name: 'Panasonic 1.0 Ton 3 Star Wi-Fi Inverter Split AC', brand: 'Panasonic', price: 32990, capacity: '1.0 Ton', starRating: 3 },
            { id: 'p5', name: 'LG 1.5 Ton 5 Star AI DUAL Inverter Split AC', brand: 'LG', price: 47990, capacity: '1.5 Ton', starRating: 5 },
            { id: 'p6', name: 'Voltas 1.5 Ton Window AC (Fixed Speed)', brand: 'Voltas', price: 28990, capacity: '1.5 Ton', starRating: 3 }
        ];
    }

    // Load saved vendor inventory from storage
    const saved = localStorage.getItem('vendor_inventory');
    if (saved) {
        try { vendorInventory = JSON.parse(saved); } catch (_) {}
    }

    renderVendorProducts(allProducts);
    updateKpis();
}

function updateKpis() {
    const kpiTotal = document.getElementById('kpiTotalProducts');
    const kpiStock = document.getElementById('kpiUnitsInStock');
    if (kpiTotal) kpiTotal.textContent = allProducts.length;

    let units = 0;
    allProducts.forEach(p => {
        const item = vendorInventory[p.id] || {};
        units += (parseInt(item.stock, 10) || 4); // Default 4 units each
    });
    if (kpiStock) kpiStock.textContent = units;
}

function renderVendorProducts(products) {
    const tbody = document.getElementById('vendorProductList');
    if (!tbody) return;

    if (!products.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-[#655448] dark:text-[#B8AA98]">No products match filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = products.map(p => {
        const item = vendorInventory[p.id] || {
            rate: Math.round(p.price * 0.88),
            stock: 6,
            lead: '24 - 48 Hours',
            status: 'In Stock'
        };

        return `
            <tr class="hover:bg-[#E6DFD3]/20 dark:hover:bg-[#1F1916]/50 transition">
              <td class="p-3.5">
                <div class="font-bold text-[#342C27] dark:text-[#F2EDE3]">${escapeHtml(p.name)}</div>
                <div class="text-[11px] text-[#A05B3A] dark:text-[#E4C99A] font-semibold">${p.brand || 'HVAC'} · ${p.capacity || '1.5T'} · ${p.starRating || 3}★</div>
              </td>
              <td class="p-3.5 font-mono text-[#655448] dark:text-[#B8AA98]">
                ₹${Number(p.price).toLocaleString('en-IN')}
              </td>
              <td class="p-3.5">
                <div class="flex items-center gap-1 font-mono">
                  <span class="text-[#A05B3A] dark:text-[#E4C99A] font-bold">₹</span>
                  <input type="number" id="rate_${p.id}" value="${item.rate}" class="w-24 px-2 py-1 rounded-lg border border-[#B8AA98]/40 dark:border-[#B8AA98]/20 bg-white dark:bg-[#1F1916] text-xs font-bold text-[#342C27] dark:text-[#F2EDE3]">
                </div>
              </td>
              <td class="p-3.5">
                <div class="flex items-center gap-1.5">
                  <input type="number" id="stock_${p.id}" value="${item.stock}" min="0" class="w-16 px-2 py-1 rounded-lg border border-[#B8AA98]/40 dark:border-[#B8AA98]/20 bg-white dark:bg-[#1F1916] text-xs font-bold text-[#77B89A]">
                  <span class="text-[11px] text-[#655448] dark:text-[#B8AA98]">units</span>
                </div>
              </td>
              <td class="p-3.5">
                <select id="lead_${p.id}" class="px-2 py-1 rounded-lg border border-[#B8AA98]/40 dark:border-[#B8AA98]/20 bg-white dark:bg-[#1F1916] text-[11px] text-[#342C27] dark:text-[#F2EDE3]">
                  <option value="Same Day" ${item.lead === 'Same Day' ? 'selected' : ''}>Same Day</option>
                  <option value="24 - 48 Hours" ${item.lead === '24 - 48 Hours' ? 'selected' : ''}>24 - 48 Hours</option>
                  <option value="3 - 5 Days" ${item.lead === '3 - 5 Days' ? 'selected' : ''}>3 - 5 Days</option>
                </select>
              </td>
              <td class="p-3.5 text-right">
                <button onclick="updateProductInventory('${p.id}')" class="bg-[#A05B3A] hover:bg-[#944E2E] text-white px-3 py-1 rounded-lg font-bold text-[11px] shadow-xs transition cursor-pointer">
                  Save
                </button>
              </td>
            </tr>
        `;
    }).join('');
}

function filterVendorProducts() {
    const q = (document.getElementById('searchProductInput')?.value || '').toLowerCase().trim();
    if (!q) {
        renderVendorProducts(allProducts);
        return;
    }
    const filtered = allProducts.filter(p => 
        (p.name || '').toLowerCase().includes(q) || 
        (p.brand || '').toLowerCase().includes(q)
    );
    renderVendorProducts(filtered);
}

function updateProductInventory(productId) {
    const rateEl = document.getElementById(`rate_${productId}`);
    const stockEl = document.getElementById(`stock_${productId}`);
    const leadEl = document.getElementById(`lead_${productId}`);

    const rate = Number(rateEl?.value) || 0;
    const stock = Number(stockEl?.value) || 0;
    const lead = leadEl?.value || '24 - 48 Hours';

    vendorInventory[productId] = {
        rate,
        stock,
        lead,
        updatedAt: new Date().toISOString()
    };

    localStorage.setItem('vendor_inventory', JSON.stringify(vendorInventory));
    updateKpis();
    showToast('Wholesale rate and stock updated', 'success');

    // Optionally notify backend
    fetch('/api/vendor/inventory-update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ productId, rate, stock, lead })
    }).catch(() => {});
}

function renderSpares() {
    const tbody = document.getElementById('vendorSparesList');
    if (!tbody) return;

    tbody.innerHTML = DEFAULT_SPARES.map(s => `
        <tr class="hover:bg-[#E6DFD3]/20 dark:hover:bg-[#1F1916]/50 transition">
          <td class="p-3.5 font-bold text-[#342C27] dark:text-[#F2EDE3]">
            ${escapeHtml(s.name)}
          </td>
          <td class="p-3.5 text-[#655448] dark:text-[#B8AA98]">
            ${escapeHtml(s.brand)}
          </td>
          <td class="p-3.5 font-mono text-[#A05B3A] dark:text-[#E4C99A] font-bold">
            ₹${s.cost.toLocaleString('en-IN')}
          </td>
          <td class="p-3.5 text-[#77B89A] font-semibold">
            ${s.warranty}
          </td>
          <td class="p-3.5 font-mono">
            ${s.qty} in stock
          </td>
          <td class="p-3.5 text-right">
            <button onclick="showToast('Part specification verified', 'info')" class="bg-white/80 dark:bg-[#1F1916] border border-[#B8AA98]/40 hover:border-[#A05B3A] text-[#342C27] dark:text-[#F2EDE3] px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer">
              Adjust
            </button>
          </td>
        </tr>
    `).join('');
}

function renderInquiries() {
    const container = document.getElementById('vendorInquiryCards');
    if (!container) return;

    container.innerHTML = MOCK_INQUIRIES.map(inq => `
        <div class="bg-white/80 dark:bg-[#27211D]/80 p-5 rounded-2xl border border-[#B8AA98]/40 dark:border-[#B8AA98]/20 shadow-xs space-y-3">
          <div class="flex justify-between items-start">
            <div>
              <span class="text-[10px] font-black uppercase tracking-wider bg-[#A05B3A]/15 text-[#A05B3A] px-2 py-0.5 rounded-full border border-[#A05B3A]/30">
                ${inq.id}
              </span>
              <h3 class="font-bold text-sm text-[#342C27] dark:text-[#F2EDE3] mt-1.5">${escapeHtml(inq.client)}</h3>
            </div>
            <span class="text-xs font-bold text-[#77B89A] bg-[#77B89A]/15 px-2.5 py-1 rounded-xl">
              ${inq.status}
            </span>
          </div>

          <p class="text-xs text-[#655448] dark:text-[#B8AA98] leading-relaxed">
            ${escapeHtml(inq.requirement)}
          </p>

          <div class="pt-2 border-t border-[#B8AA98]/20 flex items-center justify-between text-xs">
            <span class="text-[11px] text-[#655448] dark:text-[#B8AA98]">Timeline: <strong>${inq.targetDate}</strong></span>
            <button onclick="openBidModal('${inq.id}')" class="bg-[#A05B3A] hover:bg-[#944E2E] text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer">
              Submit Quotation
            </button>
          </div>
        </div>
    `).join('');
}

function openBidModal(inquiryId) {
    activeInquiryForBid = MOCK_INQUIRIES.find(i => i.id === inquiryId);
    if (!activeInquiryForBid) return;

    const summary = document.getElementById('bidModalInquirySummary');
    if (summary) summary.textContent = `Quoting for: ${activeInquiryForBid.client} · ${activeInquiryForBid.requirement}`;

    const modal = document.getElementById('bidModal');
    if (modal) modal.classList.remove('hidden');
}

function closeBidModal() {
    const modal = document.getElementById('bidModal');
    if (modal) modal.classList.add('hidden');
    activeInquiryForBid = null;
}

function submitBidConfirmed() {
    const rate = document.getElementById('bidUnitRate')?.value;
    const window = document.getElementById('bidDeliveryWindow')?.value;
    const notes = document.getElementById('bidNotes')?.value;

    if (!rate) {
        showToast('Please enter your unit supply rate', 'error');
        return;
    }

    closeBidModal();
    showToast(`Quotation submitted to ESS Admin for ${activeInquiryForBid?.client}!`, 'success');

    // Notify backend
    fetch('/api/vendor/submit-bid', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            inquiryId: activeInquiryForBid?.id,
            rate,
            window,
            notes
        })
    }).catch(() => {});
}

function saveVendorProfile() {
    showToast('Supplier partner profile updated successfully', 'success');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const colors = {
        success: 'bg-[#77B89A] text-white',
        error: 'bg-[#C84B31] text-white',
        info: 'bg-[#342C27] text-[#F2EDE3]'
    };

    const toast = document.createElement('div');
    toast.className = `${colors[type] || colors.info} px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold pointer-events-auto transform transition-all duration-300 translate-y-2 opacity-0 flex items-center gap-2`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}
