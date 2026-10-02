/**
 * animations.js — Shared animation + logic layer for Extreme S&S
 * Handles: scroll-reveal, 3D card tilt, number counters,
 *          cursor spotlight, particle hero dots, scroll progress,
 *          time-based greeting, seasonal banner, EMI calculator,
 *          pincode memory, FAQ accordion, keyboard shortcuts.
 */

(function () {
  'use strict';

  /* ─── 1. Scroll Reveal (Restrained, Polished & Accessible) ─── */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealElements = document.querySelectorAll('.reveal, .reveal-stagger, .reveal-left, .reveal-right');

  if (prefersReducedMotion) {
    revealElements.forEach((el) => el.classList.add('visible'));
    document.querySelectorAll('.step-connector').forEach((el) => el.classList.add('visible'));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    revealElements.forEach((el) => revealObserver.observe(el));
    document.querySelectorAll('.step-connector').forEach((el) => revealObserver.observe(el));
  }

  /* ─── 2. 3-Step Service Process Scroll Progress (No Scroll Hijacking) ─── */
  const initProcessProgress = () => {
    const processSection = document.getElementById('process');
    const stepsContainer = document.getElementById('processStepsList') || (processSection ? processSection.querySelector('.space-y-12') : null);

    if (!processSection || !stepsContainer) return;

    const stepBadges = stepsContainer.querySelectorAll('.step-badge, .process-step-node');
    if (stepBadges.length < 2) return;

    // Ensure continuous track and fill line exists
    let track = stepsContainer.querySelector('.process-line-track');
    let fill = stepsContainer.querySelector('.process-line-fill');

    if (!track) {
      track = document.createElement('div');
      track.className = 'process-line-track';
      fill = document.createElement('div');
      fill.className = 'process-line-fill';
      track.appendChild(fill);
      stepsContainer.insertBefore(track, stepsContainer.firstChild);
    } else if (!fill) {
      fill = track.querySelector('.process-line-fill');
    }

    const updateGeometry = () => {
      const bFirst = stepBadges[0].getBoundingClientRect();
      const bLast = stepBadges[stepBadges.length - 1].getBoundingClientRect();
      const containerRect = stepsContainer.getBoundingClientRect();

      const topOffset = (bFirst.top + bFirst.height / 2) - containerRect.top;
      const totalHeight = (bLast.top + bLast.height / 2) - (bFirst.top + bFirst.height / 2);
      const leftOffset = (bFirst.left + bFirst.width / 2) - containerRect.left;

      track.style.top = `${topOffset}px`;
      track.style.left = `${leftOffset}px`;
      track.style.height = `${Math.max(0, totalHeight)}px`;
    };

    const updateProgress = () => {
      if (prefersReducedMotion) {
        if (fill) fill.style.height = '100%';
        stepBadges.forEach((b) => b.classList.add('step-active'));
        return;
      }

      const bFirst = stepBadges[0].getBoundingClientRect();
      const bLast = stepBadges[stepBadges.length - 1].getBoundingClientRect();
      const vh = window.innerHeight;

      // Start line animation when step 1 badge reaches ~70% of viewport
      // Complete line animation when step 3 badge reaches ~45% of viewport
      const startThreshold = vh * 0.70;
      const endThreshold = vh * 0.45;

      const totalDistance = (bLast.top - bFirst.top) + (startThreshold - endThreshold);
      const scrolled = startThreshold - bFirst.top;
      const progress = Math.max(0, Math.min(1, scrolled / totalDistance));

      if (fill) {
        fill.style.height = `${(progress * 100).toFixed(1)}%`;
      }

      // Progressively illuminate step badges as the line passes through them
      stepBadges.forEach((badge, idx) => {
        const threshold = idx === 0 ? 0.04 : (idx / (stepBadges.length - 1)) * 0.95;
        if (progress >= threshold) {
          badge.classList.add('step-active');
        } else {
          badge.classList.remove('step-active');
        }
      });
    };

    let isTicking = false;
    const onScroll = () => {
      if (!isTicking) {
        requestAnimationFrame(() => {
          updateProgress();
          isTicking = false;
        });
        isTicking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      updateGeometry();
      updateProgress();
    }, { passive: true });

    // Initial positioning after layout calculation
    setTimeout(() => {
      updateGeometry();
      updateProgress();
    }, 80);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProcessProgress);
  } else {
    initProcessProgress();
  }

  /* ─── 3. Number Counter ───────────────────────────────── */
  function animateCounter(el) {
    const target   = parseInt(el.dataset.target, 10);
    const suffix   = el.dataset.suffix || '';
    const duration = 1500;
    const start    = performance.now();

    const update = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  document
    .querySelectorAll('[data-target]')
    .forEach((el) => counterObserver.observe(el));

  /* ─── 4. 3D Card Tilt ────────────────────────────────── */
  document.querySelectorAll('.card-3d').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect   = card.getBoundingClientRect();
      const x      = e.clientX - rect.left;
      const y      = e.clientY - rect.top;
      const cx     = rect.width  / 2;
      const cy     = rect.height / 2;
      const rotateX = ((y - cy) / cy) * -5;   // max ±5°
      const rotateY = ((x - cx) / cx) *  5;
      card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)';
      card.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1)';
    });

    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.08s ease, box-shadow 0.3s ease';
    });
  });

  /* ─── 5. Cursor spotlight in hero sections ───────────── */
  document.querySelectorAll('.hero-bg').forEach((hero) => {
    let spotlight = hero.querySelector('.hero-spotlight');
    if (!spotlight) {
      spotlight = document.createElement('div');
      spotlight.className = 'hero-spotlight';
      hero.appendChild(spotlight);
    }

    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      spotlight.style.left = (e.clientX - rect.left) + 'px';
      spotlight.style.top  = (e.clientY - rect.top)  + 'px';
    });
  });

  /* ─── 6. Particle dots in hero ───────────────────────── */
  const particleContainer = document.getElementById('particleContainer');
  if (particleContainer) {
    for (let i = 0; i < 18; i++) {
      const dot  = document.createElement('div');
      dot.className = 'particle-dot';
      const size = Math.random() * 6 + 3;
      dot.style.cssText = `
        width:${size}px; height:${size}px;
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        animation-duration:${Math.random() * 10 + 8}s;
        animation-delay:${Math.random() * 6}s;
        opacity:${0.15 + Math.random() * 0.5};
      `;
      particleContainer.appendChild(dot);
    }
  }

  /* ─── 7. Smart navbar transparency ──────────────────── */
  const nav        = document.getElementById('mainNav');
  const heroSect   = document.querySelector('section.hero-bg, div.hero-bg');

  if (nav && heroSect) {
    const handleScroll = () => {
      const heroBottom = heroSect.offsetTop + heroSect.offsetHeight;
      const scrolled   = window.scrollY > heroBottom - 80;

      nav.classList.toggle('bg-white/95', scrolled);
      nav.classList.toggle('shadow-md',   scrolled);
      nav.classList.toggle('bg-transparent', !scrolled);

      // Only apply Tailwind text classes when NOT in dark mode
      // Dark mode link colors are handled entirely by CSS (html.dark nav#mainNav a)
      if (!document.documentElement.classList.contains('dark')) {
        nav.querySelectorAll('a:not(.btn-glow):not(.btn-shimmer)').forEach((a) => {
          if (scrolled) {
            a.classList.add('text-gray-900');
            a.classList.remove('text-blue-100', 'text-white');
          } else {
            a.classList.remove('text-gray-900');
          }
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // run once on load

    // Smooth scroll for hero indicator
    const scrollDownBtn = document.getElementById('scrollDownBtn');
    if (scrollDownBtn) {
      scrollDownBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector('#services');
        if (target) {
          window.scrollTo({
            top: target.offsetTop - 80,
            behavior: 'smooth'
          });
        }
      });
    }
  }

  /* ─── 8. Mobile menu toggle ──────────────────────────── */
  const menuBtn    = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
    mobileMenu.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => mobileMenu.classList.add('hidden'))
    );
  }

  /* ─── 9. Dynamic Navigation & Scroll-Spy Highlighting ── */
  const isHomePage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
  const navLinks = document.querySelectorAll('.nav-link');

  if (isHomePage) {
    const trackedSectionIds = ['hero', 'estimator', 'services', 'diagnosis', 'calculator', 'comparison', 'coverage', 'process', 'faq'];
    const sections = trackedSectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .sort((a, b) => a.offsetTop - b.offsetTop);

    const updateActiveSection = () => {
      const scrollPos = window.scrollY + 140; // Sticky nav buffer
      let currentSectionId = '';

      for (let i = sections.length - 1; i >= 0; i--) {
        const sect = sections[i];
        if (sect && sect.offsetTop <= scrollPos) {
          currentSectionId = sect.id;
          break;
        }
      }

      if (!currentSectionId || window.scrollY < 180) {
        currentSectionId = 'hero';
      }

      navLinks.forEach((link) => {
        const href = link.getAttribute('href') || '';
        const dataSec = link.getAttribute('data-section');
        const matchesAnchor = href === `#${currentSectionId}` || href.endsWith(`#${currentSectionId}`);
        const matchesDataSec = dataSec === currentSectionId;
        const matchesHome = (currentSectionId === 'hero' && (href === 'index.html' || href === '#' || href === '#hero' || dataSec === 'hero'));

        if (matchesAnchor || matchesDataSec || matchesHome) {
          link.classList.add('active');
        } else if (href.startsWith('#') || dataSec) {
          link.classList.remove('active');
        } else if (href === 'index.html' && currentSectionId !== 'hero') {
          const hasMatchingAnchor = Array.from(navLinks).some(l => {
            const h = l.getAttribute('href') || '';
            return h === `#${currentSectionId}` || l.getAttribute('data-section') === currentSectionId;
          });
          if (hasMatchingAnchor) {
            link.classList.remove('active');
          }
        }
      });
    };

    let isNavTicking = false;
    window.addEventListener('scroll', () => {
      if (!isNavTicking) {
        requestAnimationFrame(() => {
          updateActiveSection();
          isNavTicking = false;
        });
        isNavTicking = true;
      }
    }, { passive: true });
    updateActiveSection();

    // Smooth scroll for in-page anchors with sticky navbar offset
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href').slice(1);
        if (!targetId) return;
        const target = document.getElementById(targetId);
        if (target) {
          e.preventDefault();
          const targetOffset = target.getBoundingClientRect().top + window.scrollY - 75;
          window.scrollTo({
            top: targetOffset,
            behavior: prefersReducedMotion ? 'auto' : 'smooth'
          });
          if (history.pushState) {
            history.pushState(null, null, `#${targetId}`);
          }
        }
      });
    });
  } else {
    // For standalone subpages
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    navLinks.forEach((link) => {
      const linkPath = link.getAttribute('href');
      if (linkPath === currentPath) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  /* ─── 10. Theme Management (Dark/Light mode) ────────── */

  // Sync UI icons + aria-label for ALL toggle buttons
  const updateThemeToggleUI = () => {
    const activeDark = document.documentElement.classList.contains('dark');
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      const moonIcon = btn.querySelector('.theme-icon-moon');
      const sunIcon  = btn.querySelector('.theme-icon-sun');
      // Use the CSS class approach — .theme-icon-hidden sets display:none
      // (works with or without Tailwind's 'hidden' class)
      if (activeDark) {
        if (moonIcon) { moonIcon.classList.add('hidden'); moonIcon.setAttribute('aria-hidden', 'true'); }
        if (sunIcon)  { sunIcon.classList.remove('hidden'); sunIcon.setAttribute('aria-hidden', 'false'); }
      } else {
        if (moonIcon) { moonIcon.classList.remove('hidden'); moonIcon.setAttribute('aria-hidden', 'false'); }
        if (sunIcon)  { sunIcon.classList.add('hidden'); sunIcon.setAttribute('aria-hidden', 'true'); }
      }
      btn.setAttribute('aria-label', activeDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
      btn.setAttribute('title', activeDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    });
  };

  // Apply theme to <html> and persist to localStorage
  const applyTheme = (theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
    updateThemeToggleUI();
    // Re-run nav scroll handler so link colors are corrected after theme change
    window.dispatchEvent(new Event('scroll'));
  };

  // On first visit: respect OS preference if no saved preference
  const initTheme = () => {
    const saved = localStorage.getItem('theme');
    if (saved) {
      applyTheme(saved);
    } else {
      // Respect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
    }
  };

  // Toggle between dark and light
  const toggleTheme = (triggerBtn) => {
    const willBeDark = !document.documentElement.classList.contains('dark');

    // Brief spin animation on the clicked button
    if (triggerBtn && !prefersReducedMotion) {
      triggerBtn.classList.add('theme-toggle-spin');
      setTimeout(() => triggerBtn.classList.remove('theme-toggle-spin'), 500);
    }

    applyTheme(willBeDark ? 'dark' : 'light');

    // Friendly toast confirmation
    if (window.showToast) {
      window.showToast(
        willBeDark ? '🌙 Dark mode on' : '☀️ Light mode on',
        'info',
        1800
      );
    }
  };

  // Delegated click listener for all toggle buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-toggle-btn');
    if (btn) {
      e.preventDefault();
      toggleTheme(btn);
    }
  });

  // Listen for OS-level dark mode changes (e.g. user switches system theme)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only follow OS if the user hasn't set an explicit preference
    if (!localStorage.getItem('theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });

  // Run on load
  initTheme();

})();

/* ─── 7. Global Toast Notification System ─────────────────────── */
window.showToast = function(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const typeIcons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };

  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="text-lg">${typeIcons[type] || 'ℹ️'}</span>
    <div class="flex-1 text-sm font-semibold">${message}</div>
    <button onclick="this.parentElement.remove()" class="text-gray-400 hover:text-gray-700 text-sm font-bold ml-2">✕</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 300);
  }, duration);
};

