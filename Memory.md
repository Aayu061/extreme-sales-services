# LIVING AGENT MEMORY & ACTIVE CONTEXT (Memory.md)
## Extreme Sales & Services (ESS) — State of Implementation
**Last Synchronized**: October 1, 2026  
**Active Production URL**: [https://extreme-sales-services.vercel.app](https://extreme-sales-services.vercel.app)  
**Backend API URL**: [https://extreme-sales-services-gh7s.onrender.com](https://extreme-sales-services-gh7s.onrender.com)  
**GitHub Repository**: [https://github.com/Aayu061/extreme-sales-services](https://github.com/Aayu061/extreme-sales-services)  
**Firebase Project**: `extreme-sales-services-8a2b1` (nam5 Native Mode)  

---

## 1. Verified Live Portals & Access Credentials

| Role | Portal Link | Email | Password | Access Level |
|---|---|---|---|---|
| **Super Admin** | [/login.html](https://extreme-sales-services.vercel.app/login.html) | `extremess0121@gmail.com` | `ESS@123` | Full Access & Firestore Master |
| **Admin (Demo)**| [/login.html](https://extreme-sales-services.vercel.app/login.html) | `admin@extremess.com` | `admin123` | Quick-Fill Demo Admin |
| **Staff Dispatcher** | [/staff.html](https://extreme-sales-services.vercel.app/staff.html) | `staff@extremess.com` | `staff123` | Ticket Triage & Fleet Assignment |
| **Field Technician** | [/technician.html](https://extreme-sales-services.vercel.app/technician.html) | `tech@extremess.com` | `tech123` | Mobile Job Board & Diagnostic Notes |
| **Customer Tracking**| [/status.html](https://extreme-sales-services.vercel.app/status.html) | Request: `AC-1001` | Phone: `9876543210` | Real-time GPS Stepper & Review Widget |

---

## 2. Infrastructure Architecture & Critical Gotchas

1. **Decoupled Vercel-Render Reverse Proxy**:
   - `vercel.json` maps `/api/:match*` -> `https://extreme-sales-services-gh7s.onrender.com/api/:match*`.
   - Frontend `public/js/config.js` sets `BACKEND_URL: ''` in production to leverage the Vercel edge proxy, and `http://localhost:5000` for local dev.
2. **Dual-Mode Persistence Layer**:
   - Production connects to Firestore (`nam5`) via Firebase Admin SDK with least-privilege `firestore.rules`.
   - If credentials are unavailable, `server.js` gracefully switches to synchronized in-memory arrays (`isFirebaseMode = false`), guaranteeing offline operation.
3. **Firestore `orderBy` Gotcha**:
   - Firestore silently excludes documents if queried with `.orderBy('created_at')` when `created_at` field is missing. All seed scripts and document writes MUST include `created_at: new Date().toISOString()`.
4. **JWT-Authoritative Technician Isolation (P0 IDOR Fixed)**:
   - Client-provided `x-technician-id` headers are strictly ignored.
   - Identity is derived exclusively from the verified JWT payload (`req.user.id`).
   - Technicians strictly access only their own assigned tickets; no arbitrary jobs or open-job fallback leaks.
5. **Atomic Firestore AMC Decrement Transaction**:
   - `GET /api/amc/check?phone=...` inspects active contracts in real time.
   - When a ticket is submitted via `POST /api/services`, ticket creation and `remaining_services` decrement execute inside an atomic Firestore `db.runTransaction()`, guaranteeing zero quota loss or race-condition over-consumption.
6. **Algorithmic Heuristics & Truthfulness**:
   - Dispatch uses a deterministic Multi-Objective Weighted Greedy Model (Mumbai zones, workload, skills, rating) with measured `performance.now()` latency (no hardware GPS tracking).
   - Diagnostics uses rule-based HVAC fault tree triage with measured latency.
   - Analytics aggregates real chronological Firestore records (no synthetic modulo numbers).

---

## 3. Database Collections Matrix
- `users`: Accounts with `role` (`admin`, `staff`, `technician`) and `password_hash` (`bcryptjs`).
- `products`: 18 HVAC units (categories: `new_ac`, `used_ac`, `commercial`).
- `amc_plans`: 3 tiers (`Eco Saver`, `Comfort Standard`, `Elite Ultimate`).
- `customer_amc`: Active & pending AMC subscriptions with `remaining_services`.
- `service_requests`: Ticket lifecycle (`Pending` -> `Assigned` -> `In Progress` -> `Completed`).
- `enquiries`: Customer purchase/consultation requests.
- `feedback`: Verified 1–5 star customer reviews and comments.

---

## 4. Current Workstream & Implementation Status
- [x] Phase 1: AI Engineering Markdown System (`PRD.md`, `Architecture.md`, `Rules.md`, `Phases.md`, `Design.md`, `Memory.md`).
- [x] Phase 2: Instant HVAC Service Cost & Quote Estimator (`public/js/costEstimator.js`) on `index.html`.
- [x] Phase 3: Field Technician Console Upgrades with Live Spare Parts Billing, HTML5 Digital Signature Pad, and Tax Invoice Receipt Modal (`public/js/technician.js`, `public/technician.html`).
- [x] Phase 4: Executive Admin & Analytics Portal with HVAC Profit Margin & Unit Economics Simulator, Technician Performance Leaderboard, Service Demand Breakdown, and Fleet CSV Export (`public/js/admin.js`, `public/admin.html`).
- [x] Phase 5: Customer Booking & Quote Integration with Auto-Prefill from Estimator to Booking Form, Real-Time AMC Delight Auto-Lookup, and 1-Click GPS Status Tracking (`public/js/service.js`, `public/service.html`, `public/status.html`).
- [x] Phase 6: Code Quality, Verification, Deployment Sync, and Presentation Readiness.
- [x] Phase 7: Restrained, Polished Scroll-Animation System (`public/css/style.css`, `public/js/animations.js`, `public/js/costEstimator.js`, `public/index.html`):
  - Subtle fade & upward reveal (`translateY(18px)`, `cubic-bezier(0.22, 1, 0.36, 1)`) with 50ms stagger on related cards; single-trigger via unobserving `IntersectionObserver`.
  - Non-hijacking scroll-linked vertical progress line through the "3 Simple Steps" process section on both mobile and desktop with active node illumination.
  - Smooth 240ms numerical count & crossfade for Instant HVAC Cost Estimator selections with tabular figures (`tabular-nums`) to prevent layout shifts.
  - Sticky navbar scroll-spy with active section highlighting across homepage sections and smooth anchor scrolling.
  - Full `@media (prefers-reduced-motion: reduce)` accessibility coverage across CSS and JS.
- [x] Phase 8: Advanced Algorithmic Intelligence & Interactive Frontend UI/UX HUD Systems:
  - Backend Predictive Diagnostics Upgrade: Multi-symptom token scoring, Failure Mode & Effects Analysis (FMEA) Risk Priority Number (RPN) model, Weibull-inspired equipment degradation curve, and seasonal climate factors (`server/services/diagnosticsEngine.js`).
  - Backend Fleet Dispatch Upgrade: Haversine geodesic routing, dynamic emergency SLA urgency coefficient boosting, and queuing fatigue balancing (`server/services/dispatchEngine.js`).
  - Backend Dynamic Pricing & AMC Lifecycle ROI Engine: Multi-attribute quote calculation with high-rise elevation safety surcharge and thermodynamic annual energy & breakdown savings model (`server/services/pricingEngine.js`, `POST /api/pricing/calculate`, `GET /api/pricing/amc-roi`).
  - Frontend Interactive Diagnostics HUD: Instant root-cause inference, FMEA risk meter, genuine OEM spare pricing, and direct 1-click pre-filled booking integration (`public/index.html`, `public/js/diagnosticsWidget.js`, `public/js/service.js`).
  - Frontend AMC Energy & Financial ROI Calculator: Real-time unit count and operating hours slider calculating kWh savings, net money saved, and ROI % (`public/amc.html`, `public/js/amc.js`).
  - Frontend Field Diagnostics Guide: Quick reference modal with step-by-step multimeter test procedures and target refrigerant pressure telemetry (`public/technician.html`, `public/js/technician.js`).
  - 100% Green Automated Verification: 33 out of 33 unit and algorithmic tests passing (`test/security_verification.test.js`, `test/algorithms.test.js`).


