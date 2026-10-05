# Extreme Sales & Services (V2.0)
> **Enterprise HVAC Sales, Servicing, AMC Contract Lifecycle & Real-Time Dispatch System**

Extreme Sales & Services is a comprehensive full-stack enterprise web platform engineered to automate and optimize the end-to-end lifecycle of HVAC sales, installation, recurring maintenance (AMC), field workforce dispatch, and customer tracking.

---

## 🌐 Live Deployments & Infrastructure

| Layer | Platform | Live URL / Endpoint |
|---|---|---|
| **Production Frontend** | **Vercel** (Global Edge CDN) | [https://extreme-sales-services.vercel.app](https://extreme-sales-services.vercel.app) |
| **Production Backend** | **Render** (Node.js Web Service) | [https://extreme-sales-services-gh7s.onrender.com](https://extreme-sales-services-gh7s.onrender.com) |
| **API Health Check** | Render Health Monitoring | [https://extreme-sales-services-gh7s.onrender.com/healthz](https://extreme-sales-services-gh7s.onrender.com/healthz) |
| **Database** | **Google Cloud Firebase Firestore** | Project ID: `extreme-sales-services-8a2b1` (Native Mode) |
| **Source Repository** | **GitHub** | [https://github.com/Aayu061/extreme-sales-services](https://github.com/Aayu061/extreme-sales-services) |

---

## 📚 Project Documentation
Comprehensive Software Engineering (SE) documentation has been generated conforming strictly to IEEE-830 and standard academic/enterprise specifications:

- **Microsoft Word Documentation**: [EXTREME_SALES_SERVICES_DOCUMENTATION.docx](EXTREME_SALES_SERVICES_DOCUMENTATION.docx)  
  *(Contains all 11 sections, styled tables, metadata, and 20 high-resolution architectural diagrams; ready for export to PDF)*
- **Markdown Specification**: [EXTREME_SALES_SERVICES_SE_DOCUMENTATION.md](EXTREME_SALES_SERVICES_SE_DOCUMENTATION.md)  
  *(Complete documentation containing embedded Mermaid diagrams, data flow models, state charts, sequence diagrams, function point calculations, and test cases)*
- **Architectural Diagrams (20 High-Res Assets)**: Located in [docs_assets/](docs_assets/)

---

## 📊 Implementation & Truthfulness Matrix

To maintain strict engineering integrity, all system capabilities are categorized transparently:

| Feature / Module | Status | Technical Reality & Architecture |
|---|---|---|
| **Online Service Booking Engine** | `IMPLEMENTED` | REST endpoint (`POST /api/services`) with Indian phone validation, sanitization, and collision-resistant IDs (`AC-YYYYMMDD-XXXX`). |
| **Atomic AMC Transactions** | `IMPLEMENTED` | Cloud Firestore `db.runTransaction()` atomically checks quota, decrements `remaining_services`, and creates ticket. |
| **Heuristic Dispatch Engine** | `IMPLEMENTED` | Multi-Objective Weighted Greedy Model (35% zone proximity, 30% workload, 20% skill, 15% rating) with real `performance.now()` latency. *Note: Algorithmic heuristic dispatch; not hardware GPS tracking.* |
| **Smart HVAC Diagnostics** | `IMPLEMENTED` | Deterministic rule-based fault tree triage mapping symptoms/sounds to root causes and cost ranges with real measured latency. *Note: Rule-based heuristic; not deep learning ML.* |
| **Executive Business Analytics** | `IMPLEMENTED` | Real 7-day chronological Firestore aggregation calculating actual bookings, completions, and revenue. *Note: Real DB aggregation; zero synthetic mathematical formulas.* |
| **Field Technician Portal & Signatures** | `IMPLEMENTED` | Role-restricted (`technician`) mobile console, high-contrast dark-mode signature canvas, receipt modal, and parts logger. |
| **JWT RBAC & IDOR Protection** | `IMPLEMENTED` | Strictly derives identity from verified JWT claims (`req.user.id`). No client header overrides (`x-technician-id`), no open-job fallback leaks. Fails closed if `JWT_SECRET` missing in prod. |
| **Transactional Email Service** | `IMPLEMENTED` | Non-blocking, asynchronous SendGrid email delivery for booking confirmations and status changes; logs gracefully if `SENDGRID_API_KEY` is omitted. |
| **Milestone Service Tracker** | `IMPLEMENTED` | 4-Stage visual status stepper (`Pending` -> `Assigned` -> `In Progress` -> `Completed`) with Server-Sent Events (SSE). Masked customer PII. *Note: Status-based milestone tracking; not satellite GPS.* |
| **Interactive 3D AC Unit Simulator** | `PLANNED / DEMO` | Three.js interactive visualizer is planned for future releases; currently cost estimator & specs modals serve customer consultation. |

---

## 🚀 Key Features
- **Decoupled Architecture**: High-speed static frontend served on Vercel Edge with zero-CORS reverse-proxy rewrites (`/api/*`) to Render backend API.
- **Online Service Booking Engine**: Direct booking for AC Repair, Servicing, Installation, Gas Refill, and AMC visits.
- **Smart AMC Verification**: Automatically inspects customer phone numbers against active AMC contracts, decrements visit quotas atomically, and tags requests as pre-paid.
- **Dispatcher Command Center (`/staff.html`)**: Ticket triage, lifecycle status filtering, and heuristic algorithmic technician workload balancing.
- **Technician Field Console (`/technician.html`)**: Mobile-friendly job board with diagnostic notes, spare parts logging, and dark-mode safe digital signature capture.
- **Milestone Ticket Tracker (`/status.html`)**: REST and Server-Sent Events (SSE) live progress tracking (`/api/track/live`) with customer data privacy.
- **Resilient Dual-Mode Architecture**: Operates with Google Cloud Firebase Firestore in production or seamlessly switches to a synchronized local memory store for zero-dependency development.
- **SendGrid Email Notifications**: Automated branded HTML email dispatch for booking confirmations and status updates with non-blocking error handling.
- **Executive BI Dashboard (`/admin.html`)**: Real-time revenue analytics, 7-day volume trends, and technician performance metrics powered by Chart.js.

---

## 🔐 Default Portals & Credentials

| Portal | Route | Default Credentials | Role |
|---|---|---|---|
| **Executive Admin** | [/login.html](https://extreme-sales-services.vercel.app/login.html) | `extremess0121@gmail.com` / `ESS@123` | Full Access & Analytics |
| **Staff / Dispatcher** | [/staff.html](https://extreme-sales-services.vercel.app/staff.html) | Login via portal with Staff role | Ticket Triage & Dispatch |
| **Field Technician** | [/technician.html](https://extreme-sales-services.vercel.app/technician.html) | Login via portal with Technician role | Field Jobs & Diagnostics |
| **Customer Tracking** | [/status.html](https://extreme-sales-services.vercel.app/status.html) | Request ID & Phone Number | Live Stepper & Progress Tracking |

---

## 🛠️ Local Development & Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run automated security and functionality tests
npm test

# 3. Run local development server
npm start
# Server starts on http://localhost:5000 in Synchronized Local Mode (or Cloud Mode if firebase-credentials.json exists)
```

### Database Management & Migration Scripts

```bash
# Seed initial Super Admin account into Firestore
npm run seed:admin

# Seed comprehensive users (Admin, Staff, Technicians) & sample tickets
npm run seed:users

# Seed AMC Maintenance Plans into Firestore
npm run seed:amc

# Migrate / seed HVAC product catalog into Firestore
npm run migrate:products

# Full backup of all Firestore collections to JSON
npm run export:all

# Restore / import all Firestore collections from backup
npm run import:all
```

---