/* ─── 8. Floating Dev / Demo Role Switcher ─────────────────────── */
window.initDemoSwitcher = function() {
  if (document.getElementById('demoSwitcher')) return;

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const switcher = document.createElement('div');
  switcher.id = 'demoSwitcher';
  switcher.className = 'demo-switcher hidden sm:flex';

  const links = [
    { label: '🌐 Site', href: 'index.html', page: 'index.html' },
    { label: '🛡️ Admin', href: 'admin.html', page: 'admin.html', role: 'admin' },
    { label: '📋 Staff', href: 'staff.html', page: 'staff.html', role: 'staff' },
    { label: '🧑‍🔧 Tech', href: 'technician.html', page: 'technician.html', role: 'technician' },
    { label: '📍 Track', href: 'status.html', page: 'status.html' }
  ];

  let html = `<span class="text-[10px] font-extrabold uppercase tracking-widest text-blue-400 pl-1 mr-1">Demo</span>`;
  links.forEach(l => {
    const isActive = currentPath === l.page;
    html += `<a href="${l.href}" onclick="if('${l.role || ''}') { localStorage.setItem('ess_token', 'demo-${l.role}-token'); localStorage.setItem('ess_role', '${l.role}'); }" class="demo-switcher-pill ${isActive ? 'active' : ''}">${l.label}</a>`;
  });

  switcher.innerHTML = html;
  document.body.appendChild(switcher);
};

