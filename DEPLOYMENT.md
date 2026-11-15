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
- `PYS_API_KEY`: `***REMOVED***`
- `PYS_WEBHOOK_SECRET`: `***REMOVED***`
- `PYS_FRONTEND_URL`: `https://place-your-service.vercel.app`
- `RESEND_API_KEY`: Configured
- `RESEND_FROM_EMAIL`: `Extreme Sales & Services <onboarding@resend.dev>`
- `SUPABASE_URL`: `https://jvccvdxfilzlncbgiplk.supabase.co`
- `SUPABASE_ANON_KEY`: Configured

### Vercel (`extreme-sales-services`)
- No environment variables required (edge rewrites route `/api/*` to Render).

## Validation Status
- HTML5 Standards & WCAG Accessibility: PASSED (14 pages, 0 errors, 0 warnings)
- Node.js Runtime Syntax: PASSED
- Last Deployment Trigger: 2026-11-15T21:35:00+05:30
