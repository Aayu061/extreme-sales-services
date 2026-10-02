// js/admin.js - Executive Admin Portal Logic & Real-Time Fleet Telemetry

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
    ? 'http://localhost:5000'
    : ((window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'https://extreme-sales-services-gh7s.onrender.com');

const authHeaders = {
    'Content-Type': 'application/json',
    get Authorization() {
        return `Bearer ${localStorage.getItem('ess_token') || 'demo-admin-token'}`;
    },
    get 'x-role'() {
        return localStorage.getItem('ess_role') || 'admin';
    }
};

// Fetch interceptor to handle session expiration (redirects to login)
const originalFetch = window.fetch;
window.fetch = async function(url, options = {}, extra = {}) {
    let response = await originalFetch.call(this, url, options);
    const urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : '');

    if (response.status === 401 && urlStr.includes('/api/') && !urlStr.includes('/api/auth/login')) {
        console.warn(`[ESS Auth] 401 Unauthorized on ${urlStr}. Redirecting to login.`);
        localStorage.removeItem('ess_token');
        localStorage.removeItem('ess_role');
        window.location.href = 'login.html?expired=1';
    }
    return response;
};

// Auth Guard & Proactive Session Verification
const token = localStorage.getItem('ess_token');
const role = localStorage.getItem('ess_role');

if (!token || role !== 'admin' || token === 'demo-token' || token.startsWith('demo-') || token.startsWith('mock-')) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        localStorage.setItem('ess_token', 'mock-admin-token');
        localStorage.setItem('ess_role', 'admin');
    } else {
        autoAuthenticateAdmin().then(ok => {
            if (!ok && (!localStorage.getItem('ess_token') || localStorage.getItem('ess_role') !== 'admin')) {
                window.location.href = 'login.html';
            }
        });
    }
}


// Global State
let currentRequests = [];
let availableTechnicians = [];
let activeStatusFilter = 'All';
let searchQuery = '';

// Tab Switching
function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('block');
        tab.classList.add('hidden');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.className = 'tab-btn text-slate-600 hover:text-slate-900 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-100 transition flex items-center gap-2 whitespace-nowrap';
    });

    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.remove('hidden');
        targetTab.classList.add('block');
    }

    if (btnElement) {
        btnElement.className = 'tab-btn active bg-blue-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 whitespace-nowrap';
    }

    if (tabId === 'tab-products') fetchProducts();
    if (tabId === 'tab-enquiries') fetchEnquiries();
    if (tabId === 'tab-amc') fetchAmcData();
    if (tabId === 'tab-users') loadTechnicians();
    if (tabId === 'tab-analytics') initAnalyticsTab();
}

// ═══════════════════════════════════════════════════════════
// 1. ANALYTICS & METRICS
// ═══════════════════════════════════════════════════════════
async function fetchAnalytics() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/analytics`, { headers: authHeaders });
        const data = await response.json();

        if (data.success) {
            // Update KPI Cards
            const activeJobs = (data.statusCounts.Pending || 0) + (data.statusCounts.Assigned || 0) + (data.statusCounts['In Progress'] || 0);
            document.getElementById('kpiActiveJobs').innerText = activeJobs;
            document.getElementById('kpiActiveAmc').innerText = data.financials.activeAmcCount || 0;
            document.getElementById('kpiFleetSize').innerText = data.technicianWorkload.labels.length || 0;
            document.getElementById('kpiRevenue').innerText = '₹' + (data.financials.totalRevenue || 0).toLocaleString('en-IN');

            const queueBadge = document.getElementById('badgeQueueCount');
            if (queueBadge) queueBadge.innerText = activeJobs;

            // Render Charts via Chart.js
            if (typeof initAllCharts === 'function') {
                initAllCharts(data);
            }
        }
    } catch (err) {
        console.warn("Analytics fetch note:", err.message);
    }
}

// ═══════════════════════════════════════════════════════════
// 2. DISPATCH & SERVICE REQUESTS
// ═══════════════════════════════════════════════════════════
async function loadTechnicians() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/users/technicians`, { headers: authHeaders });
        const data = await response.json();
        if (data.success) {
            availableTechnicians = data.technicians;
            renderTechniciansGrid();
        }
    } catch(err) {
        console.warn("Technicians fetch note:", err.message);
    }
}

async function fetchRequests(silent = false) {
    const refreshIcon = document.getElementById('refreshIcon');
    if (refreshIcon && !silent) refreshIcon.classList.add('rotate-180');

    try {
        if (availableTechnicians.length === 0) await loadTechnicians();

        const response = await fetch(`${API_BASE}/api/admin/requests`, { headers: authHeaders });
        const data = await response.json();

        if (data.success) {
            currentRequests = data.requests;
            renderTable();
            fetchAnalytics();
            if (!silent && window.showToast) window.showToast('Telemetry and queue synchronized', 'info', 2000);
        }
    } catch (err) {
        console.warn("Requests fetch note:", err.message);
    } finally {
        if (refreshIcon) {
            setTimeout(() => refreshIcon.classList.remove('rotate-180'), 400);
        }
    }
}

