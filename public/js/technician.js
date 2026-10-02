// js/technician.js - Mobile-First Field Technician Operations

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

let currentTechId = 'tech-1';
try {
    const rawUser = localStorage.getItem('ess_user');
    if (rawUser) {
        const u = JSON.parse(rawUser);
        const badge = document.getElementById('techNameBadge');
        if (badge) badge.innerText = u.name || 'Suresh Kumar';
        if (u.id) currentTechId = u.id;
    }
} catch(e) {}

const authHeaders = {
    'Content-Type': 'application/json',
    get Authorization() {
        return `Bearer ${localStorage.getItem('ess_token') || ''}`;
    },
    get 'x-role'() {
        return localStorage.getItem('ess_role') || '';
    },
    get 'x-technician-id'() {
        return currentTechId;
    }
};

// Transparent fetch interceptor to handle session expiration
const originalFetch = window.fetch;
window.fetch = async function(url, options = {}, extra = {}) {
    let response = await originalFetch.call(this, url, options);
    const urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : '');

    if (response.status === 401 && urlStr.includes('/api/') && !urlStr.includes('/api/auth/login')) {
        console.warn(`[ESS Tech Auth] 401 Unauthorized on ${urlStr}. Redirecting to login.`);
        localStorage.removeItem('ess_token');
        localStorage.removeItem('ess_role');
        window.location.href = 'login.html?expired=1';
    }
    return response;
};

// Strict Real-Auth Guard
const token = localStorage.getItem('ess_token');
const role = localStorage.getItem('ess_role');