// Automatically mount demo switcher on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initDemoSwitcher);
} else {
  window.initDemoSwitcher();
}

/* ─── 9. Interactive AC Diagnostic Tool ─────────────────── */
const diagnosticData = {
  'no-cooling': {
    badge: 'High Frequency Issue',
    category: 'Category: Refrigerant & Compressor',
    title: 'Insufficient Cooling & Warm Air Discharge',
    desc: 'Usually caused by clogged condenser coils restricting heat exchange, capacitor degradation, or micro-leakage in R32/R410A copper gas lines.',
    time: '45 Minutes',
    price: '₹499 - ₹1,499',
    issueParam: 'No Cooling'
  },
  'water-leak': {
    badge: 'Water Drainage Fault',
    category: 'Category: Drain Pipe & Coil Wash',
    title: 'Indoor Unit Water Dripping / Overflow',
    desc: 'Occurs when algae, dust or mold block the condensate drain line or when the evaporator coil is frozen due to restricted airflow.',
    time: '30 Minutes',
    price: '₹399 - ₹799',
    issueParam: 'Water Leaking'
  },
  'noise': {
    badge: 'Mechanical Vibration',
    category: 'Category: Blower Motor & Fan Bearings',
    title: 'Loud Rattling, Screeching or Vibrations',
    desc: 'Indicates loose motor mounting bolts, worn blower wheel bearings, or debris trapped inside the outdoor fan shroud.',
    time: '40 Minutes',
    price: '₹499 - ₹1,299',
    issueParam: 'Loud Noise'
  },
  'power-trip': {
    badge: 'Electrical Safety Fault',
    category: 'Category: Capacitor, Relay & PCB',
    title: 'MCB Circuit Tripping / Power Loss',
    desc: 'Signifies a shorted starting capacitor, damaged compressor relay, or overloaded electrical wiring drawing excessive amperage.',
    time: '50 Minutes',
    price: '₹699 - ₹1,899',
    issueParam: 'Power Tripping'
  },
  'smell': {
    badge: 'Air Quality & Hygiene',
    category: 'Category: Anti-Bacterial Jet Wash',
    title: 'Musty Foul Odor & Mold Discharge',
    desc: 'Bacterial growth on dirty evaporator fins and standing tray water. Requires 140-bar high-pressure anti-fungal jet wash.',
    time: '35 Minutes',
    price: '₹499 - ₹899',
    issueParam: 'Foul Smell'
  },
  'gas-wash': {
    badge: 'Pre-Summer Deep Care',
    category: 'Category: Full Jet Cleaning & Gas Top-up',
    title: 'Complete Jet Wash & Refrigerant Boost',
    desc: 'Comprehensive maintenance package including 100% virgin gas top-up, electrical health checks, and 2-step foam jet wash.',
    time: '60 Minutes',
    price: '₹1,299 - ₹2,499',
    issueParam: 'Gas & Wash'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Symptom Chips Listener — with smooth card transition
  const chips = document.querySelectorAll('#diagnosticSymptomChips .symptom-chip');
  const diagCard = document.getElementById('diagnosticResultCard');

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const key = chip.dataset.symptom;
      const data = diagnosticData[key];
      if (data && diagCard) {
        // Animate out
        diagCard.classList.add('updating');
        setTimeout(() => {
          document.getElementById('diagBadge').innerText = data.badge;
          document.getElementById('diagCategory').innerText = data.category;
          document.getElementById('diagTitle').innerText = data.title;
          document.getElementById('diagDescription').innerText = data.desc;
          document.getElementById('diagTime').innerText = data.time;
          document.getElementById('diagPrice').innerText = data.price;
          document.getElementById('diagBookBtn').href = `service.html?issue=${encodeURIComponent(data.issueParam)}`;
          // Animate back in
          diagCard.classList.remove('updating');
        }, 180);
      }
    });
  });

  // AC Tonnage Calculator Listener
  const areaSlider = document.getElementById('roomAreaSlider');
  const sunlightSelect = document.getElementById('sunlightSelect');
  const peopleSelect = document.getElementById('peopleSelect');
  const emiTenureSelect = document.getElementById('emiTenureSelect');

  // Price lookup table for EMI calc (approximate MRP for each tier)
  const acPrices = {
    '1.0 Ton 5-Star Inverter':             37000,
    '1.5 Ton 5-Star Inverter Split AC':    48000,
    '2.0 Ton 5-Star Inverter Split AC':    65000,
    '2.5 Ton Heavy Duty Commercial AC':    92000,
  };

  function updateCalculator() {
    if (!areaSlider) return;
    const area = parseInt(areaSlider.value, 10);
    document.getElementById('roomAreaDisplay').innerText = `${area} sq ft`;

    let baseTon = area / 100;
    if (sunlightSelect && sunlightSelect.value === 'top')   baseTon += 0.25;
    if (sunlightSelect && sunlightSelect.value === 'glass') baseTon += 0.4;
    if (peopleSelect   && peopleSelect.value === '3-4')     baseTon += 0.15;
    if (peopleSelect   && peopleSelect.value === '5+')      baseTon += 0.3;

    let recTon   = '1.0 Ton 5-Star Inverter';
    let btu      = '~12,000 BTU/hr';
    let savings  = '₹4,800 / Year';

    if (baseTon > 2.2) {
      recTon  = '2.5 Ton Heavy Duty Commercial AC';
      btu     = '~30,000 BTU/hr';
      savings = '₹11,500 / Year';
    } else if (baseTon > 1.7) {
      recTon  = '2.0 Ton 5-Star Inverter Split AC';
      btu     = '~24,000 BTU/hr';
      savings = '₹8,600 / Year';
    } else if (baseTon > 1.2) {
      recTon  = '1.5 Ton 5-Star Inverter Split AC';
      btu     = '~18,000 BTU/hr';
      savings = '₹6,400 / Year';
    }

    if (document.getElementById('calcTonnageResult')) document.getElementById('calcTonnageResult').innerText = recTon;
    if (document.getElementById('calcBtuResult'))     document.getElementById('calcBtuResult').innerText = `Cooling Capacity: ${btu}`;
    if (document.getElementById('calcSavingsResult')) document.getElementById('calcSavingsResult').innerText = savings;

    // EMI calculation
    updateEmi(acPrices[recTon] || 48000);
  }

  function updateEmi(price) {
    const emiEl = document.getElementById('calcEmiResult');
    if (!emiEl || !emiTenureSelect) return;
    const months = parseInt(emiTenureSelect.value, 10);
    const emi = Math.round(price / months);
    emiEl.innerText = `₹${emi.toLocaleString('en-IN')}/mo`;
  }

  if (areaSlider) {
    areaSlider.addEventListener('input', updateCalculator);
    if (sunlightSelect)   sunlightSelect.addEventListener('change', updateCalculator);
    if (peopleSelect)     peopleSelect.addEventListener('change', updateCalculator);
    if (emiTenureSelect)  emiTenureSelect.addEventListener('change', () => {
      // Re-derive current tonnage price without full recalc
      const tonEl = document.getElementById('calcTonnageResult');
      if (tonEl) {
        const price = acPrices[tonEl.innerText] || 48000;
        updateEmi(price);
      }
    });
    updateCalculator(); // init
  }
});