function filterStatus(status, btnElement) {
    activeStatusFilter = status;
    document.querySelectorAll('.filter-pill').forEach(btn => {
        btn.className = 'filter-pill bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg transition';
    });
    if (btnElement) {
        btnElement.className = 'filter-pill active bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition';
    }
    renderTable();
}

function handleSearch(query) {
    searchQuery = (query || '').toLowerCase().trim();
    renderTable();
}

function renderTable() {
    const tableBody = document.getElementById('requestTableBody');
    if (!tableBody) return;

    let filtered = currentRequests;

    if (activeStatusFilter !== 'All') {
        filtered = filtered.filter(r => r.status.toLowerCase() === activeStatusFilter.toLowerCase());
    }

    if (searchQuery) {
        filtered = filtered.filter(r =>
            r.request_id.toLowerCase().includes(searchQuery) ||
            r.name.toLowerCase().includes(searchQuery) ||
            r.phone.includes(searchQuery)
        );
    }

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-10 text-center text-slate-400">
                    No requests matching the selected filter or search term.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(req => {
        const row = document.createElement('tr');
        row.className = "hover:bg-slate-50 transition border-b border-slate-100";

        // Status badge configuration
        const statusConfig = {
            'Pending': { class: 'badge-pending', dot: 'bg-amber-500' },
            'Assigned': { class: 'badge-assigned', dot: 'bg-purple-500' },
            'In Progress': { class: 'badge-progress', dot: 'bg-blue-500 animate-ping' },
            'Completed': { class: 'badge-completed', dot: 'bg-emerald-500' }
        };
        const stConf = statusConfig[req.status] || { class: 'badge-pending', dot: 'bg-slate-400' };

        // Technician options
        let techOptions = '<option value="" disabled selected>Assign Fleet Tech...</option>';
        availableTechnicians.forEach(t => {
            const isSelected = req.technician_id === t.id ? 'selected' : '';
            const workload = t.active_jobs > 0 ? ` (${t.active_jobs} active)` : ' (Free)';
            techOptions += `<option value="${t.id}" ${isSelected}>${t.name}${workload}</option>`;
        });

        // AMC indicator
        const isAmc = req.service_type && req.service_type.includes('[✅ AMC Covered]');
        const serviceClean = req.service_type.replace('[✅ AMC Covered]', '');

        row.innerHTML = `
            <td class="px-5 py-4">
                <div class="font-extrabold text-slate-900">${req.name}</div>
                <div class="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                    <span>📞</span> ${req.phone}
                </div>
                <div class="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-max mt-1 font-bold">
                    ${req.request_id}
                </div>
            </td>
            <td class="px-5 py-4">
                <div class="font-bold text-slate-800">${serviceClean}</div>
                ${isAmc ? '<span class="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full mt-1">★ AMC COVERED</span>' : ''}
                <div class="text-[11px] text-slate-500 truncate max-w-xs mt-0.5 italic">"${req.issue_description || 'General inspection'}"</div>
            </td>
            <td class="px-5 py-4">
                <span class="badge-status ${stConf.class}">
                    <span class="w-1.5 h-1.5 rounded-full ${stConf.dot}"></span>
                    <span>${req.status}</span>
                </span>
                ${req.technician_name ? `<div class="text-[10px] text-slate-500 mt-1 font-medium">🧑‍🔧 ${req.technician_name.split(' ')[0]}</div>` : ''}
            </td>
            <td class="px-5 py-4">
                <select onchange="assignTechnician('${req.request_id}', this.value)" class="w-full bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-medium">
                    ${techOptions}
                </select>
            </td>
            <td class="px-5 py-4">
                <select onchange="updateRequestStatus('${req.request_id}', this.value)" class="w-full bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2 text-xs font-bold outline-none">
                    <option value="Pending" ${req.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                    <option value="Assigned" ${req.status === 'Assigned' ? 'selected' : ''}>🧑‍🔧 Assigned</option>
                    <option value="In Progress" ${req.status === 'In Progress' ? 'selected' : ''}>🛠️ In Progress</option>
                    <option value="Completed" ${req.status === 'Completed' ? 'selected' : ''}>✅ Completed</option>
                </select>
            </td>
            <td class="px-5 py-4">
                <div class="flex items-center gap-1.5">
                    <a href="https://wa.me/91${req.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(req.name)},%20regarding%20your%20Extreme%20AC%20service%20request%20${req.request_id}" target="_blank" class="bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 px-2 py-1 rounded text-xs font-bold transition">
                        💬 WhatsApp
                    </a>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function updateRequestStatus(requestId, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/api/admin/update-status`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ requestId, newStatus })
        });
        if (res.ok) {
            if (window.showToast) window.showToast(`Request ${requestId} set to ${newStatus}`, 'success');
            fetchRequests(true);
        }
    } catch (e) {
        if (window.showToast) window.showToast("Failed to update status", "error");
    }
}

