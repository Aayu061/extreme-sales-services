# ESS Inner Pages, Basket, Book and Track Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build every customer page of the new ESS site in the Mumbai Glass look (spec §7): services, AMC, shop + bill saver, product page, a basket that sends one request to PYS, tracking, contact, sell, account, legal, plus SEO and old-URL redirects.

**Architecture:** Pages are server components reading the existing cached PYS data (`lib/data.ts`) and passing plain props to small client islands. All rules (basket lines, pricing, shop filters, bill estimate, form validation, SEO data, redirects) live in pure `lib/` modules with unit tests. The browser never talks to PYS: forms post to two Next route handlers (`/api/request`, `/api/track`) which validate, add a hashed IP and call the signed PYS API. The basket lives in `localStorage` and only stores what was chosen; prices are always recomputed from live catalog/products.

**Tech Stack:** Next.js 16.4.6 App Router (`cacheComponents`), React 19.3, Tailwind 4, TypeScript, zod 4, vitest 5 + Testing Library (jsdom per file), Playwright MCP for visual and end-to-end checks. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-19-ess-website-design.md` (§7 pages, §3 constraints, §8 design system). Plan 1 (`2026-11-19-ess-home-mumbai-glass.md`, done) built the design system this plan reuses.

## Global Constraints

- Everything from plan 1's Global Constraints still applies (repo/branch/commit trailer, read `web/node_modules/next/dist/docs/` before any Next API, vitest from PowerShell at `C:\Users\aayup\Desktop\PYS\extreme-sales-services-main\web`, colour tokens, glass recipe, theme, 44px targets, Archivo only, no all-caps, tabular prices).
- Every price comes from live PYS data. Never hard-code a price. Basket prices are recomputed from the catalog/products on every render; the stored basket holds no prices.
- Never show: arrival times, "genuine/OEM spares", "certified/verified technicians", counters, reviews, manufacturer logos, discounts not in `home.offers`. Brand names as text only.
- Inner pages: slim photo banner + title reveal is the page's one motion moment, done in CSS (no GSAP on inner pages). `prefers-reduced-motion` shows the final state.
- Every form: privacy consent checkbox (required, unticked by default) with the exact text "I agree that Extreme Sales & Services may use these details to handle my request, as described in the [Privacy notice](/legal/privacy)."; optional marketing checkbox "Send me service reminders and offers on WhatsApp or email." (unticked). `consent.noticeVersion = '2026-11-19'`. Hidden honeypot input `name="company_website"` and `elapsedMs` since the form mounted.
- Never put a mobile number in a URL or in `localStorage`. The basket key is `ess-basket`; nothing else personal is stored.
- PYS can take ~50 s to wake: submit buttons show "Sending… this can take up to a minute" and are disabled while sending; a retry reuses the same reference (no duplicate requests).
- Field limits mirror PYS (`server/src/validators/intake.validator.ts` in the PYS repo): name 2–120, mobile `^[6-9]\d{9}$` after stripping `+91`/`91`/`0`/spaces/dashes, email ≤254, address line 3–300, area/landmark ≤120, city 2–80, pincode `^[1-9]\d{5}$`, message ≤2000, items 1–30, quantity 1–20, line notes ≤500, preferred date ≥ today in India, slots `MORNING | AFTERNOON | EVENING`, AC types `SPLIT | WINDOW | CASSETTE | TOWER | UNKNOWN`.
- Service page URLs use the lower-case code (`/services/svc-jet-wash`); lookups upper-case it. Existing links (`/book?service=SVC-DIAG`, `/shop?type=split`, `/services/svc-foam`) must keep working.

## Review Focus

1. A basket line whose service, plan or product has since been removed → the line shows "No longer available" with Remove, the total ignores it, and Send is blocked until it is removed; PYS never receives it. Tests: Task 2 (`priceLine` unavailable), Task 7 (Send disabled).
2. PYS asleep or slow during Send, or the visitor taps Send twice / retries after a timeout → one request in PYS. Tests: Task 6 (route passes `Idempotency-Key` = `ref`, retry with same `ref`), Task 7 (double click sends once; retry after a 502 reuses `ref`).
3. Old, corrupt or blocked `localStorage` (private mode, someone's edited value, version 0) → empty basket, page still works, add still works in memory. Test: Task 2 (`parseBasket` cases, store with throwing storage).
4. Mobile typed as "+91 98765 43210", "098765-43210" or with spaces → accepted and normalised for both Send and Track; "12345" → friendly error, no network call. Tests: Task 6 (`normalizeIndianMobile`), Task 8 (track form).
5. A shop link with unknown or bad filters (`?type=rocket&max=abc&star=9`) → ignored, all ACs shown; filters with no matches → "No ACs match these filters" with Clear filters. Test: Task 4.

---

## File map

Create (all under `web/`):
- `src/components/site/page-banner.tsx`: slim photo banner + glass title panel for inner pages.
- `src/components/site/json-ld.tsx`: renders one JSON-LD script.
- `src/lib/basket.ts`, `src/lib/basket-pricing.ts`, `src/components/basket/{use-basket.ts,basket-pill.tsx,add-to-request.tsx}`.
- `src/lib/services.ts`, `src/app/services/page.tsx`, `src/app/services/[code]/page.tsx`.
- `src/app/amc/page.tsx`, `src/components/amc/amc-plans.tsx`.
- `src/lib/shop.ts`, `src/lib/bill-saver.ts`, `src/app/shop/page.tsx`, `src/components/shop/{shop-browser,product-card,bill-saver}.tsx`.
- `src/app/shop/[id]/page.tsx`, `src/components/shop/seller-disclosure.tsx`.
- `src/lib/request-schema.ts`, `src/lib/client-ip.ts`, `src/app/api/request/route.ts`, `src/app/api/track/route.ts`.
- `src/app/book/page.tsx`, `src/components/book/{book-flow,step-items,step-where,step-details,confirmation}.tsx`, `src/components/forms/{consent-fields,use-request-submit}.ts(x)`.
- `src/app/track/page.tsx`, `src/components/track/{track-form,track-timeline}.tsx`, `src/lib/track.ts`.
- `src/app/contact/page.tsx`, `src/app/sell/page.tsx`, `src/components/forms/{contact-form,seller-form}.tsx`.
- `src/app/account/page.tsx`, `src/app/legal/[doc]/page.tsx`, `src/lib/legal.ts`.
- `src/lib/seo.ts`, `src/lib/legacy-redirects.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`.
- Tests: one file per task as named in each task.

Modify: `src/app/globals.css` (banner, `--header-h`), `src/app/not-found.tsx`, `src/app/error.tsx`, `src/components/site/site-header.tsx` (basket pill), `src/components/home/xray-section.tsx` (use `groupServices`), `src/components/home/pincode-check.tsx` (export `checkPincode`), `src/lib/amc.ts`, `src/app/page.tsx` + `src/app/layout.tsx` (JSON-LD), `next.config.ts` (redirects), `dev/mock-pys.mjs` + `dev/fixtures/track.json`.

---

### Task 1: Inner-page frame (banner, not-found, error, account)

**Files:**
- Create: `src/components/site/page-banner.tsx`, `src/app/account/page.tsx`
- Modify: `src/app/globals.css`, `src/app/not-found.tsx`, `src/app/error.tsx`
- Test: `tests/page-banner.test.tsx`

**Interfaces:**
- Consumes: `getImageProps` pattern from `components/home/hero/hero-photos.tsx` (same four photos, `quality: 70`).
- Produces: `PageBanner({ title, intro, crumbs, children }: { title: string; intro?: string; crumbs?: Array<{ href: string; label: string }>; children?: React.ReactNode })` (server). CSS var `--header-h` (86px; 78px ≤760px).

- [ ] **Step 1: Failing test** `tests/page-banner.test.tsx` (jsdom): renders one `<h1>` with the title, the intro paragraph, a `nav[aria-label="Breadcrumb"]` whose last item has `aria-current="page"`, and both banner images have `alt=""`.
- [ ] **Step 2:** Run `npx vitest run tests/page-banner.test.tsx`, expect FAIL (module not found).
- [ ] **Step 3: Implement.** Banner = `clamp(190px, 30vh, 280px)` strip of the day/night photos (`object-position: 50% 18%`, same day/night CSS swap as the hero), pulled up behind the sticky header with `margin-top: calc(-1 * var(--header-h))`, bottom fade into `--page`. A soft air shimmer: one blurred white band drifting left→right over 9 s (`.banner-air`, off under reduced motion). Glass title panel (`.glass-strong`, radius 30px) overlaps the banner bottom by 48px: crumbs (Home › …), `h1` (display width 118%, weight 800, `clamp(30px, 5vw, 52px)`), intro, optional `children` (e.g. chips). Title reveal: panel rises 16px + fades over 0.6 s (`.banner-rise`).
- [ ] **Step 4: Restyle** `not-found.tsx` (banner title "This page does not exist", intro, taxi "Book a service", glass "Go to the home page") and `error.tsx` (client; title "Something went wrong", "Try again" calls `reset()`, quiet link to `/contact`). Create `/account`: banner "Your account", glass card "Customer login is coming soon. Until then you can track any request with its tracking code and mobile number." + taxi link to `/track`; `metadata.robots = { index: false }`.
- [ ] **Step 5:** Run tests, PASS; `npx tsc --noEmit` clean. Visual check `/account` and `/nope` at 1440 and 390, day and night: photo sits behind the header pill, title readable, no horizontal scroll.
- [ ] **Step 6: Commit** `feat(web): inner-page banner, account, not-found and error pages`.

### Task 2: Basket (lines, live pricing, storage, nav pill, add button)

**Files:**
- Create: `src/lib/basket.ts`, `src/lib/basket-pricing.ts`, `src/components/basket/use-basket.ts`, `src/components/basket/basket-pill.tsx`, `src/components/basket/add-to-request.tsx`
- Modify: `src/components/site/site-header.tsx` (pill next to the theme switch)
- Test: `tests/basket.test.ts`, `tests/basket-pricing.test.ts`, `tests/add-to-request.test.tsx`

**Interfaces:**
- Consumes: `Catalog`, `CatalogService`, `CatalogAmcPlan`, `Product`, `PriceBreakup` (types.ts).
- Produces:
  - `type LineType = 'SERVICE' | 'AMC' | 'PRODUCT'`; `type AcType = 'SPLIT' | 'WINDOW' | 'CASSETTE' | 'TOWER' | 'UNKNOWN'`; `interface LineAc { type?: AcType; tonnage?: number }`
  - `interface BasketLine { key: string; type: LineType; ref: string; name: string; quantity: number; ac?: LineAc }` (`ref` = service code, AMC plan code or product id; `name` only for display when offline)
  - `interface Basket { v: 1; lines: BasketLine[] }`; `BASKET_KEY = 'ess-basket'`, `MAX_LINES = 30`, `MAX_QTY = 20`
  - `lineKey(type, ref, ac?): string` = `` `${type}:${ref}:${ac?.type ?? ''}:${ac?.tonnage ?? ''}` ``
  - `addLine(b: Basket, line: { type: LineType; ref: string; name: string; quantity?: number; ac?: LineAc }): { basket: Basket; result: 'added' | 'increased' | 'full' }`
  - `removeLine(b, key)`, `setQuantity(b, key, q)` (clamped 1–20), `setLineAc(b, key, ac)` (re-keys; merges quantities if the new key exists), `parseBasket(raw: string | null): Basket`, `EMPTY_BASKET`
  - `type PricedLine = { line: BasketLine; status: 'ok'; unit: number | null; label: string } | { line: BasketLine; status: 'unavailable' }`
  - `priceLine(line, catalog: Pick<Catalog, 'services' | 'amcPlans'>, products: Product[]): PricedLine`; `basketTotals(lines: PricedLine[]): { known: number; hasUnpriced: boolean; unavailable: number }`
  - `useBasket(): { basket: Basket; add(...): 'added' | 'increased' | 'full'; remove(key); setQuantity(key, q); setAc(key, ac); clear() }` (client, `useSyncExternalStore`; listens to `storage` and a `ess-basket-change` window event; server snapshot = `EMPTY_BASKET`; storage errors fall back to an in-memory copy)
  - `BasketPill()` (link to `/book`, "Your request, N items", hidden when 0); `AddToRequest({ line, className }: { line: Parameters<typeof addLine>[1]; className?: string })`

- [ ] **Step 1: Failing tests** `tests/basket.test.ts`: adding the same service twice → one line, quantity 2, result `'increased'`; same service with different `ac` → two lines; quantity never exceeds 20; 31st distinct line → `'full'`, basket unchanged; `setLineAc` onto an existing key merges quantities; `parseBasket` returns `EMPTY_BASKET` for `null`, `'{'`, `'{"v":0,"lines":[]}'`, and drops lines with unknown `type`, empty `ref` or non-integer quantity while keeping valid ones.
- [ ] **Step 2: Failing tests** `tests/basket-pricing.test.ts` (port the PYS `basketPricing` rules exactly; fixture = `dev/fixtures/catalog.json`, `products.json`): `SVC-JET-WASH` → `unit 1414.82`; `SVC-PCB` → `unit null`; AMC `ORD-4` with `{type:'SPLIT', tonnage:1.5}` → `rates.splitLarge.total`; `ORD-4` with `{type:'SPLIT', tonnage:1}` → `splitSmall`; `ORD-4` with tonnage 2.5 or type `CASSETTE` or no ac → `unit null`; `JKT-2` with no ac → `rates.flat.total`; product `nlbvy46fALr4txUIZfqr` → `33990`; unknown code or product id → `'unavailable'`; `basketTotals` sums `unit × quantity` of ok lines, `hasUnpriced` true when any ok line has `unit null`, counts unavailable.
- [ ] **Step 3: Failing test** `tests/add-to-request.test.tsx` (jsdom): clicking "Add to request" writes `ess-basket` in localStorage, the button reads "Added" with a "View request" link to `/book`, and a rendered `BasketPill` shows "1"; with `localStorage.setItem` throwing, the click still shows "Added" and the pill shows "1".
- [ ] **Step 4:** Run the three files, expect FAIL.
- [ ] **Step 5: Implement.** Small = tonnage 0.75–1.0, large = 1.5–2.2 (as PYS). `useBasket` caches the parsed snapshot by raw string so `useSyncExternalStore` gets a stable object. Add button: taxi `sm`, after add shows "Added ✓" for 2.5 s with the quiet "View request" link; `'full'` shows "Your request is full (30 items)". Pill: glass round-pill with a basket icon and count badge (`aria-label` "Your request: N items"), in the header before `ThemeSwitch`.
- [ ] **Step 6:** Run tests PASS; `tsc` clean.
- [ ] **Step 7: Commit** `feat(web): request basket with live prices and nav pill`.

### Task 3: Services and AMC pages

**Files:**
- Create: `src/lib/services.ts`, `src/app/services/page.tsx`, `src/app/services/[code]/page.tsx`, `src/app/amc/page.tsx`, `src/components/amc/amc-plans.tsx`
- Modify: `src/components/home/xray-section.tsx` (import `groupServices`, drop its own `CATEGORY_LABEL`), `src/lib/amc.ts`
- Test: `tests/services.test.ts`, `tests/amc-plans.test.tsx`

**Interfaces:**
- Consumes: `getCatalog`, `getSiteBasics` (data.ts); `PageBanner` (Task 1); `AddToRequest` (Task 2); `servicePriceText`, `gstBreakupText`, `formatInr`; `amcCard` (amc.ts).
- Produces:
  - `SERVICE_GROUPS = [{ category: 'CLEANING', label: 'Cleaning' }, { category: 'GAS', label: 'Gas' }, { category: 'INSTALLATION', label: 'Installation' }, { category: 'DIAGNOSIS', label: 'Diagnosis' }, { category: 'REPAIR', label: 'Repairs', note: 'Priced after the diagnosis visit' }] as const`
  - `groupServices(services: CatalogService[]): Array<{ category: string; label: string; note?: string; items: CatalogService[] }>` (public + active only, `displayOrder` order, unknown categories after the known ones under their own name, empty groups dropped)
  - `serviceSlug(code) = code.toLowerCase()`; `findService(services, slug): CatalogService | null` (public + active only); `relatedServices(services, s, n = 3)` (same category first, then the rest, never `s`)
  - `AMC_SIZES = [{ key: 'splitSmall', type: 'SPLIT', label: 'Split · up to 1 ton', tonnages: [0.75, 1] }, { key: 'splitLarge', type: 'SPLIT', label: 'Split · 1.5–2 ton', tonnages: [1.5, 2] }, { key: 'windowSmall', type: 'WINDOW', label: 'Window · up to 1 ton', tonnages: [0.75, 1] }, { key: 'windowLarge', type: 'WINDOW', label: 'Window · 1.5–2 ton', tonnages: [1.5, 2] }] as const`
  - `amcRateFor(plan: CatalogAmcPlan, sizeKey): PriceBreakup | null` (flat rate wins, as PYS)
  - `AmcPlans({ plans }: { plans: CatalogAmcPlan[] })` (client)

- [ ] **Step 1: Failing tests** `tests/services.test.ts`: `groupServices(fixture)` → labels in order Cleaning, Gas, Installation, Diagnosis, Repairs, Repairs has the note, a non-public or inactive service is absent; `findService(fixture, 'svc-jet-wash')?.code === 'SVC-JET-WASH'`, `findService(fixture, 'svc-nope') === null`; `relatedServices` for `SVC-JET-WASH` starts with the other Cleaning services and has length 3. `amcRateFor(JKT-2, 'windowSmall')` = flat; `amcRateFor(SAMC-3, 'splitSmall') === null`.
- [ ] **Step 2: Failing test** `tests/amc-plans.test.tsx` (jsdom, fixture plans): default size "Split · up to 1 ton"; each card shows "{n} visits a year", covers, and the price for that size or "Not for this AC" (button disabled); choosing "Window · 1.5–2 ton" and a 2-ton chip then "Add to request" stores an `AMC` line with `ac {type:'WINDOW', tonnage:2}`.
- [ ] **Step 3:** Run, expect FAIL.
- [ ] **Step 4: Implement `/services`.** Read the Next docs pages for `page.js`, `generateStaticParams`, `generateMetadata` and dynamic `params` (a Promise in this version) first. Banner "Services and prices", intro "Every price includes GST. Repairs are priced after a diagnosis visit." Groups as glass cards: name, short description, price (`servicePriceText` + "incl. GST" when priced), duration when set, "What's included" link to the detail page, `AddToRequest` (`type 'SERVICE'`, `ref` = code). Sticky group chips on top link to `#cleaning` etc.
- [ ] **Step 5: Implement `/services/[code]`.** `generateStaticParams` from the catalog (catch → `[]`); unknown slug → `notFound()`. Sections: price card (total, `gstBreakupText`, pricing note for FROM / QUOTE), What's included / Not included lists (hidden when empty), duration, "Works on" AC types, "{warrantyDays}-day warranty on our work" when the service's `warrantyDays` or `identity.warrantyDays` > 0, taxi "Book this" = `AddToRequest` + quiet link to `/book`, related services (3 cards). `generateMetadata`: title = service name, description = short description or "{name} in Mumbai, Thane and Navi Mumbai. Price incl. GST.".
- [ ] **Step 6: Implement `/amc`.** Banner "AMC plans", intro "A yearly plan for regular service visits. Choose your AC to see its price.", `AmcPlans`: neumorphic segmented size picker (`AMC_SIZES`), tonnage chips for the chosen size, plan cards grouped by `category` (Ordinary, Semi-comprehensive, Special comprehensive, Premium jacket; label = title-cased category), "Compare" table on ≥1024px (rows = plans, columns = the 4 sizes + "Any AC" when a flat rate exists, cells `formatInr(total)` or "—"), coverage summary text from PYS when present. Small print: "Prices are per AC per year and include GST."
- [ ] **Step 7:** Run tests PASS; visual check of the three pages at 1440 and 390 (cards stack, table hidden on phones).
- [ ] **Step 8: Commit** `feat(web): services, service detail and AMC pages`.

