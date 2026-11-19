# ESS Home Page (Mumbai Glass) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Bright Cool Air" home page with the approved Mumbai Glass design: photo hero with live AC/rain effects and glass UI, AC X-ray services section, AMC, AC types, 3 booking steps, contact & pincode check, and the site-wide design system (tokens, glass, taxi-yellow buttons, neumorphic day/night switch, floating contact) that plan 2 (inner pages + basket) will reuse.

**Architecture:** Server components fetch PYS data through the existing cached `lib/data.ts` reads and pass plain props to small client islands (hero scene, problem dock, X-ray, pincode check, theme switch, floating contact). All mapping logic (geometry, season note, offers, problem/part → service, AMC summary, AC-type tiles) lives in pure `lib/` modules with unit tests; client components only render and animate. GSAP (+ ScrollTrigger) runs only inside client islands via `@gsap/react`'s `useGSAP`.

**Tech Stack:** Next.js 16.4.6 App Router (`cacheComponents`), React 19.3, Tailwind 4, TypeScript, GSAP 3.15.1 + @gsap/react 2.1.2, vitest 5 + Testing Library (jsdom per file), Playwright MCP for visual checks.

**Spec:** `docs/superpowers/specs/2026-11-19-ess-website-design.md` (sections 5, 6, 8, 9 apply to this plan; section 7 inner pages = plan 2).

## Global Constraints

- Work in the ESS repo `C:\Users\aayup\Desktop\PYS\extreme-sales-services-main`, folder `web/`, branch `phase-2-ess-rebuild`. Stage files by explicit path only (never `git add -A`). Commit message trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push without telling the owner (repo, branch, contents) first.
- Before using any Next.js API, read its page under `web/node_modules/next/dist/docs/` (this Next version differs from training data).
- Run vitest from PowerShell with the upper-case path `C:\Users\aayup\Desktop\PYS\extreme-sales-services-main\web` (drive-letter gotcha). Component tests start with `// @vitest-environment jsdom`.
- Every price comes from live PYS data (`getCatalog`, `getProducts`). Never hard-code a price; AI mock-up prices must not appear anywhere.
- Never show: arrival times, "genuine/OEM spares", "certified/verified technicians", counters, invented reviews, manufacturer logos, discounts not in `home.offers`.
- Shown facts: warranty from `identity.warrantyDays` (live = 45) as "{n}-day warranty on our work"; "Prices include GST"; `identity.hours`.
- Colour tokens (day / night): page `#f3f6fb` / `#0b0a1f`; surface `#ffffff` / `#16143a`; ink `#12163a` / `#ecedff`; muted `#4d5480` / `#a6a9d6`; line `#d9deef` / `#2a2760`; cool `#1f5fd6` / `#5cc8ff`; heat `#ff6a1a` / `#ff7a2e`; taxi `#ffc915` text `#141414` hover `#ffd84d`; glass fill `rgb(255 255 255 / .42)` / `rgb(14 22 48 / .38)`; glass line `rgb(255 255 255 / .65)` / `rgb(255 255 255 / .18)`.
- Glass: fill + 1px line + `-webkit-backdrop-filter` and `backdrop-filter: blur(18px) saturate(150%)` (prefixed first) + inset top highlight; `@supports not (backdrop-filter: blur(1px))` → surface at 92 % opacity.
- Theme: `data-theme` on `<html>`, light default, key `ess-theme`, applied by the existing inline `THEME_SCRIPT` before paint.
- Motion: one orchestrated intro per page; `prefers-reduced-motion` → no intro, loops, pin or parallax, final states shown, X-ray opens in list view; phones (≤760px) → no parallax, no pin, rain density halved, canvas paused when hero off-screen or tab hidden; canvas DPR capped at 2.
- Targets ≥44px, focus ring 3px `--cool`, Archivo only, no all-caps labels, tabular figures for prices.
- Hero images: `web/public/hero/{night,day}.png` 1672×941, `{night,day}-phone.png` 941×1672, `xray.png` 1672×941 with alpha. Serve via `getImageProps` art direction (`sizes="100vw"`); visible theme's image eager/high priority, the other lazy.