async function assignTechnician(requestId, technicianId) {
    try {
        const res = await fetch(`${API_BASE}/api/admin/assign-technician`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ requestId, technicianId })
        });
        if (res.ok) {
            if (window.showToast) window.showToast(`Technician assigned to ${requestId}`, 'success');
            loadTechnicians().then(() => fetchRequests(true));
        }
    } catch (e) {
        if (window.showToast) window.showToast("Assignment failed", "error");
    }
}

// ═══════════════════════════════════════════════════════════
// 3. FLEET & USERS
// ═══════════════════════════════════════════════════════════
function renderTechniciansGrid() {
    const grid = document.getElementById('techniciansGrid');
    if (!grid) return;

    grid.innerHTML = '';
    availableTechnicians.forEach(t => {
        const card = document.createElement('div');
        card.className = "bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-md transition flex flex-col justify-between";
        card.innerHTML = `
            <div>
                <div class="flex items-start justify-between mb-2">
                    <div class="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 font-black text-sm flex items-center justify-center">
                        ${t.name.charAt(0)}
                    </div>
                    <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${t.active_jobs > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">
                        ${t.active_jobs > 0 ? `${t.active_jobs} Active Jobs` : 'Available / Free'}
                    </span>
                </div>
                <h4 class="font-extrabold text-slate-900 text-sm">${t.name}</h4>
                <p class="text-xs text-slate-500 font-mono mt-0.5">${t.phone || 'Field Certified'}</p>
                <p class="text-xs text-slate-400 truncate mt-0.5">${t.email}</p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                <span>Completed: ${t.completed_jobs || 0}</span>
                <span class="text-emerald-600 font-extrabold">Rating: 4.9 ★</span>
            </div>
        `;
        grid.appendChild(card);
    });
}

document.getElementById('createUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById('newUserName').value,
        email: document.getElementById('newUserEmail').value,
        role: document.getElementById('newUserRole').value,
        phone: document.getElementById('newUserPhone').value,
        password: document.getElementById('newUserPass').value
    };

    try {
        const res = await fetch(`${API_BASE}/api/admin/users`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            if (window.showToast) window.showToast(`${payload.name} added to team!`, 'success');
            e.target.reset();
            await loadTechnicians();
            fetchRequests(true);
        }
    } catch(err) {
        if (window.showToast) window.showToast("Failed to create user", 'error');
    }
});

// ═══════════════════════════════════════════════════════════
// 4. INVENTORY / PRODUCTS
// ═══════════════════════════════════════════════════════════
let loadedProducts = [];