/* ─── 10. Pincode Coverage Checker ──────────────────────── */
window.checkPincodeCoverage = function() {
  const input = document.getElementById('pincodeInput');
  const result = document.getElementById('pincodeResult');
  if (!input || !result) return;

  const code = input.value.trim();
  result.classList.remove('hidden', 'text-emerald-400', 'text-amber-400', 'text-red-400');

  if (/^\d{6}$/.test(code)) {
    // Save valid pincode to localStorage
    localStorage.setItem('ess_pincode', code);
    renderSavedPincodeChip(code);

    const firstThree = parseInt(code.substring(0, 3), 10);
    if (firstThree >= 400 && firstThree <= 410) {
      const engineerCount = Math.floor(Math.random() * 3) + 3; // 3–5
      result.className = "mt-4 text-xs font-bold text-emerald-400 bg-emerald-950/80 p-4 rounded-xl border border-emerald-800 flex items-start gap-3";
      result.innerHTML = `
        <span class="engineer-live-dot mt-0.5 flex-shrink-0"></span>
        <span>✅ <strong>Pincode ${code}</strong> is in our Priority Dispatch Hub.
        <strong>${engineerCount} Engineers Active</strong> nearby (&lt; 45 Mins Arrival).
        <a href="service.html" class="underline text-emerald-300 ml-1">Book now →</a></span>
      `;
    } else if (firstThree >= 400 && firstThree <= 421) {
      result.className = "mt-4 text-xs font-bold text-amber-400 bg-amber-950/80 p-4 rounded-xl border border-amber-800";
      result.innerHTML = `⚠️ Pincode ${code} is in our Extended Zone. Service available within 2–3 hours. <a href="tel:+917977805245" class="underline text-amber-300">Call hotline</a> for instant dispatch.`;
    } else {
      result.className = "mt-4 text-xs font-bold text-amber-300 bg-slate-800 p-4 rounded-xl border border-slate-600";
      result.innerHTML = `📍 Pincode ${code} may be outside our current active zones. <a href="contact.html" class="underline text-blue-400">Contact us</a> to arrange service or call <a href="tel:+917977805245" class="underline text-blue-400">+91 7977805245</a>.`;
    }
  } else {
    result.className = "mt-4 text-xs font-bold text-red-400 bg-red-950/80 p-3 rounded-xl border border-red-800";
    result.innerHTML = `❌ Please enter a valid 6-digit Indian pincode (e.g., 400013).`;
  }
};