## Review Focus

1. PYS is slow/down or a mapped service code is missing from the catalog → dock, X-ray and tiles still render; the answer reads "Price after inspection" or "Call us for this one", never crashes or shows ₹0. Tests: Task 4 (`problemAnswer` missing code), Task 6 (`partAnswer` missing code).
2. Visitor has reduced motion on → no intro animation, final 24° shown, X-ray starts in list view. Test: Task 6 (list view default when `matchMedia` reduce).
3. An offer has ended, has an off-site link, or the list is empty → the season note shows instead. Test: Task 3 (`heroOfferCard`).
4. Pincode typed with spaces, 5 digits or letters → friendly message, no network call; server route rejects anything not 6 digits. Tests: Task 9.
5. No priced in-stock product of an AC type → tile shows "See models", never "From ₹Infinity"/₹0. Test: Task 8.

---

## File map

Create (all under `web/`):
- `src/lib/hero-geometry.ts`: photo-coordinate maths and AC frame constants.
- `src/lib/season.ts`: season notes and hero offer-card choice.
- `src/lib/xray-parts.ts`: X-ray parts, hotspots, part → service answer.
- `src/lib/amc.ts`: AMC card summary.
- `src/lib/ac-kind.ts`: product → AC kind (moved out of product-art) and AC-type tiles.
- `src/lib/answer.ts`: shared `ServiceAnswer` type + `serviceAnswer()` used by dock and X-ray.
- `src/components/theme/theme-switch.tsx`: neumorphic day/night switch (replaces `theme-toggle.tsx`, keeps `THEME_KEY`/`THEME_SCRIPT`).
- `src/components/home/hero/hero.tsx`, `hero-scene.tsx`, `problem-dock.tsx`, `offer-card.tsx`.
- `src/components/home/xray-section.tsx`, `amc-section.tsx`, `ac-types-section.tsx`, `book-steps.tsx`, `contact-area.tsx`, `pincode-check.tsx`.
- `src/app/api/serviceability/[pincode]/route.ts`.
- Tests: `tests/hero-geometry.test.ts`, `tests/season.test.ts`, `tests/answer.test.ts`, `tests/problem-dock.test.tsx`, `tests/floating-contact.test.tsx`, `tests/theme-switch.test.tsx`, `tests/xray.test.tsx`, `tests/amc.test.ts`, `tests/ac-kind.test.ts`, `tests/serviceability-route.test.ts`, `tests/pincode-check.test.tsx`.

Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/ui/button.tsx`, `src/components/site/{site-header,site-footer,floating-contact,logo}.tsx`, `src/components/shop/product-art.tsx`, `src/lib/problems.ts`, `package.json`.

Delete: `src/components/home/{hero-ac,service-icon,brand-strip,problem-picker}.tsx`, `src/components/theme/theme-toggle.tsx` (after moving its exports), `src/lib/offers.ts` + `tests/offers.test.ts` (folded into `season.ts`).

---

### Task 1: Design system (tokens, glass, buttons, day/night switch)

**Files:**
- Modify: `web/package.json` (add `gsap@3.15.1`, `@gsap/react@2.1.2`), `src/app/globals.css`, `src/components/ui/button.tsx`, `src/app/layout.tsx`
- Create: `src/components/theme/theme-switch.tsx`; delete `src/components/theme/theme-toggle.tsx`
- Test: `tests/theme-switch.test.tsx`

**Interfaces:**
- Produces: CSS classes `.glass`, `.glass-strong`, `.neu-inset`, `.neu-raised`; Tailwind colours `taxi`, `taxi-ink`, `cool`, `heat`, `ink`, `muted`, `line`, `surface`, `page`; `buttonStyles({ variant: 'taxi' | 'glass' | 'quiet', size: 'sm' | 'md' | 'lg' })`; `ThemeSwitch()`; `THEME_KEY = 'ess-theme'`; `THEME_SCRIPT` (unchanged string).

- [ ] **Step 1: Install** `npm install gsap@3.15.1 @gsap/react@2.1.2` in `web/`. Expected: both in `dependencies`.
- [ ] **Step 2: Write the failing test** `tests/theme-switch.test.tsx`:
```tsx
// @vitest-environment jsdom
it('switches day to night, saves it, and labels the next action', async () => {
  document.documentElement.dataset.theme = 'light';
  render(<ThemeSwitch />);
  const btn = screen.getByRole('button', { name: 'Switch to night mode' });
  await userEvent.click(btn);
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(localStorage.getItem('ess-theme')).toBe('dark');
  expect(screen.getByRole('button', { name: 'Switch to day mode' })).toBeTruthy();
});
it('still switches when storage throws', async () => { /* spy localStorage.setItem to throw; click; theme is dark */ });
```
- [ ] **Step 3:** Run `npx vitest run tests/theme-switch.test.tsx`. Expected: FAIL (module not found).
- [ ] **Step 4: Implement** `ThemeSwitch()` in `theme-switch.tsx`: same `useSyncExternalStore` pattern as the old toggle; 76×40 pill (`.neu-inset`) with a 32px knob (`.neu-raised`) sliding 36px, sun icon in day, moon in night; `aria-label` "Switch to night mode" / "Switch to day mode". Move `THEME_KEY`/`THEME_SCRIPT` here; update `layout.tsx` import.
- [ ] **Step 5: Tokens.** Rewrite the `:root` / `[data-theme="dark"]` blocks in `globals.css` with the Global Constraints colours (keep the `@custom-variant dark` line, motion tokens, skip-link, focus, reduced-motion block). Add `.glass`, `.glass-strong` (fill .62 day / .55 night), `.neu-inset` (inset 4px 4px 8px dark-shadow, -4px -4px 8px light-shadow), `.neu-raised` (outer equivalents), with the `@supports not` fallback. Remove the old `airflow`, `marquee`, `logo-light/dark` rules only if unused after Task 10 (leave `pop-in`, `reveal`).
- [ ] **Step 6: Buttons.** `button.tsx` variants become `taxi` (`bg-taxi text-taxi-ink hover:bg-taxi-hover shadow-[0_10px_30px_-8px_rgb(255_201_21/.55)]`), `glass` (`glass text-ink`), `quiet` (`text-cool underline-offset-4 hover:underline`); all pills (`rounded-full`), `active:scale-[0.96]`; sizes sm `min-h-11 px-5 text-[15px]`, md `min-h-12 px-6 text-base`, lg `min-h-14 px-8 text-lg`. Default `taxi`/`md`. Fix every existing caller to a valid variant.
- [ ] **Step 7:** Run `npx vitest run` and `npx tsc --noEmit`. Expected: all pass, no type errors.
- [ ] **Step 8: Commit** `feat(web): Mumbai Glass tokens, glass and neumorphic utilities, taxi buttons, day/night switch`.

### Task 2: Hero geometry (photo coordinates)

**Files:** Create `src/lib/hero-geometry.ts`; Test `tests/hero-geometry.test.ts`

**Interfaces:**
- Produces:
  - `type Pt = readonly [number, number]`
  - `interface AcFrame { image: { w: number; h: number }; face: readonly [Pt, Pt, Pt, Pt]; vent: readonly [Pt, Pt]; flow: { dx: number; dy: number; n: number }; window: readonly [number, number, number, number] }`
  - `AC_FRAMES: { desktop: AcFrame; phone: AcFrame }` with exactly:
    desktop image 1672×941, face `[[1240,152.5],[1580,71],[1570,207.5],[1240,257.5]]`, vent `[[1254,283],[1562,233]]`, flow `{dx:-250,dy:330,n:9}`, window `[0,0,965,790]`;
    phone image 941×1672, face `[[524,305],[865,209],[867.5,350],[524,422.5]]`, vent `[[537,452],[860,392]]`, flow `{dx:-210,dy:330,n:6}`, window `[0,140,470,1210]`.
  - `onFace(face, u, v): Pt` (bilinear point), `faceMatrix(face, u0, v0, u1, v1, w, h): string` (`matrix(a b c d e f)` mapping a w×h drawing onto the panel area), `coverRect(viewW, viewH, imgW, imgH, rect: readonly [x0,y0,x1,y1]): { x: number; y: number; w: number; h: number }` (object-fit: cover, centred).

- [ ] **Step 1: Write failing tests:** `onFace(face,0,0)` equals face[0] and `onFace(face,1,1)` equals face[2]; `faceMatrix(square,0,0,1,1,100,100)` for face `[[0,0],[100,0],[100,100],[0,100]]` returns `'matrix(1 0 0 1 0 0)'`; `coverRect(1672,941,1672,941,[0,0,965,790])` → `{x:0,y:0,w:965,h:790}`; `coverRect(836,941,1672,941,[0,0,1672,941])` → width 1672 scaled 1, `x` = -418.
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3: Implement** the functions (port `onFace`/`faceMatrix` from the mock-up `hero-glass.html`; `coverRect` uses `s = max(viewW/imgW, viewH/imgH)`, offsets centred). Round matrix numbers to 4 decimals.
- [ ] **Step 4:** Run, expect PASS.
- [ ] **Step 5: Commit** `feat(web): hero photo geometry for the AC overlay and window rain`.

### Task 3: Season note and hero offer card

**Files:** Create `src/lib/season.ts`; delete `src/lib/offers.ts`, `tests/offers.test.ts`; update `src/lib/data.ts` import; Test `tests/season.test.ts`

**Interfaces:**
- Consumes: `HomeOffer` (types.ts).
- Produces: `interface HeroCard { kind: 'offer' | 'season'; title: string; text: string; href: string | null; linkLabel: string }`; `activeOffers(items: unknown, now: Date): HomeOffer[]` (moved unchanged from offers.ts); `seasonNote(now: Date): HeroCard`; `heroOfferCard(offers: HomeOffer[], now: Date): HeroCard`.

Season copy (India date, exact):
| Months | title | text | href | linkLabel |
|---|---|---|---|---|
| Mar–May | Pre-summer service | Get your AC cleaned before the heat arrives. | /services/svc-jet-wash | See jet wash |
| Jun–Sep | Monsoon AC care | A foam wash clears the musty monsoon smell. | /services/svc-foam | See foam wash |
| Oct | October heat | Check your AC's gas before the heat peaks. | /services/svc-gas | See gas check |
| Nov–Feb | Plan the year | An AMC covers your regular service visits. | /amc | Compare AMC plans |

- [ ] **Step 1: Failing tests:** keep the three existing `activeOffers` cases; `seasonNote(new Date('2026-07-10T06:00:00Z')).title === 'Monsoon AC care'`; `seasonNote(new Date('2026-10-31T20:00:00Z')).title === 'Plan the year'` (already 1 Nov in India); `heroOfferCard([], d).kind === 'season'`; `heroOfferCard([{title:'Ended', endsOn:'2026-01-01'}], d).kind === 'season'` via `activeOffers` first; `heroOfferCard([{title:'Jet wash week', href:'/services/svc-jet-wash'}], d)` → `{kind:'offer', title:'Jet wash week', linkLabel:'See the offer', href:'/services/svc-jet-wash', text:''}`.
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3: Implement** (month from `Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'})`). `heroOfferCard` calls `activeOffers` and uses the first item, else `seasonNote`.
- [ ] **Step 4:** Run, expect PASS.
- [ ] **Step 5: Commit** `feat(web): season note fallback for the hero offer card`.