### Task 4: Shop with filters and bill saver

**Files:**
- Create: `src/lib/shop.ts`, `src/lib/bill-saver.ts`, `src/app/shop/page.tsx`, `src/components/shop/shop-browser.tsx`, `src/components/shop/product-card.tsx`, `src/components/shop/bill-saver.tsx`
- Modify: `src/components/home/ac-types-section.tsx` (use `ProductCard` for featured ACs)
- Test: `tests/shop.test.ts`, `tests/bill-saver.test.ts`, `tests/shop-browser.test.tsx`

**Interfaces:**
- Consumes: `getProducts`; `kindOf`, `AcKind` (ac-kind.ts); `ProductArt`; `AddToRequest`; `formatInr`.
- Produces:
  - `interface ShopFilters { type: AcKind | null; ton: 'upto1' | '1.5' | '2plus' | null; brand: string | null; star: 3 | 4 | 5 | null; max: number | null; sort: 'featured' | 'price-asc' | 'price-desc' }`
  - `parseShopFilters(p: URLSearchParams, brands: string[]): ShopFilters` (unknown/invalid values → null/'featured'; `brand` must match a known brand case-insensitively and returns its canonical spelling); `shopQuery(f: ShopFilters): string` (only non-default keys, stable order `type,ton,brand,star,max,sort`)
  - `tonnageOf(p: Product): number | null` (first number in `tonnage`, e.g. "1.5 TR" → 1.5; "10,000 CFM" → null); `starOf(p): number | null` (`/(\d)\s*star/i`)
  - `filterProducts(products: Product[], f: ShopFilters): Product[]` (`ton` buckets: ≤1, 1.1–1.5, ≥1.6; `max` keeps priced products ≤ max and drops price-on-request ones; featured = `displayOrder`; price sorts put price-on-request last)
  - `shopFacets(products): { brands: string[]; maxPrices: number[] }` (brands sorted A–Z; `maxPrices` = those of `[30000, 40000, 50000, 75000, 100000]` below the highest price)
  - `BILL_ASSUMPTIONS = { kwPerTonNow: 0.9, ageFactor: { new: 1, mid: 1.1, old: 1.2 }, afterServiceSaving: 0.1, kwPerTonNewInverter: 0.55, daysPerMonth: 30, defaultTariff: 10 } as const`
  - `billEstimate(input: { tonnage: 1 | 1.5 | 2; age: 'new' | 'mid' | 'old'; hoursPerDay: number; tariff: number }): { now: number; afterService: number; newInverter: number }` (monthly ₹, each rounded to nearest 10): `now = ton × kwPerTonNow × ageFactor × hours × days × tariff`; `afterService = now × (1 − afterServiceSaving)` (from the unrounded `now`); `newInverter = ton × kwPerTonNewInverter × hours × days × tariff`. `hoursPerDay` clamped 1–24, `tariff` clamped 1–30.
  - `ShopBrowser({ products }: { products: Product[] })` (client, reads/writes the URL with `useSearchParams` + `router.replace(…, { scroll: false })`); `ProductCard({ product })`; `BillSaver()` (client)

