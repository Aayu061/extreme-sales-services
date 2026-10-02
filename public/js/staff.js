// js/staff.js - Coordinator Dispatch & Operations Logic

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
    ? 'http://localhost:5000'
    : ((window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'https://extreme-sales-services-gh7s.onrender.com');

const authHeaders = {
    'Content-Type': 'application/json',
    get Authorization() {
        return `Bearer ${localStorage.getItem('ess_token') || ''}`;
    },
    get 'x-role'() {
        return localStorage.getItem('ess_role') || '';
    }
};

// Transparent fetch interceptor to handle session expiration
const originalFetch = window.fetch;
window.fetch = async function(url, options = {}, extra = {}) {
    let response = await originalFetch.call(this, url, options);
    const urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : '');

    if (response.status === 401 && urlStr.includes('/api/') && !urlStr.includes('/api/auth/login')) {
        console.warn(`[ESS Staff Auth] 401 Unauthorized on ${urlStr}. Redirecting to login.`);
        localStorage.removeItem('ess_token');
        localStorage.removeItem('ess_role');
        window.location.href = 'login.html?expired=1';
    }
    return response;
};

// Strict Real-Auth Guard
const token = localStorage.getItem('ess_token');
const role = localStorage.getItem('ess_role');

if (!token || (role !== 'staff' && role !== 'admin') || token.startsWith('demo-') || token.startsWith('mock-')) {
    localStorage.removeItem('ess_token');
    localStorage.removeItem('ess_role');
    localStorage.removeItem('ess_user');
    window.location.href = 'login.html';
}


// Global State
let currentRequests = [];
let availableTechnicians = [];
let activeStatusFilter = 'All';
let searchQuery = '';

function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('block');
        tab.classList.add('hidden');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.className = 'tab-btn text-slate-600 hover:text-slate-900 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-100 transition flex items-center gap-2 whitespace-nowrap';
    });

    const target = document.getElementById(tabId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('block');
    }

    if (btnElement) {
        btnElement.className = 'tab-btn active bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 whitespace-nowrap';
    }

    if (tabId === 'tab-enquiries') fetchEnquiries();
}