### Task 4: Problem dock (hero "What's wrong?")

**Files:** Create `src/lib/answer.ts`, `src/components/home/hero/problem-dock.tsx`; Modify `src/lib/problems.ts`; Tests `tests/answer.test.ts`, `tests/problem-dock.test.tsx`

**Interfaces:**
- Consumes: `CatalogService`, `servicePriceText` (lib/format.ts).
- Produces:
  - `type PickerService = Pick<CatalogService, 'code' | 'name' | 'shortDescription' | 'pricingModel' | 'price' | 'category'>` (moved here from the deleted `problem-picker.tsx`; every later task imports it from `@/lib/answer`)
  - `interface ServiceAnswer { serviceName: string | null; priceText: string; bookHref: string | null; detailHref: string | null }`
  - `serviceAnswer(code: string, services: PickerService[]): ServiceAnswer`: found + priced → `priceText = servicePriceText(s)`, `bookHref = /book?service=CODE`, `detailHref = /services/code-lowercase`; found + `QUOTE_AFTER_DIAGNOSIS` → `'Price after inspection'`; not found / inactive → `{ serviceName: null, priceText: 'Call us for this one', bookHref: null, detailHref: null }`.
  - `DOCK_PROBLEM_IDS = ['not-cooling','leaking','noisy','smell','service-due','gas'] as const` in problems.ts, with short labels `Not cooling, Leaking, Noisy, Bad smell, Service due, Needs gas`.
  - `ProblemDock({ services }: { services: PickerService[] })`: client; 6 buttons each with a small looping icon (CSS keyframes, disabled under reduced motion); selected answer appears in a glass card above the dock (`aria-live="polite"`) with the service name, price, "incl. GST" when priced, and a taxi "Book this" link when `bookHref`.