/* Render the saved pincode chip */
function renderSavedPincodeChip(code) {
  const chip = document.getElementById('savedPincodeChip');
  if (!chip) return;
  chip.innerHTML = `📍 Saved: <strong>${code}</strong> &nbsp;<span style="opacity:0.6">✕</span>`;
  chip.classList.remove('hidden');
  chip.onclick = () => {
    localStorage.removeItem('ess_pincode');
    chip.classList.add('hidden');
    const input = document.getElementById('pincodeInput');
    if (input) { input.value = ''; input.focus(); }
    const result = document.getElementById('pincodeResult');
    if (result) result.classList.add('hidden');
  };
}

/* ─── 11. Scroll Progress Bar ────────────────────────────── */
(function initScrollProgress() {
  const bar = document.getElementById('scrollProgressBar');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = pct + '%';
  }, { passive: true });
})();

/* ─── 12. Time-Based Hero Greeting ───────────────────────── */
(function initHeroGreeting() {
  const el = document.getElementById('heroGreeting');
  if (!el) return;
  const hour = new Date().getHours();
  let greeting = '';
  let icon = '';
  if (hour >= 5 && hour < 12)  { greeting = 'Good Morning'; icon = '☀️'; }
  else if (hour < 17)           { greeting = 'Good Afternoon'; icon = '🌤️'; }
  else if (hour < 20)           { greeting = 'Good Evening'; icon = '🌅'; }
  else                          { greeting = 'Good Night'; icon = '🌙'; }

  const month = new Date().getMonth(); // 0-indexed
  let seasonNote = '';
  if (month >= 2 && month <= 5)  seasonNote = '— Peak AC Season! Book early.';
  else if (month >= 5 && month <= 8) seasonNote = '— Monsoon Care Special On!';

  el.textContent = `${icon} ${greeting}! ${seasonNote}`;
})();

