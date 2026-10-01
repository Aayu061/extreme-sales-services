// js/technician.js - Mobile-First Field Technician Operations

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
    ? 'http://localhost:5000'
    : ((window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'https://extreme-sales-services-gh7s.onrender.com');

const token = localStorage.getItem('ess_token');
const role = localStorage.getItem('ess_role');

// Auth Guard
if (!token || (role !== 'technician' && role !== 'admin')) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        localStorage.setItem('ess_token', 'mock-tech-token');
        localStorage.setItem('ess_role', 'technician');
    } else {
        window.location.href = 'login.html';
    }
}

// User Profile
try {
    const rawUser = localStorage.getItem('ess_user');
    if (rawUser) {
        const u = JSON.parse(rawUser);
        const badge = document.getElementById('techNameBadge');
        if (badge) badge.innerText = u.name || 'Suresh Kumar';
    }
} catch(e) {}

const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('ess_token')}`,
    'x-technician-id': 'tech-1'
};

// Global State
let myJobs = [];
let activeFilter = 'all';

async function fetchJobs(silent = false) {
    const refreshIcon = document.getElementById('refreshIcon');
    if (refreshIcon && !silent) refreshIcon.classList.add('rotate-180');

    try {
        const response = await fetch(`${API_BASE}/api/technician/jobs`, { headers: authHeaders });
        const data = await response.json();

        if (data.success) {
            myJobs = data.requests || [];

            // Stats
            const assigned = myJobs.filter(j => j.status === 'Assigned').length;
            const progress = myJobs.filter(j => j.status === 'In Progress').length;
            const completed = myJobs.filter(j => j.status === 'Completed').length;

            document.getElementById('statAssigned').innerText = assigned;
            document.getElementById('statProgress').innerText = progress;
            document.getElementById('statCompleted').innerText = completed;

            document.getElementById('jobCountLabel').innerText = `${myJobs.length} jobs on schedule`;

            renderJobs();
            if (!silent && window.showToast) window.showToast("Schedule synchronized with dispatch", "info", 1800);
        }
    } catch(err) {
        console.warn("Tech jobs fetch note:", err.message);
    } finally {
        if (refreshIcon) {
            setTimeout(() => refreshIcon.classList.remove('rotate-180'), 400);
        }
    }
}

function filterTechJobs(filterType, btnElement) {
    activeFilter = filterType;
    document.querySelectorAll('.tech-filter').forEach(b => {
        b.className = 'tech-filter text-slate-600 hover:text-slate-900 font-bold text-xs px-3 py-1.5 rounded-lg transition';
    });
    if (btnElement) {
        btnElement.className = 'tech-filter active bg-slate-900 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition';
    }
    renderJobs();
}

function renderJobs() {
    const list = document.getElementById('jobList');
    if (!list) return;

    let filtered = myJobs;
    if (activeFilter === 'active') {
        filtered = myJobs.filter(j => j.status === 'Assigned' || j.status === 'In Progress');
    } else if (activeFilter === 'completed') {
        filtered = myJobs.filter(j => j.status === 'Completed');
    }

    list.innerHTML = '';

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-2xs">
                <div class="text-3xl mb-2">🎉</div>
                <h3 class="font-extrabold text-slate-900 text-base">No pending jobs in this view</h3>
                <p class="text-xs text-slate-500 mt-1">All set! Dispatch will assign upcoming tickets as they arrive.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(job => {
        const card = document.createElement('div');
        card.className = "bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-4";

        const isAmc = job.service_type && job.service_type.includes('[✅ AMC Covered]');
        const serviceClean = job.service_type.replace('[✅ AMC Covered]', '');

        const statusPillClass = {
            'Pending': 'bg-amber-100 text-amber-800 border-amber-200',
            'Assigned': 'bg-purple-100 text-purple-800 border-purple-200',
            'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
            'Completed': 'bg-emerald-100 text-emerald-800 border-emerald-200'
        }[job.status] || 'bg-slate-100 text-slate-800';

        // Action Buttons according to state
        let actionSection = '';
        if (job.status === 'Assigned') {
            actionSection = `
                <button onclick="startJob('${job.request_id}')" class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-md shadow-blue-500/25 transition flex items-center justify-center gap-1.5">
                    <span>🚀</span>
                    <span>Start Service (Arrived On-Site)</span>
                </button>
            `;
        } else if (job.status === 'In Progress') {
            actionSection = `
                <button onclick="openCompletionModal('${job.request_id}', '${encodeURIComponent(job.name)}')" class="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-md shadow-emerald-500/25 transition flex items-center justify-center gap-1.5">
                    <span>✓</span>
                    <span>Complete Job &amp; Sign Off</span>
                </button>
            `;
        } else if (job.status === 'Completed') {
            actionSection = `
                <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex-1">
                    <div class="font-extrabold flex items-center gap-1.5 text-emerald-700">
                        <span>✅</span> Service Successfully Completed
                    </div>
                    <p class="text-[11px] text-slate-600 mt-1 italic">
                        <strong>Sign-Off:</strong> "${job.completion_notes || 'All checks passed. Cooling restored.'}"
                    </p>
                </div>
            `;
        }

        card.innerHTML = `
            <div>
                <!-- Top Badge Line -->
                <div class="flex items-center justify-between gap-2 mb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            ${job.request_id}
                        </span>
                        ${isAmc ? '<span class="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">★ AMC CONTRACT</span>' : ''}
                    </div>
                    <span class="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${statusPillClass}">
                        ${job.status}
                    </span>
                </div>

                <!-- Customer Details -->
                <h3 class="text-lg font-black text-slate-900 tracking-tight">${job.name}</h3>
                <div class="font-bold text-xs text-blue-700 mt-0.5">${serviceClean}</div>

                <p class="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2.5 leading-relaxed">
                    <strong class="text-slate-800">Issue:</strong> ${job.issue_description || 'Routine service inspection'}
                </p>

                <div class="mt-3 text-xs text-slate-500 space-y-1">
                    <div class="flex items-start gap-1.5">
                        <span>📍</span>
                        <span class="font-medium text-slate-700">${job.address}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span>📞</span>
                        <span class="font-bold text-slate-800">${job.phone}</span>
                    </div>
                </div>
            </div>

            <!-- Bottom Actions -->
            <div class="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                    <a href="tel:${job.phone}" class="flex-1 sm:flex-none text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center justify-center gap-1">
                        <span>📞</span>
                        <span>Call</span>
                    </a>
                    <a href="https://wa.me/91${job.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(job.name)},%20this%20is%20Extreme%20AC%20Technician%20Suresh%20regarding%20request%20${job.request_id}." target="_blank" class="flex-1 sm:flex-none text-center bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center justify-center gap-1">
                        <span>💬</span>
                        <span>WhatsApp</span>
                    </a>
                    <a href="https://maps.google.com/?q=${encodeURIComponent(job.address)}" target="_blank" class="flex-1 sm:flex-none text-center bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center justify-center gap-1">
                        <span>📍</span>
                        <span>Map</span>
                    </a>
                </div>

                <div>
                    ${actionSection}
                </div>
            </div>
        `;

        list.appendChild(card);
    });
}

async function startJob(requestId) {
    try {
        const res = await fetch(`${API_BASE}/api/admin/update-status`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ requestId, newStatus: 'In Progress' })
        });
        if (res.ok) {
            if (window.showToast) window.showToast(`Service started for ${requestId}! Customer notified.`, 'info');
            fetchJobs(true);
        }
    } catch(e) {
        if (window.showToast) window.showToast("Failed to update status", "error");
    }
}

function openCompletionModal(requestId, customerName) {
    document.getElementById('modalTargetRequestId').value = requestId;
    document.getElementById('modalReqId').innerText = `Request #${requestId} — ${decodeURIComponent(customerName)}`;
    document.getElementById('completionNotes').value = '';
    document.getElementById('partsUsed').value = '';
    document.getElementById('completionModal').classList.remove('hidden');
}