- [ ] **Step 1: Failing tests:** `serviceAnswer('SVC-DIAG', fixtureServices)` → `priceText 'From ₹529.82'`, `bookHref '/book?service=SVC-DIAG'`; `serviceAnswer('SVC-PCB', …)` → `'Price after inspection'`; `serviceAnswer('SVC-NOPE', …)` → `'Call us for this one'`, `bookHref null`. Dock (jsdom): click "Leaking" → shows "Diagnosis visit" and "From ₹529.82" and a "Book this" link to `/book?service=SVC-DIAG`; render with `services=[]` and click "Needs gas" → "Call us for this one", no Book link. Use `dev/fixtures/catalog.json` services as the fixture.
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3: Implement** both files; dock layout: desktop single row with "What's wrong?" label, phones 3×2 grid (icon above label, 12.5px) per the mock-up.
- [ ] **Step 4:** Run, expect PASS.
- [ ] **Step 5: Commit** `feat(web): hero problem dock with live prices`.

### Task 5: Hero (photo, AC scene, weather, glass copy, offer card)

**Files:** Create `src/components/home/hero/{hero,hero-scene,offer-card}.tsx`

**Interfaces:**
- Consumes: `AC_FRAMES`, `faceMatrix`, `coverRect` (Task 2); `HeroCard` (Task 3); `ProblemDock` (Task 4); `buttonStyles` (Task 1); `HomeHero`, `BusinessIdentity`.
- Produces: `Hero({ hero, identity, services, card }: { hero: HomeHero; identity: BusinessIdentity; services: PickerService[]; card: HeroCard })` (server); `HeroScene()` (client, no props, renders the two AC SVGs + canvas); `OfferCard({ card }: { card: HeroCard })`. The hero's Book button has `id="hero-book"` (Task 7 watches it).