/* ─── 13. Seasonal Urgency Banner ────────────────────────── */
(function initSeasonalBanner() {
  const banner = document.getElementById('seasonalBanner');
  if (!banner) return;

  // Don't show if dismissed in last 24 hours
  const dismissed = localStorage.getItem('ess_banner_dismissed');
  if (dismissed && (Date.now() - parseInt(dismissed)) < 86400000) return;

  const month = new Date().getMonth();
  let msg = '';
  if (month >= 2 && month <= 5) {
    msg = '🔥 PEAK SUMMER ALERT — Slots Filling Fast! Book AC Service Today &amp; Get Priority Dispatch. <a href="service.html" style="text-decoration:underline; color:#fde68a;">Book Now →</a>';
  } else if (month >= 5 && month <= 8) {
    msg = '🌧️ MONSOON AC CARE — Prevent Water Leaks &amp; Mould Before the Rains Hit. <a href="service.html" style="text-decoration:underline; color:#fde68a;">Schedule Now →</a>';
  } else if (month >= 9 && month <= 11) {
    msg = '❄️ WINTER PREP OFFER — Pre-Winter Gas Check + Filter Clean at Flat ₹499. <a href="amc.html" style="text-decoration:underline; color:#fde68a;">View Plans →</a>';
  }

  if (!msg) return; // No banner off-season

  banner.innerHTML = `${msg} <button class="banner-close" onclick="dismissBanner()" aria-label="Close">✕</button>`;
  banner.style.display = 'block';
  banner.style.paddingTop = '0.55rem';
  banner.style.paddingBottom = '0.55rem';
  // Push nav down to account for banner height
  const nav = document.getElementById('mainNav');
  if (nav) nav.style.top = banner.offsetHeight + 'px';
})();