- [ ] **Step 1: Failing tests** `tests/shop.test.ts`: `parseShopFilters(new URLSearchParams('type=rocket&max=abc&star=9&brand=daikin'), ['Daikin','Voltas'])` → `{ type:null, max:null, star:null, brand:'Daikin', ton:null, sort:'featured' }`; `type=split&ton=1.5` on the fixture returns only split products with tonnage 1.5; `max=30000` returns only `CbGQjrQkG6M0D4zx9553` (28990); `sort=price-asc` puts price-on-request products last; `tonnageOf` cases above; `shopQuery` round-trips; a filter set with no matches → `[]`.
- [ ] **Step 2: Failing tests** `tests/bill-saver.test.ts`: `billEstimate({tonnage:1.5, age:'mid', hoursPerDay:8, tariff:10})` → `{ now: 3560, afterService: 3210, newInverter: 1980 }`; hours 0 behaves as 1; `newInverter < afterService < now` for every age band.
- [ ] **Step 3: Failing test** `tests/shop-browser.test.tsx` (jsdom, mock `next/navigation`): with search `?type=window` only window products render and the "Window" chip is pressed; choosing brand "Voltas" calls `router.replace('/shop?type=window&brand=Voltas', { scroll: false })`; with no matches the text "No ACs match these filters" and a "Clear filters" button appear.
- [ ] **Step 4:** Run, expect FAIL.
- [ ] **Step 5: Implement.** `/shop` banner "New ACs", intro "Prices include GST. Sold by Extreme Sales & Services unless shown otherwise." `ShopBrowser` inside `<Suspense>` (fallback = skeleton grid): filter bar of glass chips (Type, Size, Brand select, Stars, Up to ₹, Sort), phones get a "Filters" button opening the same controls in a glass sheet; result count "N ACs"; grid of `ProductCard` (art, brand, name, tonnage/star chips, price "₹X incl. GST" with MRP struck through when `mrp > price`, "Price on request" when null, "Out of stock" badge, "Sold by {seller.name}", links to `/shop/[id]`, `AddToRequest` type `PRODUCT`). `BillSaver` below the grid: glass card titled "Bill saver", inputs AC size (1 / 1.5 / 2 ton segmented), age (Under 3 years / 3–7 years / 8+ years), hours a day (range 1–24, default 8), "Your unit rate (₹ per unit, see your bill)" default 10; three result bars (now / after a service / new 5-star inverter) animated on change (CSS width transition); text "Rough estimate, not a promise. It assumes {kwPerTonNow} kW per ton for your AC now, {10}% better after a service, {kwPerTonNewInverter} kW per ton for a new 5-star inverter, and 30 days a month. Your bill also depends on room size, sun and settings." Buttons: quiet "Book a service" (`/services/svc-jet-wash`), quiet "See 5-star ACs" (`/shop?star=5`).
- [ ] **Step 6:** Run tests PASS; visual check 1440 and 390 (no horizontal scroll, sheet opens and closes with Escape).
- [ ] **Step 7: Commit** `feat(web): shop with filters and bill saver`.

