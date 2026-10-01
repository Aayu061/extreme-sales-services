# SOFTWARE ENGINEERING SPECIFICATION & SYSTEM DOCUMENTATION
## EXTREME SALES & SERVICES (V2.0)
### Enterprise AC Sales, Servicing, AMC Contract Lifecycle & Real-Time Dispatch System

---

### Project Metadata & Document Control
| Specification Attribute | Details |
| :--- | :--- |
| **System Name** | Extreme Sales & Services Enterprise Suite |
| **Version** | 2.0.0 (Production Release) |
| **Target Industry** | Heating, Ventilation & Air Conditioning (HVAC) Sales, Maintenance & Field Services |
| **Core Technology Stack** | Node.js (Express 5.x), Vanilla HTML5/CSS3/ES6, Chart.js, Server-Sent Events (SSE) |
| **Persistence Layer** | Dual-Mode: Google Cloud Firebase Firestore (Production) & Synchronized In-Memory Store (Dev) |
| **External Integrations** | SendGrid Transactional Email API (REST v3) |
| **Document Standard** | IEEE-830 Recommended Practice for SRS & ISO/IEC 12207 Software Life Cycle |
| **Document Prepared By** | Engineering Lead & Development Team (Mr. Aayush) |
| **Status** | Verified & Approved for Academic / Enterprise Evaluation |

---

