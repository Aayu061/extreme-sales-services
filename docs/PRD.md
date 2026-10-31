# PROJECT REQUIREMENTS DOCUMENT (PRD)
## Extreme Sales & Services (ESS) — Enterprise HVAC Suite & Dispatch Platform
**Public Live Production URL**: [https://extreme-sales-services.vercel.app](https://extreme-sales-services.vercel.app)  
**Backend API Service**: [https://extreme-sales-services-gh7s.onrender.com](https://extreme-sales-services-gh7s.onrender.com)  
**Version**: 2.1.0  
**Target Delivery**: College Capstone & Enterprise Evaluation Release  

---

## 1. Executive Summary & Problem Statement
### 1.1 The Industry Problem
In the residential and commercial HVAC (Heating, Ventilation, and Air Conditioning) maintenance sector, service providers encounter significant operational bottlenecks:
- **Opaque Customer Experience**: Customers have zero visibility into technician dispatch schedules, arrival times, and transparent pricing.
- **Disconnected AMC Contract Tracking**: Annual Maintenance Contracts (AMCs) are traditionally tracked on spreadsheets or paper ledgers, resulting in lost visit quotas, uncollected renewal revenues, and disputed billings.
- **Fragmented Field Dispatch**: Dispatch coordinators manually assign service calls via telephone, leading to uneven technician workloads, delayed emergency response times, and unrecorded spare parts usage.
- **Lack of Centralized Sales & Refurbished Marketplace**: Dealers lack an integrated storefront to showcase both brand-new HVAC inventory and certified refurbished inventory with clear warranty terms.

### 1.2 The Solution: Extreme Sales & Services
Extreme Sales & Services is a unified, cloud-native enterprise HVAC management system delivering:
1. A modern, Bose-inspired interactive public portal for consumers to browse products, calculate servicing costs, purchase AMC tiers, and book certified technicians.
2. A transparent milestone customer tracking interface with 4-stage progress steppers and Server-Sent Events (SSE).
3. A mobile-first field technician console with digital signature capture, spare parts logging, and instant on-site bill calculation.
4. A centralized dispatcher control desk for triage, live workload balancing, and heuristic algorithmic technician assignment.
5. An executive BI analytics dashboard with real 7-day chronological Firestore trends, technician performance leaderboards, and automated synchronization.

---

## 2. Target User Personas & User Journeys

| Persona | Role | Core Goals | Primary Touchpoint |
|---|---|---|---|
| **P1: Homeowner / Client** | Customer | Book fast AC repairs, verify AMC coverage, track field technician progress, purchase certified ACs. | `index.html`, `service.html`, `status.html`, `products.html`, `amc.html` |
| **P2: Field Service Engineer** | Technician | View assigned daily tickets, navigate to site, log replacement parts, capture customer signature, close tickets. | `technician.html` |
| **P3: Operations Coordinator** | Staff Dispatcher | Triage unassigned tickets, balance fleet workload, assign specialists, monitor response SLA. | `staff.html` |
| **P4: Business Owner / Admin** | Executive Admin | Monitor daily revenue, review technician metrics, manage inventory, activate AMC contracts, export reports. | `admin.html`, `login.html` |

---

## 3. Core Feature Matrix & Requirements

### 3.1 Presentation Homepage & Instant Tools (`index.html`)
- **Interactive 3D AC Unit Simulator [Planned Specification]**: Interactive 3D AC visualizer (designed for Three.js / Canvas) planned for future 3D model integration. The current system provides comprehensive technical specs and cost estimation.
- **Interactive Cost Estimator [Implemented]**: Dynamic HVAC Service Cost Estimator allowing customers to select AC Type (Split / Window / Inverter / Cassette), Tonnage (1.0T, 1.5T, 2.0T), and Problem Type to see instant estimated quotes and AMC savings.
- **Pincode Serviceability Check [Implemented]**: Coverage checker validating service across Mumbai, Navi Mumbai, and Thane metropolitan areas.
- **Emergency Breakdown Hotline & Floating Booking Bar [Implemented]**: Quick-action booking triggers.

### 3.2 Customer Booking Engine & Smart AMC Verification (`service.html`)
- **Direct Service Booking**: Comprehensive form capturing Customer Name, Phone, Address, Email, AC Type, Preferred Slot, and Issue Notes with backend validation and rate limiting.
- **Real-Time AMC Auto-Lookup (`GET /api/amc/check`)**: As the customer inputs their 10-digit phone number, client dynamically checks active subscriptions in Firestore:
  - If active: Renders green delight banner showing plan tier, remaining free visits, and tags ticket as `[✅ AMC Covered]`.
  - Quota is decremented atomically inside a Firestore `db.runTransaction()` during `POST /api/services`.
  - If inactive: Renders standard transparent pricing.
- **Success Modal with Direct Live Tracker Link**: Generates unique, collision-resistant tracking code (`AC-YYYYMMDD-XXXX`) and direct navigation button into `status.html?id=AC-YYYYMMDD-XXXX&phone=...`.
- **SendGrid Email Confirmation**: Asynchronous dispatch of branded confirmation email with direct tracking link (non-blocking).

### 3.3 Milestone Service Stepper Tracker (`status.html`)
- **Unified Ticket Query**: Lookup via Request ID (`AC-YYYYMMDD-XXXX` or legacy `AC-XXXX`), Phone Number, or both.
- **4-Stage Visual Stepper**: Pending (Received) -> Assigned (Tech Dispatched) -> In Progress (On-Site Diagnostics) -> Completed (Done).
- **Live SSE EventStream (`/api/track/live`)**: Dynamic browser updates without manual page refresh.
- **Customer Privacy Protection**: Masks customer contact details and residential address from unauthenticated queries.
- **Confetti & Customer Review Widget**: Triggers celebratory animation upon completion and invites verified rating submission directly into `/api/feedback`.

### 3.4 Products Marketplace & Enquiry Engine (`products.html`)
- **Dual Catalog**: Brand new inverter air conditioners and certified refurbished/used units.
- **Real-Time Client Filtering**: Category filter (New AC, Used AC, Commercial), price sort, and live search.
- **Detailed Specifications Modal**: SEER ratings, copper condenser details, warranty duration, and stock availability.
- **Direct Purchase / Price Quote Enquiry**: Submits consultation request directly into `enquiries` collection.

### 3.5 AMC Contract Lifecycle & Self-Service Portal (`amc.html`)
- **Tiered AMC Plans**:
  1. *Eco Saver Plan* (₹1,200/yr — 2 Jet washes, pressure diagnostics, 10% off parts).
  2. *Comfort Standard Plan* (₹2,400/yr — 3 Deep cleans, free breakdown visits, 20% off gas).
  3. *Elite Ultimate Plan* (₹4,500/yr — 4 Quarterly washes, fully covered gas top-up, priority response).
- **Digital Plan Purchase Form**: Direct subscription registration with immediate coordinator callback trigger.

### 3.6 Field Technician Mobile Console (`technician.html`)
- **Mobile-First Job Cards**: Displays assigned client address, contact phone with 1-click dialer, service type, and issue notes.
- **Status Workflow Controller**: One-tap progression from Assigned -> In Progress -> Completed.
- **Digital Customer Signature Pad**: HTML5 canvas allowing the customer to sign on the technician's screen upon job completion.
- **Spare Parts & Diagnostics Logger**: Dynamic parts picker (Capacitor, Gas Refill, Copper Brazing, Contactor Relay) calculating total bill with GST.
- **Printable Service Receipt Modal**: Immediate digital job sheet view.

### 3.7 Staff Dispatcher Workspace (`staff.html`)
- **Ticket Triage Desk**: Real-time listing of all incoming service requests with search and status filtering.
- **Heuristic Algorithmic Dispatch Engine**: Evaluates available technicians using a multi-objective greedy algorithm (35% zone proximity, 30% workload, 20% skill, 15% rating) with real measured execution latency (`performance.now()`).
- **Live Technician Fleet Balancing**: Technician selector displaying active workloads and availability status.
- **Enquiry Manager**: Customer price quotation and consultation tracker.

### 3.8 Executive BI Dashboard (`admin.html`)
- **Real Chronological Chart.js Visualizations**:
  - 7-Day Booking vs Completion Trends (aggregated directly from actual Firestore ticket timestamps).
  - Live Status Breakdown Doughnut Chart.
  - Technician Workload & Performance Bar Chart.
  - Service Type Distribution Pie Chart.
- **Inventory & Catalog Manager**: Add, edit, update stock, and delete marketplace products.
- **AMC Contract Activator**: One-click approval activating customer contracts for 365 days.
- **Fleet Technician User Management**: Register new technicians and staff members with hashed credentials (minimum 8 characters; default passwords rejected).
- **CSV Data Export**: One-click download of all fleet tickets and revenue metrics.

---

## 4. Real-World Business Rules & Logic
1. **Atomic AMC Quota Decrement**: When an active subscriber books a service, `remaining_services` is decremented by 1 within a Firestore transaction, guaranteeing no race conditions or lost quota, and the billable service charge is set to ₹0.
2. **Technician Workload Cap**: A technician with 4 or more active jobs (`Assigned` or `In Progress`) displays a yellow high-load indicator to prevent dispatcher overburdening.
3. **Fail-Closed Authentication & JWT RBAC**: Production enforces JWT verification against Firestore bcrypt hashes; missing `JWT_SECRET` in production causes a fail-closed crash rather than falling back to an insecure default secret.
4. **Technician Isolation (Zero IDOR)**: Technicians strictly access only their own assigned tickets as determined by their verified JWT claims.
5. **Zero-CORS Edge Routing**: Static assets on Vercel proxy `/api/*` seamlessly to Render, eliminating browser cross-origin policy complications.