- [ ] **Step 1: Hero (server).** Full-viewport section (`100svh`, min 640px). Day and night `<picture>`s built with `getImageProps` art direction (desktop source `(min-width: 761px)`, phone fallback), `alt=""`; night picture `opacity` 1 only under `[data-theme=dark]`, day under light (CSS, 1.1s crossfade). Shade layer per spec. Glass copy panel: `<h1>` = `hero.headline` (default "Stay cool this Mumbai season."), subline, taxi lg **Book a service** (`/book`, `id="hero-book"`), glass lg **Buy an AC** (`/shop`), fact chips (warranty from `identity.warrantyDays` when > 0, "Prices include GST", `identity.hours`). `ProblemDock` bottom-left; `OfferCard` bottom-right (desktop only; badge "Offer" for `kind:'offer'`, "This month" for season).
- [ ] **Step 2: HeroScene (client).** Port from the mock-up: per frame an `<svg viewBox="0 0 W H" preserveAspectRatio="xMidYMid slice">` (desktop/phone shown by media query) containing the "ess" mark (`faceMatrix(face,.07,.5,.23,.7,100,36)`), smoked display (`faceMatrix(face,.73,.47,.92,.73,100,40)`), vent glow line, flow group (blurred cone + `flow.n` ribbons, `mix-blend-mode: screen`). Canvas: night = drops clipped to `coverRect(...window)`, day = 40 dust specks. `useGSAP` intro timeline exactly as spec §5 (display "ON" → vent → air → 28°→24°), loops (core dash flow, wide glow breathe), desktop pointer parallax (photo/effects ±14px, copy ±6px). Reduced motion: no timeline, display "24°", flows at opacity .8, no canvas loop. Pause the canvas loop via `IntersectionObserver` (hero off-screen) and `visibilitychange`. Phones: half drop count, no parallax.
- [ ] **Step 3: Verify visually.** Start `node dev/mock-pys.mjs` and `npx next dev -p 3100`; with Playwright check 1440×860 and 390×844, day and night, plus `emulate_media reducedMotion: reduce`: AC display sits on the angled panel, air starts at the vent, dock fits (3×2 on phone, no horizontal scroll: `document.documentElement.scrollWidth === innerWidth`), headline readable on both photos. Expected: matches the approved mock-up screenshots.
- [ ] **Step 4:** `npx tsc --noEmit && npx eslint src tests` clean.
- [ ] **Step 5: Commit** `feat(web): Mumbai Glass hero with live AC, rain and glass panels`.

