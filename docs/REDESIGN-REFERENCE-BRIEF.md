# Dwell Studio — Redesign Reference Brief

**Purpose:** Redesign the Dwell Studio site to follow the *layout and structure*
of a reference fitness-studio website, while keeping **Dwell's own colors,
fonts, copy, imagery, and identity** — and keeping all functionality identical.

**Hand this to Claude Design together with `docs/DESIGN-HANDOFF.md`.** That
companion doc has the color tokens, type, component system, route inventory, and
the "don't break functionality" guardrails. This brief adds the reference to
emulate.

> Fill in every `[ ... ]` and delete the italic hints. Attach screenshots where
> noted. Anything you leave blank, Claude Design will use its best judgment on.

---

## 1. The reference site

- **URL:** `[ https://... ]`
- **Why this site / what I love about it (the north star):**
  `[ e.g. "Bold full-bleed hero, photo-forward sections, super clean pricing
  cards, calm and spacious — our current site feels too busy." Be specific about
  the 3–5 things you want to capture. ]`
- **Overall vibe words:** `[ e.g. spacious, editorial, bold, minimal, warm ]`
- **Other sites for secondary inspiration (optional):** `[ URLs + one line each ]`

---

## 2. Screenshots attached

*Attach full-page desktop **and** mobile screenshots of each key page. Label
each file. Long/full-page captures — not just the top of the page.*

- [ ] Homepage — desktop + mobile
- [ ] Class schedule / booking — desktop + mobile
- [ ] Membership / pricing — desktop + mobile
- [ ] Class or event detail — desktop + mobile
- [ ] About / studio story — desktop + mobile
- [ ] `[ any other page you want emulated ]`

*Tip: annotate the screenshots ("copy this pricing card", "love this hero",
"want our schedule to look like this").*

---

## 3. Borrow vs. keep

**Borrow from the reference (the "how it's laid out"):**
- [x] Page structure & section order
- [x] Hero style & composition
- [x] Navigation pattern (header/footer, mobile menu)
- [x] Component layouts (pricing cards, schedule grid, class cards, forms)
- [x] Spacing rhythm & visual hierarchy
- [x] Scroll/interaction feel
- [ ] `[ add/remove anything specific ]`

**Keep as Dwell's own (do NOT take from the reference):**
- [x] **Colors** — use Dwell's palette (see `DESIGN-HANDOFF.md` §4)
- [x] **Logo & brand marks** — Dwell's
- [x] **All copy / verbiage** — Dwell's words (see §5 below)
- [x] **Photography / images** — Dwell's own photos only
- [x] **Brand voice** — warm, faith-centered, feminine, community
- [ ] **Fonts:** keep Dwell's current type  ◻  OR  change type too → `[ notes ]`

> **Important:** Take *structure and UX patterns* as inspiration only. Do **not**
> copy the reference site's actual text, photos, logo, exact brand colors, or a
> licensed font.

---

## 4. Page-by-page mapping

*For each Dwell page, note which reference page/section to model it on and what
to take. Dwell's real routes are pre-filled — fill in the reference side.*

| Dwell page (route) | Model it on (reference page/section) | What to take |
|---|---|---|
| Landing `/` | `[ ... ]` | `[ ... ]` |
| Class schedule `/schedule` | `[ ... ]` | `[ ... ]` |
| Memberships & passes `/memberships` | `[ ... ]` | `[ ... ]` |
| Events list `/events` + detail `/events/[id]` | `[ ... ]` | `[ ... ]` |
| Login / Register | `[ ... ]` | `[ ... ]` |
| My account `/account` | `[ ... ]` | `[ ... ]` |
| Admin CRM (staff) | `[ usually lower priority — keep clean/legible ]` | `[ ... ]` |

---

## 5. Dwell verbiage / copy to use

*Give Claude Design the actual words so it doesn't invent or borrow copy.*

- **Tagline / hero line:** `[ ... ]`
- **Short "about" blurb:** `[ ... ]`
- **How you describe classes (cycle / movement / dance):** `[ ... ]`
- **Membership names + one-line descriptions:** `[ ... ]`
- **Calls to action you like:** `[ e.g. "Book your spot", "Join the community" ]`
- **Words/phrases that are core to the brand:** `[ e.g. "dwelling place",
  "worship + workout", "flourish in freedom" ]`
- **Things to avoid saying:** `[ ... ]`

*(If you'd rather keep the current site's copy as-is, just say "keep existing
copy" and skip this.)*

---

## 6. Priorities & scope

- **Redesign these first (most important):** `[ e.g. Landing, then Schedule,
  then Memberships ]`
- **Lower priority / can come later:** `[ e.g. the admin CRM screens ]`
- **Must-keep elements (don't lose these):** `[ e.g. the promo popup, the
  member bottom tab bar, the "Sponsor a Sister" section ]`
- **Dark mode?** `[ not needed / would like it / only if easy ]`

---

## 7. Guardrails (please read)

From `DESIGN-HANDOFF.md` — the redesign changes **looks**, not behavior:
- Keep every form field's `name` attribute, and all server actions, routes, and
  URL params.
- Keep every conditional state (booked / waitlisted / sold out / past-due /
  private / hidden, etc.) — restyle each, don't remove any.
- Keep the accessibility work (focus ring, contrast ≥ AA, alt text, labels,
  skip link, dialog Escape, zoom allowed).
- Restyle via the Tailwind tokens (`tailwind.config.ts`) + primitives
  (`app/globals.css`) so the whole app moves together.

---

*Attach: this brief + `docs/DESIGN-HANDOFF.md` + your labeled screenshots.*
</content>