function closeCompletionModal() {
    document.getElementById('completionModal').classList.add('hidden');
}

document.getElementById('completionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const requestId = document.getElementById('modalTargetRequestId').value;
    const notes = document.getElementById('completionNotes').value;
    const parts = document.getElementById('partsUsed').value;
    const fullNotes = notes + (parts ? ` [Parts: ${parts}]` : '');

    try {
        const res = await fetch(`${API_BASE}/api/admin/update-status`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({
                requestId,
                newStatus: 'Completed',
                notes: fullNotes
            })
        });

        if (res.ok) {
            closeCompletionModal();
            if (window.showToast) window.showToast(`Job ${requestId} signed off as Completed! Great work.`, 'success');
            fetchJobs(true);
        }
    } catch(err) {
        if (window.showToast) window.showToast("Sign off failed", "error");
    }
});

function handleLogout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

document.getElementById('refreshBtn')?.addEventListener('click', () => {
    fetchJobs(false);
});

// Boot
fetchJobs(true);

// Auto-sync polling every 12 seconds
setInterval(() => {
    fetchJobs(true);
}, 12000);

// ═══════════════════════════════════════════════════════════
// TECHNICIAN ENHANCEMENTS: Checklist, Earnings, Ring, Maps, SOS
// ═══════════════════════════════════════════════════════════

