# SYSTEM ARCHITECTURE SPECIFICATION (Architecture.md)
## Extreme Sales & Services (ESS) — Enterprise HVAC Cloud Platform
**Document Version**: 2.1.0  
**Target Environments**: Vercel (Edge CDN) + Render (Node.js API) + Google Cloud Firebase (Firestore)  

---

## 1. High-Level System Architecture

The platform uses a modern, **decoupled jamstack-style architecture**:
- **Presentation & Edge Tier (Vercel)**: High-speed global static asset hosting and client-side JavaScript execution, with an intelligent edge rewrite proxy routing all `/api/*` requests seamlessly to the backend.
- **Microservices Application Tier (Render)**: Containerized Node.js (Express 5.x) REST service responsible for business logic, JWT authentication, RBAC authorization, and ticket lifecycle orchestration.
- **Persistence & Cloud Data Tier (Google Cloud Platform)**: Managed Google Cloud Firebase Firestore in Native Multi-Region Mode (`nam5`), with an in-memory synchronized store fallback for zero-dependency local development.
- **Communications Tier (Twilio SendGrid)**: Asynchronous transactional email dispatch for instant customer booking receipts and technician dispatch notifications.

```mermaid
graph TD
    subgraph Client Tier
        Browser["<<Browser Client>><br>Desktop, Tablet & Mobile Devices"]
    end

    subgraph Edge CDN Layer (Vercel)
        VercelEdge["<<Vercel Global Edge Network>><br>https://extreme-sales-services.vercel.app<br>Static HTML5/CSS3/ES6 Assets<br>Edge Routing & Clean URLs"]
        VercelRewrite["<<Vercel Rewrite Proxy>><br>Path: /api/:match*<br>Zero-CORS Edge Gateway"]
    end

    subgraph Application Service Tier (Render Cloud)
        RenderSvc["<<Render Node.js Web Service>><br>https://extreme-sales-services-gh7s.onrender.com<br>Node.js v20 LTS / Express 5.x<br>Health Check: /healthz"]
        AuthModule["JWT & Bcrypt Auth Middleware<br>(RBAC: Admin, Staff, Tech)"]
        EventStream["Server-Sent Events (SSE)<br>Endpoint: /api/track/live"]
    end

    subgraph Managed Cloud Infrastructure
        Firestore[(Google Cloud Firebase Firestore<br>Project: extreme-sales-services-8a2b1<br>nam5 Native Mode)]
        SendGrid[Twilio SendGrid Cloud API<br>Branded HTML Email Dispatcher]
        GitHub[GitHub Repository & CI/CD<br>Aayu061/extreme-sales-services]
    end

    Browser -->|HTTPS TLS 1.3 / Port 443| VercelEdge
    VercelEdge --> VercelRewrite
    VercelRewrite -->|Transparent Edge Reverse Proxy| RenderSvc
    Browser -.->|Direct Fallback REST / SSE| RenderSvc
    RenderSvc --> AuthModule
    RenderSvc --> EventStream
    RenderSvc -->|gRPC / Google Cloud Admin SDK| Firestore
    RenderSvc -->|HTTPS REST v3| SendGrid
    GitHub -.->|Auto-Deploy Webhook| RenderSvc
    GitHub -.->|Git Integration Deployment| VercelEdge
```

---

## 2. Directory & File Structure

