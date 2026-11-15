// extreme-sales-services-main/public/js/customer-portal.js
// ═══════════════════════════════════════════════════════════════════════════
// EXTREME SALES & SERVICES - CUSTOMER PORTAL CLIENT CONTROLLER (ES6 NATIVE)
// Direct integration with Consolidated PYS / Supabase REST Engine
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // Determine API endpoint base:
  // If running on local dev server (port 5002) or production, use relative /api/portal
  // Fall back to direct PYS endpoint if opened directly
  const isDirectPys = window.location.port === '5000' || window.location.port === '5173';
  const API_BASE = isDirectPys ? 'http://localhost:5000/api/v1/portal' : '/api/portal';

  let currentToken = localStorage.getItem('ess_customer_token') || '';
  let currentCustomer = null;
  let cachedOverview = null;

  // DOM Elements
  const authSection = document.getElementById('authSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const loginForm = document.getElementById('loginForm');
  const loginPhone = document.getElementById('loginPhone');
  const loginName = document.getElementById('loginName');
  const newCustomerFields = document.getElementById('newCustomerFields');
  const portalAlert = document.getElementById('portalAlert');
  const quickDemoBtn = document.getElementById('quickDemoBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  // Modals
  const bookServiceModal = document.getElementById('bookServiceModal');
  const registerAssetModal = document.getElementById('registerAssetModal');
  const jobCardModal = document.getElementById('jobCardModal');
  const bookServiceForm = document.getElementById('bookServiceForm');
  const registerAssetForm = document.getElementById('registerAssetForm');

  // Helpers
  function showAlert(msg, isError) {
    if (!portalAlert) return;
    portalAlert.className = isError
      ? 'mb-6 p-4 rounded-2xl text-xs font-bold flex items-center justify-between border bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50'
      : 'mb-6 p-4 rounded-2xl text-xs font-bold flex items-center justify-between border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50';
    portalAlert.innerHTML = '<span>' + msg + '</span><button type="button" onclick="this.parentElement.classList.add(\'hidden\')" class="ml-4 font-black">×</button>';
    portalAlert.classList.remove('hidden');
  }

  function getInitials(name) {
    if (!name) return 'CU';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function formatDate(dStr) {
    if (!dStr) return '—';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dStr;
    }
  }

  function formatPhone(raw) {
    if (!raw) return '';
    const digits = String(raw).replace(/\D/g, '').slice(-10);
    if (digits.length === 10) {
      return '+91 ' + digits.slice(0, 5) + ' ' + digits.slice(5);
    }
    return raw;
  }

  // Authentication & API Request
  async function apiRequest(endpoint, method, body) {
    method = method || 'GET';
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (currentToken) {
      headers['Authorization'] = 'Bearer ' + currentToken;
    }

    try {
      const res = await fetch(API_BASE + endpoint, {
        method: method,
        headers: headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(function () { return {}; });
      return { ok: res.ok, status: res.status, data: data };
    } catch (err) {
      return { ok: false, status: 503, data: { message: err.message || 'Network connection failed' } };
    }
  }

  // Initialize
  async function init() {
    setupEventListeners();
    setupThemeToggle();

    if (currentToken) {
      await loadPortalData();
    } else {
      showAuth();
    }
  }

  function showAuth() {
    if (authSection) authSection.classList.remove('hidden');
    if (dashboardSection) dashboardSection.classList.add('hidden');
  }

  function showDashboard() {
    if (authSection) authSection.classList.add('hidden');
    if (dashboardSection) dashboardSection.classList.remove('hidden');
  }

  // Load Portal Overview
  async function loadPortalData() {
    const res = await apiRequest('/overview', 'GET');
    if (!res.ok || !res.data.success) {
      // Session expired or invalid
      localStorage.removeItem('ess_customer_token');
      currentToken = '';
      showAuth();
      return;
    }

    cachedOverview = res.data.data;
    currentCustomer = cachedOverview.customer;
    renderDashboard(cachedOverview);
    showDashboard();
  }

  // Render Dashboard
  function renderDashboard(data) {
    const cust = data.customer || {};
    const assets = data.assets || [];
    const tickets = data.serviceRequests || [];
    const schedules = data.serviceSchedules || [];
    const reports = data.serviceReports || [];
    const amcList = data.amcContracts || [];
    const invoices = data.invoices || [];

    // Profile Banner
    const nameEl = document.getElementById('custName');
    if (nameEl) nameEl.textContent = cust.name || 'Valued Customer';

    const avatarEl = document.getElementById('custAvatarLetters');
    if (avatarEl) avatarEl.textContent = getInitials(cust.name);

    const badgeEl = document.getElementById('custCodeBadge');
    if (badgeEl) badgeEl.textContent = cust.customerCode || 'CUST';

    const phoneEl = document.getElementById('custPhone');
    if (phoneEl) phoneEl.textContent = '📞 ' + formatPhone(cust.phone);

    const cityEl = document.getElementById('custCity');
    if (cityEl) cityEl.textContent = '📍 ' + (cust.city || 'Mumbai');

    // Metrics Counters
    const totalAssetsEl = document.getElementById('statTotalAssets');
    if (totalAssetsEl) totalAssetsEl.textContent = String(assets.length);

    const totalTicketsEl = document.getElementById('statTotalTickets');
    if (totalTicketsEl) totalTicketsEl.textContent = String(tickets.length);

    const activeAmcEl = document.getElementById('statActiveAmc');
    if (activeAmcEl) {
      activeAmcEl.textContent = String(
        amcList.filter(function (a) { return a.status === 'ACTIVE'; }).length
      );
    }

    const pendingTotal = invoices
      .filter(function (inv) { return inv.status === 'UNPAID'; })
      .reduce(function (sum, inv) { return sum + (Number(inv.total_amount_due || inv.total_amount) || 0); }, 0);
    const duesEl = document.getElementById('statPendingDues');
    if (duesEl) duesEl.textContent = '₹' + pendingTotal.toLocaleString('en-IN');

    // Tab badges
    const tabAssetsEl = document.getElementById('tabCountAssets');
    if (tabAssetsEl) tabAssetsEl.textContent = String(assets.length);

    const tabHistoryEl = document.getElementById('tabCountHistory');
    if (tabHistoryEl) tabHistoryEl.textContent = String(tickets.length);

    const tabAmcEl = document.getElementById('tabCountAmc');
    if (tabAmcEl) tabAmcEl.textContent = String(amcList.length);

    const tabInvEl = document.getElementById('tabCountInvoices');
    if (tabInvEl) tabInvEl.textContent = String(invoices.length);

    // 1. Render AC Assets
    renderAssets(assets);

    // 2. Render History & Reports
    renderHistory(tickets, schedules, reports);

    // 3. Render AMC Contracts
    renderAmc(amcList);

    // 4. Render Invoices
    renderInvoices(invoices);

    // Populate Asset select dropdown in Book Service Modal
    const select = document.getElementById('bookAssetSelect');
    if (select) {
      select.innerHTML = '<option value="">General Service / Any AC</option>';
      assets.forEach(function (a) {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = a.brand + ' ' + (a.model_number || '') + ' (' + (a.room_location || a.ac_type || 'AC') + ')';
        select.appendChild(opt);
      });
    }
  }

  // 1. Render Equipment Cards
  function renderAssets(assets) {
    const grid = document.getElementById('assetsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (assets.length === 0) {
      grid.innerHTML =
        '<div class="col-span-full p-8 text-center bg-white/40 dark:bg-[#27211D]/40 rounded-3xl border border-dashed border-[#B8AA98]/60">' +
        '<p class="text-sm font-bold text-[#655448] dark:text-[#B8AA98]">No AC equipment registered yet.</p>' +
        '<p class="text-xs text-muted mt-1">Register your air conditioners to track warranties and maintenance schedules.</p>' +
        '<button type="button" onclick="document.getElementById(\'openRegisterAssetModalBtn\').click()" class="mt-4 px-4 py-2 bg-[#A05B3A] text-white rounded-xl text-xs font-bold shadow-xs">' +
        '+ Register Your First AC' +
        '</button>' +
        '</div>';
      return;
    }

    assets.forEach(function (a) {
      const warrantyBadge =
        a.warranty_status === 'AMC_COVERED'
          ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">🛡️ AMC Covered</span>'
          : a.warranty_status === 'UNDER_WARRANTY'
          ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">★ In Warranty</span>'
          : '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Standard Service</span>';

      const card = document.createElement('div');
      card.className =
        'bg-white/80 dark:bg-[#27211D]/80 p-5 rounded-2xl border border-[#B8AA98]/40 shadow-xs flex flex-col justify-between hover:shadow-md transition';
      card.innerHTML =
        '<div>' +
        '<div class="flex items-center justify-between gap-2 mb-2">' +
        '<span class="text-xs font-mono font-bold text-[#A05B3A] dark:text-[#E4C99A]">' + (a.asset_tag || 'ESSC') + '</span>' +
        warrantyBadge +
        '</div>' +
        '<h3 class="text-base font-black text-[#342C27] dark:text-[#F2EDE3]">' + (a.brand || 'AC Brand') + '</h3>' +
        '<p class="text-xs font-mono text-[#655448] dark:text-[#B8AA98] mt-0.5">' + (a.model_number || 'Standard Model') + '</p>' +
        '<div class="mt-3 grid grid-cols-2 gap-2 text-[11px] bg-[#F2EDE3]/50 dark:bg-[#1A1412]/50 p-2.5 rounded-xl border border-[#B8AA98]/20">' +
        '<div><span class="text-muted">Type:</span> <b>' + (a.ac_type || 'Split AC') + '</b></div>' +
        '<div><span class="text-muted">Capacity:</span> <b>' + (a.capacity_tons ? a.capacity_tons + ' Ton' : '1.5 Ton') + '</b></div>' +
        '<div><span class="text-muted">Rating:</span> <b>' + (a.star_rating || '3 Star') + '</b></div>' +
        '<div><span class="text-muted">Room:</span> <b>' + (a.room_location || 'Living Room') + '</b></div>' +
        '</div>' +
        '</div>' +
        '<div class="mt-4 pt-3 border-t border-[#B8AA98]/30 flex items-center justify-between">' +
        '<span class="text-[10px] text-muted">Status: <b class="text-emerald-600">' + (a.asset_status || 'Active') + '</b></span>' +
        '<button type="button" data-asset-id="' + a.id + '" class="requestServiceForAssetBtn text-xs font-bold text-[#A05B3A] dark:text-[#E4C99A] hover:underline flex items-center gap-1">' +
        '<span>Book Visit</span> →' +
        '</button>' +
        '</div>';
      grid.appendChild(card);
    });

    // Wire book buttons
    document.querySelectorAll('.requestServiceForAssetBtn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        const id = e.currentTarget.getAttribute('data-asset-id');
        const sel = document.getElementById('bookAssetSelect');
        if (sel) sel.value = id || '';
        if (bookServiceModal) bookServiceModal.classList.remove('hidden');
      });
    });
  }

  // 2. Render History Table
  function renderHistory(tickets, schedules, reports) {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (tickets.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-muted">No service requests recorded.</td></tr>';
      return;
    }

    tickets.forEach(function (t) {
      // Find matching schedule
      const sched = schedules.find(function (s) { return s.service_request_id === t.id; });
      const rep = sched ? reports.find(function (r) { return r.service_schedule_id === sched.id; }) : null;
      const techName = (sched && sched.technician && sched.technician.name) || 'Assigned on Dispatch';

      const statusBadge =
        t.status === 'COMPLETED' || t.status === 'RESOLVED'
          ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">✓ Completed</span>'
          : t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED'
          ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">⚙️ In Progress</span>'
          : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">⏳ Pending</span>';

      const tr = document.createElement('tr');
      tr.className = 'hover:bg-[#F2EDE3]/30 dark:hover:bg-[#1A1412]/30 transition';
      tr.innerHTML =
        '<td class="p-3.5 font-mono font-bold text-[#A05B3A] dark:text-[#E4C99A]">' + (t.request_number || 'SR') + '</td>' +
        '<td class="p-3.5 text-muted">' + formatDate(t.preferred_date || t.created_at) + '</td>' +
        '<td class="p-3.5">' +
        '<div class="font-bold text-[#342C27] dark:text-[#F2EDE3]">' + (t.request_type || 'Service') + '</div>' +
        '<div class="text-[11px] text-muted truncate max-w-xs">' + (t.description || '') + '</div>' +
        '</td>' +
        '<td class="p-3.5">' +
        '<div class="font-bold">' + techName + '</div>' +
        '</td>' +
        '<td class="p-3.5">' + statusBadge + '</td>' +
        '<td class="p-3.5 text-right">' +
        (rep
          ? '<button type="button" data-rep-id="' + rep.id + '" class="viewJobCardBtn px-2.5 py-1 bg-[#A05B3A]/10 text-[#A05B3A] dark:text-[#E4C99A] hover:bg-[#A05B3A]/20 rounded-lg font-bold text-[11px] transition">View Job Card</button>'
          : '<span class="text-muted text-[11px]">—</span>') +
        '</td>';
      tbody.appendChild(tr);
    });

    // Wire job card buttons
    document.querySelectorAll('.viewJobCardBtn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        const repId = e.currentTarget.getAttribute('data-rep-id');
        const report = reports.find(function (r) { return r.id === repId; });
        if (report) showJobCardModal(report);
      });
    });
  }

  // 3. Render AMC Contracts
  function renderAmc(contracts) {
    const container = document.getElementById('amcCardsContainer');
    if (!container) return;
    container.innerHTML = '';

    if (contracts.length === 0) {
      container.innerHTML =
        '<div class="p-8 text-center bg-white/40 dark:bg-[#27211D]/40 rounded-3xl border border-dashed border-[#B8AA98]/60">' +
        '<p class="text-sm font-bold text-[#655448] dark:text-[#B8AA98]">No active AMC contract registered.</p>' +
        '<p class="text-xs text-muted mt-1">Get priority 24/7 service, scheduled seasonal servicing, and free breakdown calls.</p>' +
        '<a href="amc.html" class="inline-block mt-4 px-4 py-2 bg-[#A05B3A] text-white rounded-xl text-xs font-bold shadow-xs">' +
        'Browse AMC Plans' +
        '</a>' +
        '</div>';
      return;
    }

    contracts.forEach(function (c) {
      const plan = c.amc_plans || {};
      const card = document.createElement('div');
      card.className = 'bg-white/80 dark:bg-[#27211D]/80 p-6 rounded-2xl border border-[#B8AA98]/40 shadow-xs';
      card.innerHTML =
        '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#B8AA98]/30">' +
        '<div>' +
        '<div class="flex items-center gap-2">' +
        '<span class="text-xs font-mono font-bold text-[#A05B3A] dark:text-[#E4C99A]">' + c.contract_number + '</span>' +
        '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full ' +
        (c.status === 'ACTIVE'
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
          : 'bg-gray-100 text-gray-700') +
        '">' + c.status + '</span>' +
        '</div>' +
        '<h3 class="text-base font-black text-[#342C27] dark:text-[#F2EDE3] mt-1">' + (plan.name || 'Comprehensive AMC') + '</h3>' +
        '<p class="text-xs text-muted">' + (plan.description || plan.coverage_summary || 'Full coverage with preventive maintenance') + '</p>' +
        '</div>' +
        '<div class="text-right">' +
        '<span class="text-[11px] text-muted block">Contract Validity:</span>' +
        '<span class="text-xs font-bold">' + formatDate(c.start_date) + ' — ' + formatDate(c.end_date) + '</span>' +
        '</div>' +
        '</div>' +
        '<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">' +
        '<div class="bg-[#F2EDE3]/50 dark:bg-[#1A1412]/50 p-2.5 rounded-xl">' +
        '<span class="text-muted block text-[10px]">Dry Services/Yr</span>' +
        '<b class="text-sm">' + (c.dry_service_visits || 2) + ' Visits</b>' +
        '</div>' +
        '<div class="bg-[#F2EDE3]/50 dark:bg-[#1A1412]/50 p-2.5 rounded-xl">' +
        '<span class="text-muted block text-[10px]">Jet Pump Washes</span>' +
        '<b class="text-sm">' + (c.jet_service_visits || 1) + ' Visits</b>' +
        '</div>' +
        '<div class="bg-[#F2EDE3]/50 dark:bg-[#1A1412]/50 p-2.5 rounded-xl">' +
        '<span class="text-muted block text-[10px]">Gas Charging</span>' +
        '<b class="text-sm">' + (plan.has_gas_charging ? '✓ Included' : 'Extra as per usage') + '</b>' +
        '</div>' +
        '<div class="bg-[#F2EDE3]/50 dark:bg-[#1A1412]/50 p-2.5 rounded-xl">' +
        '<span class="text-muted block text-[10px]">Covered AC Units</span>' +
        '<b class="text-sm">' + ((c.amc_assets && c.amc_assets.length) || 1) + ' ACs</b>' +
        '</div>' +
        '</div>' +
        '<div class="mt-4 pt-3 flex justify-end">' +
        '<button type="button" class="bookAmcVisitBtn px-4 py-2 bg-[#A05B3A] hover:bg-[#8B4D2F] text-white rounded-xl text-xs font-bold transition">' +
        'Book Routine AMC Maintenance Visit' +
        '</button>' +
        '</div>';
      container.appendChild(card);
    });

    document.querySelectorAll('.bookAmcVisitBtn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const reqType = document.getElementById('bookRequestType');
        if (reqType) reqType.value = 'PREVENTIVE';
        if (bookServiceModal) bookServiceModal.classList.remove('hidden');
      });
    });
  }

  // 4. Render Invoices Table
  function renderInvoices(invoices) {
    const tbody = document.getElementById('invoicesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (invoices.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-muted">No invoices available.</td></tr>';
      return;
    }

    invoices.forEach(function (inv) {
      const isPaid = inv.status === 'PAID';
      const statusBadge = isPaid
        ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">✓ PAID</span>'
        : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">UNPAID</span>';

      const tr = document.createElement('tr');
      tr.className = 'hover:bg-[#F2EDE3]/30 dark:hover:bg-[#1A1412]/30 transition';
      tr.innerHTML =
        '<td class="p-3.5 font-mono font-bold text-[#A05B3A] dark:text-[#E4C99A]">' + (inv.payment_number || 'INV') + '</td>' +
        '<td class="p-3.5 text-muted">' + formatDate(inv.created_at) + '</td>' +
        '<td class="p-3.5 font-bold">₹' + Number(inv.total_amount_due || 0).toLocaleString('en-IN') + '</td>' +
        '<td class="p-3.5 text-muted">₹' + Number(inv.total_amount_paid || 0).toLocaleString('en-IN') + '</td>' +
        '<td class="p-3.5 font-black text-[#342C27] dark:text-[#F2EDE3]">₹' + Number(inv.total_amount_due || 0).toLocaleString('en-IN') + '</td>' +
        '<td class="p-3.5">' + statusBadge + '</td>';
      tbody.appendChild(tr);
    });
  }

  // Show Job Card Modal
  function showJobCardModal(rep) {
    const repNumEl = document.getElementById('jcReportNumber');
    if (repNumEl) repNumEl.textContent = rep.report_number;
    const content = document.getElementById('jcContent');
    if (content) {
      content.innerHTML =
        '<div class="bg-[#F2EDE3]/50 dark:bg-[#1A1412]/50 p-3 rounded-xl border border-[#B8AA98]/20 grid grid-cols-2 gap-2">' +
        '<div><span class="text-muted">Start Time:</span> <b>' + formatDate(rep.start_time) + '</b></div>' +
        '<div><span class="text-muted">Outcome:</span> <b class="text-emerald-600">' + (rep.primary_outcome || 'Completed') + '</b></div>' +
        '<div><span class="text-muted">Signoff Name:</span> <b>' + (rep.customer_representative || 'Customer') + '</b></div>' +
        '<div><span class="text-muted">Status:</span> <b class="text-emerald-600">Verified</b></div>' +
        '</div>' +
        '<div>' +
        '<h4 class="font-bold text-[#342C27] dark:text-[#F2EDE3] mb-1">Work Description & Observations:</h4>' +
        '<p class="p-2.5 rounded-xl bg-white/70 dark:bg-[#1A1412]/70 border border-[#B8AA98]/30">' +
        (rep.work_description || rep.action_taken || 'AC Serviced and verified operational') +
        '</p>' +
        '</div>' +
        (rep.recommendation
          ? '<div><h4 class="font-bold text-[#342C27] dark:text-[#F2EDE3] mb-1">Technician Recommendations:</h4>' +
            '<p class="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 text-amber-900 dark:text-amber-200">' +
            rep.recommendation +
            '</p></div>'
          : '');
    }
    if (jobCardModal) jobCardModal.classList.remove('hidden');
  }

  // Event Listeners
  function setupEventListeners() {
    // Login form submit
    loginForm && loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const phone = loginPhone ? loginPhone.value.trim() : '';
      const name = loginName ? loginName.value.trim() : '';

      const btn = document.getElementById('loginSubmitBtn');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>Verifying...</span>';
      }

      const res = await apiRequest('/auth/login', 'POST', { phone: phone, name: name });
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>View My Equipment &amp; Records</span>';
      }

      if (!res.ok || !res.data.success) {
        showAlert(res.data && res.data.message ? res.data.message : 'Login failed', true);
        return;
      }

      if (!res.data.registered) {
        // Customer not found, prompt for name to register
        if (newCustomerFields) newCustomerFields.classList.remove('hidden');
        if (loginName) loginName.required = true;
        showAlert('No existing profile found. Please enter your name to register as a new customer.');
        return;
      }

      // Successful login
      currentToken = res.data.token;
      localStorage.setItem('ess_customer_token', currentToken);
      showAlert('Welcome, ' + res.data.customer.name + '!');
      await loadPortalData();
    });

    // Quick demo button
    quickDemoBtn && quickDemoBtn.addEventListener('click', function () {
      if (loginPhone) loginPhone.value = '9820123456';
      if (loginName) loginName.value = 'Aayush Parekh';
    });

    // Logout button
    logoutBtn && logoutBtn.addEventListener('click', function () {
      localStorage.removeItem('ess_customer_token');
      currentToken = '';
      currentCustomer = null;
      cachedOverview = null;
      showAuth();
      showAlert('Signed out successfully.');
    });

    // Modal open buttons
    const openBookBtn = document.getElementById('openBookServiceModalBtn');
    openBookBtn && openBookBtn.addEventListener('click', function () {
      if (bookServiceModal) bookServiceModal.classList.remove('hidden');
    });

    const openRegBtn = document.getElementById('openRegisterAssetModalBtn');
    openRegBtn && openRegBtn.addEventListener('click', function () {
      if (registerAssetModal) registerAssetModal.classList.remove('hidden');
    });

    // Close modal buttons
    document.querySelectorAll('.closeModalBtn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (bookServiceModal) bookServiceModal.classList.add('hidden');
        if (registerAssetModal) registerAssetModal.classList.add('hidden');
        if (jobCardModal) jobCardModal.classList.add('hidden');
      });
    });

    // Tab buttons
    document.querySelectorAll('.portal-tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        const targetTab = e.currentTarget.getAttribute('data-tab');

        // Update button states
        document.querySelectorAll('.portal-tab-btn').forEach(function (b) {
          b.classList.remove('active', 'border-b-2', 'border-[#A05B3A]', 'dark:border-[#E4C99A]', 'text-[#A05B3A]', 'dark:text-[#E4C99A]', 'font-black');
          b.classList.add('font-bold', 'text-[#655448]', 'dark:text-[#B8AA98]');
        });

        const activeBtn = e.currentTarget;
        activeBtn.classList.add('active', 'border-b-2', 'border-[#A05B3A]', 'dark:border-[#E4C99A]', 'text-[#A05B3A]', 'dark:text-[#E4C99A]', 'font-black');
        activeBtn.classList.remove('text-[#655448]', 'dark:text-[#B8AA98]');

        // Update panels
        document.querySelectorAll('.portal-tab-panel').forEach(function (panel) {
          panel.classList.add('hidden');
        });

        const panelMap = {
          equipment: 'tabPanelEquipment',
          history: 'tabPanelHistory',
          amc: 'tabPanelAmc',
          invoices: 'tabPanelInvoices'
        };
        const activePanelId = panelMap[targetTab];
        if (activePanelId) {
          const p = document.getElementById(activePanelId);
          if (p) p.classList.remove('hidden');
        }
      });
    });

    // Book Service Form submit
    bookServiceForm && bookServiceForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const assetSelect = document.getElementById('bookAssetSelect');
      const reqTypeSelect = document.getElementById('bookRequestType');
      const dateInput = document.getElementById('bookPreferredDate');
      const descInput = document.getElementById('bookDescription');

      const res = await apiRequest('/book-service', 'POST', {
        assetId: (assetSelect && assetSelect.value) || undefined,
        requestType: (reqTypeSelect && reqTypeSelect.value) || 'BREAKDOWN',
        preferredDate: (dateInput && dateInput.value) || undefined,
        description: (descInput && descInput.value) || 'Service Request',
      });

      if (!res.ok || !res.data.success) {
        showAlert((res.data && res.data.message) || 'Failed to submit service request', true);
        return;
      }

      if (bookServiceModal) bookServiceModal.classList.add('hidden');
      bookServiceForm.reset();
      showAlert('Service request booked successfully! A technician will be assigned shortly.');
      await loadPortalData();
    });

    // Register AC Form submit
    registerAssetForm && registerAssetForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const brandInput = document.getElementById('regBrand');
      const modelInput = document.getElementById('regModelNumber');
      const acTypeSelect = document.getElementById('regAcType');
      const tonnageSelect = document.getElementById('regTonnage');
      const roomInput = document.getElementById('regRoomLocation');

      const res = await apiRequest('/register-asset', 'POST', {
        brand: brandInput ? brandInput.value : '',
        modelNumber: modelInput ? modelInput.value : '',
        acType: acTypeSelect ? acTypeSelect.value : 'Split AC',
        capacityTons: tonnageSelect ? Number(tonnageSelect.value) : 1.5,
        roomLocation: roomInput ? roomInput.value : 'Living Room',
      });

      if (!res.ok || !res.data.success) {
        showAlert((res.data && res.data.message) || 'Failed to register AC', true);
        return;
      }

      if (registerAssetModal) registerAssetModal.classList.add('hidden');
      registerAssetForm.reset();
      showAlert('AC equipment registered successfully to your address!');
      await loadPortalData();
    });
  }

  // Theme Toggle Support
  function setupThemeToggle() {
    document.querySelectorAll('.theme-toggle-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
      });
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