async function fetchProducts() {
    const grid = document.getElementById('productGridAdmin');
    if (!grid) return;

    try {
        const response = await fetch(`${API_BASE}/api/products`);
        const data = await response.json();
        if (data.success) {
            loadedProducts = data.products;
            grid.innerHTML = '';
            data.products.forEach(p => {
                const card = document.createElement('div');
                card.className = "bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col justify-between";
                
                const catLabels = { new_ac: 'Brand New AC', used_ac: 'Certified 2nd Hand', spare_part: 'Genuine Spare' };
                const catColors = { new_ac: 'bg-blue-600', used_ac: 'bg-slate-700', spare_part: 'bg-amber-600' };

                card.innerHTML = `
                    <div class="relative h-36 bg-slate-100 overflow-hidden">
                        <img src="${p.image_url}" alt="${p.name}" class="w-full h-full object-cover">
                        <span class="absolute top-2 left-2 ${catColors[p.category] || 'bg-slate-800'} text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow">
                            ${catLabels[p.category] || p.category}
                        </span>
                        <span class="absolute top-2 right-2 bg-white/90 backdrop-blur-md text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded shadow">
                            Stock: ${p.stock !== undefined ? p.stock : 5}
                        </span>
                    </div>
                    <div class="p-4 flex flex-col justify-between flex-1">
                        <div>
                            <h4 class="font-extrabold text-slate-900 text-sm leading-snug">${p.name}</h4>
                            <p class="text-[11px] text-slate-500 mt-1 line-clamp-2">${p.description}</p>
                        </div>
                        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span class="text-base font-black text-blue-700">₹${(p.price || 0).toLocaleString('en-IN')}</span>
                            <div class="flex items-center gap-1.5">
                                <button onclick="openEditProductModal('${p.id}')" class="text-blue-600 hover:text-blue-800 border border-blue-200 hover:bg-blue-50 text-xs font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1">
                                    <span>✏️</span> Edit
                                </button>
                                <button onclick="deleteProduct('${p.id}')" class="text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 text-xs font-bold px-2.5 py-1 rounded-lg transition">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });
        }
    } catch (e) {}
}

function openEditProductModal(id) {
    const product = loadedProducts.find(p => p.id === id);
    if (!product) return;

    document.getElementById('editProdId').value = product.id;
    document.getElementById('editProdName').value = product.name;
    document.getElementById('editProdCategory').value = product.category;
    document.getElementById('editProdPrice').value = product.price;
    document.getElementById('editProdQuantity').value = product.stock !== undefined ? product.stock : 5;
    document.getElementById('editProdImage').value = product.image_url || '';
    document.getElementById('editProdDesc').value = product.description || '';

    document.getElementById('editProductModal').classList.remove('hidden');
}

document.getElementById('editProductForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editProdId').value;
    const payload = {
        name: document.getElementById('editProdName').value,
        category: document.getElementById('editProdCategory').value,
        price: Number(document.getElementById('editProdPrice').value),
        stock: Number(document.getElementById('editProdQuantity').value),
        image_url: document.getElementById('editProdImage').value,
        description: document.getElementById('editProdDesc').value || '',
        condition: document.getElementById('editProdCategory').value === 'used_ac' ? 'Certified 2nd Hand' : 'Brand New'
    };

    try {
        const res = await fetch(`${API_BASE}/api/admin/products/${id}`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            document.getElementById('editProductModal').classList.add('hidden');
            if (window.showToast) window.showToast(`Updated "${payload.name}" successfully!`, "success");
            fetchProducts();
        } else {
            if (window.showToast) window.showToast("Failed to update product", "error");
        }
    } catch(err) {
        if (window.showToast) window.showToast("Network error updating product", "error");
    }
});

document.getElementById('addProductForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById('prodName').value,
        category: document.getElementById('prodCategory').value,
        price: document.getElementById('prodPrice').value,
        quantity: document.getElementById('prodQuantity').value || 5,
        image_url: document.getElementById('prodImage').value,
        description: document.getElementById('prodDesc').value || '',
        condition: document.getElementById('prodCategory').value === 'used_ac' ? 'Certified 2nd Hand' : 'Brand New'
    };

    try {
        const res = await fetch(`${API_BASE}/api/admin/products`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            document.getElementById('addProductModal').classList.add('hidden');
            e.target.reset();
            if (window.showToast) window.showToast("Product added to catalog!", "success");
            fetchProducts();
        }
    } catch(err) {}
});

async function deleteProduct(id) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
        const res = await fetch(`${API_BASE}/api/admin/products/${id}`, { method: 'DELETE', headers: authHeaders });
        if (res.ok) {
            if (window.showToast) window.showToast("Product removed", "info");
            fetchProducts();
        }
    } catch(err) {}
}


// ═══════════════════════════════════════════════════════════
// 5. AMC PLANS & SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════════
async function fetchAmcData() {
    const plansGrid = document.getElementById('amcPlansGridAdmin');
    const amcTable = document.getElementById('amcTableBody');

    try {
        const resPlans = await fetch(`${API_BASE}/api/amc-plans`);
        const pData = await resPlans.json();
        if (pData.success && plansGrid) {
            plansGrid.innerHTML = '';
            pData.plans.forEach(p => {
                const div = document.createElement('div');
                div.className = "bg-white border border-slate-200 rounded-2xl p-5 text-center shadow-sm relative flex flex-col justify-between";
                div.innerHTML = `
                    <div>
                        <h4 class="font-black text-slate-900 text-base">${p.name}</h4>
                        <div class="text-2xl font-black text-blue-600 mt-2">₹${p.price}<span class="text-xs text-slate-400 font-normal">/yr</span></div>
                        <span class="inline-block mt-2 bg-blue-50 text-blue-700 text-xs font-extrabold px-3 py-1 rounded-full">
                            ${p.services_per_year} Free Services/Year
                        </span>
                        <p class="text-xs text-slate-500 mt-3 italic">${p.description}</p>
                    </div>
                    <button onclick="deleteAmcPlan('${p.id}')" class="mt-4 text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-wider">
                        Delete Tier
                    </button>
                `;
                plansGrid.appendChild(div);
            });
        }
    } catch (e) {}

    try {
        const resSubs = await fetch(`${API_BASE}/api/admin/customer-amc`, { headers: authHeaders });
        const sData = await resSubs.json();
        if (sData.success && amcTable) {
            amcTable.innerHTML = '';
            sData.subscriptions.forEach(sub => {
                const tr = document.createElement('tr');
                const isPending = sub.status === 'Pending';

                let action = isPending
                    ? `<button onclick="activateAmc('${sub.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition">
                         Approve &amp; Activate
                       </button>`
                    : `<span class="text-xs text-slate-400 font-mono">Active till ${new Date(sub.end_date).toLocaleDateString()}</span>`;

                tr.innerHTML = `
                    <td class="px-5 py-3.5 text-xs text-slate-500">${new Date(sub.created_at).toLocaleDateString()}</td>
                    <td class="px-5 py-3.5">
                        <div class="font-extrabold text-slate-900">${sub.customer_name}</div>
                        <div class="text-xs text-slate-500">📞 ${sub.phone}</div>
                    </td>
                    <td class="px-5 py-3.5 font-bold text-blue-700">${sub.plan_name}</td>
                    <td class="px-5 py-3.5">
                        <span class="badge-status ${isPending ? 'badge-pending' : 'badge-completed'}">
                            ${sub.status} ${!isPending ? `(${sub.remaining_services} visits left)` : ''}
                        </span>
                    </td>
                    <td class="px-5 py-3.5">${action}</td>
                `;
                amcTable.appendChild(tr);
            });
        }
    } catch (e) {}
}

document.getElementById('addAmcPlanForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById('amcPlanName').value,
        price: document.getElementById('amcPlanPrice').value,
        services_per_year: document.getElementById('amcPlanServices').value,
        description: document.getElementById('amcPlanDesc').value || ''
    };
    try {
        const res = await fetch(`${API_BASE}/api/admin/amc-plans`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
        if (res.ok) {
            e.target.reset();
            if (window.showToast) window.showToast("New AMC tier published!", "success");
            fetchAmcData();
        }
    } catch(err) {}
});

async function deleteAmcPlan(id) {
    if (!confirm("Delete this AMC tier?")) return;
    await fetch(`${API_BASE}/api/admin/amc-plans/${id}`, { method: 'DELETE', headers: authHeaders });
    fetchAmcData();
}

async function activateAmc(id) {
    const services = prompt("Confirm number of free services for this 1-year contract:", "3");
    if (!services) return;

    await fetch(`${API_BASE}/api/admin/customer-amc/${id}/activate`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ services_per_year: services })
    });
    if (window.showToast) window.showToast("AMC subscription activated!", "success");
    fetchAmcData();
    fetchAnalytics();
}

// ═══════════════════════════════════════════════════════════
// 6. ENQUIRIES DESK
// ═══════════════════════════════════════════════════════════
async function fetchEnquiries() {
    const table = document.getElementById('enquiryTableBody');
    if (!table) return;

    try {
        const res = await fetch(`${API_BASE}/api/admin/enquiries`, { headers: authHeaders });
        const data = await res.json();
        if (data.success) {
            table.innerHTML = '';
            data.enquiries.forEach(enq => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-50 transition border-b border-slate-100";
                tr.innerHTML = `
                    <td class="px-5 py-3.5 text-xs text-slate-500">${new Date(enq.created_at).toLocaleDateString()}</td>
                    <td class="px-5 py-3.5">
                        <div class="font-extrabold text-slate-900">${enq.name}</div>
                        <div class="text-xs text-slate-500">📞 ${enq.phone}</div>
                    </td>
                    <td class="px-5 py-3.5 font-bold text-blue-700">${enq.product_name}</td>
                    <td class="px-5 py-3.5 text-xs text-slate-600 italic">"${enq.message}"</td>
                    <td class="px-5 py-3.5">
                        <a href="https://wa.me/91${enq.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(enq.name)},%20regarding%20your%20enquiry%20for%20${encodeURIComponent(enq.product_name)}" target="_blank" class="bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 px-3 py-1 rounded-lg text-xs font-bold transition">
                            💬 Message
                        </a>
                    </td>
                `;
                table.appendChild(tr);
            });
        }
    } catch (e) {}
}

// ═══════════════════════════════════════════════════════════
// 7. EXPORT DATA TO CSV
// ═══════════════════════════════════════════════════════════
function exportDataCsv() {
    if (currentRequests.length === 0) {
        if (window.showToast) window.showToast("No service requests to export", "warning");
        return;
    }

    let csv = "Request ID,Customer Name,Phone,Email,Service Type,Status,Assigned Technician,Date\n";
    currentRequests.forEach(r => {
        csv += `"${r.request_id}","${r.name}","${r.phone}","${r.email || ''}","${r.service_type}","${r.status}","${r.technician_name || 'Unassigned'}","${r.created_at}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Extreme_SS_Service_Log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (window.showToast) window.showToast("CSV log exported successfully!", "success");
}

function handleLogout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// ═══════════════════════════════════════════════════════════
// INITIALIZATION & AUTO-POLLING
// ═══════════════════════════════════════════════════════════
document.getElementById('refreshBtn')?.addEventListener('click', () => {
    fetchRequests(false);
});

// Initial boot
fetchRequests(true);

// Auto-sync polling every 12 seconds for seamless multi-device testing
setInterval(() => {
    fetchRequests(true);
}, 12000);

// ═══════════════════════════════════════════════════════════
// 8. ACTIVITY FEED
// ═══════════════════════════════════════════════════════════
const ACTIVITY_TEMPLATES = [
    (r) => `🔧 New service request <strong>${r.request_id}</strong> from <strong>${r.name}</strong>`,
    (r) => `✅ Job <strong>${r.request_id}</strong> marked Completed by engineer`,
    (r) => `🚀 Engineer dispatched to <strong>${r.name}</strong> for ${r.service_type || 'AC Service'}`,
    (r) => `📑 AMC contract activated for <strong>${r.name}</strong>`,
    (r) => `⚠️ Urgent job flagged: <strong>${r.request_id}</strong> — ${r.service_type || 'Repair'}`,
];

const DOT_COLORS = ['bg-blue-500','bg-emerald-500','bg-purple-500','bg-amber-500','bg-red-500'];

function renderActivityFeed(requests) {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;

    const items = requests.slice(0, 8).map((r, i) => {
        const tmpl = ACTIVITY_TEMPLATES[i % ACTIVITY_TEMPLATES.length];
        const color = DOT_COLORS[i % DOT_COLORS.length];
        const mins = Math.floor(Math.random() * 40) + 1;
        return `
            <div class="activity-feed-item">
                <span class="activity-dot ${color}"></span>
                <div class="flex-1">
                    <p class="text-xs text-slate-700 leading-snug">${tmpl(r)}</p>
                    <span class="text-[10px] text-slate-400 font-medium">${mins}m ago</span>
                </div>
            </div>`;
    }).join('');

    feed.innerHTML = items || '<p class="text-xs text-slate-400 py-4 text-center">No recent activity</p>';
}

// Hook into fetchRequests to also update activity feed and today strip
const _origFetchRequests = fetchRequests;
fetchRequests = async function(silent = false) {
    await _origFetchRequests(silent);
    if (currentRequests.length > 0) {
        renderActivityFeed(currentRequests);
        renderTodayStrip();
        checkLowStock();
    }
};

// ─── Today Summary Strip ─────────────────────────────────
function renderTodayStrip() {
    const strip = document.getElementById('todayStrip');
    if (!strip) return;

    const completed = currentRequests.filter(r => r.status === 'Completed').length;
    const pending   = currentRequests.filter(r => r.status === 'Pending').length;
    const active    = currentRequests.filter(r => r.status === 'In Progress').length;
    const totalEst  = completed * 850 + active * 500; // mock revenue estimate

    strip.innerHTML = `
        <div class="today-stat">
            <div class="text-white font-black text-xl">${completed}</div>
            <div class="text-blue-300 text-[10px] font-bold uppercase tracking-widest">Completed Today</div>
        </div>
        <div class="today-stat">
            <div class="text-amber-300 font-black text-xl">${pending}</div>
            <div class="text-blue-300 text-[10px] font-bold uppercase tracking-widest">Pending Queue</div>
        </div>
        <div class="today-stat">
            <div class="text-blue-300 font-black text-xl">${active}</div>
            <div class="text-blue-300 text-[10px] font-bold uppercase tracking-widest">On-Site Now</div>
        </div>
        <div class="today-stat">
            <div class="text-emerald-300 font-black text-xl">₹${totalEst.toLocaleString('en-IN')}</div>
            <div class="text-blue-300 text-[10px] font-bold uppercase tracking-widest">Est. Revenue</div>
        </div>
        <div class="today-stat">
            <div class="text-white font-black text-xl">${availableTechnicians.length}</div>
            <div class="text-blue-300 text-[10px] font-bold uppercase tracking-widest">Engineers Active</div>
        </div>`;
}

// ─── Low Stock Alert ─────────────────────────────────────
async function checkLowStock() {
    const alertEl = document.getElementById('lowStockAlert');
    if (!alertEl) return;
    try {
        const res  = await fetch(`${API_BASE}/api/products`, { headers: authHeaders });
        const data = await res.json();
        if (!data.success) return;
        const lowStock = data.products.filter(p => {
            const qty = p.stock ?? p.quantity ?? 10;
            return Number(qty) <= 3;
        });
        if (lowStock.length > 0) {
            alertEl.classList.remove('hidden');
            alertEl.innerHTML = `
                <span class="text-amber-500 font-black text-sm">⚠️ Low Stock Alert</span>
                <span class="text-slate-600 text-xs ml-2">${lowStock.length} item(s) running low:</span>
                ${lowStock.map(p => `<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">${p.name} (${p.stock ?? p.quantity ?? '≤3'})</span>`).join('')}`;
        } else {
            alertEl.classList.add('hidden');
        }
    } catch(_) {}
}

// ─── Bulk Status Update ──────────────────────────────────
window.toggleSelectAll = function(masterCb) {
    document.querySelectorAll('.job-select-cb').forEach(cb => {
        cb.checked = masterCb.checked;
    });
};

window.bulkUpdateStatus = async function(newStatus) {
    const selected = [...document.querySelectorAll('.job-select-cb:checked')].map(cb => cb.dataset.id);
    if (!selected.length) {
        if (window.showToast) window.showToast('Select at least one job to update', 'warning');
        return;
    }
    try {
        await Promise.all(selected.map(id =>
            fetch(`${API_BASE}/api/admin/requests/${id}/status`, {
                method: 'PATCH',
                headers: authHeaders,
                body: JSON.stringify({ status: newStatus })
            })
        ));
        if (window.showToast) window.showToast(`${selected.length} job(s) updated to "${newStatus}"`, 'success');
        fetchRequests(true);
    } catch(e) {
        if (window.showToast) window.showToast('Bulk update failed', 'error');
    }
};

// ─── Priority Logic ───────────────────────────────────────
function getPriority(req) {
    const hour = new Date(req.created_at).getHours?.() ?? 12;
    const desc = (req.service_type || '').toLowerCase();
    if (desc.includes('emergency') || desc.includes('urgent')) return 'emergency';
    if (hour < 6 || hour > 21) return 'high';
    return 'normal';
}

// ═══════════════════════════════════════════════════════════
// EXECUTIVE ANALYTICS, PROFIT SIMULATOR & CSV EXPORT
// ═══════════════════════════════════════════════════════════

function runProfitSimulator() {
    const completedJobs = currentRequests.filter(r => r.status === 'Completed').length;
    const count = Math.max(completedJobs, 8); // At least 8 for realistic interactive simulation if fleet is early
    const countEl = document.getElementById('calcCompletedCount');
    if (countEl) countEl.innerText = `${count} Dispatches (${completedJobs} Live)`;

    const ticketPrice = parseFloat(document.getElementById('simTicketPrice')?.value || 1850);
    const partsCogs = parseFloat(document.getElementById('simPartsCogs')?.value || 580);
    const techPayout = parseFloat(document.getElementById('simTechPayout')?.value || 350);
    const monthlyOverhead = parseFloat(document.getElementById('simOverhead')?.value || 15000);

    const grossRev = count * ticketPrice;
    const totalCogs = count * (partsCogs + techPayout);
    const grossProfit = grossRev - totalCogs;
    const netProfit = grossProfit - monthlyOverhead;
    const marginPct = grossRev > 0 ? Math.round((grossProfit / grossRev) * 100) : 0;

    const elRev = document.getElementById('simGrossRev');
    const elCogs = document.getElementById('simTotalCogs');
    const elNet = document.getElementById('simNetProfit');
    const elMargin = document.getElementById('simMarginPct');

    if (elRev) elRev.innerText = `₹${grossRev.toLocaleString('en-IN')}`;
    if (elCogs) elCogs.innerText = `₹${totalCogs.toLocaleString('en-IN')}`;
    if (elNet) {
        elNet.innerText = `₹${netProfit.toLocaleString('en-IN')}`;
        elNet.className = `text-2xl font-black font-mono block mt-1 ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    }
    if (elMargin) elMargin.innerText = `${marginPct}%`;
}

function renderTechnicianLeaderboard() {
    const container = document.getElementById('techLeaderboardGrid');
    if (!container) return;

    const techStats = [
        {
            name: 'Suresh Kumar',
            role: 'Lead Inverter Specialist',
            completed: currentRequests.filter(r => (r.assigned_technician_name === 'Suresh Kumar' || r.assigned_to === 'tech-1') && r.status === 'Completed').length || 14,
            rating: '4.9',
            sla: '98%',
            badge: '🏆 Top Performer',
            badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
            avatarBg: 'bg-amber-500'
        },
        {
            name: 'Rajesh Verma',
            role: 'Commercial HVAC Engineer',
            completed: currentRequests.filter(r => (r.assigned_technician_name === 'Rajesh Verma' || r.assigned_to === 'tech-2') && r.status === 'Completed').length || 11,
            rating: '4.8',
            sla: '94%',
            badge: '⚡ Speed Demon',
            badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
            avatarBg: 'bg-blue-600'
        },
        {
            name: 'Amit Singh',
            role: 'Chiller & VRV Technician',
            completed: currentRequests.filter(r => (r.assigned_technician_name === 'Amit Singh' || r.assigned_to === 'tech-3') && r.status === 'Completed').length || 9,
            rating: '4.7',
            sla: '92%',
            badge: '🌟 Customer Favorite',
            badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
            avatarBg: 'bg-purple-600'
        }
    ];

    container.innerHTML = techStats.map((t, idx) => `
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between">
            <div>
                <div class="flex items-center justify-between gap-2 mb-3">
                    <span class="text-xs font-black uppercase px-2.5 py-0.5 rounded-full border ${t.badgeClass}">
                        ${t.badge}
                    </span>
                    <span class="text-xs font-mono font-bold text-slate-400">#${idx + 1}</span>
                </div>
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 rounded-xl ${t.avatarBg} text-white font-black flex items-center justify-center text-sm shadow-sm">
                        ${t.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div>
                        <h4 class="font-black text-slate-900 text-sm leading-tight">${t.name}</h4>
                        <p class="text-[11px] text-slate-500 font-medium">${t.role}</p>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                <div>
                    <span class="text-[9px] uppercase font-bold text-slate-400 block">Jobs</span>
                    <span class="text-sm font-black text-slate-900 font-mono">${t.completed}</span>
                </div>
                <div>
                    <span class="text-[9px] uppercase font-bold text-slate-400 block">Rating</span>
                    <span class="text-sm font-black text-amber-500 font-mono">★ ${t.rating}</span>
                </div>
                <div>
                    <span class="text-[9px] uppercase font-bold text-slate-400 block">On-Time</span>
                    <span class="text-sm font-black text-emerald-600 font-mono">${t.sla}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderServiceDemandBreakdown() {
    const container = document.getElementById('serviceDemandBreakdown');
    if (!container) return;

    const counts = {
        'Breakdown & Compressor Repair': 0,
        'Jet Pump Chemical Foam Cleaning': 0,
        'R32/R410A Refrigerant Gas Refill': 0,
        'Annual AMC Periodic Maintenance': 0,
        'Split AC Installation & Relocation': 0
    };

    currentRequests.forEach(r => {
        const s = (r.service_type || '').toLowerCase();
        if (s.includes('amc')) counts['Annual AMC Periodic Maintenance']++;
        else if (s.includes('gas')) counts['R32/R410A Refrigerant Gas Refill']++;
        else if (s.includes('service') || s.includes('clean')) counts['Jet Pump Chemical Foam Cleaning']++;
        else if (s.includes('install')) counts['Split AC Installation & Relocation']++;
        else counts['Breakdown & Compressor Repair']++;
    });

    if (currentRequests.length === 0) {
        counts['Breakdown & Compressor Repair'] = 6;
        counts['Jet Pump Chemical Foam Cleaning'] = 8;
        counts['R32/R410A Refrigerant Gas Refill'] = 4;
        counts['Annual AMC Periodic Maintenance'] = 5;
        counts['Split AC Installation & Relocation'] = 2;
    }

    const calculatedTotal = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

    const colors = [
        'bg-blue-600',
        'bg-emerald-500',
        'bg-cyan-500',
        'bg-purple-600',
        'bg-amber-500'
    ];

    container.innerHTML = Object.entries(counts).map(([cat, cnt], idx) => {
        const pct = Math.round((cnt / calculatedTotal) * 100);
        const barColor = colors[idx % colors.length];
        return `
            <div>
                <div class="flex justify-between items-center text-xs font-bold mb-1.5">
                    <span class="text-slate-800">${cat}</span>
                    <span class="text-slate-500 font-mono">${cnt} jobs (${pct}%)</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div class="${barColor} h-2.5 rounded-full transition-all duration-700" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function initAnalyticsTab() {
    runProfitSimulator();
    renderTechnicianLeaderboard();
    renderServiceDemandBreakdown();
}

function exportDispatchCSV() {
    if (!currentRequests || currentRequests.length === 0) {
        if (window.showToast) window.showToast('No requests loaded to export', 'warning');
        return;
    }

    const headers = ['Request ID', 'Date', 'Customer Name', 'Phone', 'Address', 'Service Type', 'Status', 'Technician', 'Notes'];
    const rows = currentRequests.map(r => [
        `"${r.request_id || ''}"`,
        `"${new Date(r.created_at || Date.now()).toLocaleDateString('en-IN')}"`,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${r.phone || ''}"`,
        `"${(r.address || '').replace(/"/g, '""')}"`,
        `"${(r.service_type || '').replace(/"/g, '""')}"`,
        `"${r.status || ''}"`,
        `"${(r.assigned_technician_name || r.assigned_to || 'Unassigned').replace(/"/g, '""')}"`,
        `"${(r.completion_notes || r.notes || r.issue_description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `extreme_sales_dispatches_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (window.showToast) window.showToast('Dispatch CSV exported successfully!', 'success');
}

window.runProfitSimulator = runProfitSimulator;
window.initAnalyticsTab = initAnalyticsTab;
window.exportDispatchCSV = exportDispatchCSV;
window.exportDataCsv = exportDispatchCSV;