### Task 5: Product page with seller disclosure

**Files:**
- Create: `src/app/shop/[id]/page.tsx`, `src/components/shop/seller-disclosure.tsx`
- Test: `tests/seller-disclosure.test.tsx`

**Interfaces:**
- Consumes: `getProduct`, `getProducts`, `getSiteBasics`; `ProductArt`, `ProductCard`, `AddToRequest`, `kindOf`.
- Produces: `SellerDisclosure({ seller }: { seller: SellerDisclosure })` (server).

- [ ] **Step 1: Failing test** (jsdom): renders "Sold by" + `seller.name`, legal name when different, address, GSTIN, phone, email, grievance officer (name or "Grievance officer" + email/phone), return policy text or "Returns: ask us before you buy; we will explain the brand's policy." when null; missing fields are left out, never "null".
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3: Implement.** `generateStaticParams` from products (catch → `[]`), unknown id → `notFound()`. Layout: art/photo (glass frame) left; right: brand, `h1` name, chips (type, tonnage, star), price card ("₹X incl. GST", MRP struck when higher, "You save ₹Y" only when `mrp > price`, "Price on request" + "Ask for a price" = AddToRequest when null), stock state, `AddToRequest`, quiet "Questions? Call us" tel link. Below: key features, specs table (only non-null rows: Cooling capacity, Power use, Refrigerant, Noise, Size, Country of origin), warranty text from product (no invented warranty), description, `SellerDisclosure`, 3 more ACs of the same kind (`ProductCard`). `generateMetadata`: title name, description "{brand} {name}, ₹{price} incl. GST. Sold by {seller.name}." (price part left out when null).
- [ ] **Step 4:** Run tests PASS; visual check one priced and one price-on-request product.
- [ ] **Step 5: Commit** `feat(web): product page with seller disclosure`.