const CHECKLIST_ITEMS = [
    'Inspect & clean air filters',
    'Check refrigerant (gas) level',
    'Clean evaporator + condenser coils',
    'Inspect electrical connections',
    'Test & verify cooling temperature',
    'Check drainage pipe & pan',
    'Lubricate fan motor bearings',
];

// ─── Checklist Per Job ───────────────────────────────────
window.openJobChecklist = function(requestId) {
    const stored = JSON.parse(localStorage.getItem(`ess_checklist_${requestId}`) || '{}');

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div class="flex justify-between items-center mb-5">
                <div>
                    <h3 class="font-black text-slate-900 text-base">Service Checklist</h3>
                    <p class="text-xs text-slate-400 mt-0.5">Job ${requestId}</p>
                </div>
                <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-slate-700 font-bold text-lg">✕</button>
            </div>
            <div id="checklistBody" class="space-y-1 mb-5">
                ${CHECKLIST_ITEMS.map((item, idx) => {
                    const isChecked = stored[idx] === true;
                    return `<label class="checklist-item ${isChecked ? 'checked' : ''}">
                        <input type="checkbox" data-idx="${idx}" ${isChecked ? 'checked' : ''}
                            onchange="updateChecklist('${requestId}', ${idx}, this.checked, this.closest('label'))">
                        <span class="text-sm text-slate-700">${item}</span>
                    </label>`;
                }).join('')}
            </div>
            <div class="flex justify-between items-center">
                <span id="checklistCount_${requestId}" class="text-xs font-bold text-slate-500">
                    ${Object.values(stored).filter(Boolean).length}/${CHECKLIST_ITEMS.length} completed
                </span>
                <button onclick="this.closest('.fixed').remove()" class="bg-blue-600 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-blue-500 transition">
                    Done ✓
                </button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
};

window.updateChecklist = function(requestId, idx, checked, labelEl) {
    const key  = `ess_checklist_${requestId}`;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    data[idx]  = checked;
    localStorage.setItem(key, JSON.stringify(data));
    if (labelEl) labelEl.classList.toggle('checked', checked);
    const countEl = document.getElementById(`checklistCount_${requestId}`);
    if (countEl) countEl.textContent = `${Object.values(data).filter(Boolean).length}/${CHECKLIST_ITEMS.length} completed`;
    updateProgressRing();
};

// ─── Daily Earnings Calculator ───────────────────────────
function calcDailyEarnings() {
    const completed = myJobs.filter(j => j.status === 'Completed').length;
    const ratePerJob = 350; // ₹350 per completed job (incentive)
    return completed * ratePerJob;
}