window.dismissBanner = function() {
  const banner = document.getElementById('seasonalBanner');
  if (banner) {
    banner.style.maxHeight = banner.offsetHeight + 'px';
    banner.style.transition = 'max-height 0.4s ease, opacity 0.3s ease';
    requestAnimationFrame(() => {
      banner.style.maxHeight = '0';
      banner.style.opacity = '0';
    });
    setTimeout(() => { banner.style.display = 'none'; }, 450);
  }
  localStorage.setItem('ess_banner_dismissed', Date.now());
  const nav = document.getElementById('mainNav');
  if (nav) nav.style.top = '0';
};

/* ─── 14. FAQ Accordion ──────────────────────────────────── */
window.toggleFaq = function(triggerBtn) {
  const item = triggerBtn.closest('.faq-item');
  if (!item) return;
  const isOpen = item.classList.contains('open');

  // Close all other items
  document.querySelectorAll('.faq-item.open').forEach(el => {
    if (el !== item) el.classList.remove('open');
  });

  // Toggle current
  item.classList.toggle('open', !isOpen);
};

/* ─── 15. Keyboard Shortcut '/' to focus Pincode ─────────── */
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    const pincodeInput = document.getElementById('pincodeInput');
    if (pincodeInput) {
      pincodeInput.focus();
      pincodeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  // Press Enter in pincode input to trigger check
  if (e.key === 'Enter' && document.activeElement.id === 'pincodeInput') {
    window.checkPincodeCoverage();
  }
});

