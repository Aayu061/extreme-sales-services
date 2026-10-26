// js/status.js - Enhanced Live GPS & Service Tracking with Stepper, ETA, Confetti & Rating

const trackForm     = document.getElementById('trackingForm');
const formCard      = document.getElementById('trackingFormCard');
const resultsCard   = document.getElementById('trackingResultsCard');
const displayId     = document.getElementById('displayId');
const timelineContent = document.getElementById('timelineContent');

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

let trackingSource = null;
let pollInterval   = null;
let etaInterval    = null;
let etaMinutes     = 0;
let lastStatus     = null;

// ─── URL Auto-fill ──────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    const p = new URLSearchParams(window.location.search);
    const idParam    = p.get('id');
    const phoneParam = p.get('phone');
    if (idParam) {
        document.getElementById('requestId').value = idParam;
        if (phoneParam) document.getElementById('phone').value = phoneParam;
        startTracking(idParam, phoneParam || '9876543210');
    }
});

trackForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id    = document.getElementById('requestId').value.trim().toUpperCase();
    const phone = document.getElementById('phone').value.trim();
    startTracking(id, phone);
});

// ─── Tracking Core ───────────────────────────────────────────────
function startTracking(id, phone) {
    if (trackingSource) trackingSource.close();
    if (pollInterval) clearInterval(pollInterval);
    if (etaInterval)  clearInterval(etaInterval);

    displayId.innerText = id;
    
    if (typeof gsap !== 'undefined') {
        gsap.to(formCard, {
            opacity: 0,
            y: -15,
            duration: 0.25,
            ease: 'power2.in',
            onComplete: () => {
                formCard.classList.add('hidden');
                resultsCard.classList.remove('hidden');
                gsap.fromTo(resultsCard,
                    { opacity: 0, y: 20, scale: 0.98 },
                    { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'power2.out' }
                );
            }
        });
    } else {
        formCard.classList.add('hidden');
        resultsCard.classList.remove('hidden');
    }

    // Inject share-link bar
    injectShareBar(id, phone);

    fetchStatus(id, phone);

    try {
        trackingSource = new EventSource(`${API_BASE}/api/track/live?id=${encodeURIComponent(id)}&phone=${encodeURIComponent(phone)}`);
        trackingSource.onmessage = (e) => {
            try {
                const d = JSON.parse(e.data);
                if (d.success && d.status) renderAll(d.status, d.technician_name, d.service_type, d.name);
            } catch(_) {}
        };
        trackingSource.onerror = () => {
            trackingSource.close();
            if (!pollInterval) pollInterval = setInterval(() => fetchStatus(id, phone), 6000);
        };
    } catch(_) {
        pollInterval = setInterval(() => fetchStatus(id, phone), 6000);
    }
}

async function fetchStatus(id, phone) {
    try {
        const res  = await fetch(`${API_BASE}/api/track?id=${encodeURIComponent(id)}&phone=${encodeURIComponent(phone)}`);
        const data = await res.json();
        if (data.success) renderAll(data.status, data.technician_name, data.service_type, data.name, data.eta, data.zone);
        else if (window.showToast) window.showToast(data.message || 'Request not found', 'error');
    } catch(_) {}
}

// ─── Master Render ───────────────────────────────────────────────
function renderAll(status, techName, serviceType, customerName, serverEta = null, zone = null) {
    const changed = status !== lastStatus;
    lastStatus    = status;

    renderStepper(status);
    renderTimeline(status, techName, serviceType, customerName);
    renderEtaCard(status, techName, serverEta, zone);

    if (status === 'Completed') {
        if (changed) launchConfetti();
        renderRatingWidget();
    }
}

// ─── Horizontal Stepper ─────────────────────────────────────────
const STAGES = [
    { key: 'Pending',     icon: '📋', label: 'Received' },
    { key: 'Assigned',    icon: '👷', label: 'Assigned' },
    { key: 'In Progress', icon: '🔧', label: 'On-Site' },
    { key: 'Completed',   icon: '✅', label: 'Done' }
];