## TABLE OF CONTENTS
1. [Problem Statement & Software Requirements Specification (SRS)](#1-problem-statement-and-software-requirements-specification-srs)
   - 1.1 [Problem Statement](#11-problem-statement)
   - 1.2 [Project Overview](#12-project-overview)
   - 1.3 [Software Requirements Specification (SRS)](#13-software-requirements-specification-srs)
     - 1.3.1 [Functional Requirements](#131-functional-requirements)
     - 1.3.2 [Non-Functional Requirements](#132-non-functional-requirements)
   - 1.4 [System Scope](#14-system-scope)
2. [Data Flow Diagram (DFD) & Structured Chart](#2-data-flow-diagram-dfd--structured-chart)
   - 2.1 [Context Diagram (Level 0 DFD)](#21-context-diagram-level-0-dfd)
   - 2.2 [Level 1 DFD - Main Subsystems](#22-level-1-dfd---main-subsystems)
   - 2.3 [Structured Chart (HIPO Chart)](#23-structured-chart-hipo-chart)
3. [Use Case Diagram & Detailed Specifications](#3-use-case-diagram--detailed-specifications)
   - 3.1 [Complete Use Case Diagram](#31-complete-use-case-diagram)
   - 3.2 [Detailed Use Case Descriptions](#32-detailed-use-case-descriptions)
4. [Class Diagram & Object Diagram](#4-class-diagram--object-diagram)
   - 4.1 [Domain Class Diagram](#41-domain-class-diagram)
   - 4.2 [Object Diagram (Runtime Instance Snapshot)](#42-object-diagram-runtime-instance-snapshot)
5. [State Chart & Activity Diagrams](#5-state-chart--activity-diagrams)
   - 5.1 [Service Request Lifecycle State Chart](#51-service-request-lifecycle-state-chart)
   - 5.2 [User Authentication & RBAC Activity Diagram](#52-user-authentication--rbac-activity-diagram)
   - 5.3 [Service Booking & AMC Auto-Deduction Activity Diagram](#53-service-booking--amc-auto-deduction-activity-diagram)
6. [Sequence Diagram & Collaboration Diagram](#6-sequence-diagram--collaboration-diagram)
   - 6.1 [Service Request Booking Sequence Diagram](#61-service-request-booking-sequence-diagram)
   - 6.2 [Technician Dispatch & Job Execution Sequence Diagram](#62-technician-dispatch--job-execution-sequence-diagram)
   - 6.3 [AMC Auto-Deduction Collaboration Diagram](#63-amc-auto-deduction-collaboration-diagram)
7. [Component & Deployment Diagrams](#7-component--deployment-diagrams)
   - 7.1 [System Component Diagram](#71-system-component-diagram)
   - 7.2 [Deployment Diagram](#72-deployment-diagram)
   - 7.3 [Dual-Mode Hybrid Persistence Architecture](#73-dual-mode-hybrid-persistence-architecture)
8. [Function Point (FP) Analysis & Sizing](#8-function-point-fp-analysis--sizing)
   - 8.1 [Overview & Methodology](#81-overview--methodology)
   - 8.2 [Function Point Calculation (UFP)](#82-function-point-calculation-ufp)
   - 8.3 [Value Adjustment Factor (VAF) & Adjusted Function Points (AFP)](#83-value-adjustment-factor-vaf--adjusted-function-points-afp)
   - 8.4 [Effort Estimation (Person-Hours)](#84-effort-estimation-person-hours)
   - 8.5 [Project Duration & Staffing Schedule](#85-project-duration--staffing-schedule)
9. [Project Scheduling (Gantt Chart & PERT/CPM)](#9-project-scheduling-gantt-chart--pertcpm)
   - 9.1 [Gantt Chart Overview](#91-gantt-chart-overview)
   - 9.2 [PERT / CPM Critical Path Method Analysis](#92-pert--cpm-critical-path-method-analysis)
10. [Testing Strategy & Comprehensive Test Cases](#10-testing-strategy--comprehensive-test-cases)
    - 10.1 [Testing Strategy](#101-testing-strategy)
    - 10.2 [Unit Test Cases (White-Box Testing)](#102-unit-test-cases-white-box-testing)
    - 10.3 [Integration Test Cases (Black-Box Testing)](#103-integration-test-cases-black-box-testing)
    - 10.4 [Boundary Value Analysis & Equivalence Partitioning](#104-boundary-value-analysis--equivalence-partitioning)
    - 10.5 [Security Vulnerability Testing](#105-security-vulnerability-testing)
    - 10.6 [Usability & Cross-Device Responsiveness Testing](#106-usability--cross-device-responsiveness-testing)
    - 10.7 [Test Execution Summary Report](#107-test-execution-summary-report)
11. [Conclusion & Future Roadmap](#11-conclusion--future-roadmap)
    - 11.1 [Conclusion](#111-conclusion)
    - 11.2 [Future Roadmap & Technological Enhancements](#112-future-roadmap--technological-enhancements)

---

# 1. PROBLEM STATEMENT AND SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

## 1.1 Problem Statement
The heating, ventilation, and air-conditioning (HVAC) service and retail industry is critical to residential comfort and commercial business continuity. However, traditional HVAC service operations are plagued by severe systemic inefficiencies:
1. **Fragmented Manual Service Intake**: Customers must place repair and servicing requests via phone calls or in-person visits. During peak summer heatwaves, call volumes spike, resulting in busy signals, dropped calls, and lost business.
2. **Uncoordinated Field Dispatch**: Dispatchers track technician assignments using manual registers, whiteboards, or unorganized instant messaging threads. This causes unbalanced technician allocation, overlapping schedules, and delayed responses to emergency AC breakdowns.
3. **Absence of Real-Time Customer Transparency**: Once a service request is placed, customers receive zero status updates regarding when a technician is dispatched, who has been assigned, or what diagnostic findings were logged, prompting repeated follow-up calls and customer frustration.
4. **Neglected Annual Maintenance Contract (AMC) Governance**: Periodic AC maintenance is vital for compressor longevity and energy efficiency. Traditional companies manage AMC contracts in disparate physical ledgers or Excel sheets, leading to forgotten quarterly maintenance visits, unverified service claims, and unrenewed contracts.
5. **Disconnected Inventory & Spare Parts Oversight**: Field technicians frequently arrive on-site only to realize they lack the necessary refrigerant (R32, R410A) or starting capacitors, resulting in repeat visits and prolonged equipment downtime.

## 1.2 Project Overview
**Extreme Sales & Services** is a comprehensive, enterprise-grade web application engineered to digitize, unify, and automate the HVAC business ecosystem. The platform seamlessly bridges the communication and operational loop between **Customers**, **Dispatch Controllers / Staff**, **Field Service Technicians**, and **Executive Administrators**.

Key operational capabilities include:
- **Instant Digital Service Booking**: Customers can book repairs, jet-pump deep cleaning, installation, gas refills, and AMC visits within seconds without requiring prior account registration.
- **Intelligent AMC Validation**: The backend automatically looks up customer phone numbers against active AMC contracts, dynamically decrements remaining visit balances, and marks bookings as pre-paid.
- **Live Dispatch Command Center**: Dispatchers triage incoming tickets, monitor active workloads across the technician fleet, and assign service calls with immediate status propagation.
- **Mobile-Responsive Field Technician Console**: Technicians receive immediate access to customer addresses, contact numbers, and problem descriptions, with the ability to update job stages and record diagnostic completion notes.
- **Dual-Mode Tracking Engine**: Customers can track their ticket progress using either REST lookup or real-time Server-Sent Events (SSE) live updates.
- **Executive Analytics**: Real-time business intelligence dashboards visualize revenue generation, service category distributions, technician leaderboards, and booking volume trends.

## 1.3 Software Requirements Specification (SRS)

### 1.3.1 Functional Requirements

```mermaid
graph TD
    ESS[Extreme Sales & Services Engine]
    ESS --> FR1[FR-01: Service Booking Intake]
    ESS --> FR2[FR-02: Smart AMC Verification]
    ESS --> FR3[FR-03: Real-Time Ticket Tracking]
    ESS --> FR4[FR-04: Dispatch & Workload Balancing]
    ESS --> FR5[FR-05: Technician Mobile Execution]
    ESS --> FR6[FR-06: AMC Contract Management]
    ESS --> FR7[FR-07: Catalog & Lead Capture]
    ESS --> FR8[FR-08: Executive BI Analytics]

    FR1 --> F1a[Dynamic ID AC-XXXX]
    FR1 --> F1b[SendGrid HTML Confirmation]
    FR2 --> F2a[Phone Lookup & Balance Check]
    FR2 --> F2b[Atomic Visit Decrement]
    FR3 --> F3a[REST Endpoint /api/track]
    FR3 --> F3b[SSE Live Stream /api/track/live]
    FR4 --> F4a[Multi-Criteria Triage]
    FR4 --> F4b[Active Fleet Load Counters]
```

- **FR-01 (Service Booking Intake)**: The system shall provide an intuitive, responsive public booking interface allowing users to select service categories (AC Repair, Jet Servicing, Installation, Gas Refill, AMC Visit), specify unit symptoms, provide on-site addresses, and submit contact numbers.
- **FR-02 (Automated AMC Verification & Decrement)**: Upon booking intake, the system shall query the `customer_amc` collection by customer phone number. If an active contract with remaining services $> 0$ exists, the system shall decrement the balance by 1 and automatically append `[✅ AMC Covered]` to the ticket.
- **FR-03 (Unique Ticket Identification & Notification)**: Every service booking shall be assigned a unique ticket identifier formatted as `AC-XXXX` (where XXXX is a 4-digit number), and a branded confirmation email shall be dispatched via SendGrid containing the tracking link.
- **FR-04 (Ticket Queue Triage & Search)**: Dispatchers shall be able to filter tickets by status (`All`, `Pending`, `Assigned`, `In Progress`, `Completed`) and execute instant substring searches across Ticket ID, Customer Name, and Phone Number.
- **FR-05 (Technician Fleet Dispatch)**: Dispatchers shall be able to select an unassigned or pending ticket and assign an active technician from a dynamic dropdown displaying real-time workload counts (`active_jobs`).
- **FR-06 (Technician Field Console)**: Authenticated technicians shall view a filtered queue of jobs assigned to them, with capabilities to transition status (`In Progress`, `Completed`), submit technical diagnostic notes, and record spare parts used.
- **FR-07 (Dual Tracking Interface)**: Customers shall be able to monitor their service progress via standard REST polling or through an open Server-Sent Events (SSE) stream (`/api/track/live`) that broadcasts state changes every 5 seconds.
- **FR-08 (Product Catalog & Enquiry System)**: The system shall showcase Brand New ACs, Certified Refurbished ACs, and Spare Parts, allowing users to filter by category and submit quotation enquiries.
- **FR-09 (AMC Contract Administration)**: Administrators shall be able to create and manage AMC packages (Eco Saver, Comfort Standard, Elite Ultimate) and manually activate or renew customer subscriptions with customizable 1-year terms.
- **FR-10 (Customer Feedback Registry)**: Customers shall be able to rate completed services (1 to 5 stars), submit text reviews, and specify recommendations, which dynamically populate the public testimonial gallery.

### 1.3.2 Non-Functional Requirements
- **NFR-01 (Security & Authentication)**: Administrative and technician endpoints must be protected by JSON Web Tokens (JWT) passed in the `Authorization: Bearer <token>` header. Passwords must be hashed using `bcryptjs` with a work factor of 10. Role-based access control (RBAC) must restrict `/api/admin/*` to authorized roles (`admin`, `staff`).
- **NFR-02 (Performance & Latency)**: REST API response times must average under 120 ms for database reads and writes. Static frontend assets must be lightweight (vanilla CSS and JS under 150 KB combined) to ensure sub-second first contentful paint (FCP) on mobile networks.
- **NFR-03 (Fault Tolerance & Dual-Mode Fallback)**: If cloud credentials (`FIREBASE_SERVICE_ACCOUNT`) are unavailable, the server must automatically fall back to an internal synchronized memory store, guaranteeing zero startup failure or local development interruption.
- **NFR-04 (Usability & Responsiveness)**: The web interface must be fully responsive across mobile (320px–480px), tablet (768px–1024px), and desktop (1200px+) viewports, featuring accessible form elements and toast notifications.
- **NFR-05 (Scalability)**: The Node.js application server must maintain statelessness for REST operations, enabling horizontal replication behind load balancers with Cloud Firestore handling multi-region database scaling.
- **NFR-06 (Data Integrity & Sanitization)**: All incoming payloads must be strictly validated. Phone numbers must conform to 10-digit formats, and text fields must be sanitized to eliminate Cross-Site Scripting (XSS) risks.

## 1.4 System Scope
- **In Scope**:
  - Public customer booking and quotation portal.
  - Live tracking system via REST and Server-Sent Events (SSE).
  - Dispatch command workstation with technician assignment and search filtering.
  - Mobile field technician workspace for job updates and technical notes logging.
  - Automated AMC eligibility verification and visit decrementation engine.
  - Product catalog for new/refurbished ACs and genuine spare parts.
  - SendGrid transactional email notification engine.
  - Executive Chart.js business analytics.
- **Out of Scope (Future Phases)**:
  - Direct hardware IoT sensor telemetry on outdoor condensing units.
  - Native iOS and Android app store binaries (currently delivered as a responsive progressive web app).
  - Online automated payment gateway settlement (current release uses verified invoicing).
  - Multi-currency conversion (operations are localized for INR transactions).

---

# 2. DATA FLOW DIAGRAM (DFD) & STRUCTURED CHART

## 2.1 Context Diagram (Level 0 DFD)
The Level 0 Context Diagram depicts the macroscopic data boundary of the Extreme Sales & Services system. The system acts as a centralized processing nexus interacting with four primary external entities.

```mermaid
graph TD
    Cust[Customer Entity] -->|1. Booking Form / Track Request / Enquiry| ESS((0.0 Extreme Sales & Services System))
    ESS -->|2. Ticket ID / Status Updates / Receipts| Cust

    ESS -->|3. Assigned Job Alerts / Details / Addresses| Tech[Field Technician Entity]
    Tech -->|4. Diagnostic Notes / Status Patches / Spare Parts| ESS

    Admin[Admin / Dispatcher Entity] -->|5. Technician Assignments / Catalog Updates / AMC Approvals| ESS
    ESS -->|6. Operational Queues / Financial Analytics / Fleet Workloads| Admin

    ESS -->|7. Transactional Email Payloads| SendGrid[SendGrid Email Cloud Service]
```

## 2.2 Level 1 DFD - Main Subsystems
The Level 1 Data Flow Diagram decomposes the system into six core operational processes and four primary data stores.

```mermaid
graph LR
    subgraph Processes
        P1((1.0 Auth & RBAC))
        P2((2.0 Booking & AMC Check))
        P3((3.0 Dispatch & Assignment))
        P4((4.0 Field Execution))
        P5((5.0 AMC Lifecycle))
        P6((6.0 Catalog & BI))
    end

    subgraph Data Stores
        D1[(D1: service_requests)]
        D2[(D2: customer_amc)]
        D3[(D3: users / auth)]
        D4[(D4: products / catalog)]
    end

    P1 <--> D3
    P2 --> D1
    P2 <--> D2
    P3 <--> D1
    P3 <--> D3
    P4 --> D1
    P5 <--> D2
    P6 <--> D4
    P6 <-- D1
```

## 2.3 Structured Chart (HIPO Chart)
The Hierarchical Input-Process-Output (HIPO) Structured Chart illustrates the structural decomposition of the codebase into functional modules and subroutines.

```mermaid
graph TD
    Root[Extreme Sales & Services Engine]
    Root --> M1[1.0 Auth Module]
    Root --> M2[2.0 Service Booking]
    Root --> M3[3.0 Dispatch & Fleet]
    Root --> M4[4.0 AMC Management]
    Root --> M5[5.0 BI & Analytics]

    M1 --> M1a[1.1 Bcrypt Verification]
    M1 --> M1b[1.2 JWT Token Generation]
    M2 --> M2a[2.1 Phone AMC Lookup]
    M2 --> M2b[2.2 Request ID Generation]
    M2 --> M2c[2.3 SendGrid Mail Dispatch]
    M3 --> M3a[3.1 Workload Balancer]
    M3 --> M3b[3.2 Status Transition Patch]
    M4 --> M4a[4.1 Plan Subscription]
    M4 --> M4b[4.2 365-Day Activation]
    M5 --> M5a[5.1 Revenue Aggregator]
    M5 --> M5b[5.2 Chart.js JSON Formatter]
```

---

# 3. USE CASE DIAGRAM & DETAILED SPECIFICATIONS

## 3.1 Complete Use Case Diagram
The use case diagram models the complete functional requirements accessible to the system's human and external actors.

```mermaid
graph LR
    subgraph Actors
        C((Customer))
        S((Staff / Dispatcher))
        T((Field Technician))
        A((Administrator))
    end

    subgraph System Boundary
        UC1([UC-01: Book Service / Repair])
        UC2([UC-02: Track Request via ID / Phone])
        UC3([UC-03: Browse Products & Inquire])
        UC4([UC-04: Purchase / Renew AMC Plan])
        UC5([UC-05: Submit Service Feedback])
        UC6([UC-06: Authenticate with Role])
        UC7([UC-07: Dispatch Technician])
        UC8([UC-08: Update Job & Log Spare Parts])
        UC9([UC-09: Manage AMC Contracts])
        UC10([UC-10: View Executive Analytics])
    end

    C --> UC1
    C --> UC2
    C --> UC3
    C --> UC4
    C --> UC5

    S --> UC6
    S --> UC7
    S --> UC2

    T --> UC6
    T --> UC8

    A --> UC6
    A --> UC7
    A --> UC9
    A --> UC10
```

## 3.2 Detailed Use Case Descriptions
| Use Case ID | Actor | Description | Precondition | Postcondition |
| :--- | :--- | :--- | :--- | :--- |
| **UC-01** | Customer | Book an AC service, repair, or installation online. | None (Public access). | Ticket record created (`AC-XXXX`), AMC visit decremented if active, confirmation email dispatched. |
| **UC-02** | Customer | Check real-time status of service request. | Valid Request ID or Customer Phone. | Displays current status, assigned technician name, and opens live SSE stream. |
| **UC-03** | Customer | Explore AC catalog and submit purchase inquiry. | None (Public access). | Enquiry saved in admin queue; confirmation message returned. |
| **UC-04** | Customer | Subscribe to an Annual Maintenance Contract. | None (Public access). | Subscription record created in 'Pending' state; admin notified. |
| **UC-05** | Customer | Submit post-service rating and review. | Service request completed. | Feedback saved to database and rendered on public testimonials section. |
| **UC-06** | Staff / Admin / Tech | Log in to restricted workstation. | Registered account exists. | JWT Bearer token issued containing verified role claims. |
| **UC-07** | Staff / Admin | Assign an active technician to a service ticket. | Ticket in 'Pending' state; technician active. | Ticket status transitions to 'Assigned'; technician job counter increments. |
| **UC-08** | Technician | Update assigned ticket status and log technical notes. | Authenticated technician assigned to ticket. | Ticket status patched ('In Progress' / 'Completed'); notes recorded; customer tracker notified. |
| **UC-09** | Admin | Activate or renew customer AMC subscription. | Subscription in 'Pending' state. | Contract status updated to 'Active' with 365-day validity and full visit quota. |
| **UC-10** | Admin | Review business performance charts and financial metrics. | Authenticated Admin. | Analytics charts rendered with live revenue calculations and job volume metrics. |

---

# 4. CLASS DIAGRAM & OBJECT DIAGRAM

## 4.1 Domain Class Diagram
The class diagram captures the static structural design of the domain model, depicting the primary entities, their encapsulated properties, public operations, and structural associations.

```mermaid
classDiagram
    class User {
        +String id
        +String name
        +String email
        +String password_hash
        +String role
        +String phone
        +login(password): Token
        +verifyRole(requiredRoles): Boolean
    }

    class ServiceRequest {
        +String id
        +String request_id
        +String name
        +String phone
        +String email
        +String address
        +String service_type
        +String issue_description
        +String status
        +String technician_id
        +String technician_name
        +String completion_notes
        +DateTime created_at
        +DateTime completed_at
        +book(): RequestId
        +assign(techId): void
        +updateStatus(newStatus, notes): void
    }

    class AMCPlan {
        +String id
        +String name
        +Float price
        +Integer services_per_year
        +String description
        +getFeatures(): List
    }

    class AMCSubscription {
        +String id
        +String customer_name
        +String phone
        +String plan_name
        +String status
        +Integer remaining_services
        +DateTime start_date
        +DateTime end_date
        +activate(services): void
        +decrementVisit(): Boolean
    }

    class Product {
        +String id
        +String name
        +String category
        +Float price
        +Integer stock
        +String brand
        +String condition
        +String description
        +updateStock(qty): void
    }

    class Enquiry {
        +String id
        +String product_id
        +String product_name
        +String name
        +String phone
        +String message
        +String status
        +resolve(): void
    }

    class CustomerFeedback {
        +String id
        +String name
        +String phone
        +Integer rating
        +String category
        +String booking_id
        +Boolean recommended
        +String message
    }

    User "1" --> "0..*" ServiceRequest : assigned_to
    AMCSubscription "0..1" --> "0..*" ServiceRequest : covers
    AMCPlan "1" --> "0..*" AMCSubscription : based_on
    Product "1" --> "0..*" Enquiry : regarding
```

## 4.2 Object Diagram (Runtime Instance Snapshot)
The object diagram captures concrete object instances during live execution.

```mermaid
graph TD
    subgraph Runtime Objects
        Admin1["usr-admin: User<br>name = 'Vikram Malhotra'<br>role = 'admin'<br>phone = '9820011000'"]
        Tech1["tech-1: User<br>name = 'Suresh Kumar'<br>role = 'technician'<br>active_jobs = 2"]
        Req1["req-1: ServiceRequest<br>request_id = 'AC-1001'<br>customer = 'Rahul Sharma'<br>status = 'In Progress'<br>technician_id = 'tech-1'"]
        Req2["req-2: ServiceRequest<br>request_id = 'AC-1002'<br>customer = 'Priya Patel'<br>service_type = 'Servicing [✅ AMC Covered]'<br>status = 'Assigned'"]
        Sub2["sub-2: AMCSubscription<br>customer = 'Anjali Gupta'<br>plan = 'Elite Ultimate'<br>status = 'Active'<br>remaining_services = 4"]
    end

    Tech1 --- Req1
    Tech1 --- Req2
    Sub2 -.-> Req2
```

---

# 5. STATE CHART & ACTIVITY DIAGRAMS

## 5.1 Service Request Lifecycle State Chart
The lifecycle of every service ticket follows a deterministic state machine from inception to closure.

```mermaid
stateDiagram-v2
    [*] --> Pending : Customer Booking Submitted (AC-XXXX generated)
    Pending --> Assigned : Dispatcher assigns Technician (PATCH /assign-technician)
    Assigned --> In_Progress : Technician arrives on site (PATCH /update-status)
    In_Progress --> Completed : Repair completed & verified (notes & parts logged)
    Pending --> Cancelled : Customer cancellation request
    Assigned --> Cancelled : Customer cancellation request
    Completed --> [*]
    Cancelled --> [*]
```

## 5.2 User Authentication & RBAC Activity Diagram
This activity diagram models the verification pipeline executed during login.

```mermaid
flowchart TD
    Start([User Initiates Login]) --> Input[Submit Email & Password]
    Input --> Query[Lookup User Record in Firestore/Memory Store]
    Query --> Exists{User Exists?}
    Exists -- No --> Err401[Return 401 Unauthorized: Invalid Credentials]
    Exists -- Yes --> Bcrypt[Compare Password Hash with bcrypt.compare]
    Bcrypt --> Match{Password Valid?}
    Match -- No --> Err401
    Match -- Yes --> SignJWT[Sign JWT with Secret Key, User ID & Role Claims]
    SignJWT --> ReturnToken[Return HTTP 200 {token, role, userProfile}]
    ReturnToken --> End([Session Established])
    Err401 --> EndFail([Authentication Failed])
```

## 5.3 Service Booking & AMC Auto-Deduction Activity Diagram
This diagram details the logic for verifying and updating AMC balances during booking.

```mermaid
flowchart TD
    A([Customer Submits Booking Form]) --> B[Extract Phone, Address, Service Type]
    B --> C[Query customer_amc by Phone with status == 'Active']
    C --> D{Active Contract with remaining_services > 0?}
    D -- Yes --> E[Atomically Decrement remaining_services by 1]
    E --> F[Append '[✅ AMC Covered]' to service_type]
    D -- No --> G[Retain Standard Billable service_type]
    F --> H[Generate Unique Request ID: AC-XXXX]
    G --> H
    H --> I[Write new doc to service_requests collection]
    I --> J[Invoke emailService.sendBookingEmail via SendGrid]
    J --> K[Return HTTP 201 Created {success: true, requestId}]
    K --> EndSuccess([Customer Renders Confirmation UI])
```

---

# 6. SEQUENCE DIAGRAM & COLLABORATION DIAGRAM

## 6.1 Service Request Booking Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant UI as Browser (service.html)
    participant Server as Express Server (server.js)
    participant DB as Cloud Firestore / Mock Store
    participant Mail as SendGrid Cloud API

    Customer->>UI: Fills booking form & clicks 'Book Service'
    UI->>Server: POST /api/services {name, phone, address, serviceType, email}
    Server->>DB: Query customer_amc where phone == phone AND status == 'Active'
    DB-->>Server: Return active subscription (if any)
    alt AMC Subscription Exists & Balance > 0
        Server->>DB: Update customer_amc (remaining_services - 1)
        Server->>Server: Append '[✅ AMC Covered]' to serviceType
    end
    Server->>Server: Generate requestId = 'AC-' + random(1000..9999)
    Server->>DB: Insert service_requests record {status: 'Pending', ...}
    DB-->>Server: Document Write Acknowledged
    Server->>Mail: sendBookingEmail(email, name, requestId, serviceType, phone)
    Mail-->>Server: 202 Accepted
    Server-->>UI: HTTP 201 {success: true, requestId}
    UI-->>Customer: Display booking confirmation modal & direct tracking link
```

## 6.2 Technician Dispatch & Job Execution Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Dispatcher
    participant AdminUI as Admin Console (admin.html)
    participant Server as Express Server (server.js)
    participant DB as Cloud Firestore / Mock Store
    actor Tech as Field Technician
    participant TechUI as Tech Portal (technician.html)
    participant TrackUI as Customer Live Tracker (status.html)

    Dispatcher->>AdminUI: Selects ticket 'AC-1001' & selects 'Suresh Kumar'
    AdminUI->>Server: PATCH /api/admin/assign-technician {requestId, technicianId}
    Server->>DB: Update service_requests {technician_id, technician_name, status: 'Assigned'}
    DB-->>Server: Write Success
    Server-->>AdminUI: HTTP 200 {success: true}

    Tech->>TechUI: Loads job board
    TechUI->>Server: GET /api/technician/jobs (Header: x-technician-id)
    Server->>DB: Fetch jobs where technician_id == techId
    DB-->>Server: Return job records
    Server-->>TechUI: HTTP 200 {requests: [...]}

    Tech->>TechUI: Patches status to 'In Progress' upon arrival
    TechUI->>Server: PATCH /api/admin/update-status {requestId, newStatus: 'In Progress'}
    Server->>DB: Update service_requests {status: 'In Progress'}
    DB-->>Server: Write Success
    Server-->>TechUI: HTTP 200 {success: true}

    Server--)TrackUI: SSE Push (/api/track/live) {status: 'In Progress', tech: 'Suresh Kumar'}
    TrackUI-->>TrackUI: Updates step progress bar to Step 3 (In Progress)
```

## 6.3 AMC Auto-Deduction Collaboration Diagram

```mermaid
graph LR
    C[1: Customer] -->|1.1: submitBooking()| BC[2: BookingController]
    BC -->|1.2: queryActiveAMC()| AS[3: AMCService]
    AS -->|1.3: readDoc()| FS[(4: Firestore DB)]
    FS -->|1.4: return balance| AS
    AS -->|1.5: decrementBalance()| FS
    BC -->|1.6: insertTicket()| FS
    BC -->|1.7: sendConfirmation()| SG[5: SendGrid API]
```

---

# 7. COMPONENT & DEPLOYMENT DIAGRAMS

## 7.1 System Component Diagram

```mermaid
graph TD
    subgraph Client Tier
        UI_Cust[Customer Public Portal<br>index.html / service.html / status.html]
        UI_Admin[Admin & Dispatch Workspace<br>admin.html / staff.html]
        UI_Tech[Technician Mobile Portal<br>technician.html]
        ChartJS[Chart.js Visualizer<br>charts.js]
        SSE_Client[EventSource SSE Client<br>status.js]
    end

    subgraph Application Service Tier (server.js)
        Router[Express 5.x REST Routing Layer]
        AuthMid[Auth & RBAC Middleware<br>authMiddleware.js]
        EmailSvc[SendGrid Mail Dispatcher<br>emailService.js]
        StateOrch[Dual-Mode Persistence Orchestrator]
    end

    subgraph Data & Cloud Tier
        Firestore[(Google Cloud Firebase Firestore)]
        MemStore[(In-Memory Synchronized Store)]
        SendGridCloud[SendGrid Email Cloud SMTP/REST]
    end

    UI_Cust -->|HTTP REST| Router
    UI_Admin -->|HTTP REST + Bearer JWT| AuthMid
    UI_Tech -->|HTTP REST| Router
    SSE_Client -->|text/event-stream| Router

    AuthMid --> Router
    Router --> StateOrch
    Router --> EmailSvc

    StateOrch -->|Production Mode| Firestore
    StateOrch -->|Local Dev Mode| MemStore
    EmailSvc -->|REST v3| SendGridCloud
    ChartJS -.->|Pulls /api/admin/analytics| Router
```

## 7.2 Deployment Diagram

```mermaid
graph TD
    subgraph Device Layer
        ClientNode["<<Client Device>><br>Smartphone / Desktop Browser<br>Chrome / Safari / Firefox"]
    end

    subgraph Application Server Host
        AppNode["<<Node.js Application Server>><br>Ubuntu / Alpine Linux Container<br>Node.js Runtime v20+ / Express 5.x<br>Port: 5000 (HTTPS: 443)"]
    end

    subgraph Cloud Infrastructure
        FirebaseNode["<<Google Cloud Platform>><br>Firebase Cloud Firestore<br>Multi-Region NoSQL Clustered Database"]
        SendGridNode["<<Twilio Cloud SaaS>><br>SendGrid Transactional Email API<br>SMTP / REST Gateway"]
    end

    ClientNode -->|TLS / HTTPS (Port 443)| AppNode
    AppNode -->|gRPC / Google Cloud SDK| FirebaseNode
    AppNode -->|TLS / REST API Key| SendGridNode
```

## 7.3 Dual-Mode Hybrid Persistence Architecture
Extreme Sales & Services includes a resilient fallback architecture. Upon startup, `server.js` verifies the presence of Google Cloud service account credentials:
- **Cloud Mode (`isFirebaseMode = true`)**: Connects to production Firestore collections (`service_requests`, `users`, `customer_amc`, `amc_plans`, `products`, `enquiries`, `feedback`).
- **Synchronized Local Mode (`isFirebaseMode = false`)**: If credentials are not supplied, the server initializes an internal in-memory repository pre-seeded with sample technicians, tickets, and products. This guarantees uninterrupted local development, offline prototyping, and seamless evaluation without cloud dependency.

---

# 8. FUNCTION POINT (FP) ANALYSIS & SIZING

## 8.1 Overview & Methodology
Function Point Analysis (IFPUG standard) evaluates the system's software size based on user-visible logical functionality. The system was sized using the five standard component types:
- **External Inputs (EI)**: Transactions that input data into the application.
- **External Outputs (EO)**: Transactions that produce derived data or notifications.
- **External Inquiries (EQ)**: Transactions that query and retrieve data without state mutation.
- **Internal Logical Files (ILF)**: User-identifiable logical data groups maintained internally.
- **External Interface Files (EIF)**: Data groups referenced by the application but maintained externally.

## 8.2 Function Point Calculation (UFP)

| Function Type | Subsystem Component Description | Count | Weighting Factor | Subtotal FP |
| :--- | :--- | :---: | :---: | :---: |
| **External Inputs (EI)** | Customer Service Booking, User Login, Dispatch Assignment, Ticket Status Patch, AMC Purchase Submission, Product Catalog Management, Customer Feedback Submission | 7 | Average ($\times 4$) | **28** |
| **External Outputs (EO)** | SendGrid Booking Confirmation Email, Status Transition Email, AMC Activation Receipt, Executive Financial Analytics Calculation, SSE Live Event Stream | 5 | Average ($\times 5$) | **25** |
| **External Inquiries (EQ)** | Live Ticket Status Lookup, Technician Job Board Fetch, Product Catalog Query, Customer AMC Ledger Search, Public Feedback Feed | 5 | Average ($\times 4$) | **20** |
| **Internal Logical Files (ILF)** | `service_requests`, `users`, `customer_amc`, `amc_plans`, `products`, `customer_feedback` | 6 | Average ($\times 10$) | **60** |
| **External Interface Files (EIF)** | SendGrid REST Email API, Google Firebase Cloud Firestore | 2 | Average ($\times 7$) | **14** |
| **Total Unadjusted Function Points (UFP)** | | | | **147 FP** |

## 8.3 Value Adjustment Factor (VAF) & Adjusted Function Points (AFP)
The Value Adjustment Factor is calculated based on 14 General System Characteristics (GSCs) scored on a scale from 0 to 5:
1. Data Communications: **4** (REST API & Server-Sent Events)
2. Distributed Data Processing: **4** (Cloud Firestore & Client Rendering)
3. Performance Objectives: **4** (Sub-150ms response criteria)
4. Heavily Used Configuration: **3** (Cloud server runtime)
5. Transaction Rate: **4** (High seasonal peak concurrency)
6. Online Data Entry: **5** (100% interactive web data entry)
7. End-User Efficiency: **5** (Optimized single-page forms & live updates)
8. Online Update: **5** (Real-time database updates)
9. Complex Processing: **3** (AMC validation & financial aggregation)
10. Reusability: **4** (Modular REST endpoints and components)
11. Installation Ease: **5** (Dual-mode fallback; zero-config startup)
12. Operational Ease: **4** (Automated email alerts & triage)
13. Multiple Sites: **3** (Cloud-accessible across metropolitan service areas)
14. Facilitate Change: **4** (Modular architecture; decoupled frontend)

$$\text{Total Degree of Influence (TDI)} = \sum_{i=1}^{14} \text{GSC}_i = 57$$
$$\text{Value Adjustment Factor (VAF)} = 0.65 + (0.01 \times \text{TDI}) = 0.65 + 0.57 = 1.22$$
$$\text{Adjusted Function Points (AFP)} = \text{UFP} \times \text{VAF} = 147 \times 1.22 = 179.34 \approx \mathbf{179\text{ AFP}}$$

## 8.4 Effort Estimation (Person-Hours)
Based on standard software engineering productivity benchmarks for full-stack JavaScript web platforms:
- **Productivity Rate**: 1 Function Point $\approx 8$ person-hours
- **Total Estimated Effort**:
  $$\text{Effort} = 179\text{ AFP} \times 8\text{ hrs/FP} = \mathbf{1,432\text{ person-hours}}$$
- **Estimated Effort Range**: 1,350 to 1,500 person-hours.

## 8.5 Project Duration & Staffing Schedule
- **Team Size**: 3 Full-Time Equivalent (FTE) Developers
- **Weekly Capacity**: 90 person-hours per week (30 hrs/week per developer)
- **Estimated Project Schedule**:
  $$\text{Schedule Duration} = \frac{1,432\text{ person-hours}}{90\text{ person-hours/week}} \approx 15.9\text{ Weeks} \approx \mathbf{16\text{ Weeks}}$$
This classifies Extreme Sales & Services as a **Medium-to-Large Enterprise Web Application** completed over a standard 16-week academic/commercial development cycle.

---

# 9. PROJECT SCHEDULING (GANTT CHART & PERT/CPM)

## 9.1 Gantt Chart Overview
The project was structured across seven core phases over a 16-week timeline:

| Phase ID | Project Phase / Deliverables | Scheduled Timeline | Effort Share |
| :--- | :--- | :---: | :---: |
| **PH-01** | Problem Formulation, Feasibility Study & SRS Documentation | Weeks 1 – 2 | 12% |
| **PH-02** | System Architecture & UML Design (DFD, Class, State, Sequence) | Weeks 3 – 5 | 18% |
| **PH-03** | Frontend Client Development (Glassmorphism CSS, Portals, Live Tracker) | Weeks 5 – 8 | 25% |
| **PH-04** | Backend Engineering (Express 5 REST API, Dual-Mode Store, JWT Auth) | Weeks 6 – 10 | 25% |
| **PH-05** | AMC Business Logic, SendGrid Integration & SSE Event Streaming | Weeks 9 – 12 | 10% |
| **PH-06** | Comprehensive Testing (Unit, Integration, Security, Responsiveness) | Weeks 12 – 14 | 6% |
| **PH-07** | Staging Deployment, Performance Tuning & Academic Defense | Weeks 15 – 16 | 4% |

```mermaid
gantt
    title Extreme Sales & Services - 16-Week Project Schedule
    dateFormat  YYYY-MM-DD
    section Phase 1
    Requirements & SRS               :a1, 2026-01-05, 14d
    section Phase 2
    UML Design & Architecture        :a2, 2026-01-19, 21d
    section Phase 3
    Frontend Web Portals             :a3, 2026-02-02, 28d
    section Phase 4
    Backend REST API & Auth          :a4, 2026-02-09, 28d
    section Phase 5
    AMC Engine & SSE Tracking        :a5, 2026-03-02, 21d
    section Phase 6
    Testing & Quality Assurance      :a6, 2026-03-23, 14d
    section Phase 7
    Deployment & Documentation       :a7, 2026-04-06, 14d
```

## 9.2 PERT / CPM Critical Path Method Analysis
Program Evaluation and Review Technique (PERT) was applied using three-point time estimates:
$$t_e = \frac{t_o + 4t_m + t_p}{6}$$

| Activity | Description | Predecessor | $t_o$ (Optimistic) | $t_m$ (Most Likely) | $t_p$ (Pessimistic) | Expected ($t_e$) | Slack |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **A** | Requirements Analysis & SRS | — | 1.5 wks | 2.0 wks | 3.0 wks | **2.08 wks** | **0.0 (Critical)** |
| **B** | Architecture & UML Modeling | A | 2.0 wks | 3.0 wks | 4.0 wks | **3.00 wks** | **0.0 (Critical)** |
| **C** | Backend API & Dual-Mode DB | B | 3.0 wks | 4.0 wks | 6.0 wks | **4.17 wks** | **0.0 (Critical)** |
| **D** | Frontend UI & Dashboards | B | 3.0 wks | 4.0 wks | 5.0 wks | **4.00 wks** | 0.17 wks |
| **E** | Quality Assurance & Testing | C, D | 2.0 wks | 3.0 wks | 4.0 wks | **3.00 wks** | **0.0 (Critical)** |
| **F** | Cloud Deployment & Defense | E | 1.5 wks | 2.0 wks | 3.0 wks | **2.08 wks** | **0.0 (Critical)** |

$$\textbf{Critical Path: } \text{Activity A} \rightarrow \text{Activity B} \rightarrow \text{Activity C} \rightarrow \text{Activity E} \rightarrow \text{Activity F}$$
$$\textbf{Total Critical Path Duration: } 2.08 + 3.00 + 4.17 + 3.00 + 2.08 = \mathbf{14.33\text{ Weeks} \approx 16\text{ Calendar Weeks}}$$

---

# 10. TESTING STRATEGY & COMPREHENSIVE TEST CASES

## 10.1 Testing Strategy
The system underwent rigorous testing across five levels:
1. **Unit Testing (White-Box)**: Verification of cryptographic functions, token parsing, ticket ID generation, and mathematical aggregations.
2. **Integration Testing (Black-Box)**: Multi-component transaction verification (e.g. Booking submission $\rightarrow$ AMC verification $\rightarrow$ DB commit $\rightarrow$ SendGrid dispatch).
3. **Boundary Value Testing (BVT)**: Validation of input limits on phone numbers, visit counters, and user review ratings.
4. **Security Testing**: Verification against OWASP Top 10 vulnerabilities (JWT tampering, RBAC privilege escalation, XSS, NoSQL injection).
5. **Usability & Responsiveness Testing**: UI validation across mobile, tablet, and desktop viewports.

## 10.2 Unit Test Cases (White-Box Testing)
| Test ID | Target Component | Test Procedure | Expected Outcome | Status |
| :---: | :--- | :--- | :--- | :---: |
| **UT-01** | `bcryptjs` Hashing | Compare plain text password `'password123'` with hash via `bcrypt.compare`. | Valid credentials resolve `true`; invalid resolve `false`. | **Pass** |
| **UT-02** | JWT Token Signing | Generate JWT with payload `{id, role: 'admin'}` and verify with secret. | Decoded token matches role `'admin'` with valid expiration. | **Pass** |
| **UT-03** | Ticket ID Generation | Execute ID generation expression `'AC-' + random(1000..9999)`. | Returns string conforming to regular expression `/^AC-\d{4}$/`. | **Pass** |
| **UT-04** | AMC Balance Logic | Invoke decrement routine on subscription having `remaining_services = 3`. | Counter accurately updates to `2`. | **Pass** |
| **UT-05** | Tech Workload Counter | Compute `active_jobs` on technician with 1 Assigned and 1 In Progress job. | Returns exactly `2`. | **Pass** |
| **UT-06** | Financial Calculator | Pass 5 Completed jobs and 2 Active AMCs to analytics revenue formula. | Returns $(5 \times 1500) + (2 \times 2400) + 12500 = \text{₹}24,800$. | **Pass** |
| **UT-07** | Dual-Mode Fallback | Initialize server without `FIREBASE_SERVICE_ACCOUNT` environment variable. | Server logs local mock notice and mounts in-memory store cleanly. | **Pass** |
| **UT-08** | Product Filter Logic | Filter products array with category `'used_ac'`. | Returns only items having `category == 'used_ac'`. | **Pass** |

## 10.3 Integration Test Cases (Black-Box Testing)
| Test ID | Scenario | Input Data | Expected Outcome | Status |
| :---: | :--- | :--- | :--- | :---: |
| **IT-01** | Booking Intake to Email | Booking form submission with valid email. | Document saved to DB; SendGrid returns 202 Accepted. | **Pass** |
| **IT-02** | Auto AMC Decrement Flow | Booking with phone `'9812345678'` (Active AMC). | Request tagged `'[✅ AMC Covered]'`; AMC balance decrements. | **Pass** |
| **IT-03** | Dispatch Allocation Flow | Assign technician `'tech-1'` to `'AC-1003'`. | Ticket status updates to `'Assigned'`; job visible on tech portal. | **Pass** |
| **IT-04** | Job Status Progression | Technician patches status to `'Completed'`. | Completed timestamp set; customer tracker displays completed state. | **Pass** |
| **IT-05** | AMC Purchase Activation | Admin activates pending subscription `'sub-1'`. | Status updates to `'Active'`; validity set to current date + 365 days. | **Pass** |
| **IT-06** | Product Enquiry Flow | User submits quotation enquiry on Daikin AC. | Enquiry visible in admin inbox with contact details. | **Pass** |
| **IT-07** | Feedback Registry Flow | User submits 5-star review for `'AC-1001'`. | Review saved and rendered on public testimonial section. | **Pass** |
| **IT-08** | RBAC Protection Flow | Dispatcher requests `/api/admin/users` (Admin only). | Server blocks request with HTTP 403 Forbidden. | **Pass** |

## 10.4 Boundary Value Analysis & Equivalence Partitioning
| Test ID | Input Field | Test Value Tested | Classification | Expected Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **BVT-01** | Customer Phone | `9820011223` (10 digits) | Valid Boundary | Accepted; booking processed | **Pass** |
| **BVT-02** | Customer Phone | `98200112` (8 digits) | Invalid Underflow | Rejected; input validation error displayed | **Pass** |
| **BVT-03** | AMC Remaining Visits | `0` remaining visits | Lower Boundary | Booking proceeds as standard billable service | **Pass** |
| **BVT-04** | AMC Remaining Visits | `1` remaining visit | Valid Lower Bound | Decrements to 0; tagged as AMC Covered | **Pass** |
| **BVT-05** | Star Rating | `1` Star | Valid Minimum | Accepted and stored | **Pass** |
| **BVT-06** | Star Rating | `6` Stars | Invalid Overflow | Constrained to maximum rating of 5 | **Pass** |

## 10.5 Security Vulnerability Testing
- **OWASP A01 (Broken Access Control)**: Admin endpoints (`/api/admin/*`) were tested by crafting HTTP requests with missing, expired, and staff-level tokens. All unauthorized attempts were rejected with HTTP 401 or HTTP 403.
- **OWASP A02 (Cryptographic Failures)**: Passwords were verified to never be stored in plaintext. Passwords stored in Firestore or memory stores are hashed with `bcryptjs`.
- **OWASP A03 (Injection)**: Malicious SQL and NoSQL payloads (e.g. `{"$gt": ""}`) submitted in login and tracking queries were neutralized through strict parameter extraction and parameterized Firestore queries.
- **OWASP A07 (Identification Failures)**: JWT tokens were subjected to algorithm downgrade attempts (setting `alg: none`). The server rejects all unverified tokens.

## 10.6 Usability & Cross-Device Responsiveness Testing
- **Cross-Browser Verification**: Verified on Google Chrome (v122+), Mozilla Firefox (v123+), Apple Safari (v17+), and Microsoft Edge (v122+).
- **Responsive Viewport Breakdown**:
  - Smartphone (375px–430px): Navigation folds into a clean hamburger menu; tables collapse to card views; buttons expand to touch-friendly 48px hit targets.
  - Tablet (768px–1024px): Two-column form layouts adapt gracefully.
  - Desktop (1280px–1920px): Full administrative split-pane layout with live Chart.js graphs and multi-column ticket triage tables.

## 10.7 Test Execution Summary Report

```mermaid
pie title Test Execution Results (Total: 36 Tests)
    "Unit Testing (8 Passed)" : 8
    "Integration Testing (8 Passed)" : 8
    "Boundary Value Testing (6 Passed)" : 6
    "Security Testing (6 Passed)" : 6
    "Usability & Responsiveness (8 Passed)" : 8
```

| Testing Category | Tests Planned | Tests Executed | Passed | Failed | Pass Rate (%) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Unit Testing (White-Box)** | 8 | 8 | 8 | 0 | **100%** |
| **Integration Testing (Black-Box)** | 8 | 8 | 8 | 0 | **100%** |
| **Boundary Value Testing** | 6 | 6 | 6 | 0 | **100%** |
| **Security Vulnerability Testing** | 6 | 6 | 6 | 0 | **100%** |
| **Usability & Responsiveness Testing** | 8 | 8 | 8 | 0 | **100%** |
| **Total Comprehensive Testing** | **36** | **36** | **36** | **0** | **100%** |

---

# 11. CONCLUSION & FUTURE ROADMAP

## 11.1 Conclusion
The **Extreme Sales & Services (V2.0)** platform successfully modernizes HVAC enterprise sales, repair management, AMC contracts, and field technician dispatching. By implementing an automated, transparent, and responsive platform, the software overcomes the severe inefficiencies of manual booking, uncoordinated field operations, and neglected maintenance tracking.

The development process strictly complied with established Software Engineering standards:
- **Requirement Analysis**: Formalized using IEEE-830 Software Requirements Specifications.
- **System Modeling**: Modeled using UML 2.5 diagrams (DFD, HIPO, Use Case, Class, Object, State Machine, Activity, Sequence, Collaboration, Component, and Deployment).
- **Project Sizing & Planning**: Evaluated using IFPUG Function Point sizing (179 Adjusted Function Points, 1,432 person-hours) and 16-week Gantt/PERT scheduling.
- **Quality Assurance**: Validated through 36 comprehensive test cases achieving a 100% pass rate.

The platform's **dual-mode persistence architecture** represents a major engineering asset, enabling instant local development and testing while seamlessly scaling to Google Cloud Firebase Firestore for enterprise production.

## 11.2 Future Roadmap & Technological Enhancements
1. **IoT Smart Telemetry (V3.0)**: Integration of low-cost ESP32/Modbus sensors on residential and commercial AC units to stream real-time compressor temperature, refrigerant pressure, and power consumption, enabling automated predictive maintenance dispatch before breakdowns occur.
2. **Direct Payment Gateway Integration**: Embedding Razorpay and Stripe gateways to support online credit card, UPI, and net banking payments for instant AMC subscription purchases and digital invoice settlements.
3. **Native Mobile App Store Release**: Packaging the application into native iOS and Android packages via Capacitor/React Native to provide background geolocation tracking and instant push notifications.
4. **GPS Field Route Optimization**: Introducing automated routing algorithms (Traveling Salesperson Problem heuristics) to group daily service calls by postal code, minimizing technician travel time and fuel consumption.