```
Extreme-Sales-Services/
├── .env.example                     # Environment variables template for Render & local dev
├── .firebaserc                      # Firebase active project binding (extreme-sales-services-8a2b1)
├── .gitignore                       # Strict Git protection ignoring credentials, node_modules & logs
├── Architecture.md                  # Comprehensive system flow and topology documentation
├── Design.md                        # Visual design tokens, 3D interactive specs & color palette
├── Memory.md                        # Living AI state, verified endpoints & operational logs
├── package.json                     # Node.js dependencies, metadata and migration scripts
├── package-lock.json                # Locked dependency tree
├── Phases.md                        # Implementation phases and upgrade roadmap
├── PRD.md                           # Project Requirements Document
├── README.md                        # Project overview, quickstart & portal credential tables
├── render.yaml                      # Render Blueprint Infrastructure-as-Code manifest
├── Rules.md                         # AI operating guidelines, constraints & security policies
├── server.js                        # Unified Express 5.x application server & fallback orchestrator
├── vercel.json                      # Vercel deployment manifest with edge reverse proxy rewrites
│
├── public/                          # Static Frontend Tier (Served by Vercel CDN)
│   ├── favicon.svg                  # SVG brand icon
│   ├── index.html                   # 3D Interactive Presentation Homepage & Simulator
│   ├── products.html                # HVAC Marketplace & Refurbished inventory catalog
│   ├── service.html                 # Booking engine with dynamic AMC phone lookup
│   ├── status.html                  # Live GPS stepper & real-time SSE ticket tracker
│   ├── amc.html                     # AMC subscription plans & self-service purchase
│   ├── login.html                   # Universal multi-role portal authentication (1-Click chips)
│   ├── admin.html                   # Executive BI control center & analytics dashboard
│   ├── staff.html                   # Dispatcher operations console & fleet workload balancer
│   ├── technician.html              # Mobile technician console with digital signature pad
│   ├── contact.html                 # Location map, emergency hotline & verified customer reviews
│   │
│   ├── css/
│   │   └── style.css                # Custom glassmorphism, animations, and theme styles
│   │
│   └── js/
│       ├── admin.js                 # Admin dashboard telemetry, product editor & fleet manager
│       ├── amc.js                   # AMC checkout & plan renderer
│       ├── animations.js            # Shared UI animations, counters, and intersection observers
│       ├── charts.js                # Chart.js visualizations (trends, doughnut, workload, pie)
│       ├── config.js                # Centralized client API config (window.APP_CONFIG)
│       ├── login.js                 # Multi-role authentication & JWT session storage
│       ├── products.js              # Marketplace filtering, modal inspection & enquiry handler
│       ├── service.js               # Service booking handler & inline AMC auto-deduction banner
│       ├── staff.js                 # Dispatcher ticket triage & technician assignment logic
│       ├── status.js                # EventSource SSE client, progress stepper, and confetti
│       └── technician.js            # Field technician job board, signature canvas & parts billing
│
├── scripts/                         # Database Migration & Administrative Tooling
│   ├── exportAllData.js             # Full JSON dump of all Firestore collections
│   ├── importAllData.js             # Complete JSON restore of Firestore collections
│   ├── migrateProducts.js           # HVAC catalog seeder with timestamp ordering
│   ├── seedAdmin.js                 # Super Admin credential provisioning script
│   ├── seedAllUsers.js              # Comprehensive seeding of Admin, Staff, Techs & sample jobs
│   └── seedAmcPlans.js              # Seeding for Eco Saver, Comfort Standard & Elite Ultimate plans
│
└── server/                          # Modular Backend Services & Middleware
    ├── middleware/
    │   ├── authMiddleware.js        # Strict JWT verification, fail-closed production check, RBAC
    │   └── security.js              # Rate limiters, validators, collision-resistant IDs, state machine
    └── services/
        ├── diagnosticsEngine.js     # Rule-based HVAC fault tree triage with performance.now() latency
        ├── dispatchEngine.js        # Heuristic multi-objective greedy dispatch with performance.now()
        └── emailService.js          # SendGrid transactional email generator with non-blocking error handling
```

---

## 3. Data Flow & Communication Topology

### 3.1 Service Booking & Smart AMC Verification Data Flow
1. **User Action**: Customer completes form on `service.html` and enters their 10-digit phone number.
2. **Dynamic Check**: `service.js` fires asynchronous `GET /api/amc/check?phone=<phone>`.
3. **Firestore Inspection**: Backend queries `customer_amc` where `phone == <phone>` and `status == 'Active'`.
4. **Client Render**: If active and `remaining_services > 0`, UI presents green delight banner indicating 100% free AMC coverage.
5. **Atomic Firestore Transaction**: On booking submit (`POST /api/services`), backend executes an atomic `db.runTransaction()`:
   - Reads current active AMC contract.
   - Decrements `remaining_services` by 1.
   - Creates new ticket in `service_requests` with collision-resistant ID (`AC-YYYYMMDD-XXXX`).
   - If anything fails, all mutations roll back.
   - Initiates asynchronous non-blocking SendGrid confirmation email.

### 3.2 Dispatch & Field Technician Flow
1. **Ticket Creation**: Ticket is tagged as `status: 'Pending'`.
2. **Heuristic Dispatcher Assignment**: Coordinator on `staff.html` or `admin.html` assigns technician directly or via the Heuristic Dispatch Engine (`PATCH /api/admin/assign-technician`).
3. **Status Progression**: Status changes to `'Assigned'`.
4. **Field On-Site Action**: Technician on `technician.html` authenticates via JWT and accesses strictly their assigned jobs (`GET /api/technician/jobs`), updates status to `'In Progress'`, logs replacement parts, captures customer signature on high-contrast canvas, and marks `'Completed'`.
5. **Customer Real-Time Stream**: Customer's active `status.html` receives SSE updates on `/api/track/live` without exposing sensitive customer PII.

---

## 4. Security & Authentication Architecture
- **Least-Privilege Firestore Rules**: Direct client reads and writes are blocked for sensitive collections (`users`, `service_requests`, `customer_amc`, `enquiries`). Only read-only catalog data is public.
- **Fail-Closed JWT Authentication**: Production rejects missing `JWT_SECRET` with an immediate server error; zero hardcoded fallback secrets.
- **Role-Based Access Control (RBAC)**: Authoritative middleware (`requireAuth`, `requireRole('admin')`, `requireRole('staff')`, `requireRole('technician')`).
- **Zero IDOR Vulnerabilities**: Technician endpoints derive user identity strictly from `req.user.id`; client-provided identity headers are discarded.
- **State Machine Integrity**: Ticket status changes must follow legal transitions (`Pending` -> `Assigned` -> `In Progress` -> `Completed`).
- **Input Sanitization & Validation**: Validation of phone, email, text length, and numeric inputs; global HTML entity escaping (`escapeHtml()`) prevents stored and DOM-based XSS.
- **Sliding-Window Rate Limiting**: Production protections on auth, bookings, enquiries, feedback, and diagnostics.
- **Zero Secrets in Version Control**: `.env` and `firebase-credentials.json` are strictly excluded via `.gitignore`.

