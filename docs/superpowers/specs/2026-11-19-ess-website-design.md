# ESS website: "Mumbai Glass" design (home + every customer page)

Date: 2026-11-19 · Status: draft for approval · Replaces the "Bright Cool Air" home (commit c943f74) · Code lives in `web/` (Next.js 16, branch `phase-2-ess-rebuild`).

## 1. Intent

The owner judged every AC company site (Daikin, Voltas, Blue Star, Urban Company, and a polished AI mock-up) as "the same UI everyone has": banner carousel, icon row, product cards, number counters, four steps, testimonial slider, blue/white or green/cream. ESS should look and feel like no other AC business while still answering a customer's questions fast: *what do you do, what does it cost, how do I book, where do you work.*

The chosen direction is **Mumbai Glass**: a photo-real Mumbai room (monsoon night or sunny day) where the ESS AC visibly switches on and cools the room, with all interface panels in frosted glass and taxi-yellow buttons. The same look carries through every customer page.

Success = a customer on a cheap Android phone understands what ESS does and reaches a price or the Book button within one screen; the site feels premium and local; nothing claims what the business has not confirmed.

## 2. Goals, non-goals, anti-goals

Goals
- Approved hero (mock-up `hero-glass.html`, section 5) shipped as the home top section.
- Home trimmed to six info sections (section 6).
- Every customer page (section 7) uses the same design system.
- Day and night themes, both first-class.
- Fast and usable on 360 px phones; motion that degrades gracefully.

Non-goals (this round)
- Customer login (`/account` stays "coming soon"), seller marketplace (Phase 4), AI assistant, payments.
- Thermal-camera section, sound check, brand strip, AC health card QR, repair-or-replace tool (ideas parked; thermal and sound may return on service pages later).
- Customer reviews (only after Google reviews are linked; never invented).

Anti-goals (would be a failure even if it works)
- Any unconfirmed claim: arrival times (e.g. 90-minute), "genuine/OEM spares", "certified/verified technicians", "trusted by thousands", counters, discounts not published in admin.
- Manufacturer logos without permission (brand names as text only).
- Motion that blocks reading or booking, or makes phones stutter.
- Fake reviews or stock photos that do not show ACs.

## 3. Constraints

- Stack already built in Stage C: Next.js 16.4.6 App Router with `cacheComponents`, `'use cache'` reads from PYS via the signed API (`lib/pys/client.ts`, `lib/data.ts`), Tailwind 4, `motion` installed, Archivo font (wdth axis). Read `web/node_modules/next/dist/docs/` before using a Next API.
- Data comes only from PYS `/api/v1/ess/*`: `catalog`, `products`, `products/:id`, `content?keys=`, `areas`, `serviceability/:pincode`, `intakes` (POST basket), `track` (POST). Prices: services and AMC carry a GST breakup; products are GST-inclusive. Prices with paise are shown as they are (owner confirmed).
- Confirmed facts that may be shown: 45-day warranty on service work (`business.identity.warrantyDays` = 45, live), prices include GST, opening hours, address, GSTIN, phone/WhatsApp, service areas Mumbai / Thane / Navi Mumbai.
- Legal: Consumer Protection (E-Commerce) Rules 2020 disclosures in footer and on product pages ("Sold by"), DPDP consent checkbox on every form, grievance officer details (editable in admin).
- Free plans for now: no paid image, font or animation services. GSAP is free for commercial use (all plugins).

## 4. Approaches considered (owner picked)

| Direction | What it was | Outcome |
|---|---|---|
| Bright Cool Air (built, c943f74) | Blue hero, drawn AC, coloured service tiles | Rejected: "average, like every company" |
| Thermal camera hero | Room seen as a heat map, cools as you scroll | Rejected as hero: customers would not understand it. Parked for a later section |
| AC X-ray | Blueprint AC; tap a part for problem, fix and price | **Kept** as the home Services & prices section |
| Mumbai local colours | Monsoon grey + taxi yellow | Partly kept: taxi-yellow buttons, Mumbai photos |
| **Mumbai Glass (chosen)** | Photo-real room + live AC/rain effects + glassmorphism | **Approved** for the hero and the whole site |

Colour family: the owner chose "thermal palette as base, Mumbai touches", then chose **yellow buttons** over blue.

## 5. Approved hero (home top section)

Reference implementation: `.superpowers/brainstorm/1054-1795078206/content/hero-glass.html` (local mock-up, not shipped code; port its behaviour, not its markup).

Images (owner-made in ChatGPT, saved in `web/public/hero/`): `night.png`, `day.png` (1672×941) and `night-phone.png`, `day-phone.png` (941×1672). AC front is blank and the AC is off in the image; all glow is drawn live. Serve through `next/image` (AVIF/WebP, `priority`, `sizes="100vw"`, phone art via `<picture>`/media). Owner may later supply larger renders; nothing else changes.