### Task 6: AC X-ray section (services & prices)

**Files:** Create `src/lib/xray-parts.ts`, `src/components/home/xray-section.tsx`; Test `tests/xray.test.tsx`

**Interfaces:**
- Consumes: `serviceAnswer`, `ServiceAnswer` (Task 4), `PickerService`, `CatalogService`.
- Produces: `interface XrayPart { id: 'filter'|'coil'|'fan'|'pcb'|'gas'|'drain'; label: string; symptom: string; serviceCode: string; spot: readonly [number, number] }` and `XRAY_PARTS` exactly:
  filter "Air filter", "Bad smell or dusty air", SVC-FOAM, [0.15, 0.50];
  coil "Cooling coil", "Not cooling well", SVC-JET-WASH, [0.34, 0.44];
  fan "Blower fan", "Noisy or vibrating", SVC-DIAG, [0.58, 0.47];
  pcb "Circuit board", "Won't start or keeps beeping", SVC-PCB, [0.79, 0.40];
  gas "Gas pipes", "Warm air or ice on the pipes", SVC-GAS, [0.90, 0.36];
  drain "Drain tray", "Water dripping inside", SVC-DIAG, [0.60, 0.64].
  `partAnswer(part: XrayPart, services: PickerService[]): ServiceAnswer` (= `serviceAnswer(part.serviceCode, services)`).
  `XraySection({ services, all }: { services: PickerService[]; all: CatalogService[] })` (client).