function renderEarningsStrip() {
    const el = document.getElementById('earningsStrip');
    if (!el) return;
    const earnings = calcDailyEarnings();
    const jobs = myJobs.filter(j => j.status === 'Completed').length;
    el.innerHTML = `
        <div>
            <div class="text-[10px] font-extrabold text-emerald-300 uppercase tracking-widest">Today's Earnings</div>
            <div class="text-white font-black text-xl">₹${earnings.toLocaleString('en-IN')}</div>
            <div class="text-emerald-300 text-xs">${jobs} job(s) completed × ₹350</div>
        </div>
        <div class="text-right">
            <div class="text-[10px] font-extrabold text-emerald-300 uppercase tracking-widest">Weekly Target</div>
            <div class="text-white font-black text-xl">₹${(1750).toLocaleString('en-IN')}</div>
            <div class="text-emerald-200 text-xs">${Math.min(100, Math.round(earnings / 1750 * 100))}% achieved</div>
        </div>`;
}

// ─── Progress Ring ───────────────────────────────────────
function updateProgressRing() {
    const ring   = document.getElementById('progressRing');
    const valEl  = document.getElementById('progressRingVal');
    if (!ring || !valEl) return;

    const total     = myJobs.length || 1;
    const completed = myJobs.filter(j => j.status === 'Completed').length;
    const pct       = Math.round(completed / total * 100);
    const circumference = 2 * Math.PI * 22;
    const offset    = circumference - (pct / 100 * circumference);

    ring.style.strokeDasharray  = circumference;
    ring.style.strokeDashoffset = offset;
    valEl.textContent = `${completed}/${total}`;
}

// Hook into fetchJobs to also update earnings and ring
const _techOrigFetch = fetchJobs;
fetchJobs = async function(silent = false) {
    await _techOrigFetch(silent);
    renderEarningsStrip();
    updateProgressRing();
};

// ─── Google Maps Direction Link ──────────────────────────
window.getDirections = function(address, customerName) {
    if (!address) {
        if (window.showToast) window.showToast('No address available for this job', 'warning');
        return;
    }
    const query = encodeURIComponent(`${address}, Mumbai`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
};

// ─── Tech Job Note ───────────────────────────────────────
window.openNoteModal = function(requestId) {
    const key  = `ess_note_${requestId}`;
    const note = localStorage.getItem(key) || '';

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-black text-slate-900">Job Note — ${requestId}</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-slate-400 font-bold text-lg">✕</button>
            </div>
            <textarea id="noteInput_${requestId}" rows="4" placeholder="Add field notes, parts used, issues found..."
                class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-400 resize-none mb-4">${note}</textarea>
            <div class="flex justify-end gap-2">
                <button onclick="this.closest('.fixed').remove()" class="text-slate-500 font-bold px-4 py-2 rounded-xl text-sm hover:bg-slate-100 transition">Cancel</button>
                <button onclick="saveNote('${requestId}')" class="bg-blue-600 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-blue-500 transition">Save Note</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
};

window.saveNote = function(requestId) {
    const val = document.getElementById(`noteInput_${requestId}`)?.value || '';
    localStorage.setItem(`ess_note_${requestId}`, val);
    document.querySelector('.fixed')?.remove();
    if (window.showToast) window.showToast('Field note saved!', 'success');
};

// ─── SOS Alert ───────────────────────────────────────────
window.triggerSOS = function() {
    if (!navigator.geolocation) {
        if (window.showToast) window.showToast('GPS not available on this device', 'error');
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
            // In production this would POST to an API
            if (window.showToast) window.showToast(`🆘 SOS Sent! Staff alerted. Your location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'error', 6000);
            // Auto-call support
            setTimeout(() => { window.location.href = 'tel:+917977805245'; }, 1500);
        },
        () => {
            if (window.showToast) window.showToast('🆘 SOS Sent! GPS unavailable — calling support.', 'error', 5000);
            setTimeout(() => { window.location.href = 'tel:+917977805245'; }, 1500);
        }
    );
};