### Task 6: Request and track routes (server side of all forms)

**Files:**
- Create: `src/lib/request-schema.ts`, `src/lib/client-ip.ts`, `src/app/api/request/route.ts`, `src/app/api/track/route.ts`, `dev/fixtures/track.json`
- Modify: `dev/mock-pys.mjs`
- Test: `tests/request-schema.test.ts`, `tests/request-route.test.ts`, `tests/track-route.test.ts`

**Interfaces:**
- Consumes: `pysRequest`, `PysError`, `serverEnv` (secret used as the hash salt), `TrackResult`, `IntakeCreated`.
- Produces:
  - `normalizeIndianMobile(v: string): string | null`
  - `requestSchema` = zod discriminated union on `kind`, shared by browser and server:
    - common: `ref` (`^[A-Za-z0-9_.:-]{8,200}$`), `contact { name, phone (normalised), email? }`, `consent { privacy: true, marketing: boolean }`, `hp: string` (≤500), `elapsedMs: int ≥ 0`
    - `BASKET`: `items[1..30] { type, ref, quantity 1–20, ac? { type?, tonnage? } }`, `address? { line, area?, landmark?, city, pincode? }` (required when any item is SERVICE or AMC), `when? { date?, slot? }`, `message?`
    - `CONTACT`: `message` (5–2000)
    - `SELLER_INTEREST`: `business { name 2–120, city 2–80, gstin? (15 chars, `^[0-9A-Z]{15}$` after upper-casing), sells 2–300 }`, `message?`
  - `type SiteRequest = z.infer<typeof requestSchema>`; `fieldErrors(issues): Record<string, string>` (path joined with `.`, first message wins)
  - `toPysIntake(r: SiteRequest, clientIpHash: string | undefined): object` = PYS `createIntakeSchema` body: `externalReferenceId = r.ref`; BASKET items map `ref` → `serviceCode` / `amcPlanCode` / `productId`; `when` → `request.preferredDate/preferredSlot`; `message` → `request.message`; SELLER_INTEREST message = `"Business: {name}\nCity: {city}\nGSTIN: {gstin or 'not given'}\nSells: {sells}\n\n{message}"`; `consent.noticeVersion '2026-11-19'`; `meta { clientIpHash, honeypot: hp, elapsedMs }`
  - `hashClientIp(headers: Headers, salt: string): string | undefined` = sha256 hex of `ip + salt`; ip = first `x-forwarded-for` entry, else `x-real-ip`, else undefined
  - `POST /api/request` → 200 `{ trackingCode, intakeNumber }`; 400 `{ error: 'Please check the highlighted details.', fields }` on schema failure (no PYS call); 422 same shape when PYS returns validation details (`details[].field` like `items.2.productId` → key `items.2`; `contact.phone` kept); 502 `{ error: 'We could not send your request right now. Please try again in a minute, or call us.' }` otherwise. PYS call: `pysRequest('POST', '/intakes', { body, headers: { 'Idempotency-Key': r.ref }, timeoutMs: 70_000, retries: 1 })`. Response `Cache-Control: no-store`.
  - `POST /api/track` body `{ code, phone }` → 200 `TrackResult`; 400 `{ error: 'Enter your tracking code and the 10-digit mobile number you used.' }` (no PYS call) when code is not 6–20 chars after trim/upper-case or phone invalid; PYS 404 → 404 `{ error: 'No request matches this tracking code and mobile number.' }`; PYS 429 → 429 with PYS's message; other → 502 `{ error: 'Could not check right now. Please try again in a minute or call us.' }`.

