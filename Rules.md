# AI OPERATING RULES & ENGINEERING CONSTRAINTS (Rules.md)
## Extreme Sales & Services (ESS) — Development Guidelines
**Document Version**: 2.1.0  
**Scope**: All AI Coding Sessions, Modifications, Upgrades & Pair Programming  

---

## 1. Core Principles & Philosophy
1. **Production-Ready & Presentation-Grade**: Every feature, screen, and endpoint must be functional, visually impressive ("WOW" factor), and resilient against evaluation edge cases.
2. **Decoupled Architecture Integrity**: The frontend is hosted on **Vercel** (`public/`) and communicates via `/api/*` (reverse-proxied or CORS-enabled) to **Render** (`server.js`).
3. **Dual-Mode Reliability**: The system must operate seamlessly in **Production Mode** (connected to Google Cloud Firebase Firestore) and gracefully in **Local Mode** (in-memory synchronized store) if offline.

---

## 2. Technology Stack & Library Directives

### 2.1 Approved Libraries & Frameworks
| Layer | Approved Technology | Directive |
|---|---|---|
| **Core UI** | HTML5 Semantic Elements + Vanilla ES6 JavaScript | Fast, zero-build-step deployment on Vercel. |
| **Styling** | Tailwind CSS (CDN) + Custom `style.css` | Use utility classes with customized glassmorphism and theme tokens. |
| **3D Graphics** | Three.js (CDN) + HTML5 Canvas | Lightweight 3D interactive canvas for the AC simulator on `index.html`. |
| **Charts** | Chart.js (CDN) | Interactive analytics graphs on `admin.html`. |
| **Backend** | Node.js (v20+ LTS) + Express 5.x | REST endpoints with clean JSON responses. |
| **Security** | `bcryptjs` + `jsonwebtoken` (JWT) | Password hashing (work factor 10) & stateless Bearer auth. |
| **Database** | `firebase-admin` (Cloud Firestore) | Native mode collections in Google Cloud Platform (`nam5`). |
| **Email** | `@sendgrid/mail` | High-deliverability transactional customer booking receipts. |

### 2.2 Prohibited Patterns & Libraries to Avoid
- 🚫 **Do NOT introduce heavy frontend build systems** (e.g., Vite/Webpack/React/Next.js) into this repository: The project relies on instantaneous Vercel static serving with zero build step.
- 🚫 **Do NOT commit credentials**: Never track `.env`, `firebase-credentials.json`, or API keys into Git.
- 🚫 **Do NOT use broken placeholder images**: All images must point to valid, high-resolution Unsplash HVAC assets and include `onerror` fallback handlers.
- 🚫 **Do NOT allow silent failures**: Always log meaningful server messages and display styled user toasts or feedback banners on the frontend.

---

## 3. Error Handling & Resilience Mandates

1. **Dual-Mode Fallback**:
   - `server.js` must verify Firebase initialization inside a `try/catch` block.
   - If credentials are absent or invalid, set `isFirebaseMode = false` and continue serving with `systemUsers`, `serviceRequests`, and `amcPlans` in-memory mock datasets without crashing.
2. **WebGL / 3D Fallback**:
   - If the user's browser does not support WebGL or hardware acceleration, the 3D AC interactive simulator must fallback gracefully to an interactive CSS 3D card layout without throwing fatal console exceptions.
3. **Zero-CORS Edge Rewrite**:
   - Always route frontend API calls using `window.APP_CONFIG.BACKEND_URL` fallback, and ensure `vercel.json` provides `/api/:match*` rewrites to Render.
4. **Auth Guards**:
   - Protected client pages (`admin.html`, `staff.html`, `technician.html`) must check `localStorage.getItem('ess_token')` and `ess_role`, redirecting unauthorized users to `login.html`.

---

## 4. Code Quality & Formatting Rules
- **Formatting**: Preserve all existing comments and documentation headers.
- **Paths**: Use standard relative links or Markdown file links (`file:///...`).
- **Semantic Commit Messages**: Use Conventional Commits (`feat:`, `fix:`, `docs:`, `perf:`).
