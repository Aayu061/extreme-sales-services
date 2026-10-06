/**
 * diagnosticsWidget.js — Interactive HVAC AI Fault Diagnoser & FMEA Risk Triage HUD
 * Extreme Sales & Services Precision Platform
 */

(function () {
  'use strict';

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
  const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL !== undefined)
    ? window.APP_CONFIG.BACKEND_URL
    : (isLocal ? 'http://localhost:5000' : '');

  // Local fallback knowledge base if backend API is unreachable
  const CLIENT_TRIAGE_FALLBACK = {
    'mcb': {
      rootCause: 'Compressor Ground Fault / Dual Run Capacitor Breakdown',
      category: 'High-Voltage Electrical',
      severity: 'CRITICAL',
      urgencyBadge: '🔴 Critical Emergency (Safety Hazard)',
      rpn: 360,
      costEstimate: { formatted: '₹850 - ₹2,400' },
      safetyAdvisory: 'CRITICAL HAZARD: Do not repeatedly reset the MCB. Leave isolated from mains power.',
      parts: ['OEM Run Capacitor 45uF/50uF', 'Magnetic Contactor / Terminal Relay']
    },
    'ice': {
      rootCause: 'Refrigerant Undercharge, Expansion Valve Sticking, or Coil Airflow Blockage',
      category: 'Refrigeration Cycle',
      severity: 'MEDIUM',
      urgencyBadge: '🟡 Moderate Priority (Compressor Protection)',
      rpn: 168,
      costEstimate: { formatted: '₹1,800 - ₹2,800' },
      safetyAdvisory: 'Turn off cooling mode immediately to prevent liquid slugging damage to compressor.',
      parts: ['R32/R410A Eco Refrigerant Virgin Top-up', 'Brass Flare Nut Re-brazing']
    },
    'water': {
      rootCause: 'Clogged Condensate Drain Tray or Bio-Slime Siphon Trap Obstruction',
      category: 'Drainage & Airflow',
      severity: 'LOW',
      urgencyBadge: '🟢 Standard Scheduled',
      rpn: 72,
      costEstimate: { formatted: '₹499 - ₹899' },
      safetyAdvisory: 'Place a dry catch tray beneath the indoor blower to prevent gypsum wall damage.',
      parts: ['High-Pressure Nitrogen Drain Blowout', 'Flexible Antibacterial Spiral Drain Hose']
    },
    'warm': {
      rootCause: 'Outdoor Condenser Fan Motor Stalled or Inverter Power PCB Defect',
      category: 'Inverter Inversion / Heat Exchange',
      severity: 'MEDIUM',
      urgencyBadge: '🟡 Moderate Priority',
      rpn: 126,
      costEstimate: { formatted: '₹950 - ₹3,800' },
      safetyAdvisory: 'Verify remote is set to Cool Mode with snowflake icon at 22°C-24°C.',
      parts: ['Condenser Fan Motor Capacitor', 'Inverter IPM Microcontroller Repair']
    },
    'noise': {
      rootCause: 'Cross-Flow Blower Fan Bushing Wear or Outdoor Rubber Damper Degradation',
      category: 'Mechanical Balancing',
      severity: 'LOW',
      urgencyBadge: '🟢 Standard Scheduled',
      rpn: 48,
      costEstimate: { formatted: '₹350 - ₹750' },
      safetyAdvisory: 'Avoid running on maximum fan speed until bushing alignment is verified.',
      parts: ['Neoprene Anti-Vibration Damper Pads', 'Blower Bearing High-Temp Silicone Lubrication']
    },
    'smell': {
      rootCause: 'Microbial Mold Colonization on Cooling Fins or Terminal Heat Burn',
      category: 'Indoor Air Quality & Sanitization',
      severity: 'MEDIUM',
      urgencyBadge: '🟡 Moderate Priority',
      rpn: 90,
      costEstimate: { formatted: '₹599 - ₹1,199' },
      safetyAdvisory: 'Operate in Fan mode with room windows cracked until wash is performed.',
      parts: ['Antibacterial Foam Spray & High-Temp Steam Wash', 'PM2.5 Micro-Filter Layer']
    }
  };

  let selectedSymptomText = '';

  window.selectDiagChip = function (symptomKey, element) {
    const parent = element.parentElement;
    if (parent) {
      parent.querySelectorAll('.diag-chip').forEach(c => c.classList.remove('active'));
      element.classList.add('active');
    }

    const input = document.getElementById('diagCustomInput');
    if (input) {
      input.value = symptomKey;
    }

    runDiagnostics(symptomKey);
  };

  window.handleDiagSubmit = function (e) {
    if (e) e.preventDefault();
    const input = document.getElementById('diagCustomInput');
    const text = (input ? input.value : '').trim();
    if (!text) return;
    runDiagnostics(text);
  };

  async function runDiagnostics(symptomDescription) {
    const resultCard = document.getElementById('diagResultCard');
    const loadingState = document.getElementById('diagLoading');
    const contentState = document.getElementById('diagContent');

    if (!resultCard) return;

    resultCard.classList.remove('hidden');
    if (loadingState) loadingState.classList.remove('hidden');
    if (contentState) contentState.classList.add('hidden');

    let report = null;

    try {
      const brandInput = document.getElementById('diagBrandSelect');
      const brand = brandInput ? brandInput.value : 'Standard Inverter';

      const response = await fetch(`${API_BASE}/api/diagnostics/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: symptomDescription,
          serviceType: 'AC Repair',
          brand: brand,
          acAgeYears: 3
        })
      });

      if (response.ok) {
        report = await response.json();
      }
    } catch (err) {
      console.warn('Diagnostics API offline, using resilient clientside knowledge base:', err);
    }

    // Client-side fallback if fetch failed or returned invalid
    if (!report || !report.detectedDiagnosis) {
      const lower = (symptomDescription || '').toLowerCase();
      let match = CLIENT_TRIAGE_FALLBACK.warm;
      if (lower.includes('mcb') || lower.includes('trip') || lower.includes('spark') || lower.includes('fuse')) match = CLIENT_TRIAGE_FALLBACK.mcb;
      else if (lower.includes('ice') || lower.includes('frost') || lower.includes('gas') || lower.includes('freeze')) match = CLIENT_TRIAGE_FALLBACK.ice;
      else if (lower.includes('water') || lower.includes('leak') || lower.includes('dripping') || lower.includes('drain')) match = CLIENT_TRIAGE_FALLBACK.water;
      else if (lower.includes('noise') || lower.includes('sound') || lower.includes('rattle') || lower.includes('vibrat')) match = CLIENT_TRIAGE_FALLBACK.noise;
      else if (lower.includes('smell') || lower.includes('odor') || lower.includes('stink') || lower.includes('dust')) match = CLIENT_TRIAGE_FALLBACK.smell;

      report = {
        detectedDiagnosis: match,
        fmeaRisk: { rpn: match.rpn || 120, riskLevel: match.severity },
        equipmentHealth: { healthIndex: 82, remainingUsefulLifeYears: 7 },
        latencyMs: 0.4
      };
    }

    renderDiagnosis(report, symptomDescription);

    if (loadingState) loadingState.classList.add('hidden');
    if (contentState) contentState.classList.remove('hidden');
  }

  function renderDiagnosis(data, queryText) {
    const diag = data.detectedDiagnosis;
    const fmea = data.fmeaRisk || { rpn: 120 };
    const health = data.equipmentHealth || { healthIndex: 80 };

    // Elements
    const rootCauseEl = document.getElementById('diagRootCause');
    const categoryEl = document.getElementById('diagCategory');
    const urgencyBadgeEl = document.getElementById('diagUrgencyBadge');
    const costRangeEl = document.getElementById('diagCostRange');
    const safetyAdvisoryEl = document.getElementById('diagSafetyAdvisory');
    const rpnValEl = document.getElementById('diagRpnVal');
    const rpnFillEl = document.getElementById('diagRpnFill');
    const healthIndexEl = document.getElementById('diagHealthIndex');
    const partsListEl = document.getElementById('diagPartsList');
    const bookLinkEl = document.getElementById('diagBookBtn');

    if (rootCauseEl) rootCauseEl.textContent = diag.rootCause || 'General Degradation';
    if (categoryEl) categoryEl.textContent = diag.category || 'HVAC Diagnostics';
    if (urgencyBadgeEl) urgencyBadgeEl.textContent = diag.urgencyBadge || '🟡 Moderate Priority';
    if (costRangeEl) costRangeEl.textContent = (diag.costEstimate && diag.costEstimate.formatted) ? diag.costEstimate.formatted : '₹650 - ₹1,850';
    if (safetyAdvisoryEl) safetyAdvisoryEl.textContent = diag.safetyAdvisory || 'Regular maintenance ensures optimal cooling.';

    if (rpnValEl) rpnValEl.textContent = `RPN: ${fmea.rpn || 120} / 1000`;
    if (rpnFillEl) {
      const pct = Math.min(100, Math.round(((fmea.rpn || 120) / 450) * 100));
      rpnFillEl.style.width = `${pct}%`;
      if (pct > 70) {
        rpnFillEl.className = 'fmea-risk-fill bg-rose-500';
      } else if (pct > 35) {
        rpnFillEl.className = 'fmea-risk-fill bg-amber-500';
      } else {
        rpnFillEl.className = 'fmea-risk-fill bg-emerald-500';
      }
    }

    if (healthIndexEl) healthIndexEl.textContent = `${health.healthIndex || 82}% Efficiency Health`;

    // Parts
    if (partsListEl) {
      partsListEl.innerHTML = '';
      const parts = diag.requiredOEMParts || [];
      if (parts.length > 0) {
        parts.forEach(p => {
          const li = document.createElement('li');
          li.className = 'flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800 last:border-0';
          li.innerHTML = `
            <span class="text-slate-700 dark:text-slate-300 font-medium">${p.name || p}</span>
            <span class="text-blue-600 dark:text-blue-400 font-bold font-mono">₹${(p.approxPrice || 600).toLocaleString('en-IN')}</span>
          `;
          partsListEl.appendChild(li);
        });
      } else {
        partsListEl.innerHTML = '<li class="text-xs text-slate-500">Standard OEM consumable cleaning supplies.</li>';
      }
    }

    // Direct Booking Pre-fill Link
    if (bookLinkEl) {
      const encodedIssue = encodeURIComponent(`[AI Diagnostic] ${diag.rootCause} (Symptom: ${queryText})`);
      bookLinkEl.href = `service.html?serviceType=repair&issue=${encodedIssue}`;
    }
  }

  // Auto-init with default symptom
  document.addEventListener('DOMContentLoaded', () => {
    const diagSection = document.getElementById('diagnostics');
    if (diagSection) {
      // Trigger default check on warm air
      const defaultChip = diagSection.querySelector('.diag-chip');
      if (defaultChip) {
        defaultChip.classList.add('active');
        runDiagnostics('Warm air blowing and not cooling');
      }
    }
  });

})();