- [ ] **Step 1: Failing tests** `tests/request-schema.test.ts`: `normalizeIndianMobile('+91 98765 43210') === '9876543210'`, `('098765-43210') === '9876543210'`, `('919876543210') === '9876543210'`, `('12345') === null`, `('5876543210') === null`; a BASKET with a SERVICE item and no address fails at path `address`; a products-only BASKET without address passes; `when.date` yesterday (India time) fails; CONTACT with a 3-char message fails; `toPysIntake` maps an AMC item to `{ type:'AMC', amcPlanCode:'ORD-4', quantity:1, ac:{type:'SPLIT', tonnage:1.5} }` and builds the SELLER_INTEREST message exactly as above.
- [ ] **Step 2: Failing tests** `tests/request-route.test.ts` (mock `pysRequest`): valid basket → 200 and `pysRequest` called once with `headers['Idempotency-Key'] === body.ref` and `body.externalReferenceId === body.ref` and `meta.clientIpHash` a 64-char hex when `x-forwarded-for: 1.2.3.4, 5.6.7.8` is sent; invalid phone → 400 with `fields['contact.phone']` and no PYS call; `PysError(422, 'VALIDATION_ERROR', '…', [{ field: 'items.0.productId', message: 'This AC is no longer available' }])` → 422 `fields['items.0'] === 'This AC is no longer available'`; `PysError(503, …)` → 502. `tests/track-route.test.ts`: `{ code: ' ess-abcd-1234 ', phone: '+91 98765 43210' }` → PYS called with `{ code: 'ESS-ABCD-1234', phone: '9876543210', clientIpHash }`; PYS 404 → 404 message; 429 → 429 passthrough; bad phone → 400, no call.
- [ ] **Step 3:** Run, expect FAIL.
- [ ] **Step 4: Implement** (read the Next route-handler docs page first). Mock PYS: `/intakes` checks each BASKET item against the fixtures and answers 422 `{ success:false, error:{ code:'VALIDATION_ERROR', message:'Request validation failed', details:[{ field:'items.N.productId', message:'This AC is no longer available' }] } }` for unknown refs; `/track` answers 200 with `dev/fixtures/track.json` for code `ESS-LOCL-DEV2` + phone `9876543210`, 429 for phone `9999999999`, else 404. The fixture uses real customer-status values (status `SCHEDULED`, step 3, steps 1–6 labels from PYS `customerStatus`, a visit date, technician first name "Ravi", two items with prices taken from the catalog fixture).
- [ ] **Step 5:** Run tests PASS; `tsc` clean.
- [ ] **Step 6: Commit** `feat(web): request and tracking routes to PYS`.

### Task 7: /book, the 3-step request

**Files:**
- Create: `src/app/book/page.tsx`, `src/components/book/{book-flow,step-items,step-where,step-details,confirmation}.tsx`, `src/components/forms/consent-fields.tsx`, `src/components/forms/use-request-submit.ts`
- Test: `tests/book-flow.test.tsx`, `tests/use-request-submit.test.tsx`

**Interfaces:**
- Consumes: `useBasket`, `priceLine`, `basketTotals` (Task 2); `requestSchema`, `fieldErrors`, `SiteRequest` (Task 6); `PincodeCheck` logic (`components/home/pincode-check.tsx`; extract its fetch into `checkPincode(pincode: string): Promise<{ serviceable: boolean; area: string | null } | { error: string }>` in the same file and reuse it); `Field`, `Input`, `Select`, `Textarea`; `getCatalog`, `getProducts`, `getSiteBasics`.
- Produces:
  - `ConsentFields({ errors })` (the two checkboxes + hidden honeypot, exact copy from Global Constraints)
  - `useRequestSubmit(): { state: 'idle' | 'sending' | 'done' | 'error'; result: IntakeCreated | null; error: string | null; fields: Record<string, string>; send(build: (ref: string) => SiteRequest): Promise<void>; elapsedMs(): number }` (one `ref` = `web-${crypto.randomUUID()}` kept until success; ignores `send` while sending; re-uses the same `ref` after an error)
  - `BookFlow({ catalog, products, phone })` (client)

- [ ] **Step 1: Failing tests** `tests/use-request-submit.test.tsx`: two quick `send` calls → one `fetch('/api/request')`; after a 502 the next `send` posts the same `ref`; after success the result holds `trackingCode` and a later `send` uses a new `ref`. `tests/book-flow.test.tsx` (jsdom, fixtures, mocked `fetch` and `next/navigation`): `?service=SVC-DIAG` on first load adds one Diagnosis line and the URL is replaced with `/book`; reload with the same query does not add it twice (the query is removed); a basket line with an unknown code shows "No longer available" and the Continue button is disabled until it is removed; step 2 is skipped for a products-only basket (address optional, no date/slot); step 3 without the privacy box ticked shows the error on the checkbox and sends nothing; a full happy path posts a BASKET whose items match the basket and shows the confirmation with the tracking code, a Copy button and a "Track this request" link to `/track?code=ESS-LOCL-DEV2`, and the basket is empty afterwards.
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3: Implement `/book`** (server: fetch catalog, products, basics with the same `.catch` fallbacks as the home page; `BookFlow` in `<Suspense>`; `metadata.robots = { index: false }`). Glass step header "1 What you need · 2 Where and when · 3 Your details" (current step `aria-current="step"`, steps you passed are buttons). Step 1: lines with name, AC type select (Split / Window / Cassette / Floor-standing / Not sure → `UNKNOWN`), size select (0.75 / 1 / 1.5 / 2 / 2.5+ ton / Not sure; 2.5+ sends 2.5) shown for SERVICE and AMC lines, neumorphic quantity stepper, live unit price or "Price after inspection", Remove; total "₹X incl. GST" + "Some items are priced after inspection" when `hasUnpriced`; empty basket = glass empty state with links to Services, AMC plans, Shop ACs; "Add something else" quiet links. Step 2: address line, area, landmark, city (select Mumbai / Thane / Navi Mumbai / Other → free text), pincode with inline check (`checkPincode`, not blocking: outside area shows "We don't usually cover this pincode; we'll call you to confirm."), preferred date (`min` = today in India, `max` = today + 60 days), slot segmented (Morning 9–12 / Afternoon 12–4 / Evening 4–7 → `MORNING|AFTERNOON|EVENING`), both optional. Step 3: name, mobile (`inputMode="tel"`), email optional, note optional, `ConsentFields`, taxi "Send request". Client-side `requestSchema.safeParse` before sending; field errors under each field and focus moves to the first one. Sending state per Global Constraints. Confirmation (replaces the steps): glass card "Request sent", tracking code large in tabular figures, Copy, "We'll call you to confirm the visit and the price before any extra work. Keep this code to track your request.", taxi "Track this request", quiet "Back to home".
- [ ] **Step 4:** Run tests PASS.
- [ ] **Step 5: End-to-end check** with the mock PYS + `npx next dev -p 3100` in Playwright (call `page.bringToFront()` first): add a service on `/services`, an AMC plan on `/amc`, an AC on `/shop/[id]`; the pill shows 3; complete `/book` at 390px; the confirmation shows `ESS-LOCL-DEV2`. Then add a product with an unknown id to `ess-basket` by hand → "No longer available".
- [ ] **Step 6: Commit** `feat(web): book page sends the whole basket as one request`.

