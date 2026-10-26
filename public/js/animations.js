/**
 * animations.js — Shared animation + logic layer for Extreme S&S
 * Handles: scroll-reveal, 3D card tilt, number counters,
 *          cursor spotlight, particle hero dots, scroll progress,
 *          time-based greeting, seasonal banner, EMI calculator,
 *          pincode memory, FAQ accordion, keyboard shortcuts.
 */

(function () {
  'use strict';

  /* ─── 0. Universal Loading & Transition System (Clean & Instant) ─── */
  const initLoadingSystem = () => {
    // Non-blocking parallel probe to server health check
    fetch('/api/health', { method: 'GET', cache: 'no-store' }).catch(() => {});
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoadingSystem);
  } else {
    initLoadingSystem();
  }

  /* ─── 1. GSAP Engine Core & Pre-Flight Registration ─── */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof gsap !== 'undefined';

  if (hasGSAP) {
    if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);
    if (typeof ScrollToPlugin !== 'undefined') gsap.registerPlugin(ScrollToPlugin);
    gsap.config({ autoSleep: 60, force3D: true });
  }

  /* ─── 1A. GSAP Hero Entrance Choreography (Executive High-End) ─── */
  const initHeroAnimation = () => {
    if (!hasGSAP || prefersReducedMotion) return;
    const heroSection = document.getElementById('hero');
    if (!heroSection) return;

    const nav = document.getElementById('mainNav');
    const greeting = document.getElementById('heroGreeting');
    const trustBadge = heroSection.querySelector('.inline-flex');
    const h1 = heroSection.querySelector('h1');
    const subtitle = heroSection.querySelector('p');
    const ctas = heroSection.querySelectorAll('.btn-accent, a[href="products.html"]');
    const valueStrip = heroSection.querySelector('.inline-flex.flex-wrap');
    const pillars = heroSection.querySelectorAll('.grid > div');

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    if (nav) {
      tl.from(nav, { y: -25, opacity: 0, duration: 0.7 });
    }
    if (greeting) {
      tl.from(greeting, { y: 15, opacity: 0, duration: 0.4 }, '-=0.4');
    }
    if (trustBadge) {
      tl.from(trustBadge, { scale: 0.85, opacity: 0, duration: 0.5, ease: 'back.out(1.5)' }, '-=0.2');
    }
    if (h1) {
      tl.from(h1, { y: 35, opacity: 0, duration: 0.8, ease: 'power4.out' }, '-=0.3');
    }
    if (subtitle) {
      tl.from(subtitle, { y: 20, opacity: 0, duration: 0.6 }, '-=0.4');
    }
    if (ctas && ctas.length) {
      tl.from(ctas, { y: 20, opacity: 0, stagger: 0.1, duration: 0.5 }, '-=0.3');
    }
    if (valueStrip) {
      tl.from(valueStrip, { scale: 0.95, opacity: 0, duration: 0.5 }, '-=0.2');
    }
    if (pillars && pillars.length) {
      tl.from(pillars, { y: 15, opacity: 0, stagger: 0.06, duration: 0.45 }, '-=0.2');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroAnimation);
  } else {
    initHeroAnimation();
  }

  /* ─── 1B. GSAP ScrollTrigger Batch Scroll Reveal ─── */
  const revealElements = document.querySelectorAll('.reveal, .reveal-stagger, .reveal-left, .reveal-right, .card-3d');

  if (prefersReducedMotion) {
    revealElements.forEach((el) => el.classList.add('visible'));
    document.querySelectorAll('.step-connector').forEach((el) => el.classList.add('visible'));
  } else if (hasGSAP && typeof ScrollTrigger !== 'undefined') {
    // GSAP ScrollTrigger hardware-accelerated batches
    ScrollTrigger.batch('.reveal, .card-3d', {
      interval: 0.1,
      batchMax: 6,
      start: 'top 88%',
      once: true,
      onEnter: (batch) => {
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power2.out',
          overwrite: 'auto',
          onComplete: () => {
            batch.forEach((el) => el.classList.add('visible'));
          }
        });
      }
    });

    ScrollTrigger.batch('.reveal-stagger', {
      interval: 0.1,
      batchMax: 8,
      start: 'top 88%',
      once: true,
      onEnter: (batch) => {
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.65,
          stagger: 0.1,
          ease: 'power2.out',
          overwrite: 'auto',
          onComplete: () => {
            batch.forEach((el) => el.classList.add('visible'));
          }
        });
      }
    });

    ScrollTrigger.batch('.reveal-left', {
      start: 'top 88%',
      once: true,
      onEnter: (batch) => {
        gsap.to(batch, {
          opacity: 1,
          x: 0,
          duration: 0.75,
          ease: 'power2.out',
          onComplete: () => batch.forEach((el) => el.classList.add('visible'))
        });
      }
    });

    ScrollTrigger.batch('.reveal-right', {
      start: 'top 88%',
      once: true,
      onEnter: (batch) => {
        gsap.to(batch, {
          opacity: 1,
          x: 0,
          duration: 0.75,
          ease: 'power2.out',
          onComplete: () => batch.forEach((el) => el.classList.add('visible'))
        });
      }
    });
  } else {
    // Native IntersectionObserver Fallback
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    revealElements.forEach((el) => revealObserver.observe(el));
    document.querySelectorAll('.step-connector').forEach((el) => revealObserver.observe(el));
  }

  /* ─── 2. 3-Step Service Process Scroll Progress (GSAP Scrubbed) ─── */
  const initProcessProgress = () => {
    const processSection = document.getElementById('process');
    const stepsContainer = document.getElementById('processStepsList') || (processSection ? processSection.querySelector('.space-y-12') : null);

    if (!processSection || !stepsContainer) return;

    const stepBadges = stepsContainer.querySelectorAll('.step-badge, .process-step-node');
    if (stepBadges.length < 2) return;

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

    if (prefersReducedMotion) {
      if (fill) fill.style.height = '100%';
      stepBadges.forEach((b) => b.classList.add('step-active'));
      return;
    }

    if (hasGSAP && typeof ScrollTrigger !== 'undefined') {
      updateGeometry();
      window.addEventListener('resize', updateGeometry, { passive: true });

      ScrollTrigger.create({
        trigger: processSection,
        start: 'top 75%',
        end: 'bottom 60%',
        scrub: 0.5,
        onUpdate: (self) => {
          if (fill) fill.style.height = `${(self.progress * 100).toFixed(1)}%`;
          stepBadges.forEach((badge, idx) => {
            const threshold = idx === 0 ? 0.05 : (idx / (stepBadges.length - 1)) * 0.95;
            if (self.progress >= threshold) {
              badge.classList.add('step-active');
            } else {
              badge.classList.remove('step-active');
            }
          });
        }
      });
    } else {
      // Intersection/Scroll fallback
      const updateProgressFallback = () => {
        const bFirst = stepBadges[0].getBoundingClientRect();
        const bLast = stepBadges[stepBadges.length - 1].getBoundingClientRect();
        const vh = window.innerHeight;
        const startThreshold = vh * 0.70;
        const endThreshold = vh * 0.45;
        const totalDistance = (bLast.top - bFirst.top) + (startThreshold - endThreshold);
        const scrolled = startThreshold - bFirst.top;
        const progress = Math.max(0, Math.min(1, scrolled / totalDistance));

        if (fill) fill.style.height = `${(progress * 100).toFixed(1)}%`;
        stepBadges.forEach((badge, idx) => {
          const threshold = idx === 0 ? 0.04 : (idx / (stepBadges.length - 1)) * 0.95;
          if (progress >= threshold) badge.classList.add('step-active');
          else badge.classList.remove('step-active');
        });
      };
      window.addEventListener('scroll', updateProgressFallback, { passive: true });
      window.addEventListener('resize', () => { updateGeometry(); updateProgressFallback(); }, { passive: true });
      setTimeout(() => { updateGeometry(); updateProgressFallback(); }, 80);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProcessProgress);
  } else {
    initProcessProgress();
  }

  /* ─── 3. GSAP Smooth Numerical Odometer Counters ────────── */
  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';
    if (isNaN(target)) return;

    if (hasGSAP && !prefersReducedMotion) {
      const counterObj = { value: 0 };
      gsap.to(counterObj, {
        value: target,
        duration: 1.8,
        ease: 'power2.out',
        onUpdate: () => {
          el.textContent = Math.floor(counterObj.value).toLocaleString('en-IN') + suffix;
        }
      });
    } else {
      const duration = 1500;
      const start = performance.now();
      const update = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target).toLocaleString('en-IN') + suffix;
        if (progress < 1) requestAnimationFrame(update);
      };
      requestAnimationFrame(update);
    }
  }

  if (hasGSAP && typeof ScrollTrigger !== 'undefined' && !prefersReducedMotion) {
    ScrollTrigger.batch('[data-target]', {
      start: 'top 90%',
      once: true,
      onEnter: (batch) => {
        batch.forEach((el) => animateCounter(el));
      }
    });
  } else {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    document.querySelectorAll('[data-target]').forEach((el) => counterObserver.observe(el));
  }

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
          if (hasGSAP && typeof ScrollToPlugin !== 'undefined' && !prefersReducedMotion) {
            gsap.to(window, {
              duration: 0.85,
              scrollTo: { y: target, offsetY: 75 },
              ease: 'power3.inOut'
            });
          } else {
            window.scrollTo({
              top: target.offsetTop - 80,
              behavior: 'smooth'
            });
          }
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
        const href = anchor.getAttribute('href');
        if (!href || href === '#') return;
        const targetId = href.slice(1);
        const target = document.getElementById(targetId);
        if (target) {
          e.preventDefault();
          if (hasGSAP && typeof ScrollToPlugin !== 'undefined' && !prefersReducedMotion) {
            gsap.to(window, {
              duration: 0.85,
              scrollTo: { y: target, offsetY: 75 },
              ease: 'power3.inOut'
            });
          } else {
            const targetOffset = target.getBoundingClientRect().top + window.scrollY - 75;
            window.scrollTo({
              top: targetOffset,
              behavior: prefersReducedMotion ? 'auto' : 'smooth'
            });
          }
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

  // On first visit: default to Clean Light Mode
  const initTheme = () => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      applyTheme('dark');
    } else {
      applyTheme('light');
    }
  };

  // Toggle between dark and light
  const toggleTheme = (triggerBtn) => {
    const willBeDark = !document.documentElement.classList.contains('dark');

    // Smooth button spin & spring pop with GSAP
    if (triggerBtn && !prefersReducedMotion) {
      if (hasGSAP) {
        gsap.fromTo(triggerBtn, 
          { rotation: 0, scale: 0.9 }, 
          { rotation: willBeDark ? 360 : -360, scale: 1, duration: 0.45, ease: 'back.out(2)' }
        );
      } else {
        triggerBtn.classList.add('theme-toggle-spin');
        setTimeout(() => triggerBtn.classList.remove('theme-toggle-spin'), 500);
      }
    }

    applyTheme(willBeDark ? 'dark' : 'light');

    // Friendly toast confirmation
    if (window.showToast) {
      window.showToast(
        willBeDark ? '🌙 Dark mode active' : '☀️ Light mode active',
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

/* ─── 7. Global Toast Notification System (GSAP Powered) ─────── */
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
    <div class="flex-1 text-xs sm:text-sm font-semibold">${message}</div>
    <button type="button" class="text-[#B8AA98] hover:text-[#342C27] dark:hover:text-white text-sm font-bold ml-2 cursor-pointer">✕</button>
  `;

  const closeBtn = toast.querySelector('button');
  container.appendChild(toast);

  const hasGSAP = typeof gsap !== 'undefined';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (hasGSAP && !prefersReducedMotion) {
    gsap.fromTo(toast, 
      { y: -25, opacity: 0, scale: 0.92 }, 
      { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.5)' }
    );
  }

  let isDismissed = false;
  const dismiss = () => {
    if (isDismissed) return;
    isDismissed = true;
    if (hasGSAP && !prefersReducedMotion) {
      gsap.to(toast, {
        opacity: 0,
        x: 40,
        scale: 0.95,
        duration: 0.28,
        ease: 'power2.in',
        onComplete: () => toast.remove()
      });
    } else {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 250);
    }
  };

  if (closeBtn) closeBtn.onclick = dismiss;
  setTimeout(dismiss, duration);
};

/* ─── 8. Global Modal Spring Pop Helpers ─────────────────────── */
window.openGsapModal = function(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('hidden');
  const dialogCard = modalEl.querySelector('.bg-white, .bg-\\[\\#FDFBF7\\], .bg-\\[\\#27211D\\], [class*="rounded-3xl"], [class*="rounded-2xl"]');
  if (typeof gsap !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.fromTo(modalEl, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });
    if (dialogCard) {
      gsap.fromTo(dialogCard, 
        { scale: 0.92, y: 20, opacity: 0 }, 
        { scale: 1, y: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.4)' }
      );
    }
  }
};

window.closeGsapModal = function(modalEl) {
  if (!modalEl) return;
  const dialogCard = modalEl.querySelector('.bg-white, .bg-\\[\\#FDFBF7\\], .bg-\\[\\#27211D\\], [class*="rounded-3xl"], [class*="rounded-2xl"]');
  if (typeof gsap !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (dialogCard) {
      gsap.to(dialogCard, { scale: 0.94, y: 15, opacity: 0, duration: 0.2, ease: 'power2.in' });
    }
    gsap.to(modalEl, {
      opacity: 0,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => {
        modalEl.classList.add('hidden');
        gsap.set(modalEl, { clearProps: 'all' });
        if (dialogCard) gsap.set(dialogCard, { clearProps: 'all' });
      }
    });
  } else {
    modalEl.classList.add('hidden');
  }
};

/* ─── 9. Interactive AC Diagnostic Tool ─────────────────── */
const diagnosticData = {
  'no-cooling': {
    badge: 'High Frequency Issue',
    category: 'Category: Refrigerant & Compressor',
    title: 'Insufficient Cooling & Warm Air Discharge',
    desc: 'Usually caused by clogged condenser coils restricting heat exchange, capacitor degradation, or micro-leakage in R32/R410A copper gas lines.',
    time: '45 Minutes',
    price: '₹499 - ₹1,499',
    issueParam: 'No Cooling',
    algoCode: 'Expert Diagnosis: Gas Leakage / Coil Clog',
    algoConf: 'Accuracy: 98% Match',
    algoPriority: 'Priority: High'
  },
  'water-leak': {
    badge: 'Drainage Fault',
    category: 'Category: Drain Line & Deep Cleaning',
    title: 'Indoor Unit Water Dripping / Overflow',
    desc: 'Occurs when dust or algae block the condensate drainage tray or when internal filters are frozen due to restricted airflow.',
    time: '30 Minutes',
    price: '₹399 - ₹799',
    issueParam: 'Water Leaking',
    algoCode: 'Expert Diagnosis: Blocked Condensate Trap',
    algoConf: 'Accuracy: 99% Match',
    algoPriority: 'Priority: Normal'
  },
  'noise': {
    badge: 'Mechanical Vibration',
    category: 'Category: Blower Motor & Fan Bearings',
    title: 'Loud Rattling, Screeching or Vibrations',
    desc: 'Indicates loose motor mounting dampers, worn blower wheel bearings, or minor debris trapped inside the outdoor fan unit.',
    time: '40 Minutes',
    price: '₹499 - ₹1,299',
    issueParam: 'Loud Noise',
    algoCode: 'Expert Diagnosis: Fan Bearing / Damper Wear',
    algoConf: 'Accuracy: 97% Match',
    algoPriority: 'Priority: Normal'
  },
  'power-trip': {
    badge: 'Electrical Safety Alert',
    category: 'Category: Capacitor, Relay & PCB',
    title: 'MCB Circuit Tripping / Power Cut',
    desc: 'Signifies an aged starting capacitor, weak compressor relay, or overloaded electrical wiring drawing excess current.',
    time: '50 Minutes',
    price: '₹699 - ₹1,899',
    issueParam: 'Power Tripping',
    algoCode: 'Expert Diagnosis: Capacitor / Inverter Load',
    algoConf: 'Accuracy: 99% Match',
    algoPriority: 'Priority: Critical Safety'
  },
  'smell': {
    badge: 'Air Quality & Hygiene',
    category: 'Category: Anti-Bacterial Foam Jet Wash',
    title: 'Musty Foul Odor & Mold Discharge',
    desc: 'Microbial buildup on evaporator cooling fins. Resolved by our high-pressure anti-bacterial eco-foam wash.',
    time: '35 Minutes',
    price: '₹499 - ₹899',
    issueParam: 'Foul Smell',
    algoCode: 'Expert Diagnosis: Deep Chemical Wash Required',
    algoConf: 'Accuracy: 98% Match',
    algoPriority: 'Priority: Preventive'
  },
  'gas-wash': {
    badge: 'Pre-Summer Deep Care',
    category: 'Category: Full Jet Cleaning & Gas Top-up',
    title: 'Complete Jet Wash & Refrigerant Boost',
    desc: 'Comprehensive maintenance package including 100% virgin gas top-up, electrical health checks, and 2-step foam jet wash.',
    time: '60 Minutes',
    price: '₹1,299 - ₹2,499',
    issueParam: 'Gas & Wash',
    algoCode: 'MOW-GDM#718 (Full Life-Cycle Optimization)',
    algoConf: '99.0%',
    algoPriority: 'P2-STANDARD'
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
          
          const codeEl = document.getElementById('diagAlgoCode');
          const confEl = document.getElementById('diagAlgoConf');
          const prioEl = document.getElementById('diagAlgoPriority');
          if (codeEl && data.algoCode) codeEl.innerText = data.algoCode;
          if (confEl && data.algoConf) confEl.innerText = data.algoConf;
          if (prioEl && data.algoPriority) prioEl.innerText = data.algoPriority;

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
  const h = banner.offsetHeight || 35;
  if (nav) nav.style.top = h + 'px';
  // Auto-hide banner after 10 seconds
  setTimeout(() => {
    if (typeof window.dismissBanner === 'function') {
      window.dismissBanner();
    }
  }, 10000);
})();

window.dismissBanner = function() {
  const banner = document.getElementById('seasonalBanner');
  if (banner) {
    banner.style.maxHeight = banner.offsetHeight + 'px';
    banner.style.transition = 'max-height 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease';
    requestAnimationFrame(() => {
      banner.style.maxHeight = '0';
      banner.style.opacity = '0';
    });
    setTimeout(() => { banner.style.display = 'none'; }, 550);
  }
  localStorage.setItem('ess_banner_dismissed', Date.now());
  const nav = document.getElementById('mainNav');
  if (nav) {
    nav.style.transition = 'top 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
    nav.style.top = '0';
  }
  document.documentElement.style.setProperty('--banner-height', '0px');
};

/* ─── 14. FAQ Accordion (GSAP Powered) ───────────────────── */
window.toggleFaq = function(triggerBtn) {
  const item = triggerBtn.closest('.faq-item');
  if (!item) return;
  const body = item.querySelector('.faq-body');
  const icon = triggerBtn.querySelector('.faq-icon');
  const isOpen = item.classList.contains('open');
  const hasGSAP = typeof gsap !== 'undefined';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Close all other open items with smooth collapse
  document.querySelectorAll('.faq-item.open').forEach(el => {
    if (el !== item) {
      el.classList.remove('open');
      const otherBody = el.querySelector('.faq-body');
      const otherIcon = el.querySelector('.faq-icon');
      if (hasGSAP && !prefersReducedMotion && otherBody) {
        gsap.to(otherBody, { height: 0, opacity: 0, duration: 0.28, ease: 'power2.out', clearProps: 'height,opacity' });
      }
      if (hasGSAP && !prefersReducedMotion && otherIcon) {
        gsap.to(otherIcon, { rotation: 0, duration: 0.25 });
        otherIcon.textContent = '+';
      } else if (otherIcon) {
        otherIcon.textContent = '+';
      }
    }
  });

  if (isOpen) {
    item.classList.remove('open');
    if (hasGSAP && !prefersReducedMotion && body) {
      gsap.to(body, { height: 0, opacity: 0, duration: 0.28, ease: 'power2.out', clearProps: 'height,opacity' });
    }
    if (hasGSAP && !prefersReducedMotion && icon) {
      gsap.to(icon, { rotation: 0, duration: 0.25 });
      icon.textContent = '+';
    } else if (icon) {
      icon.textContent = '+';
    }
  } else {
    item.classList.add('open');
    if (hasGSAP && !prefersReducedMotion && body) {
      gsap.fromTo(body,
        { height: 0, opacity: 0 },
        { height: 'auto', opacity: 1, duration: 0.35, ease: 'power2.out' }
      );
    }
    if (hasGSAP && !prefersReducedMotion && icon) {
      gsap.to(icon, { rotation: 45, duration: 0.3, ease: 'back.out(1.8)' });
      icon.textContent = '+';
    } else if (icon) {
      icon.textContent = '−';
    }
  }
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
    banner.className = 'fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[9999] bg-[#27211D]/95 backdrop-blur-xl border border-[#B8AA98]/40 text-[#F2EDE3] p-4 sm:p-5 rounded-2xl shadow-2xl transition-all duration-500 transform translate-y-8 opacity-0 flex flex-col gap-3 text-xs';
    banner.innerHTML = `
      <div class="flex items-start gap-3">
        <span class="text-2xl flex-shrink-0">🍪</span>
        <div class="space-y-1">
          <p class="font-bold text-[#F2EDE3] text-sm">Cookie &amp; Service Preferences</p>
          <p class="text-[#B8AA98] text-xs leading-relaxed">
            We use lightweight cookies and session storage to optimize live service dispatch tracking and remember your preferences. Read our <a href="privacy.html" class="text-[#E4C99A] hover:underline font-semibold">Privacy Policy</a>.
          </p>
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 pt-1">
        <button type="button" id="declineCookieBtn" class="px-3.5 py-1.5 rounded-xl border border-[#B8AA98]/40 hover:bg-[#342C27] text-[#B8AA98] hover:text-[#F2EDE3] text-xs font-semibold transition">
          Dismiss
        </button>
        <button type="button" id="acceptCookieBtn" class="bg-[#A05B3A] hover:bg-[#8B4D2F] text-[#F2EDE3] px-4 py-1.5 rounded-xl text-xs font-bold shadow-xs transition">
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

