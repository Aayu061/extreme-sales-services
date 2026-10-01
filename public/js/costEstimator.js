/**
 * costEstimator.js — Interactive Instant HVAC Cost Estimator & Quote Calculator
 * Extreme Sales & Services (ESS) Precision HVAC Platform
 */

(function () {
  'use strict';

  // Base Pricing Matrix
  const PRICING_RULES = {
    services: {
      jet_wash: { name: 'Deep Jet-Pump Foam Wash & Sanitization', basePrice: 699, duration: '45 mins' },
      gas_refill: { name: 'Refrigerant Leak Test & Gas Refill (R32/R410A)', basePrice: 1850, duration: '60 mins' },
      cooling_repair: { name: 'Cooling Failure, Capacitor & Sensor Diagnosis', basePrice: 1150, duration: '45 mins' },
      installation: { name: 'New AC Copper Piping & Bracket Installation', basePrice: 1450, duration: '90 mins' },
      health_check: { name: 'Pre-Summer 24-Point Comprehensive Health Audit', basePrice: 899, duration: '40 mins' }
    },
    types: {
      split: { multiplier: 1.0, label: 'Split Inverter AC' },
      window: { multiplier: 0.85, label: 'Window AC Unit' },
      cassette: { multiplier: 1.4, label: 'Commercial Cassette AC' }
    },
    tonnage: {
      '1.0': { multiplier: 0.9, label: '1.0 Ton' },
      '1.5': { multiplier: 1.0, label: '1.5 Ton' },
      '2.0': { multiplier: 1.25, label: '2.0 Ton' }
    }
  };

  let selectedType = 'split';
  let selectedTonnage = '1.5';
  let selectedService = 'jet_wash';

  let lastBase = null;
  let lastGst = null;
  let lastTotal = null;

  function animateNumber(el, fromVal, toVal, prefix = '₹', suffix = '', duration = 240) {
    if (!el) return;
    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Fast, snappy ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(fromVal + (toVal - fromVal) * eased);
      el.textContent = `${prefix}${current.toLocaleString('en-IN')}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = `${prefix}${toVal.toLocaleString('en-IN')}${suffix}`;
      }
    }
    requestAnimationFrame(frame);
  }

  window.selectEstimatorOption = function (category, value, element) {
    if (category === 'type') selectedType = value;
    if (category === 'tonnage') selectedTonnage = value;
    if (category === 'service') selectedService = value;

    // Toggle active pill styling
    const parent = element.parentElement;
    if (parent) {
      parent.querySelectorAll('.estimator-pill').forEach(btn => {
        btn.classList.remove('active', 'bg-blue-600', 'text-white', 'border-blue-600', 'shadow-md');
        btn.classList.add('bg-white', 'text-slate-700', 'border-slate-200');
      });
      element.classList.add('active', 'bg-blue-600', 'text-white', 'border-blue-600', 'shadow-md');
      element.classList.remove('bg-white', 'text-slate-700', 'border-slate-200');
    }

    calculateQuote(false);
  };

  function calculateQuote(isInitial = false) {
    const serviceMeta = PRICING_RULES.services[selectedService];
    const typeMeta = PRICING_RULES.types[selectedType];
    const tonMeta = PRICING_RULES.tonnage[selectedTonnage];

    if (!serviceMeta || !typeMeta || !tonMeta) return;

    const baseCost = Math.round(serviceMeta.basePrice * typeMeta.multiplier * tonMeta.multiplier);
    const gstCost = Math.round(baseCost * 0.18);
    const totalCost = baseCost + gstCost;
    const amcSavings = totalCost;

    // Update UI elements
    const quoteBaseEl = document.getElementById('estBasePrice');
    const quoteGstEl = document.getElementById('estGstPrice');
    const quoteTotalEl = document.getElementById('estTotalPrice');
    const quoteDurationEl = document.getElementById('estDuration');
    const quoteSavingsEl = document.getElementById('estAmcSavings');
    const bookBtn = document.getElementById('estBookBtn');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isInitial || prefersReducedMotion || lastTotal === null) {
      if (quoteBaseEl) quoteBaseEl.textContent = `₹${baseCost.toLocaleString('en-IN')}`;
      if (quoteGstEl) quoteGstEl.textContent = `₹${gstCost.toLocaleString('en-IN')}`;
      if (quoteTotalEl) quoteTotalEl.textContent = `₹${totalCost.toLocaleString('en-IN')}`;
      if (quoteDurationEl) quoteDurationEl.textContent = serviceMeta.duration;
      if (quoteSavingsEl) quoteSavingsEl.textContent = `Save ₹${amcSavings.toLocaleString('en-IN')}`;
    } else {
      // Smooth numerical and subtle transform transition
      if (quoteTotalEl) {
        quoteTotalEl.classList.add('price-val', 'is-updating');
        animateNumber(quoteTotalEl, lastTotal, totalCost, '₹', '', 240);
        setTimeout(() => quoteTotalEl.classList.remove('is-updating'), 240);
      }
      if (quoteBaseEl) {
        quoteBaseEl.classList.add('price-val', 'is-updating');
        animateNumber(quoteBaseEl, lastBase, baseCost, '₹', '', 240);
        setTimeout(() => quoteBaseEl.classList.remove('is-updating'), 240);
      }
      if (quoteGstEl) {
        quoteGstEl.classList.add('price-val', 'is-updating');
        animateNumber(quoteGstEl, lastGst, gstCost, '₹', '', 240);
        setTimeout(() => quoteGstEl.classList.remove('is-updating'), 240);
      }

      // Smooth duration crossfade
      if (quoteDurationEl && quoteDurationEl.textContent !== serviceMeta.duration) {
        quoteDurationEl.classList.add('estimate-text-crossfade', 'is-updating');
        setTimeout(() => {
          quoteDurationEl.textContent = serviceMeta.duration;
          quoteDurationEl.classList.remove('is-updating');
        }, 120);
      }

      // AMC savings
      if (quoteSavingsEl) {
        quoteSavingsEl.classList.add('estimate-text-crossfade', 'is-updating');
        animateNumber(quoteSavingsEl, lastTotal, amcSavings, 'Save ₹', '', 240);
        setTimeout(() => quoteSavingsEl.classList.remove('is-updating'), 240);
      }
    }

    lastBase = baseCost;
    lastGst = gstCost;
    lastTotal = totalCost;

    if (bookBtn) {
      const serviceParam = encodeURIComponent(`${serviceMeta.name} (${typeMeta.label} - ${tonMeta.label})`);
      bookBtn.href = `service.html?serviceType=${serviceParam}`;
    }
  }

  // Initial Calculation on Page Ready
  document.addEventListener('DOMContentLoaded', () => {
    calculateQuote(true);
  });
})();
