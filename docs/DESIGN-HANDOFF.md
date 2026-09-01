# Dwell Studio — Design Handoff

A brief for redesigning the Dwell Studio website **without changing any
functionality**. Read the "Golden rule" first — it defines the guardrails that
keep the app working while the look changes.

---

## 1. What this is

**Dwell Studio** is a Christ-centered movement studio for women in Lincoln, NE —
cycle, movement, and dance classes framed around worship and community. The
website is also the full business platform: members book classes, buy
memberships/passes, register for events, and manage their accounts; staff run
everything from a built-in CRM.

- **Audience:** women; members range from tech-comfortable to not. The studio
  owner is non-technical.
- **Voice / feeling today:** warm, editorial, faith-centered, feminine, calm —
  soft "sand" backgrounds, olive-green accent, elegant serif headlines, a
  script/display logo. Think a boutique-studio print program, not a gym app.
- **Live site:** dwellstudiolnk.com · Instagram @dwellstudio.lnk

The redesign should feel like a fresh, elevated version of that identity (or a
deliberate, on-brand evolution) — but it's the *visual* layer that changes, not
what the site does.

---

## 2. ⭐ Golden rule: keep functionality identical

The app is **Next.js (App Router) with React Server Components + Server
Actions** — a lot of behavior is wired to specifics in the markup. A redesign
should touch **styling and layout**, not the wiring. Concretely:

**Do NOT change:**
- **Form field `name` attributes.** Server Actions read submitted data by
  `name` (e.g. `formData.get("firstName")`, `"classTypeId"`, `"date"`,
  `"time"`, `"isPrivate"`, `"imageUrl"`, `"requiresMatchingPlan"`). Renaming or
  dropping a `name` silently breaks the feature. Restyle the input, keep its
  `name`, `type`, `required`, and `defaultValue`/`value`.
- **Server Actions and data logic** — anything in `app/actions/**`, `lib/**`,
  `prisma/**`, and the `"use server"` functions. Don't edit these for design.
- **Routes / URLs** — the folder structure under `app/**` and the paths
  (`/schedule`, `/admin/...`, `/c/[token]`, etc.), plus query params the app
  depends on: `?next=`, `?status=success|cancel|thanks`, `?session_id=`,
  `?view=week|list`, `?w=`, `?page=`.
- **Conditional states.** Buttons/badges/sections render differently based on
  state (booked / waitlisted / sold out / registration closed / past due /
  private / hidden). Keep every state's element present — you may restyle each,
  but don't collapse them into one.
- **Client interactivity** — `onClick`/`useTransition`/`useFormState` handlers,
  modal open/close, the promo popup, copy-link buttons. Keep the behavior; skin
  the elements.
- **Accessibility already built in** (see §5). Preserve it.

**Free to change:**
- Colors, type, spacing, radii, shadows, imagery, iconography, backgrounds.
- Layout, composition, grid, component visual design, empty/loading/error
  visuals, hover/transition treatments.
- Copy polish is fine if it doesn't change meaning; structural copy that the app
  keys on (status strings, etc.) should stay.

**The cleanest way to restyle** (works globally, low-risk): change the **design
tokens in `tailwind.config.ts`** and the **component primitives in
`app/globals.css`** (see §3–4). Because almost everything uses these shared
classes, retuning them re-skins the whole app at once. For bespoke screens,
edit the Tailwind utility classes in the page/component JSX — leaving
`name`/handlers/state logic intact.

---

## 3. Where the design lives (files to edit)

| Concern | File | Notes |
|---|---|---|
| Color / font / shadow tokens | `tailwind.config.ts` | The palette, font families, brand shadows, easing. Retune here to shift the whole system. |
| Component primitives + base | `app/globals.css` | `.btn*`, `.card*`, `.input`, `.label`, `.badge`, `.eyebrow`, `.rule`, `.nav-link`, body background, focus ring, headings, reduced-motion. |
| Fonts | `app/layout.tsx` | Loads the display font (local `.ttf`), Playfair Display (serif), Inter (sans) as CSS variables. |
| Per-screen layout | `app/**/page.tsx`, `app/**/layout.tsx` | Tailwind utility classes in JSX. |
| Reusable UI | `components/**` | Header, footer, buttons, forms, cards, popups, icons. |

**Keep using Tailwind.** Prefer restyling via tokens + the primitive classes
over introducing a parallel styling system, so the codebase stays consistent
and the non-technical owner's future edits keep working.

If you **rename or remove a primitive class** (e.g. `.btn-primary`), you must
update every usage across `app/**` and `components/**` — safer to **restyle the
existing class names** in place.

---

## 4. Current design system (reference)

