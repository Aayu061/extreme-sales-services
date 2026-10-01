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
   - All frontend JS files fall back to `window.APP_CONFIG.BACKEND_URL` (`https://extreme-sales-services-gh7s.onrender.com`).
2. **Dual-Mode Persistence Layer**:
   - Production connects to Firestore (`nam5`).
   - If credentials are unavailable, `server.js` gracefully switches to synchronized in-memory arrays (`isFirebaseMode = false`), guaranteeing offline operation.
3. **Firestore `orderBy` Gotcha**:
   - Firestore silently excludes documents if queried with `.orderBy('created_at')` when `created_at` field is missing. All seed scripts and document writes MUST include `created_at: new Date().toISOString()`.
4. **Dynamic `x-technician-id` Binding**:
   - `technician.js` reads `localStorage.getItem('ess_user').id` to pass as `x-technician-id`, falling back to `tech-1`.
   - `server.js` `/api/technician/jobs` includes an open-job fallback so newly created technicians always see available tasks.
5. **Smart AMC Decrement Logic**:
   - `GET /api/amc/check?phone=...` inspects active contracts in real time.
   - When a ticket is submitted via `POST /api/services`, `remaining_services` is decremented atomically in Firestore.

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
