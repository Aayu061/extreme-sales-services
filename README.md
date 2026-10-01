# Extreme Sales & Services (V2.0)
> **Enterprise HVAC Sales, Servicing, AMC Contract Lifecycle & Real-Time Dispatch System**

Extreme Sales & Services is a comprehensive full-stack enterprise web platform engineered to automate and optimize the end-to-end lifecycle of HVAC sales, installation, recurring maintenance (AMC), field workforce dispatch, and customer tracking.

---

## 📚 Project Documentation
Comprehensive Software Engineering (SE) documentation has been generated conforming strictly to IEEE-830 and standard academic/enterprise specifications:

- **Microsoft Word Documentation**: [EXTREME_SALES_SERVICES_DOCUMENTATION.docx](file:///c:/Users/aayup/Desktop/Extreme-Sales-Services-main/EXTREME_SALES_SERVICES_DOCUMENTATION.docx)  
  *(Contains all 11 sections, styled tables, metadata, and 20 high-resolution architectural diagrams; ready for export to PDF)*
- **Markdown Specification**: [EXTREME_SALES_SERVICES_SE_DOCUMENTATION.md](file:///c:/Users/aayup/Desktop/Extreme-Sales-Services-main/EXTREME_SALES_SERVICES_SE_DOCUMENTATION.md)  
  *(Complete documentation containing embedded Mermaid diagrams, data flow models, state charts, sequence diagrams, function point calculations, and test cases)*

---

## 🚀 Key Features
- **Online Service Booking Engine**: Direct booking for AC Repair, Servicing, Installation, Gas Refill, and AMC visits.
- **Smart AMC Verification**: Automatically inspects customer phone numbers against active AMC contracts, decrements visit quotas, and tags requests as pre-paid.
- **Dispatcher Command Center**: Ticket triage, lifecycle status filtering, and live technician workload balancing.
- **Technician Field Console**: Mobile-friendly job board with diagnostic notes and spare parts logging.
- **Real-Time Ticket Tracker**: REST and Server-Sent Events (SSE) live progress tracking (`/api/track/live`).
- **Resilient Dual-Mode Architecture**: Operates with Google Cloud Firebase Firestore in production or seamlessly switches to a synchronized local memory store for zero-dependency development.
- **SendGrid Email Notifications**: Automated branded HTML email dispatch for booking confirmations and status updates.
- **Executive BI Dashboard**: Real-time revenue analytics, 7-day volume trends, and technician performance metrics powered by Chart.js.

---

## 🛠️ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm start
# Server starts on http://localhost:5000 in Synchronized Local Mode (or Cloud Mode if Firebase credentials exist)
```