### Color tokens (`tailwind.config.ts` → `theme.extend.colors`)
Neutrals are named `ink` (Soft Sand → Charcoal). Accents: `brand` (olive),
`sage`, `clay`.

- **ink** (bg → text): `50 #F4F1EC` (Soft Sand, page bg), `100 #ECE7DE`,
  `200 #DED5C7` (borders), `300 #C9BCA8`, `400 #756C5A` (secondary text —
  darkened for AA contrast), `500 #7C7363`, `600 #5C5547`, `700 #44403A`,
  `800 #343230`, `900 #2D2D2D` (Charcoal, primary text).
- **brand** (Olive Green, primary accent): `50 #EFF2EC` … `400 #859673`,
  `500 #6A7A5F` (signature), `600 #5B6A52`, `700 #49553F` … `900 #2D3528`.
- **sage** (Pale Sage): `200 #C8D1C2` … up to `700`.
- **clay** (Clay Beige, warm secondary): `100 #EEE5D9`, `200 #E1D2BF`,
  `300 #D2BBA0`, `400 #C0A689`, `500 #A88B6C`.

The body has a subtle warm radial glow (clay + sage) at the top over the sand
background — see `app/globals.css` `body`.

### Type
- **Display / logo & hero headlines** — a single-weight script/display face
  loaded locally (`--font-brand`; "Brown Sugar" placeholder). Used sparingly.
- **Headings (h1–h3)** — **Playfair Display** serif (`--font-serif`), tight
  tracking, `text-wrap: balance`. Editorial, high-contrast.
- **Body / UI** — **Inter** (`--font-sans`).
- Small tracked uppercase label = `.eyebrow` (brand-green).

*(The display font is a licensed-placeholder for "Brown Sugar"; if the redesign
changes display type, swap the file in `public/fonts/` and the `localFont`
config. Ensure any web fonts are properly licensed.)*

### Shadows / motion / shape
- Brand-tinted soft shadows: `shadow-soft`, `shadow-lift`, `shadow-btn` (warm
  olive undertone, not neutral gray).
- Easing token `ease-out-soft` (`cubic-bezier(0.22,1,0.36,1)`).
- Rounded, soft geometry — buttons are pill-shaped (`rounded-full`), cards
  `rounded-2xl`.
- A page-load reveal (`.animate-rise`) is gated behind
  `prefers-reduced-motion`.

### Component primitives (in `app/globals.css`)
| Class | Role |
|---|---|
| `.btn`, `.btn-primary` (olive), `.btn-brand` (clay), `.btn-secondary` (outline), `.btn-ghost` | Buttons — pill shaped. |
| `.card`, `.card-interactive` | Surfaces; interactive adds hover lift. |
| `.input` | Text inputs/selects/textareas. |
| `.label` | Field label text. |
| `.badge` | Status pills (booked, sold out, private, hidden, comp, etc.). |
| `.eyebrow` | Small uppercase section kicker. |
| `.rule` | Delicate centered divider. |
| `.nav-link` | Nav link with an underline that draws in on hover. |

### Status color conventions (keep the *meaning*, restyle freely)
green = active/confirmed/paid · amber = past-due/sold-out/warning · red =
cancelled/error/destructive · ink-grey = neutral/expired/none · brand/clay =
gift/private/comp accents.

---

## 5. Accessibility to preserve (WCAG 2.1 AA — already implemented)

The site was recently brought to AA. **Keep these while redesigning:**
- Every page has a `<main id="main-content">` landmark and there's a
  **skip-to-content** link (first focusable element in `app/layout.tsx`).
- **Visible keyboard focus ring** (`:focus-visible` in globals.css) — don't add
  `outline:none` without an equal-or-better replacement.