Layers, back to front
1. Photo (day or night crossfade, 1.1 s).
2. Left readability shade (night: dark gradient; day: soft warm-white gradient).
3. AC overlay SVG in the photo's own coordinates (`viewBox` = image size, `preserveAspectRatio="xMidYMid slice"`, same box as the photo): an "ess" mark and a smoked display window mapped onto the angled front panel with a `matrix()` built from the panel corners; a vent glow line along the slanted outlet; airflow = blurred cone + 6–9 ribbons (wide blurred stroke + thin dashed core), `mix-blend-mode: screen`. Corner/vent coordinates are recorded in the mock-up (`AC` object) and must be kept with the images.
4. Weather canvas: night = raindrops sliding on the window glass (clipped to the window area mapped from photo coordinates); day = slow dust specks in the sunlight. Max 2× device pixel ratio.
5. Glass UI: nav pill, headline panel, "What's wrong?" dock, offer card.

Content
- Headline "Stay cool this Mumbai season." (from content block `home.hero`, editable), subline about services and areas.
- Buttons: **Book a service** (yellow, primary) and **Buy an AC** (glass).
- Fact chips: 45-day warranty on our work (value from `warrantyDays`), Prices include GST, opening hours.
- "What's wrong?" dock: Not cooling, Leaking, Noisy, Bad smell, Service due, Needs gas, each with a small looping icon. Tapping shows the matching service name and live price (from `/catalog`, mapping in `lib/problems.ts`) with Book this. Phones: 3×2 grid, icon above label.
- Offer card: shows the first active `home.offers` item; if none, shows the **season note** for the current month in Mumbai time (Mar–May pre-summer service, Jun–Sep monsoon foam wash for musty smell, Oct gas check for October heat, Nov–Feb AMC planning). Season notes are site copy, not offers, and contain no prices or discounts.

Motion (GSAP, one orchestrated intro, then calm loops)
- Intro: nav drops in → headline panel slides in → headline words rise (staggered) → dock and offer card rise → AC display "ON" → vent glows → air fades in → display counts 28° → 24°.
- Loops: air dashes flow, air glow breathes, rain/dust, dock icon micro-motion. Desktop: gentle parallax on pointer move (photo/effects shift up to 14 px, glass panel counter-shifts 6 px).
- Theme switch: neumorphic day/night pill (sun/moon knob) in the nav. Crossfades the photo, swaps glass tint, rain ↔ dust.

## 6. Home page below the hero

Order and purpose (every section must answer a customer question):

1. **Services & prices: "Point at the problem" (AC X-ray).** A clean line drawing of a split AC; scrolling (pinned on desktop) opens it into parts: filter, cooling coil, blower fan, circuit board, gas pipes, drain tray. Tap a part: problem it causes, the service that fixes it, live price incl. GST, Book this / What's included. A **"Show as list"** toggle shows all public services as glass cards with prices (also the fallback for reduced motion and screen readers). Repairs priced after diagnosis are grouped with that note.
2. **AMC plans.** Glass cards from `/catalog` amcPlans: name, visits a year, what is covered (gas, spares, complaints flags), "from ₹ / year" by AC type, Compare plans → `/amc`.
3. **New ACs.** Up to 4 in-stock residential products with price incl. GST and MRP strike-through when higher; drawn AC art until real photos exist (existing `components/shop/product-art.tsx`). See all → `/shop`.
4. **How a visit works.** Four numbered steps (a real sequence): tell us what is wrong → we confirm your visit → technician visits (extra repairs quoted first; 45-day warranty) → follow it online. Link to `/track`.
5. **Contact & area.** Pincode check (calls `/serviceability/:pincode`, shows area or "we don't cover this pincode yet, call us"), call, WhatsApp, hours, address, and the closing yellow **Book a service**.
6. **Footer** (all pages): legal name, address, GSTIN, contact, grievance officer, policy links, "Sell on ESS".

Removed from the current home: brand marquee, generic "ways we can help" band, the old drawn-AC hero.

## 7. Every other customer page (same design system)

Inner pages use a **slim photo banner** (a cropped strip of the day/night photo, no live AC effects except a subtle air shimmer) under the glass nav, then content on the page background with glass cards.

| Route | Content |
|---|---|
| `/services` | All public services grouped (Cleaning, Gas, Installation, Diagnosis, Repairs), price incl. GST, "Add to request". |
| `/services/[code]` | What's included / not included, price breakup (GST), duration, which AC types, Book this, related services. |
| `/amc` | Plan comparison table/cards by AC type (split small/large, window small/large), visits, coverage flags, Add to request. |
| `/shop` | Filters (type, tonnage, brand, star rating, price), product cards with "Sold by", **Bill saver** estimator (AC age + daily hours → rough monthly bill now / after service / new 5-star inverter; clearly labelled estimate with its assumptions). |
| `/shop/[id]` | Photos/art, price incl. GST, MRP, specs, warranty text from product, seller disclosure (name, address, GSTIN, grievance contact, return policy), Add to request. |
| `/book` | The basket: services + AMC + products in one request. Three steps: what you need → where and when (address, pincode check, preferred date/slot) → your details + consent → submit to `/intakes` → confirmation with tracking code. |
| `/track` | Enter tracking code + the mobile number used on the request (PYS `trackSchema` requires both; the site sends a hashed client IP for rate limiting) → live timeline from `/track` (steps, visit date, technician first name, items with status/price). |
| `/contact` | Contact details, map link, enquiry form (consent), hours. |
| `/sell` | "Coming soon" + dealer-interest form (intake kind SELLER_INTEREST). |
| `/account` | "Coming soon" (customer login is a later phase). |
| `/legal/privacy`, `/legal/terms` | Text pages from content blocks. |
| `not-found`, `error` | Glass panel on the slim banner, clear next action. |