### Task 8: /track

**Files:**
- Create: `src/lib/track.ts`, `src/app/track/page.tsx`, `src/components/track/track-form.tsx`, `src/components/track/track-timeline.tsx`
- Test: `tests/track.test.ts`, `tests/track-form.test.tsx`

**Interfaces:**
- Consumes: `TrackResult`, `CustomerStatus` (types.ts); `normalizeIndianMobile` (Task 6); `StatusBadge`; `formatDate`, `formatInr`.
- Produces:
  - `ITEM_STATUS_LABEL: Record<TrackResult['items'][number]['status'], string>` = PENDING "Waiting for confirmation", CONFIRMED "Confirmed", SELLER_WILL_QUOTE "Seller will send a price", DONE "Done", NOT_ACCEPTED "Not accepted", CANCELLED "Cancelled"
  - `SLOT_LABEL = { MORNING: 'Morning (9–12)', AFTERNOON: 'Afternoon (12–4)', EVENING: 'Evening (4–7)' }`
  - `timelineSteps(r: TrackResult): Array<{ step: number; label: string; state: 'done' | 'current' | 'todo' }>` (steps before `status.step` done, equal current, after todo; when `status.sideState` the current step keeps state `current` and the badge shows the side label)
  - `visitText(r): string | null` ("Wed, 25 Nov 2026, 10:00–12:00 · Technician: Ravi"; time and technician parts left out when null)
  - `TrackForm({ initialCode })` (client), `TrackTimeline({ result })`

- [ ] **Step 1: Failing tests** `tests/track.test.ts`: on the track fixture `timelineSteps` gives steps 1–2 done, 3 current, 4–6 todo; `visitText` exact string for the fixture; with `visit.technicianFirstName null` the technician part is absent; with `visit null` → `null`. `tests/track-form.test.tsx` (jsdom, mocked `fetch`): `initialCode` prefilled from `?code=`; phone "12345" → "Enter the 10-digit mobile number you used." with no fetch; code typed lower-case is sent upper-case; a 404 shows "No request matches this tracking code and mobile number." in an `role="alert"` region; a 200 renders the timeline and items with their status labels and prices.
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3: Implement.** `/track` banner "Track your request", intro "Use the tracking code from your confirmation and the mobile number you gave us." Page reads `searchParams.code` inside a `<Suspense>`-wrapped client form (`useSearchParams`). Result: glass card with request number, `StatusBadge`, horizontal stepper on desktop / vertical on phones (done = cool tick, current = taxi ring pulse, off under reduced motion), preferred date/slot when no visit yet, `visitText`, area, items list (name × qty, status label, price "₹X" or "Price after inspection"), "Questions? Call us" tel link and a "Check another request" button that clears the result. Phone number is never written to the URL.
- [ ] **Step 4:** Run tests PASS; Playwright: `/track?code=ESS-LOCL-DEV2` + `98765 43210` shows the timeline at 1440 and 390.
- [ ] **Step 5: Commit** `feat(web): track a request with code and mobile`.

### Task 9: Contact and Sell on ESS

**Files:**
- Create: `src/app/contact/page.tsx`, `src/app/sell/page.tsx`, `src/components/forms/contact-form.tsx`, `src/components/forms/seller-form.tsx`
- Test: `tests/contact-forms.test.tsx`

**Interfaces:**
- Consumes: `useRequestSubmit`, `ConsentFields` (Task 7); `requestSchema` (Task 6); `PincodeCheck`; `getSiteBasics`, `getServiceAreas`.
- Produces: `ContactForm()`, `SellerForm()` (client).

- [ ] **Step 1: Failing tests** (jsdom, mocked `fetch`): ContactForm sends `{ kind: 'CONTACT', message, contact, consent, hp: '', elapsedMs }` and shows "Message sent. Your reference is {trackingCode}. We'll reply within our opening hours." (no unconfirmed time promise); SellerForm sends `kind: 'SELLER_INTEREST'` with `business { name, city, gstin, sells }`, upper-cases the GSTIN, rejects a 14-character GSTIN with "GSTIN has 15 letters and digits." and no fetch.
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3: Implement `/contact`.** Banner "Contact us". Two columns (stack on phones): glass card with phone (tel), WhatsApp (`https://wa.me/<digits>`), email, hours, address, "Open in Google Maps" (`https://www.google.com/maps/search/?api=1&query=` + encoded address), areas list from `getServiceAreas()` labels, `PincodeCheck`; glass form card "Send us a message" (name, mobile, email optional, message, consent). `generateMetadata` description with the address.
- [ ] **Step 4: Implement `/sell`.** Banner "Sell on ESS", intro "Selling ACs on ESS is coming soon. Dealers and brands can register interest now and we'll contact you when it opens." Form: your name, mobile, email optional, business name, city, GSTIN optional, "What do you sell?" (e.g. split ACs, spares), message optional, consent. Success: "Thanks. Your reference is {trackingCode}."
- [ ] **Step 5:** Run tests PASS; visual check both pages.
- [ ] **Step 6: Commit** `feat(web): contact and sell-on-ESS pages`.

### Task 10: Legal pages

**Files:**
- Create: `src/lib/legal.ts`, `src/app/legal/[doc]/page.tsx`
- Test: `tests/legal.test.ts`

**Interfaces:**
- Consumes: `getContentBlocks`, `getSiteBasics`; `PageBanner`.
- Produces: `type LegalDoc = 'privacy' | 'terms'`; `interface LegalBody { title: string; updatedOn: string; sections: Array<{ heading: string; paragraphs: string[] }> }`; `legalBody(doc: LegalDoc, block: unknown, identity: BusinessIdentity): LegalBody` (uses the published content block `legal.privacy` / `legal.terms` when it has a title and at least one section, else the bundled default; `{legalName}`, `{email}`, `{phone}`, `{address}`, `{grievanceName}` placeholders are filled from identity, `{grievanceName}` → "our grievance officer" when null).

