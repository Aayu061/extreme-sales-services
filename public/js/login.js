// js/login.js - Universal Multi-Role Authentication Logic

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL !== undefined)
    ? window.APP_CONFIG.BACKEND_URL
    : (isLocal ? 'http://localhost:5000' : '');

const roleMeta = {
    admin: {
        label: 'Admin',
        title: 'Admin Control Center',
        subtitle: 'Manage full fleet, analytics, inventory & AMCs',
        bodyClass: 'role-admin',
        btnBg: 'bg-[#A05B3A]',
        hoverBtnBg: 'hover:bg-[#8D4B2D]',
        badgeClass: 'bg-[#A05B3A]/15 text-[#A05B3A] border border-[#A05B3A]/30',
        redirect: 'admin.html'
    },
    staff: {
        label: 'Staff',
        title: 'Staff Operations Console',
        subtitle: 'Coordinate service jobs, dispatch technicians & enquiries',
        bodyClass: 'role-staff',
        btnBg: 'bg-[#77B89A]',
        hoverBtnBg: 'hover:bg-[#639D83]',
        badgeClass: 'bg-[#77B89A]/15 text-[#2E6B52] dark:text-[#77B89A] border border-[#77B89A]/30',
        redirect: 'staff.html'
    },
    technician: {
        label: 'Field Tech',
        title: 'Technician Mobile Portal',
        subtitle: 'Access daily schedules, on-site jobs & status updates',
        bodyClass: 'role-technician',
        btnBg: 'bg-[#D97706]',
        hoverBtnBg: 'hover:bg-[#B45309]',
        badgeClass: 'bg-[#D97706]/15 text-[#D97706] dark:text-[#E4C99A] border border-[#D97706]/30',
        redirect: 'technician.html'
    }
};

function setRole(role, btnElement) {
    const meta = roleMeta[role];
    if (!meta) return;

    document.getElementById('selectedRole').value = role;

    // Update body theme safely without destroying layout classes
    document.body.classList.remove('role-admin', 'role-staff', 'role-technician');
    document.body.classList.add(meta.bodyClass);

    // Update role tabs
    document.querySelectorAll('.role-tab').forEach(b => {
        b.className = 'role-tab flex-1 py-2 text-xs font-bold rounded-lg text-[#655448] dark:text-[#B8AA98] hover:text-[#342C27] dark:hover:text-[#F2EDE3] transition flex items-center justify-center gap-1.5 cursor-pointer';
    });

    if (btnElement) {
        btnElement.className = `role-tab active flex-1 py-2 text-xs font-bold rounded-lg text-white transition flex items-center justify-center gap-1.5 ${meta.btnBg} shadow-sm cursor-pointer`;
    }

    // Update titles and badge
    document.getElementById('portalTitle').textContent = meta.title;
    document.getElementById('portalSubtitle').textContent = meta.subtitle;
    const badge = document.getElementById('roleBadge');
    badge.textContent = meta.label;
    badge.className = `${meta.badgeClass} text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full`;

    if (typeof gsap !== 'undefined') {
        if (btnElement) gsap.fromTo(btnElement, { scale: 0.93 }, { scale: 1, duration: 0.22, ease: 'back.out(2)' });
        if (badge) gsap.fromTo(badge, { scale: 0.85, opacity: 0.6 }, { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(2)' });
    }

    // Update main submit button color
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.className = `w-full ${meta.btnBg} ${meta.hoverBtnBg} text-white font-bold py-3.5 rounded-xl shadow-[0_4px_14px_rgba(52,44,39,0.15)] transition transform active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer`;
}

function togglePasswordVisibility() {
    const input = document.getElementById('password');
    input.type = input.type === 'password' ? 'text' : 'password';
}

// Form Submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const role = document.getElementById('selectedRole').value;
    const errorMsg = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');

    errorMsg.classList.add('hidden');
    loginBtn.innerHTML = `
        <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
        </svg>
        <span>Authenticating...</span>
    `;
    loginBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });

        const data = await response.json();

        if (data.success) {
            // Save session
            const rememberCheckbox = document.getElementById('rememberEmail');
            if (rememberCheckbox && rememberCheckbox.checked) {
                localStorage.setItem('ess_remembered_email', email);
            } else {
                localStorage.removeItem('ess_remembered_email');
            }
            localStorage.setItem('ess_token', data.token);
            localStorage.setItem('ess_role', data.role);
            if (data.user) {
                localStorage.setItem('ess_user', JSON.stringify(data.user));
            }

            if (window.showToast) {
                window.showToast(`Welcome back, ${data.user ? data.user.name : role.toUpperCase()}!`, 'success');
            }

            const redirectTarget = roleMeta[data.role] ? roleMeta[data.role].redirect : 'admin.html';
            setTimeout(() => {
                window.location.href = redirectTarget;
            }, 600);

        } else {
            errorMsg.innerText = '❌ ' + (data.message || 'Invalid credentials.');
            errorMsg.classList.remove('hidden');
            if (window.showToast) window.showToast(data.message || 'Login failed', 'error');

            const loginCard = document.getElementById('loginForm')?.parentElement;
            if (typeof gsap !== 'undefined' && loginCard) {
                gsap.fromTo(loginCard, 
                    { x: -14 }, 
                    { x: 0, duration: 0.45, ease: 'elastic.out(1, 0.3)', clearProps: 'x' }
                );
            }
        }

    } catch (err) {
        errorMsg.innerText = '⚠️ Network error — Could not connect to backend server. Ensure server.js is running.';
        errorMsg.classList.remove('hidden');
        if (window.showToast) window.showToast('Server connection failed', 'error');

        const loginCard = document.getElementById('loginForm')?.parentElement;
        if (typeof gsap !== 'undefined' && loginCard) {
            gsap.fromTo(loginCard, 
                { x: -14 }, 
                { x: 0, duration: 0.45, ease: 'elastic.out(1, 0.3)', clearProps: 'x' }
            );
        }
    } finally {
        const meta = roleMeta[role];
        loginBtn.innerHTML = `<span>Sign In to Portal</span><span>→</span>`;
        loginBtn.disabled = false;
    }
});