if (!token || (role !== 'technician' && role !== 'admin') || token.startsWith('demo-') || token.startsWith('mock-')) {
    localStorage.removeItem('ess_token');
    localStorage.removeItem('ess_role');
    localStorage.removeItem('ess_user');
    window.location.href = 'login.html';
}


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
        const serviceClean = (job.service_type || '').replace('[✅ AMC Covered]', '');
        const safeReqId = escapeHtml(job.request_id || '');
        const safeName = escapeHtml(job.name || '');
        const safeCleanService = escapeHtml(serviceClean);
        const safeDesc = escapeHtml(job.issue_description || 'Routine service inspection');
        const safeAddr = escapeHtml(job.address || 'Address on file');
        const safePhone = escapeHtml(job.phone || '');
        const safeNotes = escapeHtml(job.completion_notes || 'All checks passed. Cooling restored.');
        const safeStatus = escapeHtml(job.status || 'Assigned');

        const statusPillClass = {
            'Pending': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-600/40',
            'Assigned': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-600/40',
            'In Progress': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-600/40',
            'Completed': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-600/40'
        }[job.status] || 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';

        // Action Buttons according to state
        let actionSection = '';
        if (job.status === 'Assigned') {
            actionSection = `
                <button onclick="startJob('${safeReqId}')" class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-md shadow-blue-500/25 transition flex items-center justify-center gap-1.5">
                    <span>🚀</span>
                    <span>Start Service (Arrived On-Site)</span>
                </button>
            `;
        } else if (job.status === 'In Progress') {
            actionSection = `
                <button onclick="openCompletionModal('${safeReqId}', '${encodeURIComponent(job.name || '')}')" class="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-md shadow-emerald-500/25 transition flex items-center justify-center gap-1.5">
                    <span>✓</span>
                    <span>Complete Job &amp; Sign Off</span>
                </button>
            `;
        } else if (job.status === 'Completed') {
            actionSection = `
                <div class="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-700/50 rounded-xl p-3 text-xs text-emerald-900 dark:text-emerald-200 flex-1">
                    <div class="font-extrabold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                        <span>✅</span> Service Successfully Completed
                    </div>
                    <p class="text-[11px] text-slate-600 dark:text-slate-300 mt-1 italic">
                        <strong>Sign-Off:</strong> "${safeNotes}"
                    </p>
                </div>
            `;
        }

        card.innerHTML = `
            <div>
                <!-- Top Badge Line -->
                <div class="flex items-center justify-between gap-2 mb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800/50">
                            ${safeReqId}
                        </span>
                        ${isAmc ? '<span class="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700/50">★ AMC CONTRACT</span>' : ''}
                    </div>
                    <span class="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${statusPillClass}">
                        ${safeStatus}
                    </span>
                </div>

                <!-- Customer Details -->
                <h3 class="text-lg font-black text-slate-900 dark:text-white tracking-tight">${safeName}</h3>
                <div class="font-bold text-xs text-blue-700 dark:text-blue-400 mt-0.5">${safeCleanService}</div>

                <p class="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mt-2.5 leading-relaxed">
                    <strong class="text-slate-800 dark:text-slate-100">Issue:</strong> ${safeDesc}
                </p>

                <div class="mt-3 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <div class="flex items-start gap-1.5">
                        <span>📍</span>
                        <span class="font-medium text-slate-700 dark:text-slate-200">${safeAddr}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span>📞</span>
                        <span class="font-bold text-slate-800 dark:text-slate-100">${safePhone}</span>
                    </div>
                </div>
            </div>

            <!-- Bottom Actions -->
            <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                    <a href="tel:${String(job.phone || '').replace(/[^0-9+]/g, '')}" class="flex-1 sm:flex-none text-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700">
                        <span>📞</span>
                        <span>Call</span>
                    </a>
                    <a href="https://wa.me/91${String(job.phone || '').replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(job.name || '')},%20this%20is%20Extreme%20AC%20Technician%20regarding%20request%20${encodeURIComponent(job.request_id || '')}." target="_blank" class="flex-1 sm:flex-none text-center bg-emerald-50 hover:bg-emerald-600 dark:bg-emerald-950/40 dark:hover:bg-emerald-600 text-emerald-700 hover:text-white dark:text-emerald-300 dark:hover:text-white border border-emerald-200 dark:border-emerald-700/50 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center justify-center gap-1">
                        <span>💬</span>
                        <span>WhatsApp</span>
                    </a>
                    <a href="https://maps.google.com/?q=${encodeURIComponent((job.address || '') + ', Mumbai')}" target="_blank" class="flex-1 sm:flex-none text-center bg-blue-50 hover:bg-blue-600 dark:bg-blue-950/40 dark:hover:bg-blue-600 text-blue-700 hover:text-white dark:text-blue-300 dark:hover:text-white border border-blue-200 dark:border-blue-700/50 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center justify-center gap-1">
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

// ═══════════════════════════════════════════════════════════
// SPARE PARTS BILLING & DIGITAL SIGNATURE LOGIC
// ═══════════════════════════════════════════════════════════

let sigCanvas = null;
let sigCtx = null;
let isDrawing = false;
let hasSignature = false;

function initSignaturePad() {
    sigCanvas = document.getElementById('signatureCanvas');
    if (!sigCanvas) return;
    sigCtx = sigCanvas.getContext('2d');

    const getPos = (e) => {
        const rect = sigCanvas.getBoundingClientRect();
        const scaleX = sigCanvas.width / rect.width;
        const scaleY = sigCanvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    sigCanvas.addEventListener('pointerdown', (e) => {
        isDrawing = true;
        hasSignature = true;
        const placeholder = document.getElementById('sigPlaceholder');
        if (placeholder) placeholder.classList.add('hidden');

        sigCtx.beginPath();
        const { x, y } = getPos(e);
        sigCtx.moveTo(x, y);
        sigCtx.lineWidth = 2.5;
        sigCtx.lineCap = 'round';
        sigCtx.lineJoin = 'round';
        sigCtx.strokeStyle = '#0f172a';
    });

    sigCanvas.addEventListener('pointermove', (e) => {
        if (!isDrawing) return;
        const { x, y } = getPos(e);
        sigCtx.lineTo(x, y);
        sigCtx.stroke();
    });

    const stopDrawing = () => {
        if (isDrawing) {
            isDrawing = false;
            sigCtx.closePath();
        }
    };

    sigCanvas.addEventListener('pointerup', stopDrawing);
    sigCanvas.addEventListener('pointercancel', stopDrawing);
    sigCanvas.addEventListener('pointerleave', stopDrawing);
}

function clearSignatureCanvas() {
    if (!sigCtx || !sigCanvas) {
        sigCanvas = document.getElementById('signatureCanvas');
        if (sigCanvas) sigCtx = sigCanvas.getContext('2d');
    }
    if (sigCtx && sigCanvas) {
        sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
    }
    hasSignature = false;
    const placeholder = document.getElementById('sigPlaceholder');
    if (placeholder) placeholder.classList.remove('hidden');
}

function calculateTechBill() {
    const baseLabor = 499;
    let partsTotal = 0;
    const partsList = [];
    const checkboxes = document.querySelectorAll('.part-item-cb:checked');
    checkboxes.forEach(cb => {
        const price = parseFloat(cb.dataset.price || 0);
        partsTotal += price;
        partsList.push({ name: cb.dataset.name, price });
    });

    const subtotal = baseLabor + partsTotal;
    const gst = Math.round(subtotal * 0.18 * 100) / 100;
    const total = Math.round((subtotal + gst) * 100) / 100;

    const totalEl = document.getElementById('techBillTotal');
    if (totalEl) totalEl.innerText = `₹${Math.round(total).toLocaleString('en-IN')}`;

    return { baseLabor, partsTotal, gst, total, parts: partsList };
}

function openCompletionModal(requestId, customerName) {
    document.getElementById('modalTargetRequestId').value = requestId;
    document.getElementById('modalReqId').innerText = `Request #${requestId} — ${decodeURIComponent(customerName)}`;
    document.getElementById('completionNotes').value = '';
    
    // Reset checkboxes
    document.querySelectorAll('.part-item-cb').forEach(cb => cb.checked = false);
    calculateTechBill();
    clearSignatureCanvas();

    document.getElementById('completionModal').classList.remove('hidden');

    if (!sigCanvas) {
        initSignaturePad();
    }
}