- [ ] **Step 1: Failing tests:** an empty or malformed block → bundled default with identity values filled in and no `{` left; a valid block wins; unknown doc → page `notFound()` (test `generateStaticParams` returns exactly `privacy`, `terms`).
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3: Implement.** Bundled defaults: port the wording of the old site's `public/privacy.html` and `public/terms.html` (repo root), updated for the new site: remove Firebase / old login / customer-portal text, describe what the forms collect (name, mobile, email, address, AC details, request notes), why (to handle the request), who sees it (ESS staff, the seller of a product you ask about), how long (as long as needed for the service and tax records), rights under the DPDP Act 2023 (access, correction, erasure, grievance) with grievance officer contact, the localStorage basket (stays on your device), and no unconfirmed claims. Terms: prices incl. GST from the live list, repairs quoted after diagnosis, visit confirmation by phone, "{warrantyDays}-day warranty on our work" (from identity), products sold by the named seller with their warranty, governing law Mumbai. Page: banner title + "Last updated {updatedOn}", sections as readable prose (max 70ch). `updatedOn` default `'2026-11-19'`.
- [ ] **Step 4:** Run tests PASS.
- [ ] **Step 5: Commit** `feat(web): privacy notice and terms pages`.

### Task 11: SEO, sitemap, robots and old-site redirects

**Files:**
- Create: `src/lib/seo.ts`, `src/components/site/json-ld.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/lib/legacy-redirects.ts`
- Modify: `next.config.ts` (`redirects()`), `src/app/page.tsx` and `src/app/contact/page.tsx` (LocalBusiness), `src/app/services/[code]/page.tsx` (Service), `src/app/shop/[id]/page.tsx` (Product), every page from Tasks 1–10 (`metadata.alternates.canonical`)
- Test: `tests/seo.test.ts`, `tests/legacy-redirects.test.ts`

**Interfaces:**
- Consumes: `BusinessIdentity`, `CatalogService`, `Product`, `serverEnv().SITE_URL`, `serviceSlug`.
- Produces:
  - `localBusinessLd(identity, siteUrl): object` (`@type: 'HVACBusiness'`, name, url, telephone, email, address as `PostalAddress` with `addressLocality 'Mumbai'`, `addressRegion 'Maharashtra'`, `addressCountry 'IN'`, `areaServed` Mumbai/Thane/Navi Mumbai, `taxID` = GSTIN when set; no `aggregateRating`, no `review`)
  - `serviceLd(s, siteUrl): object` (`@type: 'Service'`, `provider` → the business, `offers` with `price` = `price.total`, `priceCurrency 'INR'` only when priced)
  - `productLd(p, siteUrl): object` (`@type: 'Product'`, brand, sku = modelNumber, `offers { price, priceCurrency 'INR', availability InStock/OutOfStock, seller { name } }` only when priced)
  - `JsonLd({ data }: { data: object })` (escapes `<` as `\u003c`)
  - `LEGACY_REDIRECTS: Array<{ source: string; destination: string; permanent: true }>` for both `/x.html` and clean `/x` forms: index→`/`, service→`/services`, products→`/shop`, status→`/track`, privacy→`/legal/privacy`, terms→`/legal/terms`, vendor→`/sell`, customer-portal and login→`/account`, admin and staff→`/admin`, plus `/amc.html`→`/amc`, `/contact.html`→`/contact`, `/404.html`→`/` (no entry for clean `/amc`, `/contact`: they are real pages)
  - `sitemap()`: `/`, `/services`, every `/services/[slug]`, `/amc`, `/shop`, every `/shop/[id]`, `/track`, `/contact`, `/sell`, `/legal/privacy`, `/legal/terms` (catalog/products errors → static routes only); `robots()`: allow `/`, disallow `/api/`, `/book`, `/account`, `/admin`, sitemap `${SITE_URL}/sitemap.xml`

- [ ] **Step 1: Failing tests** `tests/seo.test.ts`: `localBusinessLd(FALLBACK_IDENTITY, 'https://x.test')` has `@type 'HVACBusiness'`, `taxID '27ANTPP9778J1ZO'`, no `aggregateRating`; `serviceLd(SVC-PCB)` has no `offers`; `serviceLd(SVC-JET-WASH).offers.price === 1414.82`; `productLd` of an out-of-stock priced product → `availability 'https://schema.org/OutOfStock'`; `JsonLd` output for a name containing `</script>` contains no `</script>` inside the JSON. `tests/legacy-redirects.test.ts`: every source is unique, no source equals a real route (`/amc`, `/contact`, `/services`, `/shop`, `/track`, `/sell`, `/account`), `/service.html` → `/services`, `/status` → `/track`, all `permanent: true`.
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3: Implement** (read the Next docs pages for `sitemap`, `robots`, `redirects` and metadata `alternates` first). `next.config.ts` `redirects: async () => LEGACY_REDIRECTS` (relative import). Add `alternates: { canonical: '/path' }` to each page's metadata.
- [ ] **Step 4:** Run tests PASS; `npx next build` lists `/sitemap.xml` and `/robots.txt`; `curl -sI http://localhost:3100/service.html` (with `next start`) shows `308` to `/services`.
- [ ] **Step 5: Commit** `feat(web): SEO data, sitemap, robots and redirects from old page addresses`.

### Task 12: Whole-site check and preview

**Files:** none new (fixes only).

- [ ] **Step 1: Full check:** `npx tsc --noEmit`, `npx eslint src tests`, vitest (PowerShell, C:\ path), `npx next build` with the mock PYS running. Expected: all green; static pages (○/◐) for `/services`, `/services/[code]`, `/amc`, `/shop`, `/shop/[id]`, `/contact`, `/sell`, `/account`, `/legal/*`; no build-time errors from `useSearchParams` outside Suspense.
- [ ] **Step 2: Visual pass** (Playwright, `bringToFront()` first): every route at 1440×860 and 390×844, day and night, plus reduced motion: banner photo behind header, glass readable, no horizontal scroll (`document.documentElement.scrollWidth === innerWidth`), no console errors, floating Book pill hidden on `/book`. Screenshots under `PYS/.playwright-mcp/`.
- [ ] **Step 3: Accessibility quick pass:** keyboard through `/book` and `/track` (focus visible on glass, steps reachable, errors announced), each page has one `h1`, every form control has a label, contrast of muted text on glass in both themes ≥ 4.5:1 (spot-check with the computed colours).
- [ ] **Step 4: Copy audit:** `grep -rniE "90.?min|genuine|oem|certified|verified tech|trusted by|reviews?|₹ ?[0-9]" src` → only legitimate hits (no hard-coded prices, no banned claims); fix any.
- [ ] **Step 5: Commit** fixes `fix(web): inner pages polish from the whole-site check` and update the memory notes (hand-off + phase 2 progress).
- [ ] **Step 6: Tell the owner** what will be pushed (repo ESS, branch `phase-2-ess-rebuild`, the commits) and push only after their OK; confirm the `ess-web` preview build is READY and that a real request from the preview lands in the PYS Approval Inbox (then mark that test request as spam/cancelled in PYS with the owner's OK).
