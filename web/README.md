# ESS website (new, Next.js)

The new Extreme Sales & Services website. It replaces the old pages in `../public` and the old
`../server.js` at the Phase 2 switch-over. Until then the old site stays live and unchanged.

- **Data:** everything comes from PYS through the signed API `/api/v1/ess` (catalog, products,
  content, service areas, tracking, requests). This site keeps no business data.
- **Secrets:** only on the server (`PYS_INTEGRATION_KEY_ID`, `PYS_INTEGRATION_SECRET`); the browser
  never talks to PYS.
- **Freshness:** PYS reads are cached for 5 minutes; PYS calls `POST /api/revalidate` (signed with
  this site's key) when the catalog, products, content or areas change.
- **Design:** "Cool Air" tokens in `src/app/globals.css`; Archivo in two widths.

## Run on a PC (no real key needed)

```bash
npm install
node dev/mock-pys.mjs          # stand-in PYS on :4010 with data copied from live
# .env.local:
#   PYS_API_URL=http://localhost:4010
#   PYS_INTEGRATION_KEY_ID=essweb_localdev
#   PYS_INTEGRATION_SECRET=local-dev-secret-not-for-production
npm run dev                    # http://localhost:3000
```

Checks: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

## Settings on Vercel (Project → Settings → Environment Variables)

| Name | Value |
| --- | --- |
| `PYS_API_URL` | `https://place-your-service-api.onrender.com` |
| `PYS_INTEGRATION_KEY_ID` | same as the old ESS server on Render |
| `PYS_INTEGRATION_SECRET` | same as the old ESS server on Render |
| `SITE_URL` | the site's public address |

Vercel project setting: **Root Directory = `web`**.