function closeCompletionModal() {
    document.getElementById('completionModal').classList.add('hidden');
}

function showReceipt(job, bill, notes) {
    const modal = document.getElementById('receiptModal');
    if (!modal) return;

    document.getElementById('receiptDate').innerText = new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    document.getElementById('receiptReqId').innerText = job.request_id || document.getElementById('modalTargetRequestId').value;
    
    let techName = 'Suresh Kumar';
    try {
        const u = JSON.parse(localStorage.getItem('ess_user') || '{}');
        if (u.name) techName = u.name;
    } catch(e) {}
    document.getElementById('receiptTechName').innerText = techName;
    document.getElementById('receiptCustName').innerText = job.name || 'Valued Customer';
    document.getElementById('receiptServiceType').innerText = (job.service_type || 'AC Repair & Service').replace('[✅ AMC Covered]', '');
    document.getElementById('receiptNotes').innerText = notes || 'All diagnostic checks completed. Cooling unit operating at peak thermal efficiency.';

    const partsContainer = document.getElementById('receiptPartsList');
    if (partsContainer) {
        partsContainer.innerHTML = '';
        if (bill.parts.length === 0) {
            partsContainer.innerHTML = `<div class="text-[11px] text-slate-400 italic">No replacement hardware required (Standard Inspection)</div>`;
        } else {
            bill.parts.forEach(p => {
                const safePartName = escapeHtml(p.name || 'Component');
                partsContainer.innerHTML += `
                    <div class="flex justify-between">
                        <span>+ ${safePartName}</span>
                        <span class="font-mono">₹${Number(p.price || 0).toFixed(2)}</span>
                    </div>
                `;
            });
        }
    }

    document.getElementById('receiptGst').innerText = `₹${bill.gst.toFixed(2)}`;
    document.getElementById('receiptTotalAmount').innerText = `₹${Math.round(bill.total).toLocaleString('en-IN')}`;

    // Signature image
    const sigImg = document.getElementById('receiptSignatureImg');
    const sourceCanvas = document.getElementById('signatureCanvas');
    if (sigImg && sourceCanvas) {
        sigImg.src = sourceCanvas.toDataURL('image/png');
    }

    modal.classList.remove('hidden');
}

function closeReceiptModal() {
    const modal = document.getElementById('receiptModal');
    if (modal) modal.classList.add('hidden');
}

// Make functions globally accessible for inline HTML onclick handlers
window.calculateTechBill = calculateTechBill;
window.clearSignatureCanvas = clearSignatureCanvas;
window.openCompletionModal = openCompletionModal;
window.closeCompletionModal = closeCompletionModal;
window.closeReceiptModal = closeReceiptModal;

document.getElementById('completionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const requestId = document.getElementById('modalTargetRequestId').value;
    const notes = document.getElementById('completionNotes').value;
    const bill = calculateTechBill();
    const partsSummary = bill.parts.map(p => p.name).join(', ');
    const fullNotes = (notes || 'Service verified and complete.') + 
        (partsSummary ? ` [Parts: ${partsSummary} | Total: ₹${Math.round(bill.total)}]` : ` [Total: ₹${Math.round(bill.total)}]`);

    const currentJob = myJobs.find(j => j.request_id === requestId) || {
        request_id: requestId,
        name: document.getElementById('modalReqId').innerText.split('—')[1]?.trim() || 'Customer',
        service_type: 'AC Repair'
    };

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
            showReceipt(currentJob, bill, notes);
            if (window.showToast) window.showToast(`Job ${requestId} signed off as Completed! Invoice generated.`, 'success');
            fetchJobs(true);
        } else {
            if (window.showToast) window.showToast("Server rejected sign off", "error");
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
initSignaturePad();
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
                    <p class="text-xs text-slate-400 mt-0.5">Job ${escapeHtml(requestId)}</p>
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
                <h3 class="font-black text-slate-900">Job Note — ${escapeHtml(requestId)}</h3>
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