function renderStepper(currentStatus) {
    let el = document.getElementById('progressStepper');
    if (!el) {
        el = document.createElement('div');
        el.id = 'progressStepper';
        el.className = 'progress-stepper mb-8';
        timelineContent.insertAdjacentElement('beforebegin', el);
    }

    const currentIdx = STAGES.findIndex(s => s.key === currentStatus);
    const pct = currentIdx < 0 ? 0 : Math.round(((currentIdx) / (STAGES.length - 1)) * 100);

    el.innerHTML = STAGES.map((s, i) => {
        const isDone    = i < currentIdx;
        const isActive  = i === currentIdx;
        const cls       = isDone ? 'done' : isActive ? 'active' : '';
        const dotContent = isDone ? '✓' : s.icon;
        return `
            <div class="stepper-step ${cls}">
                <div class="stepper-dot">${dotContent}</div>
                <span class="stepper-label">${s.label}</span>
            </div>`;
    }).join('');

    // Progress bar below stepper
    let bar = document.getElementById('stepperBar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'stepperBar';
        bar.className = 'mt-4 mb-8';
        bar.innerHTML = `
            <div class="flex justify-between text-[10px] font-bold text-[#655448] mb-1.5">
                <span>Progress</span><span id="stepperPct">0%</span>
            </div>
            <div class="h-2 bg-[#E6DFD3] border border-[#B8AA98]/30 rounded-full overflow-hidden">
                <div id="stepperFill" class="h-full rounded-full transition-all duration-700" style="background: linear-gradient(90deg,#77B89A,#A05B3A); width:0%"></div>
            </div>`;
        el.insertAdjacentElement('afterend', bar);
    }
    setTimeout(() => {
        const fill = document.getElementById('stepperFill');
        const pctEl = document.getElementById('stepperPct');
        if (fill) fill.style.width = pct + '%';
        if (pctEl) pctEl.textContent = pct + '%';
        
        if (typeof gsap !== 'undefined') {
            const activeDot = el.querySelector('.stepper-step.active .stepper-dot');
            if (activeDot) {
                gsap.to(activeDot, {
                    scale: 1.18,
                    repeat: -1,
                    yoyo: true,
                    duration: 0.85,
                    ease: 'sine.inOut'
                });
            }
        }
    }, 100);
}

// ─── ETA Countdown Card ─────────────────────────────────────────
function renderEtaCard(status, techName, serverEta = null, zone = null) {
    if (etaInterval) clearInterval(etaInterval);
    let el = document.getElementById('etaCard');
    if (!el) {
        el = document.createElement('div');
        el.id = 'etaCard';
        el.className = 'eta-card mb-8';
        timelineContent.insertAdjacentElement('beforebegin', el);
    }

    if (status === 'Completed') {
        el.innerHTML = `
            <span class="text-3xl">🎉</span>
            <div>
                <div class="text-[#F2EDE3] font-black text-base">Service Completed!</div>
                <div class="text-[#B8AA98] text-xs mt-0.5 font-medium">Your AC is running perfectly. Invoice sent to your phone.</div>
            </div>`;
        return;
    }

    // Dynamic Server ETA or Fallback
    if (serverEta && serverEta.totalMinutes) {
        etaMinutes = serverEta.totalMinutes;
    } else {
        etaMinutes = status === 'Pending' ? 60 : status === 'Assigned' ? 35 : status === 'In Progress' ? 15 : 0;
    }
    let secs = etaMinutes * 60;

    const trafficInfo = serverEta ? ` • ${serverEta.trafficFactor}` : '';
    const zoneInfo = zone ? ` [${zone}]` : '';

    const render = () => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        const display = m > 0 ? `${m}m ${String(s).padStart(2,'0')}s` : `${s}s`;
        const safeTechName = escapeHtml(techName || '');
        const statusMsg = status === 'Pending'
            ? 'Coordinating with dispatch algorithm'
            : status === 'Assigned'
            ? `Engineer ${safeTechName} dispatched${zoneInfo}${trafficInfo}`
            : 'Engineer is working on-site';

        el.innerHTML = `
            <div class="text-2xl">⏱️</div>
            <div class="flex-1">
                <div class="text-[#E4C99A] text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                    <span>Algorithm Dynamic ETA</span>
                    ${serverEta ? '<span class="bg-[#A05B3A]/20 text-[#E4C99A] px-1 rounded text-[9px]">MOW-GDM</span>' : ''}
                </div>
                <div class="eta-time-display text-[#F2EDE3] font-mono text-2xl font-black">${display}</div>
                <div class="text-[#B8AA98] text-xs font-medium">${statusMsg}</div>
            </div>
            <div class="text-right">
                <a href="tel:+917977805245" class="text-[#E4C99A] text-xs font-bold underline hover:text-[#F2EDE3] transition">📞 Call Support</a>
            </div>`;

        if (secs > 0) secs--;
    };

    render();
    etaInterval = setInterval(render, 1000);
}