- [ ] **Step 1: Failing tests:** `partAnswer(coil, fixture).priceText === '₹1,414.82'`; `partAnswer(pcb, fixture).priceText === 'Price after inspection'`; `partAnswer(gas, [])` → `'Call us for this one'`. Component: clicking the "Cooling coil" hotspot shows "Not cooling well", "Jet wash", "₹1,414.82"; clicking "Show as list" shows every public active service name from the fixture grouped by category with repairs under "Priced after the diagnosis visit"; with `window.matchMedia` mocked to match `(prefers-reduced-motion: reduce)` the list view is shown first.
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3: Implement.** Heading "Point at the problem." + one-line intro; `next/image` of `/hero/xray.png` (1672×941, `sizes="(min-width:1024px) 60vw, 100vw"`); hotspots = round glass buttons with a pulsing ring, absolutely positioned at `spot` percentages, each `aria-label` = part label; answer = glass card (symptom in heat colour, service name, price, "incl. GST", Book this, What's included). Segmented toggle "AC X-ray / List" (`.neu-inset`). Desktop + motion allowed: `ScrollTrigger` pins the section for 120 % of viewport height and reveals hotspots one by one (`useGSAP`, registered once); phones/reduced motion: no pin, all hotspots visible.
- [ ] **Step 4:** Run tests, expect PASS; visual check at 1440 and 390 (hotspots sit on their parts in both).
- [ ] **Step 5: Commit** `feat(web): AC X-ray services section with live prices`.

### Task 7: Header, footer and floating contact

**Files:** Modify `src/components/site/{site-header,site-footer,floating-contact,logo}.tsx`, `src/app/layout.tsx`; Test `tests/floating-contact.test.tsx`

**Interfaces:**
- Consumes: `ThemeSwitch`, `buttonStyles`.
- Produces: `SiteHeader({ phone }: { phone: string })` (client; overlay vs sticky decided from the pathname); `FloatingContact({ phone, whatsapp })` adds the phone Book pill.
- [ ] **Step 1: Failing test:** render `FloatingContact` (jsdom) with a mocked `IntersectionObserver` and `usePathname` → `/`: Book pill hidden while `#hero-book` is intersecting, visible (`role=link name="Book a service"`) after the observer reports not intersecting; with pathname `/book` the pill never renders. WhatsApp link href starts `https://wa.me/917977805245`.
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3: Implement.** Header = glass pill (logo + wordmark, links Home/Services/AMC plans/Shop ACs/Track, `ThemeSwitch`, taxi sm "Book a service"; links hidden < 1100px). Logo uses the dark-background logo in night and the normal logo in day (CSS swap kept). Floating contact: WhatsApp (green) and Call round buttons bottom-right; Book pill bottom-left on phones only (`md:hidden`). Footer: same content, on `surface` with glass cards per column, bottom padding for floating buttons on phones. `SiteHeader` becomes a client component that reads `usePathname()`: on `/` it is absolutely positioned over the hero (glass pill, 18px from top); elsewhere it is sticky with the page background behind the pill. `layout.tsx` keeps rendering it once for every route.
- [ ] **Step 4:** Run tests, PASS; `tsc` clean.
- [ ] **Step 5: Commit** `feat(web): glass header, footer and floating Book/WhatsApp/Call`.

### Task 8: AMC plans and AC types sections

**Files:** Create `src/lib/amc.ts`, `src/lib/ac-kind.ts`, `src/components/home/amc-section.tsx`, `src/components/home/ac-types-section.tsx`; Modify `src/components/shop/product-art.tsx` (import `kindOf` from `ac-kind.ts`); Tests `tests/amc.test.ts`, `tests/ac-kind.test.ts`

**Interfaces:**
- Produces:
  - `interface AmcCard { code: string; name: string; visitsPerYear: number; covers: string[]; fromTotal: number | null }`; `amcCard(plan: CatalogAmcPlan): AmcCard` (`covers` from flags: "Gas charging", "Spare parts", "Unlimited complaints"; `fromTotal` = lowest non-null rate total).
  - `type AcKind = 'split' | 'window' | 'tower' | 'cassette'`; `kindOf(name: string): AcKind` (existing rules); `interface AcTypeTile { kind: AcKind; label: 'Split' | 'Window' | 'Cassette' | 'Floor-standing'; from: number | null; href: string }`; `acTypeTiles(products: Product[]): AcTypeTile[]` (always 4 tiles in that order; `from` = min price of in-stock, non-null-price products of that kind; `href = /shop?type=<kind>`).
- [ ] **Step 1: Failing tests:** `amcCard` on fixture `ORD-4` returns its name, visits, and `fromTotal` equal to the minimum of its non-null rate totals; a plan with all rates null → `fromTotal null`. `acTypeTiles(fixtureProducts)` → 4 tiles, Window `from` 28990, Split `from` 33990; `acTypeTiles([])` → every `from` null.
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3: Implement** libs and sections. AMC: glass cards (name, "{n} visits a year", covers list, "From ₹X a year" or "Price on request"), Compare plans → `/amc`. AC types: 4 glass tiles with `ProductArt` drawing for the kind, "From ₹X incl. GST" or "See models", plus up to 4 featured in-stock priced residential products (existing card markup restyled as glass), See all → `/shop`.
- [ ] **Step 4:** Run tests PASS; visual check.
- [ ] **Step 5: Commit** `feat(web): AMC plans and AC types sections`.

### Task 9: Book steps, contact & pincode check

**Files:** Create `src/app/api/serviceability/[pincode]/route.ts`, `src/components/home/book-steps.tsx`, `src/components/home/contact-area.tsx`, `src/components/home/pincode-check.tsx`; Tests `tests/serviceability-route.test.ts`, `tests/pincode-check.test.tsx`

**Interfaces:**
- Consumes: `pysRequest`, `Serviceability`, `BusinessIdentity`.
- Produces: `GET /api/serviceability/:pincode` → 200 `{ pincode, serviceable, area }`, 400 `{ error: 'Enter a 6-digit pincode.' }` unless `/^\d{6}$/`, 502 `{ error: 'Could not check right now. Please call us.' }` on `PysError`; response `Cache-Control: public, max-age=300`. `PincodeCheck()` client; `BookSteps()`; `ContactArea({ identity })`.
- [ ] **Step 1: Failing tests:** route with `pysRequest` mocked: `400001` → 200 body passthrough; `40001`, `4000 1`, `abcdef` → 400 and `pysRequest` not called; `PysError` → 502. Component: typing "400 071" normalises to `400071` before calling `fetch('/api/serviceability/400071')`; "12" + submit → "Enter a 6-digit pincode." with no fetch; serviceable → "Yes, we cover {area}."; not serviceable → "We don't cover this pincode yet. Call us and we'll see what we can do."
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3: Implement.** Read `node_modules/next/dist/docs` route-handler page for dynamic params in this version first. Book steps: 3 numbered glass steps (copy per spec §6.4), taxi "Book now" → `/book`, quiet "Track your request" → `/track`. Contact & area: pincode check, call, WhatsApp, hours, address, closing taxi Book.
- [ ] **Step 4:** Run tests PASS.
- [ ] **Step 5: Commit** `feat(web): booking steps, contact and pincode check`.

### Task 10: Compose the home page, clean up, verify, preview

**Files:** Modify `src/app/page.tsx`, `src/lib/data.ts`; Delete old components listed in the file map.

- [ ] **Step 1: Compose** `page.tsx`: fetch catalog, products, basics, offers in parallel (same `.catch` fallbacks as now); build `PickerService[]`; render `Hero` (card = `heroOfferCard(offers, new Date())` computed inside a cached function so prerender is allowed: add `getHeroCard()` in `data.ts` with `'use cache'`, tag `content`), `XraySection`, `AmcSection`, `AcTypesSection`, `BookSteps`, `ContactArea`.
- [ ] **Step 2: Delete** `hero-ac.tsx`, `service-icon.tsx`, `brand-strip.tsx`, `problem-picker.tsx`; remove now-unused CSS (`airflow`, `marquee`). `grep -r` for their names returns nothing.
- [ ] **Step 3: Full check:** `npx tsc --noEmit`, `npx eslint src tests`, vitest (PowerShell, C:\ path), `npx next build` with the mock PYS running. Expected: all green, `/` prerendered (○).
- [ ] **Step 4: Visual pass** (Playwright): 1440×860 and 390×844 × day/night × reduced motion; scroll the whole page; no horizontal scroll; no console errors; screenshots saved under `PYS/.playwright-mcp/`.
- [ ] **Step 4b: Weight check** with the production server (`npx next start -p 3100`): in Playwright network requests the hero image actually downloaded at 390px and 1440px is ≤ 250 KB each (if not, lower `quality` in `getImageProps` to 70 and re-check); GSAP chunks load only on `/`.
- [ ] **Step 5: Commit** `feat(web): Mumbai Glass home page` and update memory notes.
- [ ] **Step 6: Tell the owner** what will be pushed (repo ESS, branch `phase-2-ess-rebuild`, the commits) and push only after their OK; confirm the Vercel `ess-web` preview build is READY and the page shows live prices.