/* ─── 16. Restore Saved Pincode on Load ──────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const savedPin = localStorage.getItem('ess_pincode');
  if (savedPin) {
    const input = document.getElementById('pincodeInput');
    if (input) input.value = savedPin;
    renderSavedPincodeChip(savedPin);
  }

  // Auto-check from URL param e.g. ?pincode=400013
  const urlParams = new URLSearchParams(window.location.search);
  const pinParam = urlParams.get('pincode');
  if (pinParam) {
    const input = document.getElementById('pincodeInput');
    if (input) {
      input.value = pinParam;
      window.checkPincodeCoverage();
    }
  }
});

/* ─── 17. Cookie Consent Banner (Production Ready) ───────── */
(function initCookieBanner() {
  if (localStorage.getItem('cookie_consent_accepted')) return;

  const path = window.location.pathname.toLowerCase();
  if (path.includes('admin') || path.includes('staff') || path.includes('technician')) return;

  window.addEventListener('DOMContentLoaded', () => {
    const banner = document.createElement('div');
    banner.id = 'cookieConsentBanner';
    banner.className = 'fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[9999] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 text-white p-4 sm:p-5 rounded-2xl shadow-2xl transition-all duration-500 transform translate-y-8 opacity-0 flex flex-col gap-3 text-xs';
    banner.innerHTML = `
      <div class="flex items-start gap-3">
        <span class="text-2xl flex-shrink-0">🍪</span>
        <div class="space-y-1">
          <p class="font-bold text-white text-sm">Cookie &amp; Service Preferences</p>
          <p class="text-slate-300 text-xs leading-relaxed">
            We use lightweight cookies and session storage to optimize live service dispatch tracking and remember your preferences. Read our <a href="privacy.html" class="text-blue-400 hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 pt-1">
        <button type="button" id="declineCookieBtn" class="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 text-xs font-semibold transition">
          Dismiss
        </button>
        <button type="button" id="acceptCookieBtn" class="btn-glow px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm">
          Accept All
        </button>
      </div>
    `;
    document.body.appendChild(banner);

    setTimeout(() => {
      banner.classList.remove('translate-y-8', 'opacity-0');
    }, 1200);

    const dismiss = () => {
      banner.classList.add('translate-y-8', 'opacity-0');
      setTimeout(() => banner.remove(), 400);
    };

    banner.querySelector('#acceptCookieBtn').addEventListener('click', () => {
      localStorage.setItem('cookie_consent_accepted', 'true');
      dismiss();
    });

    banner.querySelector('#declineCookieBtn').addEventListener('click', () => {
      localStorage.setItem('cookie_consent_accepted', 'dismissed');
      dismiss();
    });
  });
})();