// ─── Share Bar ───────────────────────────────────────────────────
function injectShareBar(id, phone) {
    let bar = document.getElementById('shareBar');
    if (bar) return;
    bar = document.createElement('div');
    bar.id = 'shareBar';
    bar.className = 'flex items-center gap-3 mb-8 flex-wrap';
    const trackUrl = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(id)}&phone=${encodeURIComponent(phone)}`;
    bar.innerHTML = `
        <div class="flex-1 bg-[#F2EDE3] border border-[#B8AA98]/40 rounded-xl px-3 py-2 text-xs text-[#655448] font-mono truncate">${trackUrl}</div>
        <button onclick="copyTrackLink('${trackUrl}')" class="flex-shrink-0 bg-[#A05B3A] hover:bg-[#8B4D2F] text-[#F2EDE3] text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm">
            <span>📋</span> Copy Link
        </button>
        <a href="https://wa.me/?text=Track my AC service: ${encodeURIComponent(trackUrl)}" target="_blank"
           class="flex-shrink-0 bg-[#1D3D2B] hover:bg-[#163022] text-[#F2EDE3] text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm">
            <span>💬</span> Share on WA
        </a>`;
    resultsCard.querySelector('.flex').after(bar);
}

window.copyTrackLink = (url) => {
    navigator.clipboard.writeText(url).then(() => {
        if (window.showToast) window.showToast('Tracking link copied!', 'success');
    });
};

// ─── Timeline Render (vertical, unchanged but enhanced) ──────────
function renderTimeline(currentStatus, techName, serviceType, customerName) {
    const safeTech = escapeHtml(techName || '');
    const safeService = escapeHtml(serviceType || 'AC Diagnostics & Service');
    const safeCustomer = escapeHtml(customerName || '');

    const stages = [
        { key: 'Pending',     title: 'Request Received & In Queue',    desc: 'Your request has been logged and is being reviewed by our dispatch team for assignment.' },
        { key: 'Assigned',    title: 'Field Engineer Assigned',         desc: techName && techName !== 'Pending Assignment' ? `Assigned to certified engineer: <strong>${safeTech}</strong>. Service toolkit prepared.` : 'Technician dispatched to schedule on-site visit.' },
        { key: 'In Progress', title: 'Engineer On-Site & Servicing',    desc: 'Technician has arrived at your location. Diagnostics and repairs are underway.' },
        { key: 'Completed',   title: 'Service Completed & Tested',      desc: 'All electrical, pressure, and cooling temperature tests verified. Warranty and invoice issued.' }
    ];

    const currentIndex = stages.findIndex(s => s.key === currentStatus);

    let html = `
        <div class="mb-6 p-4 bg-[#F2EDE3] rounded-2xl border border-[#B8AA98]/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
                <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#A05B3A]">Active Service Details</span>
                <div class="text-sm font-black text-[#342C27]">${safeService}</div>
                ${customerName ? `<div class="text-xs text-[#655448]">Customer: <strong>${safeCustomer}</strong></div>` : ''}
            </div>
            ${techName && techName !== 'Pending Assignment' ? `
                <div class="bg-[#FDFBF7] px-3 py-1.5 rounded-xl border border-[#B8AA98]/40 text-xs font-bold text-[#342C27] flex items-center gap-1.5 shadow-xs">
                    <span>🧑‍🔧</span><span>${safeTech}</span>
                </div>` : ''}
        </div>`;

    stages.forEach((stage, idx) => {
        const isPast    = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        let dotHtml, textClass, badge = '';

        if (isPast) {
            dotHtml   = `<div class="w-8 h-8 rounded-full bg-[#77B89A] text-[#1D3D2B] flex items-center justify-center font-black text-xs shadow-md">✓</div>`;
            textClass = 'text-[#342C27] font-bold';
        } else if (isCurrent) {
            dotHtml   = `<div class="w-8 h-8 rounded-full bg-[#A05B3A] text-[#F2EDE3] flex items-center justify-center font-black text-xs shadow-lg relative"><span class="w-full h-full rounded-full bg-[#A05B3A] animate-ping absolute opacity-75"></span><span class="relative z-10">●</span></div>`;
            textClass = 'text-[#A05B3A] font-extrabold';
            badge     = `<span class="bg-[#A05B3A]/15 text-[#A05B3A] border border-[#A05B3A]/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ml-2">Active Stage</span>`;
        } else {
            dotHtml   = `<div class="w-8 h-8 rounded-full bg-[#F2EDE3] border border-[#B8AA98]/40 text-[#655448] flex items-center justify-center font-bold text-xs">○</div>`;
            textClass = 'text-[#655448]';
        }

        html += `
            <div class="flex items-start gap-4 mb-8 relative">
                <div class="flex-shrink-0 mt-0.5">${dotHtml}</div>
                <div class="flex-1">
                    <div class="flex items-center flex-wrap gap-1">
                        <h4 class="text-sm ${textClass}">${stage.title}</h4>
                        ${badge}
                    </div>
                    <p class="text-xs text-[#655448] mt-1 leading-relaxed">${stage.desc}</p>
                </div>
            </div>`;
    });

    timelineContent.innerHTML = html;

    if (typeof gsap !== 'undefined' && timelineContent.children.length > 0) {
        gsap.fromTo(timelineContent.children,
            { opacity: 0, x: -14 },
            { opacity: 1, x: 0, duration: 0.35, stagger: 0.07, ease: 'power2.out' }
        );
    }
}

// ─── Confetti ────────────────────────────────────────────────────
let confettiFired = false;
function launchConfetti() {
    if (confettiFired) return;
    confettiFired = true;
    const colors = ['#A05B3A','#77B89A','#E4C99A','#B8AA98','#655448','#342C27'];
    for (let i = 0; i < 60; i++) {
        const p = document.createElement('div');
        p.className = 'confetti-piece';
        p.style.cssText = `
            left:${Math.random()*100}vw;
            top:-10px;
            background:${colors[Math.floor(Math.random()*colors.length)]};
            animation-duration:${1.5 + Math.random()*2}s;
            animation-delay:${Math.random()*0.8}s;
            transform:rotate(${Math.random()*360}deg);
            border-radius:${Math.random()>0.5?'50%':'2px'};
        `;
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 4000);
    }
}

// ─── Star Rating Widget ───────────────────────────────────────────
let ratingSubmitted = false;
function renderRatingWidget() {
    if (ratingSubmitted || document.getElementById('ratingWidget')) return;
    const widget = document.createElement('div');
    widget.id = 'ratingWidget';
    widget.className = 'mt-6 bg-[#FDFBF7] border border-[#B8AA98]/40 rounded-2xl p-6 text-center shadow-sm';
    widget.innerHTML = `
        <p class="text-xs font-extrabold uppercase tracking-widest text-[#A05B3A] mb-2">Rate Your Experience</p>
        <h3 class="font-black text-[#342C27] mb-4">How did our engineer do?</h3>
        <div id="ratingStars" class="flex justify-center gap-3 mb-4">
            ${[1,2,3,4,5].map(n => `
                <button onclick="selectRating(${n})" class="text-3xl transition-transform hover:scale-125 rating-star" data-val="${n}">⭐</button>
            `).join('')}
        </div>
        <textarea id="ratingComment" placeholder="Any comments? (optional)" rows="2"
            class="w-full border border-[#B8AA98]/40 bg-[#F2EDE3] text-[#342C27] rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-[#A05B3A] resize-none mb-3"></textarea>
        <button onclick="submitRating()" class="bg-[#A05B3A] hover:bg-[#8B4D2F] text-[#F2EDE3] font-bold px-6 py-2.5 rounded-xl text-sm transition active:scale-[0.99] shadow-sm">
            Submit Rating →
        </button>`;
    timelineContent.appendChild(widget);
}

let selectedRating = 0;
window.selectRating = (val) => {
    selectedRating = val;
    document.querySelectorAll('.rating-star').forEach(s => {
        s.style.opacity = parseInt(s.dataset.val) <= val ? '1' : '0.3';
    });
};

window.submitRating = async () => {
    if (!selectedRating) { if (window.showToast) window.showToast('Please select a star rating', 'warning'); return; }
    const comment = document.getElementById('ratingComment')?.value || '';
    try {
        await fetch(`${API_BASE}/api/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: selectedRating, comment, source: 'status_page', requestId: displayId?.innerText })
        });
    } catch(_) {}
    ratingSubmitted = true;
    document.getElementById('ratingWidget').innerHTML = `
        <div class="text-4xl mb-3">🙏</div>
        <p class="font-black text-[#342C27]">Thank you for your feedback!</p>
        <p class="text-[#655448] text-sm mt-1">Your ${selectedRating}★ rating helps us improve our service.</p>`;
    if (window.showToast) window.showToast('Rating submitted! Thank you.', 'success');
};