- **Color contrast ≥ AA** for text (that's why `ink-400` is `#756C5A`). If you
  change the palette, re-check text contrast on both white and the sand bg
  (≥ 4.5:1 for normal text).
- **Meaningful images have `alt`; decorative ones use `alt=""`** and decorative
  SVG icons are `aria-hidden`.
- **Form inputs have accessible names** (associated `<label>` or `aria-label`).
- **Dialogs** (promo popup, edit-class modal) have `role="dialog"`/
  `aria-modal`, close on **Escape**, and the backdrop is dismissable.
- **Zoom is allowed** (viewport `maximumScale: 5`) — don't reintroduce a zoom
  lock.
- Respect `prefers-reduced-motion`.

---

## 6. Screen / route inventory

Grouped by area. **Highest-visibility (prioritize):** the public marketing
pages, auth, and the member app. The admin CRM is staff-only and can be
lower-priority (but shares the same design system).

### Public / marketing (unauthenticated)
| Route | Purpose |
|---|---|
| `/` | Landing page — hero, about, classes, membership, schedule teaser, "Visit us" footer. The flagship page. |
| `/events`, `/events/[id]` | Public events list + event detail with ticket purchase (buy multiple / gift tickets). |
| `/sponsor` | "Sponsor a Sister" donation page. |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth. Split-screen login; centered card for the rest. |
| `/privacy`, `/terms`, `/accessibility` | Legal pages (shared `LegalPage` shell). |
| `/c/[token]` | Private, invite-only class reservation page (reached only via a secret link). |

### Member app (logged-in members) — shared `(member)` layout: top header + **bottom mobile tab bar**, `<main>` in the middle
| Route | Purpose |
|---|---|
| `/schedule` | Class schedule — **week grid** and **list** views; book, join waitlist, "bring a guest", "gift a class". The member's home. |
| `/bookings` | Upcoming + past bookings. |
| `/memberships` | Buy plans/passes; see active plans, renewal date, guest passes; past-due banner. |
| `/account` | Profile, membership/renewal summary, guest passes, change password, legal links. |
| `/gift` | Gift a single class to a named person (pick class + recipient → pay). |

### Admin CRM (staff/owner) — shared `(admin)` layout: **left sidebar** (desktop) / top scroll-nav (mobile)
`/admin` (dashboard), `/admin/schedule` (+ `/[id]` roster, `/history`),
`/admin/members` (+ `/[id]`), `/admin/classes`, `/admin/plans`,
`/admin/events` (+ `/[id]`), `/admin/pnl` (finances), `/admin/revenue`,
`/admin/popup` (promo popup manager), `/admin/messages`, `/admin/automations`,
`/admin/sponsorships`. Data-dense: tables, forms, stat cards, rosters, badges.

---

## 7. Layouts & navigation patterns

- **Root** (`app/layout.tsx`): fonts, skip link, body background/glow, the
  site-wide promo popup mount.
- **Marketing** pages: `MarketingHeader` (sticky, translucent, logo + nav +
  mobile menu) and `MarketingFooter` (legal links + copyright). Landing has its
  own richer footer.
- **Member** (`app/(member)/layout.tsx`): top header with logo + links + sign
  out; **fixed bottom tab bar on mobile** (Schedule / Bookings / Plans / Events
  / Account); centered `max-w-5xl` main.
- **Admin** (`app/(admin)/layout.tsx`): fixed **left sidebar** with icon+label
  nav on desktop; sticky top bar + horizontal scroll-nav on mobile;
  `max-w-5xl` content.

Icons are inline SVGs in `components/Icons.tsx` (single-weight stroke set); the
logo/marks in `components/Brand.tsx` are CSS/text, not image files.

---

## 8. Key reusable components

`MarketingHeader`, `MarketingFooter`, `Logo`/`DwellMark`/`DwellSeal` (Brand),
`Icons`, `NavLink`/`BottomNavLink`, `BookButton`, `BuyButton` /
`ManageBillingButton` / `CancelPlanButton`, `EventTicketForm`, `GiftClassForm`,
`GuestBookButton`, `PromoPopup`, `LegalPage`, and the admin form/row components
(`CreateSessionForm`, `EditSessionForm` modal, `ClassTypeRow`, `PlanRow`,
`MemberTools`, `SessionControls`, etc.). Common recurring patterns to design a
system for: **stat cards, data tables, rosters/lists, status badges, form
cards, modals, banners (success/error/warning), empty states, weekly calendar
grid.**

---

## 9. What a great redesign delivers

- A refreshed **token set** (color, type scale, spacing, radii, shadows) applied
  via `tailwind.config.ts` + `app/globals.css` so the whole app moves together.
- Restyled **component primitives** and the **key patterns** in §8, shown across
  the flagship surfaces: landing, schedule (week + list), memberships, event
  detail, login/register, and a representative admin screen.
- Consistent **light-mode** design (the app is light-only today). If you want to
  introduce **dark mode**, define the palette as tokens and provide both — but
  it's optional and must not be required for the redesign to ship.
- All of §5 (accessibility) intact.

**Out of scope:** data model, business logic, server actions, routes, form
field names, and the behaviors described in §2.

---

## 10. Handy facts

- **Stack:** Next.js 14 App Router, React Server Components + Server Actions,
  Tailwind CSS, Prisma + PostgreSQL, custom cookie auth, Stripe payments,
  Resend email / Twilio SMS, Vercel hosting.
- **No component/UI library** — plain Tailwind + the `globals.css` primitives.
  Introducing one is a bigger decision; if proposed, it must preserve all form
  `name`s, handlers, and states.
- **Money** shows via a `money()` helper (cents → USD). **Dates/times** render
  in the studio's Central timezone via helpers — leave the formatting helpers
  alone; style the output.
- The owner edits content through the CRM, not code — keep the CRM legible and
  forgiving.
</content>