The basket persists in `localStorage` (per device) and shows as a glass pill in the nav with an item count.

Also in scope (from plan Stage D): SEO metadata and JSON-LD (LocalBusiness, Product, Service), sitemap/robots, and permanent redirects from the old site's URLs (`/index.html`, `/service.html`, `/amc.html`, `/products.html`, `/contact.html`, `/status.html`, `/privacy.html`, `/terms.html`, `/vendor.html`) to the new routes.

Out of scope here: `/admin` (Stage E). It uses the same colour tokens and glass cards for consistency but no photo banner or effects, because it is a work tool.

Release path: everything ships to the `ess-web` preview (branch `phase-2-ess-rebuild`); switching the public ESS address to the new site is Stage H and needs the owner's go-ahead.

## 8. Design system

Colour tokens (CSS variables; `data-theme` on `<html>`, light default, saved choice applied before first paint as already built)

| Token | Day | Night |
|---|---|---|
| page background | `#f3f6fb` frost white | `#0b0a1f` night indigo |
| surface (solid) | `#ffffff` | `#16143a` |
| ink | `#12163a` | `#ecedff` |
| muted | `#4d5480` | `#a6a9d6` |
| line | `#d9deef` | `#2a2760` |
| cool accent (links, focus, info) | `#1f5fd6` | `#5cc8ff` |
| heat accent (problems, sparing) | `#ff6a1a` | `#ff7a2e` |
| **button: taxi yellow** | `#ffc915`, text `#141414`, hover `#ffd84d` | same |
| glass fill | `rgb(255 255 255 / .42)` | `rgb(14 22 48 / .38)` |
| glass line | `rgb(255 255 255 / .65)` | `rgb(255 255 255 / .18)` |

Glass recipe: fill + 1 px line + `backdrop-filter: blur(18px) saturate(150%)` (with `-webkit-` prefix) + inset top highlight + soft drop shadow. Fallback where `backdrop-filter` is unsupported: solid surface at 92 % opacity. Text on glass must still meet WCAG AA against the darkest/lightest photo area behind it (hence the shade layer).

Neumorphism is used only for small physical controls: the day/night switch, quantity steppers, segmented toggles (e.g. "AC X-ray / List").

Type: Archivo only. Headlines at 118–125 % width, weight 800, tight leading; body 16–19 px; tabular figures for prices. No all-caps eyebrows.

Shape: radius by hierarchy (controls 999 px pills, cards 18–24 px, big panels 30 px).

Motion rules
- One orchestrated moment per page (home: AC intro; inner pages: banner + title reveal). Everything else answers a user action (tap, open, add to basket).
- GSAP (+ ScrollTrigger for the X-ray pin) loaded only on pages that use it, client components only.
- `prefers-reduced-motion`: no intro, no loops, no pin, no parallax; final states shown; X-ray shows the list.
- Phones (≤ 760 px): no parallax, no pin (X-ray opens on tap), fewer raindrops, canvas paused when the hero is off-screen or the tab is hidden.

Accessibility: semantic headings, focus rings on glass (`--cool` 3 px), 44 px targets, dock and X-ray parts are real buttons with names, live region for price answers, images with meaningful alt (hero photo is decorative), contrast checked in both themes.

Performance budget: home LCP ≤ 2.5 s on mid Android/4G; hero photo ≤ 250 KB per variant after optimisation; JS for effects lazy after first paint; Lighthouse ≥ 90 on mobile for performance, accessibility, best practices, SEO.

## 9. Content and admin hooks

Editable through existing PYS content blocks: `home.hero` (headline, subline), `home.offers` (title, text, href, linkLabel, endsOn), `business.identity` (contact, hours, warrantyDays, grievance officer), `faq` (future). Season notes live in site code (no admin needed). Problem → service mapping lives in `lib/problems.ts`; part → service mapping for the X-ray in a sibling file.

## 10. Decided by the owner (do not reopen)

Mumbai Glass hero as mocked; yellow buttons; thermal palette base for everything else; light default with day/night switch; trimmed home (section 6); thermal camera not in the hero; 45-day warranty shown; no 90-minute arrival; paise shown; the same design on every page; images from ChatGPT in `web/public/hero/`.

## 11. Left to the builder

Component structure, file names, how GSAP is code-split, exact easing/durations within the rules, X-ray illustration detail, Bill saver formula and its stated assumptions (keep it simple and conservative), skeleton/loading states, exact breakpoints beyond the 760 px phone rule, test approach (unit tests for mappings/filters/estimator, Playwright for basket → intake → track, axe and Lighthouse checks).

## 12. Open items (owner)

- Larger hero renders (optional; current 1672 px works).
- Real product photos (drawn art until then).
- Google reviews link (reviews section stays off until then).
- Grievance officer name (editable later).