async function loadTechnicians() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/users/technicians`, { headers: authHeaders });
        const data = await response.json();
        if (data.success) {
            availableTechnicians = data.technicians;
        }
    } catch(err) {
        console.warn("Technicians load:", err.message);
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
            
            // Update KPI Counts
            const pending = currentRequests.filter(r => r.status === 'Pending').length;
            const assigned = currentRequests.filter(r => r.status === 'Assigned').length;
            const progress = currentRequests.filter(r => r.status === 'In Progress').length;
            const completed = currentRequests.filter(r => r.status === 'Completed').length;

            document.getElementById('statPending').innerText = pending;
            document.getElementById('statAssigned').innerText = assigned;
            document.getElementById('statProgress').innerText = progress;
            document.getElementById('statCompleted').innerText = completed;

            const badgeCount = document.getElementById('badgeServiceCount');
            if (badgeCount) badgeCount.innerText = pending + assigned + progress;

            renderTable();
            if (!silent && window.showToast) window.showToast("Queue synchronized with field", "info", 1800);
        }
    } catch(err) {
        console.warn("Fetch error:", err.message);
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
    const tbody = document.getElementById('requestTableBody');
    if (!tbody) return;

    let filtered = currentRequests;

    if (activeStatusFilter !== 'All') {
        filtered = filtered.filter(r => r.status.toLowerCase() === activeStatusFilter.toLowerCase());
    }

    if (searchQuery) {
        filtered = filtered.filter(r =>
            r.request_id.toLowerCase().includes(searchQuery) ||
            r.name.toLowerCase().includes(searchQuery) ||
            r.phone.includes(searchQuery) ||
            (r.address && r.address.toLowerCase().includes(searchQuery))
        );
    }

    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-10 text-center text-slate-400">
                    No requests matching the selected filter.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(req => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-emerald-50/40 transition border-b border-slate-100";

        const statusConfig = {
            'Pending': { class: 'badge-pending', dot: 'bg-amber-500' },
            'Assigned': { class: 'badge-assigned', dot: 'bg-purple-500' },
            'In Progress': { class: 'badge-progress', dot: 'bg-blue-500 animate-ping' },
            'Completed': { class: 'badge-completed', dot: 'bg-emerald-500' }
        };
        const stConf = statusConfig[req.status] || { class: 'badge-pending', dot: 'bg-slate-400' };

        // Tech dropdown
        let techOpts = '<option value="" disabled selected>Select Available Tech...</option>';
        availableTechnicians.forEach(t => {
            const isSelected = req.technician_id === t.id ? 'selected' : '';
            const workload = t.active_jobs > 0 ? ` (${t.active_jobs} active)` : ' (Free)';
            techOpts += `<option value="${t.id}" ${isSelected}>${t.name}${workload}</option>`;
        });

        const isAmc = req.service_type && req.service_type.includes('[✅ AMC Covered]');
        const serviceClean = req.service_type.replace('[✅ AMC Covered]', '');

        tr.innerHTML = `
            <td class="px-5 py-4">
                <div class="font-extrabold text-slate-900 dark:text-white">${req.name}</div>
                <div class="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">📞 ${req.phone}</div>
                <div class="text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-xs mt-0.5">📍 ${req.address}</div>
                <div class="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded w-max mt-1 font-bold border border-emerald-100 dark:border-emerald-800/40">
                    ${req.request_id}
                </div>
            </td>
            <td class="px-5 py-4">
                <div class="font-bold text-slate-800 dark:text-slate-200">${serviceClean}</div>
                ${isAmc ? '<span class="inline-block bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 border border-emerald-200 dark:border-emerald-700/50">★ COVERED BY AMC</span>' : ''}
                <div class="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5 max-w-xs truncate">"${req.issue_description || 'General inspection'}"</div>
            </td>
            <td class="px-5 py-4 whitespace-nowrap">
                <span class="badge-status ${stConf.class}">
                    <span class="w-1.5 h-1.5 rounded-full ${stConf.dot}"></span>
                    <span>${req.status}</span>
                </span>
                ${req.technician_name ? `<div class="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">🧑‍🔧 ${req.technician_name.split(' ')[0]}</div>` : ''}
                ${req.dispatch_score ? `<div class="text-[9px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40 w-max mt-0.5">⚡ ${req.dispatch_score}% Match</div>` : ''}
            </td>
            <td class="px-5 py-4">
                <select onchange="assignTechnician('${req.request_id}', this.value)" class="w-full min-w-[145px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg py-1.5 px-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-medium">
                    ${techOpts}
                </select>
                ${req.status === 'Pending' ? `
                <button type="button" onclick="triggerAlgorithmicAutoDispatch('${req.request_id}')" class="mt-1.5 w-full bg-gradient-to-r from-amber-500/10 via-emerald-500/15 to-teal-500/10 hover:from-emerald-600 hover:to-teal-600 text-emerald-800 dark:text-emerald-300 hover:text-white border border-emerald-300/80 dark:border-emerald-700/60 font-black py-1 px-2 rounded-lg text-[10px] transition flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95" title="Compute optimal technician using MOW-GDM algorithm">
                    <span>⚡</span>
                    <span>Auto-Match AI</span>
                </button>
                ` : ''}
            </td>
            <td class="px-5 py-4">
                <select onchange="updateRequestStatus('${req.request_id}', this.value)" class="w-full min-w-[130px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg py-1.5 px-2 text-xs font-bold outline-none">
                    <option value="Pending" ${req.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                    <option value="Assigned" ${req.status === 'Assigned' ? 'selected' : ''}>🧑‍🔧 Assigned</option>
                    <option value="In Progress" ${req.status === 'In Progress' ? 'selected' : ''}>🛠️ In Progress</option>
                    <option value="Completed" ${req.status === 'Completed' ? 'selected' : ''}>✅ Completed</option>
                </select>
            </td>
            <td class="px-5 py-4 whitespace-nowrap">
                <a href="https://wa.me/91${req.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(req.name)},%20Extreme%20AC%20Service%20coordinator%20here%20regarding%20request%20${req.request_id}." target="_blank" class="bg-emerald-50 hover:bg-emerald-600 dark:bg-emerald-950/40 dark:hover:bg-emerald-600 text-emerald-700 hover:text-white dark:text-emerald-300 dark:hover:text-white border border-emerald-200 dark:border-emerald-700/50 px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 w-max">
                    <span>💬</span>
                    <span>WhatsApp</span>
                </a>
            </td>
        `;
        tbody.appendChild(tr);
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
            if (window.showToast) window.showToast(`Updated ${requestId} to ${newStatus}`, 'success');
            fetchRequests(true);
        }
    } catch(err) {
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
    } catch(err) {
        if (window.showToast) window.showToast("Assignment failed", "error");
    }
}

async function fetchEnquiries() {
    const tbody = document.getElementById('enquiryTableBody');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/api/admin/enquiries`, { headers: authHeaders });
        const data = await res.json();
        if (data.success) {
            tbody.innerHTML = '';
            data.enquiries.forEach(enq => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-50 transition border-b border-slate-100";
                tr.innerHTML = `
                    <td class="px-5 py-3.5 text-xs text-slate-500">${new Date(enq.created_at).toLocaleDateString()}</td>
                    <td class="px-5 py-3.5">
                        <div class="font-extrabold text-slate-900">${enq.name}</div>
                        <div class="text-xs text-slate-500">📞 ${enq.phone}</div>
                    </td>
                    <td class="px-5 py-3.5 font-bold text-emerald-700">${enq.product_name}</td>
                    <td class="px-5 py-3.5 text-xs text-slate-600 italic">"${enq.message}"</td>
                    <td class="px-5 py-3.5">
                        <a href="https://wa.me/91${enq.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(enq.name)},%20regarding%20your%20enquiry%20with%20Extreme%20Sales%20%26%20Services" target="_blank" class="bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 px-3 py-1 rounded-lg text-xs font-bold transition">
                            💬 Follow Up
                        </a>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch(e) {}
}

function handleLogout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

document.getElementById('refreshBtn')?.addEventListener('click', () => {
    fetchRequests(false);
});

// Boot
fetchRequests(true);

// Auto-sync polling every 12 seconds
setInterval(() => {
    fetchRequests(true);
}, 12000);

// ═══════════════════════════════════════════════════════════
// STAFF ENHANCEMENTS: Job Age, Fill Bars, Call Log, Priority
// ═══════════════════════════════════════════════════════════

// ─── Job Age Helper ──────────────────────────────────────
function getJobAge(createdAt) {
    const created = new Date(createdAt);
    const now     = new Date();
    const diffMs  = now - created;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr  = Math.floor(diffMs / 3600000);

    if (isNaN(diffMs)) return { label: 'Unknown', cls: 'job-age-fresh' };
    if (diffHr >= 4)   return { label: `${diffHr}h ago`, cls: 'job-age-urgent' };
    if (diffHr >= 1)   return { label: `${diffHr}h ${diffMin % 60}m ago`, cls: 'job-age-old' };
    return { label: `${diffMin}m ago`, cls: 'job-age-fresh' };
}

// Expose job age badge builder for renderTable to use
window.jobAgeBadge = function(createdAt) {
    const { label, cls } = getJobAge(createdAt);
    const icon = cls === 'job-age-urgent' ? '🔴' : cls === 'job-age-old' ? '🟡' : '🟢';
    return `<span class="job-age-badge ${cls}">${icon} ${label}</span>`;
};

// ─── Stat Fill Bars ──────────────────────────────────────
function updateStatFillBars() {
    const total = currentRequests.length || 1;
    const counts = {
        pending:   currentRequests.filter(r => r.status === 'Pending').length,
        assigned:  currentRequests.filter(r => r.status === 'Assigned').length,
        progress:  currentRequests.filter(r => r.status === 'In Progress').length,
        completed: currentRequests.filter(r => r.status === 'Completed').length,
    };

    const fillMap = {
        fillPending:   { pct: (counts.pending / total * 100).toFixed(1),   color: '#f59e0b' },
        fillAssigned:  { pct: (counts.assigned / total * 100).toFixed(1),  color: '#8b5cf6' },
        fillProgress:  { pct: (counts.progress / total * 100).toFixed(1),  color: '#3b82f6' },
        fillCompleted: { pct: (counts.completed / total * 100).toFixed(1), color: '#10b981' },
    };

    Object.entries(fillMap).forEach(([id, { pct, color }]) => {
        const el = document.getElementById(id);
        if (el) {
            el.style.width = pct + '%';
            el.style.background = color;
        }
    });
}

// Hook into fetchRequests to update fill bars
const _staffOrigFetch = fetchRequests;
fetchRequests = async function(silent = false) {
    await _staffOrigFetch(silent);
    updateStatFillBars();
};

// ─── Call Log ────────────────────────────────────────────
window.logCall = function(requestId, phone, customerName) {
    const key  = `ess_call_log_${requestId}`;
    const log  = JSON.parse(localStorage.getItem(key) || '[]');
    const entry = { time: new Date().toISOString(), phone };
    log.push(entry);
    localStorage.setItem(key, JSON.stringify(log));

    // Open the dialer
    window.location.href = `tel:${phone}`;

    if (window.showToast) window.showToast(`📞 Calling ${customerName || phone}... call logged.`, 'info', 3000);
};

// ─── Priority Flag ───────────────────────────────────────
window.setJobPriority = async function(requestId, priority) {
    // Store priority locally (server may not have this field, so localStorage fallback)
    localStorage.setItem(`ess_priority_${requestId}`, priority);
    if (window.showToast) window.showToast(`Job ${requestId} flagged as ${priority.toUpperCase()}`, 'info', 2000);
};

window.getJobPriority = function(requestId) {
    return localStorage.getItem(`ess_priority_${requestId}`) || 'normal';
};

// ═══════════════════════════════════════════════════════════
// REAL-TIME AUTO-DISPATCH (MOW-GDM ALGORITHM) MODAL LOGIC
// ═══════════════════════════════════════════════════════════
window.triggerAlgorithmicAutoDispatch = async function(specificRequestId = null) {
    const headerBtn = document.getElementById('btnAutoDispatchHeader');
    const origHtml = headerBtn ? headerBtn.innerHTML : '';
    if (headerBtn) {
        headerBtn.disabled = true;
        headerBtn.innerHTML = `<span>⏳</span><span>Calculating Optimization...</span>`;
    }

    try {
        const payload = specificRequestId ? { requestId: specificRequestId } : {};
        const response = await fetch(`${API_BASE}/api/admin/auto-dispatch`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!data.success) {
            if (window.showToast) window.showToast(data.message || "No pending jobs available for dispatch", "info", 3000);
            return;
        }

        // Open and Populate the MOW-GDM Transparency Modal
        const modal = document.getElementById('algoModal');
        if (modal) {
            document.getElementById('algoJobId').innerText = data.requestId;
            document.getElementById('algoTimestamp').innerText = `Executed in ${data.executionLatencyMs || '<1'}ms`;

            // Customer details
            const reqMatch = currentRequests.find(r => r.request_id === data.requestId);
            if (reqMatch) {
                document.getElementById('algoCustomer').innerText = `${reqMatch.name} • ${reqMatch.phone}`;
            }

            // Metric elements
            document.getElementById('algoZone').innerText = `${data.metrics.customerZone} (${data.metrics.distanceKm} km transit)`;
            document.getElementById('algoTechName').innerText = data.assignedTechnician.name;
            document.getElementById('algoRationale').innerText = data.assignedTechnician.rationale || 'Optimal spatial & workload match';
            document.getElementById('algoScore').innerText = `${data.assignedTechnician.compositeScore}%`;

            // Sub-scores
            document.getElementById('algoGeoScore').innerText = `${data.scoreBreakdown.geoScore}/100`;
            document.getElementById('algoWorkloadScore').innerText = `${data.scoreBreakdown.workloadScore}/100`;
            document.getElementById('algoSkillScore').innerText = `${data.scoreBreakdown.skillScore}/100`;
            document.getElementById('algoRatingScore').innerText = `${data.scoreBreakdown.ratingScore}/100`;

            // ETA
            document.getElementById('algoETA').innerText = `${data.metrics.etaMinutes} mins (${data.metrics.estimatedArrival})`;
            document.getElementById('algoTraffic').innerText = data.metrics.trafficFactor || 'Moderate Traffic';

            // Full Leaderboard Table
            const tbody = document.getElementById('algoLeaderboardBody');
            if (tbody && data.rankings) {
                tbody.innerHTML = '';
                data.rankings.forEach((rank, idx) => {
                    const isWinner = idx === 0;
                    const row = document.createElement('tr');
                    row.className = isWinner ? 'bg-emerald-500/10 font-bold dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40';
                    row.innerHTML = `
                        <td class="px-3.5 py-2">${isWinner ? '🏆 #1' : `#${idx + 1}`}</td>
                        <td class="px-3.5 py-2">${rank.technicianName}</td>
                        <td class="px-3.5 py-2">${rank.metrics.techZone}</td>
                        <td class="px-3.5 py-2">${rank.metrics.activeJobs} jobs</td>
                        <td class="px-3.5 py-2">${rank.metrics.etaMinutes}m</td>
                        <td class="px-3.5 py-2 font-black">${rank.compositeScore}%</td>
                    `;
                    tbody.appendChild(row);
                });
            }

            modal.classList.remove('hidden');
        }

        if (window.showToast) {
            window.showToast(`⚡ Assigned ${data.requestId} to ${data.assignedTechnician.name} (${data.assignedTechnician.compositeScore}%)`, "success", 3500);
        }

        // Refresh Queue Table
        await loadTechnicians();
        await fetchRequests(true);

    } catch (err) {
        console.error("Auto-dispatch error:", err);
        if (window.showToast) window.showToast("Auto-dispatch service error", "error");
    } finally {
        if (headerBtn) {
            headerBtn.disabled = false;
            headerBtn.innerHTML = origHtml;
        }
    }
};

window.closeAlgoModal = function() {
    const modal = document.getElementById('algoModal');
    if (modal) modal.classList.add('hidden');
};


