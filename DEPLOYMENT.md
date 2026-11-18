# Extreme Sales & Services (ESS) — Production Deployment Manifest

**Target Architecture:**
- **Storefront Mirror:** Vercel (`https://extreme-sales-services.vercel.app`)
- **Backend API & Storefront:** Render Web Service (`https://extreme-sales-services-gh7s.onrender.com`)
- **M2M Integration:** Place Your Service API (`https://place-your-service-api.onrender.com/api/v1`)
- **Database / Auth:** Supabase (`https://jvccvdxfilzlncbgiplk.supabase.co`)
- **Email Delivery:** Resend (`Extreme Sales & Services <onboarding@resend.dev>`)

## Environment Variable Alignment Checklist

### Render (`extreme-sales-services`)
- `APP_URL`: `https://extreme-sales-services.vercel.app`
- `PYS_API_BASE_URL`: `https://place-your-service-api.onrender.com/api/v1`
- `PYS_API_KEY`: Configured in Render (secret — never write the value here)
- `PYS_WEBHOOK_SECRET`: Configured in Render (secret — never write the value here)
- `PYS_FRONTEND_URL`: `https://place-your-service.vercel.app`
- `PYS_API_URL`: optional; PYS base URL for the signed intake API (falls back to `PYS_API_BASE_URL`; a trailing `/api/v1` is ignored)
- `PYS_INTEGRATION_KEY_ID`: Configured in Render (from PYS Admin — never write the value here)
- `PYS_INTEGRATION_SECRET`: Configured in Render (secret — never write the value here)
- `RESEND_API_KEY`: Configured
- `RESEND_FROM_EMAIL`: `Extreme Sales & Services <onboarding@resend.dev>`
- `SUPABASE_URL`: `https://jvccvdxfilzlncbgiplk.supabase.co`
- `SUPABASE_ANON_KEY`: Configured

### Vercel (`extreme-sales-services`)
- No environment variables required (edge rewrites route `/api/*` to Render).

## How to connect ESS to PYS (signed intake API)

1. Deploy PYS first (it must serve `POST /api/v1/ess/intakes` and `GET /api/v1/ess/ping`).
2. In PYS, as an admin, create an integration key for the ESS website:
   `POST /api/v1/integrations/clients/ESS_WEB/keys`.
   The response shows the key id and the secret **once** — copy both straight into Render (step 3), not into any file or chat.
3. On Render (`extreme-sales-services` → Environment) set `PYS_INTEGRATION_KEY_ID` and `PYS_INTEGRATION_SECRET`
   (and `PYS_API_URL` only if PYS lives somewhere other than `PYS_API_BASE_URL`). Save — Render redeploys.
   Vercel needs nothing: it only forwards `/api/*` to Render.
4. Check: log in to ESS admin and open `GET /api/integrations/pys/health` — it should say `"mode": "signed"` and `"connected": true`.

What changes once both keys are set:

- Bookings, AMC requests, product enquiries and contact messages are sent to PYS as signed intakes.
  Each one uses a stable `Idempotency-Key` (`ess-booking-<id>`, `ess-amc-<id>`, `ess-enquiry-<id>`), so a retry never creates a duplicate.
- The customer sees the PYS tracking code on the confirmation. If PYS is asleep or unreachable, the record is
  still saved in ESS with `pys_sync_status = PENDING_SYNC`, the customer is told "We received your request",
  and ESS retries automatically every 10 minutes (admins/staff can also call `POST /api/integrations/pys/retry-pending`).
- If either key is missing, ESS keeps using the old `PYS_API_KEY` path exactly as before.

## Validation Status
- HTML5 Standards & WCAG Accessibility: PASSED (14 pages, 0 errors, 0 warnings)
- Node.js Runtime Syntax: PASSED
- Last Deployment Trigger: 2026-11-15T21:35:00+05:30
