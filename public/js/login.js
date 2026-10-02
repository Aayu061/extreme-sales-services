// js/login.js - Universal Multi-Role Authentication Logic

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
    ? 'http://localhost:5000'
    : ((window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'https://extreme-sales-services-gh7s.onrender.com');

const roleMeta = {
    admin: {
        label: 'Admin',
        title: 'Admin Control Center',
        subtitle: 'Manage full fleet, analytics, inventory & AMCs',
        bodyClass: 'role-admin',
        btnBg: 'bg-blue-600',
        hoverBtnBg: 'hover:bg-blue-700',
        badgeClass: 'bg-blue-100 text-blue-800',
        redirect: 'admin.html'
    },
    staff: {
        label: 'Staff',
        title: 'Staff Operations Console',
        subtitle: 'Coordinate service jobs, dispatch technicians & enquiries',
        bodyClass: 'role-staff',
        btnBg: 'bg-emerald-600',
        hoverBtnBg: 'hover:bg-emerald-700',
        badgeClass: 'bg-emerald-100 text-emerald-800',
        redirect: 'staff.html'
    },
    technician: {
        label: 'Field Tech',
        title: 'Technician Mobile Portal',
        subtitle: 'Access daily schedules, on-site jobs & status updates',
        bodyClass: 'role-technician',
        btnBg: 'bg-amber-600',
        hoverBtnBg: 'hover:bg-amber-700',
        badgeClass: 'bg-amber-100 text-amber-800',
        redirect: 'technician.html'
    }
};

function setRole(role, btnElement) {
    const meta = roleMeta[role];
    if (!meta) return;

    document.getElementById('selectedRole').value = role;

    // Update body theme
    document.body.className = `flex items-center justify-center min-h-screen p-4 sm:p-6 text-gray-900 font-sans antialiased relative overflow-hidden ${meta.bodyClass}`;

    // Update role tabs
    document.querySelectorAll('.role-tab').forEach(b => {
        b.className = 'role-tab flex-1 py-2 text-xs font-bold rounded-lg text-gray-600 hover:text-gray-900 transition flex items-center justify-center gap-1.5';
    });

    if (btnElement) {
        btnElement.className = `role-tab active flex-1 py-2 text-xs font-bold rounded-lg text-white transition flex items-center justify-center gap-1.5 ${meta.btnBg} shadow-sm`;
    }

    // Update titles and badge
    document.getElementById('portalTitle').textContent = meta.title;
    document.getElementById('portalSubtitle').textContent = meta.subtitle;
    const badge = document.getElementById('roleBadge');
    badge.textContent = meta.label;
    badge.className = `${meta.badgeClass} text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full`;

    // Update main submit button color
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.className = `w-full ${meta.btnBg} ${meta.hoverBtnBg} text-white font-bold py-3 rounded-xl shadow-lg transition transform active:scale-[0.98] flex items-center justify-center gap-2`;
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
        }

    } catch (err) {
        errorMsg.innerText = '⚠️ Network error — Could not connect to backend server. Ensure server.js is running.';
        errorMsg.classList.remove('hidden');
        if (window.showToast) window.showToast('Server connection failed', 'error');
    } finally {
        const meta = roleMeta[role];
        loginBtn.innerHTML = `<span>Sign In to Portal</span><span>→</span>`;
        loginBtn.disabled = false;
    }
});