// Card entrance animation & URL parameter pre-selection
window.addEventListener('DOMContentLoaded', () => {
    checkApiHealth();
    const card = document.getElementById('loginForm')?.parentElement;
    if (typeof gsap !== 'undefined' && card) {
        gsap.fromTo(card,
            { opacity: 0, y: 20, scale: 0.98 },
            { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'power2.out' }
        );
    }

    // Auto-select role tab if specified in URL (e.g. login.html?role=staff)
    const urlParams = new URLSearchParams(window.location.search);
    const targetRole = urlParams.get('role');
    if (targetRole && roleMeta[targetRole]) {
        const btn = document.querySelector(`button[onclick*="'${targetRole}'"]`);
        if (btn) setRole(targetRole, btn);
    }

    // Restore Remembered Email
    const rememberedEmail = localStorage.getItem('ess_remembered_email');
    const emailInput = document.getElementById('email');
    const rememberCheckbox = document.getElementById('rememberEmail');
    if (rememberedEmail && emailInput && rememberCheckbox) {
        emailInput.value = rememberedEmail;
        rememberCheckbox.checked = true;
    }

    // Caps Lock Warning
    const passwordInput = document.getElementById('password');
    const capsWarning = document.getElementById('capsLockWarning');
    if (passwordInput && capsWarning) {
        const checkCaps = (e) => {
            if (e.getModifierState && e.getModifierState('CapsLock')) {
                capsWarning.classList.remove('hidden');
            } else {
                capsWarning.classList.add('hidden');
            }
        };
        passwordInput.addEventListener('keydown', checkCaps);
        passwordInput.addEventListener('keyup', checkCaps);
    }

    if (urlParams.get('expired') === '1') {
        setTimeout(() => {
            if (window.showToast) window.showToast('Your session has expired. Please log in again.', 'warning');
        }, 300);
    }
});

window.fillVivaDemo = function() {
    const currentRole = document.getElementById('selectedRole')?.value || 'admin';
    const emailEl = document.getElementById('email');
    const passEl = document.getElementById('password');
    if (currentRole === 'admin') {
        if (emailEl) emailEl.value = 'ess0121@gmail.com';
        if (passEl) passEl.value = '@22062006@';
    } else if (currentRole === 'staff') {
        if (emailEl) emailEl.value = 'staff@extremess.com';
        if (passEl) passEl.value = 'staff123';
    } else if (currentRole === 'technician') {
        if (emailEl) emailEl.value = 'tech@extremess.com';
        if (passEl) passEl.value = 'tech123';
    }
    if (window.showToast) window.showToast(`Pre-filled demo credentials for ${currentRole.toUpperCase()}`, 'info');
};

async function checkApiHealth() {
    const healthText = document.getElementById('healthText');
    const healthDot = document.getElementById('healthDot');
    if (!healthText || !healthDot) return;
    const t0 = performance.now();
    try {
        const res = await fetch(`${API_BASE}/healthz`, { method: 'GET' });
        const latency = Math.round(performance.now() - t0);
        if (res.ok) {
            healthText.innerText = `Live API: Connected (${latency}ms)`;
            healthDot.className = 'w-2 h-2 rounded-full bg-[#77B89A] animate-pulse';
        } else {
            healthText.innerText = 'API: Service Degraded';
            healthDot.className = 'w-2 h-2 rounded-full bg-amber-500';
        }
    } catch(err) {
        healthText.innerText = 'API: Offline';
        healthDot.className = 'w-2 h-2 rounded-full bg-red-500';
    }
}
