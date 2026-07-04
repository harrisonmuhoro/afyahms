# 15 — UI/UX Design System

> **Authority:** Subordinate to `00-foundation.md`. All tokens, components, and patterns here implement the canonical decisions in the foundation (Tailwind `class` dark mode, React 18 + TS, react-i18next `en`/`sw`, centralized SVG icon registry, no emojis, Recharts, FullCalendar). If anything here contradicts the foundation, the foundation wins.
>
> **Scope:** The complete design language for the Afya HMS web client (SPA/PWA) — principles, design tokens, layout shell, information architecture, component library, key-screen wireframes, iconography, motion, accessibility, and i18n/RTL readiness.
>
> **Audience:** Frontend engineers, designers, QA. This is implementation-grade: tables, a Tailwind config excerpt, component state matrices, and ASCII wireframes you can build against.
>
> **Document version:** 1.0 · **Status:** Design baseline · **Stack:** React 18 + TypeScript (strict) + Vite + Tailwind CSS 3

---

## Table of contents

1. [Design principles](#1-design-principles)
2. [Design tokens](#2-design-tokens)
3. [Layout system & app shell](#3-layout-system--app-shell)
4. [Navigation & information architecture](#4-navigation--information-architecture)
5. [Component library specification](#5-component-library-specification)
6. [Key screen wireframes](#6-key-screen-wireframes)
7. [Iconography guidelines](#7-iconography-guidelines)
8. [Motion](#8-motion)
9. [Accessibility checklist](#9-accessibility-checklist)
10. [Content, i18n & RTL readiness](#10-content-i18n--rtl-readiness)

---

## 1. Design principles

Afya HMS is used at speed, by tired staff, on mixed hardware (modern desktops at reception, older tablets at the bedside, personal phones for the patient portal), often over imperfect connectivity. The design language exists to make clinical work fast, legible, and safe — never to look clever.

### 1.1 Clarity for clinical use
- **One primary action per screen.** The dominant button/control answers "what does the user do here next?" Everything else is secondary or tertiary.
- **Information density without clutter.** Clinicians scan; they don't read. Use tabular layouts, aligned labels, and consistent left-anchored value columns. White space separates *groups*, not every field.
- **Critical patient data is always visible.** The patient context bar (name, patient number `PAT-YYYY-000001`, age/sex, allergies, active alerts) is sticky on every patient-scoped screen and never scrolls away.
- **Status is colour + shape + text — never colour alone.** Triage level, queue state, lab abnormal flags, and billing status always pair a hue with an icon/label so they survive colour-blindness and greyscale printing.

### 1.2 Speed
- **Keyboard-first.** Every high-frequency workflow (registration, triage vitals, dispensing, billing) is completable without the mouse. Global command palette (`Ctrl/Cmd + K`), focus traps in modals, `Enter` to submit, `Esc` to dismiss.
- **Perceived performance.** Skeletons over spinners for content regions; optimistic UI for queue moves and toggles; TanStack Query cache means revisited screens render instantly then revalidate.
- **Minimal navigation depth.** Target ≤3 clicks from dashboard to any high-frequency task. Persistent sidebar + breadcrumbs + recent-patients shortcut.
- **Forgiving input.** Auto-format identifiers, phone numbers (`+254…`), and money as the user types; accept paste of messy data and normalise it.

### 1.3 Accessibility — WCAG 2.1 AA (mandatory)
- Colour contrast ≥ **4.5:1** for body text, **3:1** for large text (≥18.66px bold / 24px) and meaningful UI boundaries.
- Full keyboard operability; visible focus ring on every interactive element (never `outline: none` without a replacement).
- Semantic HTML first; ARIA only to fill gaps. Live regions for async results (queue updates, toast alerts, save confirmations).
- Target size ≥ **44×44 px** for touch-primary controls (tablet bedside, phone portal).
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.
- See the full [accessibility checklist](#9-accessibility-checklist).

### 1.4 Error prevention for patient safety
- **Confirm destructive and irreversible clinical actions** (dispense, finalise invoice, discharge, cancel order) with an explicit modal that restates *what* and *for whom*.
- **Guardrails over warnings.** Disable submission until safe; surface drug-allergy / interaction / duplicate-order alerts *inline at the point of action*, not after.
- **No silent failures.** Every write returns a clear success toast or a blocking, actionable error. Offline writes show a "queued — will sync" state (PWA background sync).
- **Show the cost of mistakes.** When an action affects money, stock, or a clinical record, the confirmation names the patient and the consequence ("This dispenses 30 tablets and reduces stock to 12").
- **Always reversible where clinically allowed.** Drafts, undo toasts (5s) for non-clinical actions, and audit-logged edits rather than hard overwrites.

---

## 2. Design tokens

Tokens are the single source of truth for visual style. They are defined once in the Tailwind config and consumed only via utility classes or CSS variables — **no hardcoded hex in components.** Semantic tokens (e.g. `bg-surface`, `text-danger`) map to raw palette steps so light/dark themes swap by changing the mapping, not the component.

### 2.1 Colour — brand & neutrals

Primary is a clinical teal-blue (trust, calm, medical). Secondary is a supportive indigo for accents and data viz.

| Token | Step | Hex | Usage |
|---|---|---|---|
| `primary-50` | 50 | `#ECFEFF` | Tint backgrounds, hover wash |
| `primary-100` | 100 | `#CFFAFE` | Subtle fills, selected rows |
| `primary-200` | 200 | `#A5F3FC` | Badges (light) |
| `primary-300` | 300 | `#67E8F9` | — |
| `primary-400` | 400 | `#22D3EE` | Accents (dark mode) |
| `primary-500` | 500 | `#06B6D4` | **Brand base** |
| `primary-600` | 600 | `#0891B2` | **Primary button / links** |
| `primary-700` | 700 | `#0E7490` | Hover/active primary |
| `primary-800` | 800 | `#155E75` | Pressed, dark accents |
| `primary-900` | 900 | `#164E63` | Deep headers |
| `primary-950` | 950 | `#083344` | Dark-mode surfaces accent |
| `secondary-500` | 500 | `#6366F1` | Secondary accent base |
| `secondary-600` | 600 | `#4F46E5` | Secondary button |
| `secondary-700` | 700 | `#4338CA` | Secondary hover |

**Neutrals (slate ramp)** — backgrounds, surfaces, borders, text.

| Token | Hex | Light role | Dark role |
|---|---|---|---|
| `neutral-0` | `#FFFFFF` | App / card surface | — |
| `neutral-50` | `#F8FAFC` | App background | — |
| `neutral-100` | `#F1F5F9` | Subtle fill, table header | — |
| `neutral-200` | `#E2E8F0` | Borders, dividers | — |
| `neutral-300` | `#CBD5E1` | Input border, disabled text | — |
| `neutral-400` | `#94A3B8` | Placeholder, muted icon | Muted text (dark) |
| `neutral-500` | `#64748B` | Secondary text | Secondary text (dark) |
| `neutral-600` | `#475569` | Body text (light) | Borders (dark) |
| `neutral-700` | `#334155` | Headings (light) | Surface raised (dark) |
| `neutral-800` | `#1E293B` | — | Card surface (dark) |
| `neutral-900` | `#0F172A` | Strong headings | App background (dark) |
| `neutral-950` | `#020617` | — | App backdrop (dark) |

### 2.2 Colour — semantic

| Token | Light hex | Dark hex | Meaning |
|---|---|---|---|
| `success` | `#16A34A` | `#22C55E` | Completed, paid, normal result, in-stock |
| `success-bg` | `#F0FDF4` | `#052E16` | Success surface/pill background |
| `warning` | `#D97706` | `#F59E0B` | Pending, low stock, approaching limit |
| `warning-bg` | `#FFFBEB` | `#451A03` | Warning surface/pill background |
| `danger` | `#DC2626` | `#EF4444` | Error, overdue, critical/abnormal, out-of-stock |
| `danger-bg` | `#FEF2F2` | `#450A0A` | Danger surface/pill background |
| `info` | `#0891B2` | `#22D3EE` | Informational, in-progress, neutral notices |
| `info-bg` | `#ECFEFF` | `#083344` | Info surface/pill background |

> **Contrast note:** semantic *foreground* tokens above are validated ≥4.5:1 against their own `-bg` and against the default surface in each theme. Never place `warning` text on `neutral-0` smaller than 16px without verifying — amber is the weakest; for small text use `warning-700` (`#B45309`).

### 2.3 Colour — Manchester Triage System (MTS)

Triage colours are **clinically standardised** (foundation §12) and must render identically in every theme — they are status, not decoration. Always pair the colour with the label and the target time. White text sits on Red/Orange/Green/Blue; **near-black** (`#1A1A1A`) sits on Yellow for AA contrast.

| Level | Token | Hex (fill) | On-colour text | Target | Meaning |
|---|---|---|---|---|---|
| **Red** | `triage-red` | `#DC2626` | `#FFFFFF` | Immediate | Life-threatening, see now |
| **Orange** | `triage-orange` | `#EA580C` | `#FFFFFF` | ≤ 10 min | Very urgent |
| **Yellow** | `triage-yellow` | `#FACC15` | `#1A1A1A` | ≤ 60 min | Urgent |
| **Green** | `triage-green` | `#16A34A` | `#FFFFFF` | ≤ 120 min | Standard |
| **Blue** | `triage-blue` | `#2563EB` | `#FFFFFF` | ≤ 240 min | Non-urgent |

> Triage hex values are **fixed constants** and do not theme-swap. A subtle ring/border darkens them by one step in dark mode for surface separation only; the fill stays constant.

### 2.4 Colour — queue status

Queue states map to the canonical pipeline (foundation §13: `Reception → Triage → Doctor → Lab → Pharmacy → Billing`). These are presentational tokens used by queue pills and the board.

| Status | Token | Light fill / text | Dark fill / text | Icon |
|---|---|---|---|---|
| Waiting | `queue-waiting` | `#F1F5F9` / `#475569` | `#334155` / `#CBD5E1` | `clock` |
| Called | `queue-called` | `#DBEAFE` / `#1D4ED8` | `#1E3A8A` / `#93C5FD` | `megaphone` |
| In progress | `queue-active` | `#CFFAFE` / `#0E7490` | `#155E75` / `#67E8F9` | `activity` |
| On hold | `queue-hold` | `#FEF3C7` / `#B45309` | `#451A03` / `#FCD34D` | `pause` |
| Completed | `queue-done` | `#DCFCE7` / `#15803D` | `#052E16` / `#86EFAC` | `check-circle` |
| Emergency bypass | `queue-emergency` | `#FEE2E2` / `#B91C1C` | `#450A0A` / `#FCA5A5` | `alert-triangle` |
| No-show / skipped | `queue-skip` | `#F1F5F9` / `#94A3B8` | `#1E293B` / `#64748B` | `user-x` |

### 2.5 Semantic surface mapping (light ↔ dark)

Components reference *semantic* tokens; the theme swaps the underlying value.

| Semantic token | Light | Dark |
|---|---|---|
| `--bg-app` | `neutral-50` | `neutral-950` |
| `--bg-surface` | `neutral-0` | `neutral-800` |
| `--bg-surface-raised` | `neutral-0` (shadow) | `neutral-700` |
| `--bg-subtle` | `neutral-100` | `neutral-900` |
| `--border` | `neutral-200` | `neutral-700` |
| `--border-strong` | `neutral-300` | `neutral-600` |
| `--text-primary` | `neutral-900` | `neutral-50` |
| `--text-secondary` | `neutral-600` | `neutral-400` |
| `--text-muted` | `neutral-500` | `neutral-500` |
| `--text-on-primary` | `neutral-0` | `neutral-0` |
| `--ring` | `primary-600` | `primary-400` |

### 2.6 Typography

**Font family:** `Inter` (UI, variable) with system fallback; `"JetBrains Mono"` for IDs, codes, and tabular numerics (patient/invoice numbers, money, vitals). Inter's tabular-figures feature (`font-variant-numeric: tabular-nums`) is enforced on all numeric tables.

```
font-sans:  "Inter", ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif
font-mono:  "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace
```

**Type scale** (1.25 major-third-ish, tuned for density):

| Token | Size / Line-height | Weight | Usage |
|---|---|---|---|
| `text-xs` | 12 / 16 | 400–500 | Captions, table meta, helper text |
| `text-sm` | 14 / 20 | 400–500 | **Body default**, inputs, table cells |
| `text-base` | 16 / 24 | 400 | Long-form, portal body |
| `text-lg` | 18 / 28 | 500–600 | Card titles, section labels |
| `text-xl` | 20 / 28 | 600 | Sub-page headings |
| `text-2xl` | 24 / 32 | 600–700 | Page titles |
| `text-3xl` | 30 / 36 | 700 | Dashboard hero / stat figures |
| `text-4xl` | 36 / 40 | 700 | Marketing/portal hero only |

**Weights:** 400 regular, 500 medium (labels, emphasis), 600 semibold (headings, buttons), 700 bold (page titles, stat numbers). Avoid 300/100 — fails legibility at distance on ward screens.

**Rules:** base body is `text-sm` (clinical density); line length capped at ~75ch for prose; never set body text below 12px; mono + `tabular-nums` for all aligned numeric columns.

### 2.7 Spacing scale

4px base unit. Tailwind default scale, used consistently:

| Token | px | Common use |
|---|---|---|
| `0.5` | 2 | Hairline gaps, pill padding |
| `1` | 4 | Icon-to-text gap |
| `2` | 8 | Tight stack, badge padding |
| `3` | 12 | Input padding-y, compact rows |
| `4` | 16 | **Default gutter**, card padding (compact) |
| `5` | 20 | — |
| `6` | 24 | Card padding (comfortable), section gap |
| `8` | 32 | Page gutter, group separation |
| `10` | 40 | — |
| `12` | 48 | Large section breaks, empty-state padding |
| `16` | 64 | Hero / page top spacing |

Layout rhythm: page padding `p-6`/`p-8`, card padding `p-4`/`p-6`, form field vertical gap `gap-4`, inline control gap `gap-2`.

### 2.8 Border radius

| Token | px | Usage |
|---|---|---|
| `rounded-none` | 0 | Data-dense table cells (optional) |
| `rounded-sm` | 2 | — |
| `rounded` | 4 | Inputs (compact), small badges |
| `rounded-md` | 6 | **Buttons, inputs (default)** |
| `rounded-lg` | 8 | Cards, dropdowns, modals |
| `rounded-xl` | 12 | Stat cards, larger panels |
| `rounded-2xl` | 16 | Marketing/portal surfaces |
| `rounded-full` | 9999 | Avatars, pills/badges, icon buttons |

### 2.9 Shadows / elevation

Light-mode shadows are soft and cool; dark mode replaces most elevation with **borders + raised surface tones** (shadows read poorly on dark).

| Token | Light value | Dark strategy |
|---|---|---|
| `shadow-xs` | `0 1px 2px rgba(15,23,42,.05)` | border only |
| `shadow-sm` | `0 1px 3px rgba(15,23,42,.08), 0 1px 2px rgba(15,23,42,.06)` | `surface-700` + border |
| `shadow-md` | `0 4px 6px -1px rgba(15,23,42,.08), 0 2px 4px -2px rgba(15,23,42,.06)` | `surface-700` + border |
| `shadow-lg` | `0 10px 15px -3px rgba(15,23,42,.10), 0 4px 6px -4px rgba(15,23,42,.06)` | dropdowns/modals: subtle ring + dark backdrop |
| `shadow-xl` | `0 20px 25px -5px rgba(15,23,42,.12)` | modals only |
| `shadow-inner` | `inset 0 2px 4px rgba(15,23,42,.06)` | pressed/well states |

Elevation policy: surface = 0, cards = `shadow-sm`, dropdowns/popovers/tooltips = `shadow-lg`, modals/drawers = `shadow-xl`. Focus uses a **ring**, never a shadow.

### 2.10 Z-index scale

| Token | Value | Layer |
|---|---|---|
| `z-base` | 0 | Page content |
| `z-sticky` | 10 | Sticky table headers, patient context bar |
| `z-nav` | 20 | Sidebar, topbar |
| `z-dropdown` | 30 | Selects, menus, popovers |
| `z-drawer` | 40 | Slide-over drawers |
| `z-overlay` | 50 | Modal backdrop |
| `z-modal` | 60 | Modal/dialog content |
| `z-toast` | 70 | Toasts / snackbars |
| `z-tooltip` | 80 | Tooltips (above all) |
| `z-command` | 90 | Command palette (`Ctrl/Cmd+K`) |
| `z-max` | 9999 | Critical clinical alert / system banner |

### 2.11 Tailwind config excerpt

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // foundation §10 — class strategy
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:'#ECFEFF',100:'#CFFAFE',200:'#A5F3FC',300:'#67E8F9',400:'#22D3EE',
          500:'#06B6D4',600:'#0891B2',700:'#0E7490',800:'#155E75',900:'#164E63',950:'#083344',
        },
        secondary: { 500:'#6366F1', 600:'#4F46E5', 700:'#4338CA' },
        // semantic — resolved against CSS variables for theme swap
        success: 'rgb(var(--c-success) / <alpha-value>)',
        warning: 'rgb(var(--c-warning) / <alpha-value>)',
        danger:  'rgb(var(--c-danger)  / <alpha-value>)',
        info:    'rgb(var(--c-info)    / <alpha-value>)',
        // triage — FIXED, never theme-swap
        triage: {
          red:'#DC2626', orange:'#EA580C', yellow:'#FACC15', green:'#16A34A', blue:'#2563EB',
        },
      },
      fontFamily: {
        sans: ['Inter','ui-sans-serif','system-ui','Segoe UI','Roboto','sans-serif'],
        mono: ['JetBrains Mono','ui-monospace','SFMono-Regular','Menlo','Consolas','monospace'],
      },
      fontSize: {
        xs:['0.75rem',{lineHeight:'1rem'}], sm:['0.875rem',{lineHeight:'1.25rem'}],
        base:['1rem',{lineHeight:'1.5rem'}], lg:['1.125rem',{lineHeight:'1.75rem'}],
        xl:['1.25rem',{lineHeight:'1.75rem'}], '2xl':['1.5rem',{lineHeight:'2rem'}],
        '3xl':['1.875rem',{lineHeight:'2.25rem'}], '4xl':['2.25rem',{lineHeight:'2.5rem'}],
      },
      borderRadius: { md:'0.375rem', lg:'0.5rem', xl:'0.75rem', '2xl':'1rem' },
      boxShadow: {
        xs:'0 1px 2px rgba(15,23,42,.05)',
        sm:'0 1px 3px rgba(15,23,42,.08),0 1px 2px rgba(15,23,42,.06)',
        md:'0 4px 6px -1px rgba(15,23,42,.08),0 2px 4px -2px rgba(15,23,42,.06)',
        lg:'0 10px 15px -3px rgba(15,23,42,.10),0 4px 6px -4px rgba(15,23,42,.06)',
        xl:'0 20px 25px -5px rgba(15,23,42,.12)',
      },
      zIndex: {
        sticky:'10', nav:'20', dropdown:'30', drawer:'40', overlay:'50',
        modal:'60', toast:'70', tooltip:'80', command:'90',
      },
      transitionTimingFunction: { 'emphasized':'cubic-bezier(0.2,0,0,1)' },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
}
```

```css
/* tokens.css — semantic theme variables (RGB triplets for <alpha-value>) */
:root {
  --c-success: 22 163 74;  --c-warning: 217 119 6;
  --c-danger: 220 38 38;   --c-info: 8 145 178;
  --bg-app: 248 250 252;   --bg-surface: 255 255 255;
  --bg-subtle: 241 245 249; --border: 226 232 240;
  --text-primary: 15 23 42; --text-secondary: 71 85 105;
}
.dark {
  --c-success: 34 197 94;   --c-warning: 245 158 11;
  --c-danger: 239 68 68;    --c-info: 34 211 238;
  --bg-app: 2 6 23;         --bg-surface: 30 41 59;
  --bg-subtle: 15 23 42;    --border: 51 65 85;
  --text-primary: 248 250 252; --text-secondary: 148 163 184;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration:.001ms !important; transition-duration:.001ms !important; }
}
```

---

## 3. Layout system & app shell

### 3.1 App shell anatomy

The authenticated application is a persistent shell: fixed **sidebar** (left), fixed **topbar** (top), scrollable **content area** (right). A patient-scoped **context bar** docks below the topbar when a patient is open.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR (h-14, z-nav)                                                           │
│ [≡] Afya  | [🔍 search / ⌘K]      [Branch ▾] [EN/SW] [☀/🌙] [🔔3] [Avatar ▾]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ SIDEBAR      │ CONTEXT BAR (patient-scoped, sticky, z-sticky) — optional      │
│ (w-64, z-nav)│ PAT-2026-000042 · Amina Otieno · F/34 · ⚠ Penicillin allergy   │
│              ├───────────────────────────────────────────────────────────────┤
│ ▸ Dashboard  │ BREADCRUMBS  Patients / Amina Otieno / Consultation            │
│ ▸ Patients   │                                                               │
│ ▸ Queue      │  ┌─────────────────────────────────────────────────────────┐  │
│ ▸ Triage     │  │  PAGE CONTENT (max-w-screen-2xl, p-6/p-8)               │  │
│ ▸ Clinical   │  │  responsive grid …                                      │  │
│ ▸ Pharmacy   │  │                                                         │  │
│ ▸ Lab        │  └─────────────────────────────────────────────────────────┘  │
│ ⋯            │                                                               │
│──────────────│                                                               │
│ ⚙ Settings   │                                                               │
│ ◐ Collapse   │                                                               │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

Symbols above (☀ 🌙 🔍 🔔 ⚠ ◐) are **placeholders for SVG icons from the registry** — the product uses no emojis (foundation §10).

### 3.2 Topbar

Fixed, `h-14`, `bg-surface`, bottom `border`, `z-nav`. Left → right:

1. **Sidebar toggle** (`menu` icon) — collapses sidebar to icon-rail; on mobile opens drawer.
2. **Brand** — Afya wordmark + mark; links to dashboard. Hidden < `sm` to save room.
3. **Global search / command palette** — input that opens the `⌘K` palette: jump to patient by number/name, navigate, run actions. `aria-label="Search patients and actions"`.
4. **Branch switcher** (right cluster) — dropdown showing active branch code+name (foundation §4). Switching sets `active_branch_id`; triggers a confirm if unsaved work exists. Hidden/disabled for single-branch users.
5. **Language toggle** — `EN / SW` segmented control (react-i18next). Persists to the authenticated user profile in the database.
6. **Theme toggle** — `light / dark / system` cycle button (`sun`/`moon`/`monitor`). Persists to the authenticated user profile in the database.
7. **Notifications** — bell with unread count badge; opens a drawer/popover list (queue calls, lab results ready, low-stock, claim status). Live via broadcasting.
8. **User menu** — avatar + name + role; dropdown: profile, my branches, security/MFA, help, sign out.

Touch targets in the topbar are ≥44px; on `< sm`, items 3–6 collapse into an overflow menu, keeping branch switcher and notifications visible.

### 3.3 Sidebar

`w-64` expanded / `w-16` icon-rail collapsed; full-height; `bg-surface`; right `border`; `z-nav`. Sections grouped by domain, each item = icon + label (+ optional count badge, e.g. queue waiting count). Active item: `primary-50` wash (light) / `primary-950` (dark), left `2px` `primary-600` accent bar, `aria-current="page"`.

- **Collapsed rail:** icon-only with tooltips; labels read by SR via `aria-label`.
- **Mobile (< `lg`):** sidebar becomes an off-canvas drawer over a scrim; toggled from topbar.
- **Role-filtered:** items render only if the user holds the permission (foundation §5, `08-rbac-matrix.md`). Empty groups are hidden.
- Footer: Settings (admin-only items gated), theme/lang quick toggles (mobile), collapse control, app version.

### 3.4 Content area

- Max content width `max-w-screen-2xl` centred; page padding `p-6` (mobile/tablet) → `p-8` (desktop).
- Standard page header: title (`text-2xl`), optional subtitle/meta, right-aligned primary action(s), optional filter/segment row below.
- Breadcrumbs sit above the page header for nested screens.

### 3.5 Responsive breakpoints

Tailwind defaults, with HMS roles per band:

| Token | Min width | Primary devices | Shell behaviour |
|---|---|---|---|
| (base) | 0 | Phones (patient portal, staff on the move) | Single column; sidebar = drawer; tables → stacked cards; bottom-sheet modals |
| `sm` | 640 | Large phones / small tablets portrait | Two-column forms begin; topbar shows brand |
| `md` | 768 | Tablets (triage, bedside, ward) | Sidebar rail optional; data tables with horizontal scroll; 2-col grids |
| `lg` | 1024 | Laptops, reception desktops | **Persistent sidebar appears**; 2–3 col grids; full data-grids |
| `xl` | 1280 | Desktops (records, billing, admin) | 3–4 col dashboards; split-pane (list + detail) |
| `2xl` | 1536 | Large monitors / ward display boards | Max content width; queue board multi-column |

**Queue/ward display boards** target `2xl`+ in kiosk/fullscreen mode with enlarged typography (`text-xl`+) for across-the-room legibility.

### 3.6 Content grid system

- 12-column logical grid via Tailwind `grid grid-cols-12 gap-6`.
- **Dashboard:** stat cards `col-span-12 sm:col-span-6 xl:col-span-3`; charts `col-span-12 lg:col-span-6`/`8`; side panels `col-span-12 lg:col-span-4`.
- **List + detail (master/detail):** `lg:grid-cols-[360px_1fr]` split-pane (patient lists, lab worklist, pharmacy queue).
- **Forms:** `grid-cols-1 md:grid-cols-2`, full-width fields span both; logical fieldset groups in `Card`s.

---

## 4. Navigation & information architecture

The sidebar is **role-filtered** by permission. Below is the full canonical menu; each role sees the union of groups its permissions unlock. Counts (e.g. `Queue · 12`) come from live data.

### 4.1 Full menu tree (superset)

```
Dashboard
Patients
  ├─ Register patient
  ├─ Patient directory
  └─ Records requests
Appointments
  ├─ Calendar
  └─ Schedule
Queue
  ├─ My station
  └─ Board (department display)
Triage
Clinical (EMR)
  ├─ My consultations
  ├─ Encounters / SOAP
  ├─ Orders (lab / radiology / Rx)
  └─ Clinical alerts
Pharmacy
  ├─ Dispense queue
  ├─ Prescriptions
  ├─ Stock / inventory
  └─ Drug catalog
Laboratory
  ├─ Sample collection
  ├─ Worklist
  └─ Results entry
Radiology
  ├─ Worklist
  └─ Reports
Inpatient (IPD)
  ├─ Bed board
  ├─ Admissions
  └─ Ward rounds
Billing
  ├─ Invoices
  ├─ Payments (M-Pesa / cash)
  ├─ Cashier shift
  └─ Insurance / SHA claims
Inventory
  ├─ Stock
  ├─ Purchase orders
  └─ Goods received (GRN)
Reports
  ├─ Clinical
  ├─ Financial
  ├─ Operational
  └─ Compliance / audit
Administration
  ├─ Branches
  ├─ Users & roles
  ├─ Departments & services
  ├─ Settings
  └─ Audit log
─────────────
Settings (personal)
Help & support
```

### 4.2 Sidebar per role

Only top-level groups shown; sub-items appear when the role holds the relevant permission.

| Role (slug) | Visible sidebar groups |
|---|---|
| **Hospital Admin** (`hospital-admin`) | Dashboard, Patients, Appointments, Queue, Triage, Clinical, Pharmacy, Laboratory, Radiology, Inpatient, Billing, Inventory, Reports (all), **Administration** (full). Branch switcher = all branches. |
| **Doctor** (`doctor`) | Dashboard, Patients, Appointments, Queue (My station), Clinical (My consultations, SOAP, Orders, Alerts), Laboratory (results view), Radiology (reports view), Inpatient (ward rounds), Reports (Clinical). |
| **Nurse** (`nurse`) | Dashboard, Patients, Queue, Triage, Clinical (vitals, notes — scoped), Inpatient (bed board, rounds, nursing notes), Pharmacy (administration/MAR view). |
| **Receptionist** (`receptionist`) | Dashboard, Patients (Register, Directory), Appointments, Queue (Reception station), Billing (create invoice — if permitted). |
| **Records Officer** (`records-officer`) | Dashboard, Patients (Directory, Records requests, merge), Reports (Compliance), Documents. |
| **Pharmacist** (`pharmacist`) | Dashboard, Queue (Pharmacy station), Pharmacy (Dispense, Prescriptions, Stock, Catalog), Inventory (stock view), Reports (Pharmacy). |
| **Lab Technician** (`lab-technician`) | Dashboard, Queue (Lab station), Laboratory (Collection, Worklist, Results), Reports (Lab). |
| **Radiologist** (`radiologist`) | Dashboard, Radiology (Worklist, Reports), Patients (view), Reports (Radiology). |
| **Cashier/Accountant** (`cashier`) | Dashboard, Queue (Billing station), Billing (Invoices, Payments, Shift, Claims), Reports (Financial). |
| **Patient** (`patient`) | **Patient Portal IA** (separate shell, §6.13): Home, Appointments, Records, Results, Prescriptions, Bills & pay, Messages, Profile. |

### 4.3 IA principles
- **Breadcrumbs** on every screen ≥2 levels deep: `Group / Entity / Sub-view`.
- **Recent patients** quick-access in the `⌘K` palette and a topbar shortcut.
- **Deep-linkable & permission-guarded routes** (`<ProtectedRoute permission="...">`, foundation §10). Unauthorised deep links → 403 screen with "request access".
- **Cross-links** keep context: from a queue ticket → patient consultation; from an order → its result; from an invoice → its encounter.

---

## 5. Component library specification

All components live in `src/components/ui`, are theme-aware, fully keyboard-operable, i18n-driven (no hardcoded strings), and use the central `<Icon name="…"/>` registry. Each spec below lists **usage**, **variants/states**, and **accessibility (a11y)**.

### 5.1 Buttons

**Usage:** trigger actions. Exactly one **primary** button per view region. Use `secondary` for the common alternative, `ghost`/`link` for low-emphasis, `danger` for destructive, `success` sparingly for explicit positive confirmations.

**Variants**

| Variant | Light style | Use |
|---|---|---|
| `primary` | `bg-primary-600 text-white hover:bg-primary-700` | Main action |
| `secondary` | `bg-secondary-600 text-white` | Alt action |
| `outline` | `border-border text-primary hover:bg-subtle` | Neutral secondary |
| `ghost` | `text-primary hover:bg-subtle` | Toolbar, low-emphasis |
| `link` | `text-primary-600 underline-offset-2 hover:underline` | Inline navigation |
| `danger` | `bg-danger text-white` | Destructive (delete, void) |
| `success` | `bg-success text-white` | Confirm dispense/pay |

**Sizes:** `xs` (h-7), `sm` (h-8), `md` (h-10, default), `lg` (h-12, touch/portal). Icon-only buttons are square at the matching height with required `aria-label`.

**States:** `default · hover · active/pressed · focus-visible (2px primary ring + offset) · disabled (opacity-50, not focusable, cursor-not-allowed) · loading (spinner replaces leading icon, label retained, aria-busy, click suppressed) · with leading/trailing icon`.

**A11y:** native `<button>`; never a `<div>`. `aria-busy` while loading; `aria-disabled` mirrors `disabled`; loading announced politely. Visible focus always. Min target 44px for primary touch actions.

### 5.2 Inputs & form fields

**Usage:** text, number, email, tel, password, textarea, date/time. Always paired with a **visible label** (placeholders are never labels).

**Anatomy:** label → (optional helper) → control → (error or hint). Optional leading/trailing icon or affix (e.g. `KES`, `kg`, `+254`).

**States:** `default · focus (ring-primary) · filled · disabled · readonly · error (border-danger, danger helper, aria-invalid) · success (subtle, for async-validated fields like patient number lookup) · with-icon · with-affix · loading (async validation spinner)`.

**Validation:** Zod-resolved (RHF, foundation §10). Inline errors below the field; the message is specific and actionable ("Phone must be a valid Kenyan number, e.g. +254712345678"). Errors set `aria-invalid` and link via `aria-describedby`. Form-level error summary at top of long forms, focus-moved on submit failure.

**A11y:** programmatic `<label htmlFor>`; required fields marked with text "(required)" not just `*`; `autocomplete` set; numeric keypad `inputmode` on mobile; helper/error tied by `aria-describedby`.

### 5.3 Selects, comboboxes, multiselect

**Usage:** native `<select>` for short static lists; **combobox** (typeahead) for large/searched sets (drugs, ICD-10, patients, services); **multiselect** chips for tags/services; **async select** for server-searched data (TanStack Query).

**States:** `default · open · focused-option · selected · disabled-option · loading (async) · no-results (empty state) · error`.

**A11y:** ARIA combobox/listbox pattern; arrow-key navigation, type-ahead, `Enter` select, `Esc` close; `aria-activedescendant`; selected count announced for multiselect; results list `aria-live="polite"` for async. Always keyboard-reachable; never trap focus outside the menu.

### 5.4 Tables & data grids

**Usage:** the workhorse for directories, worklists, invoices, stock, reports. Supports **sorting, filtering, pagination, column visibility, row selection, sticky header**, and (for clinical worklists) row status accents.

**Anatomy**
```
┌ Toolbar: [search] [filters ▾] [column ▾]            [bulk-actions] [export] ┐
├ Header (sticky, z-sticky): ▢ | Col ▲ | Col | … | Actions                    │
├ Rows: ▢ | cell | cell (tabular-nums for numbers) | … | [⋯ row menu]        │
│   · selected row: primary-50 wash   · status accent: 3px left border        │
├ Footer: "Showing 1–25 of 312"            « ‹ 1 2 3 … 13 › »   [25 ▾ / page] │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Features & states:** sortable columns (aria-sort asc/desc/none, 3-state click); column filters (text, select, date-range, status); server-side pagination + page-size; multi-select with sticky bulk-action bar; resizable/toggleable columns (persisted per user); **density toggle** (comfortable/compact); row actions via overflow menu; expandable rows for detail. States: `loading (skeleton rows) · empty (empty state) · error (retry) · filtered-empty ("no results, clear filters") · partial (load-more / infinite for worklists)`.

**Responsive:** below `md`, tables collapse to **stacked cards** (label:value pairs) preserving key columns and the row action.

**A11y:** semantic `<table>`/`<th scope>`; `aria-sort` on sortable headers; sortable header is a `<button>`; row-select checkboxes labelled with the row's key (patient name); caption or `aria-label` describing the table; pagination controls labelled; live region announces "Showing X of Y" on change. Avoid horizontal-scroll-only access to critical actions on touch.

### 5.5 Modals / dialogs

**Usage:** focused tasks and confirmations that must block. Keep short; prefer drawers for longer forms. **Confirmation modals are the patient-safety gate** (§1.4) — restate action + subject.

**Variants:** standard, confirmation (with `danger`/`success` accent), form modal (sm/md/lg widths), fullscreen (mobile bottom-sheet).

**States:** `open · closing · loading (action in flight, primary button busy, backdrop click disabled) · error (inline alert inside)`.

**A11y:** `role="dialog"` `aria-modal="true"`; labelled by title (`aria-labelledby`) + described by body (`aria-describedby`); **focus trapped**, focus moved to first control/title on open, returned to trigger on close; `Esc` closes (suppressed while a destructive action is mid-flight); scroll-locked backdrop; never the only path to critical info.

### 5.6 Drawers (slide-overs)

**Usage:** contextual detail/edit without losing the list (patient quick-view, order detail, notifications, filters panel). Slides from right (LTR) / left (RTL); `z-drawer`.

**Variants:** right (default), left (filters), bottom-sheet (mobile). Widths `sm`/`md`/`lg`.

**States:** `open · loading · dirty (unsaved-changes guard on close) · error`.

**A11y:** same dialog semantics as modal (focus trap, `Esc`, labelled). Backdrop optional (non-modal drawers allow background scroll but keep an explicit close). Side respects writing direction.

### 5.7 Tabs

**Usage:** switch views within one context without navigation (patient profile sections, report types, settings panes).

**Variants:** underline (default), pill/segmented, vertical (settings). Optional count badges.

**States:** `default · active (primary underline/fill, aria-selected) · hover · disabled · focus · overflow (scroll / "more ▾" on narrow)`.

**A11y:** ARIA tabs pattern — `role="tablist"`, arrow-key roving tabindex, `aria-selected`, `aria-controls` → `tabpanel` with `aria-labelledby`. Lazy-load panel content but keep selection deep-linkable via URL.

### 5.8 Cards

**Usage:** group related content/actions on a surface. Base building block of dashboards and forms.

**Variants:** basic, with header (title + actions) + body + footer; interactive/clickable (whole card is a link — hover elevate, focus ring); stat card (§5.18); list card (mobile table fallback).

**States:** `default · hover (interactive only) · selected · loading (skeleton) · disabled`.

**A11y:** if the whole card is clickable, it wraps a single semantic link/button (no nested interactive traps); decorative icons `aria-hidden`. Heading hierarchy maintained (card title = `<h3>`/`<h2>` per context).

### 5.9 Badges & status pills

**Usage:** compact status. Three families: **semantic** (success/warning/danger/info/neutral), **triage** (§2.3), **queue status** (§2.4). Always colour + icon/label.

**Variants:** solid, soft (tinted bg + tinted text — default), outline, dot (leading status dot + text). Sizes `sm`/`md`.

**Triage pill:** `[●] Yellow · ≤60m` using `triage-*` constants; near-black text on yellow. **Queue pill:** `[icon] In progress`.

**A11y:** never colour-only — include text label or `aria-label`/SR-text (e.g. visually a dot, `<span class="sr-only">Status: completed</span>`). Soft variants verified ≥4.5:1 text contrast in both themes.

### 5.10 Toasts / alerts

**Toasts (transient):** bottom-right stack (`z-toast`), auto-dismiss 4–6s (success/info), persistent until dismissed for `danger`. Optional action ("Undo", "View"). Max ~3 stacked; queue the rest.

**Alerts (inline, persistent):** banners within content for context-bound messages (validation summary, offline mode, claim rejected). Variants `info · success · warning · danger`, each with leading icon + optional title + body + actions.

**System banner:** full-width top banner (`z-max`) for critical states (connection lost, maintenance, critical clinical alert).

**A11y:** toasts in an `aria-live` region — `polite` for success/info, `assertive`/`role="alert"` for danger. Never auto-dismiss error toasts before the user can act; dismiss button labelled; respect reduced-motion (fade not slide).

### 5.11 Tooltips

**Usage:** supplementary hints on icon-only buttons, truncated text, abbreviations (SOAP, SHA, MTS). Never put essential or interactive content in a tooltip.

**States:** `hidden · visible (hover/focus, ~150ms delay)`. `z-tooltip`.

**A11y:** triggered on **hover and keyboard focus**; linked via `aria-describedby`; dismissible with `Esc`; not used for actionable content; truncation tooltips expose full text to SR via `title`/`aria-label`.

### 5.12 Avatars

**Usage:** users (staff menu, audit, assignment) and patients (context bar, lists). Photo, else initials on a deterministic colour from a safe palette, else generic icon.

**Variants/sizes:** `xs`(20)·`sm`(24)·`md`(32)·`lg`(40)·`xl`(64); circular; optional status dot (online/duty) and stacked group (`+3`).

**A11y:** `alt` = person's name; initials avatars get `aria-label` with full name; status dot has SR text; group overflow announced ("and 3 more").

### 5.13 Breadcrumbs

**Usage:** orientation for nested screens. `Group / Entity / View`, last item = current (not a link, `aria-current="page"`).

**States:** `default · truncated (collapse middle to "…" on narrow with a menu) · with leading home icon`.

**A11y:** `<nav aria-label="Breadcrumb">` wrapping an ordered list; separators decorative/`aria-hidden`; current page non-interactive.

### 5.14 Pagination

**Usage:** paginated tables/lists. Shows range, page controls, and page-size select; supports server-side paging.

**Variants:** numbered (`« ‹ 1 … 13 › »`), simple prev/next, load-more/infinite (worklists/feeds).

**States:** `default · first-page (prev disabled) · last-page (next disabled) · single-page (hidden) · loading`.

**A11y:** `<nav aria-label="Pagination">`; current page `aria-current="page"`; disabled controls `aria-disabled`; page-size is a labelled select; range text in a live region.

### 5.15 Empty states

**Usage:** zero-data contexts — first-run, filtered-empty, no-results, error-empty. Reassure + direct.

**Anatomy:** centered illustration/icon (muted, `aria-hidden`) → title → one-line explanation → primary action (when one exists, e.g. "Register first patient") → secondary link (e.g. "Clear filters" / docs).

**Variants:** empty (no data yet) · no-results (search/filter) · error (with retry) · permission (no access). Tone is helpful and specific to the screen.

**A11y:** illustration decorative; the title is a real heading; action button keyboard-reachable; not announced as an error unless it is one.

### 5.16 Skeletons / loading

**Usage:** placeholder for content regions while fetching (preferred over spinners for layout-stable loads). Mirror the final layout (text lines, avatar circle, table rows, card blocks).

**States:** `pulsing (shimmer/opacity — disabled under reduced-motion → static muted blocks)`.

**A11y:** wrapper `aria-busy="true"` + `aria-hidden` on the shimmer; a polite SR message "Loading…"; replaced by content when ready (announce completion for long loads). Use a **spinner** only for in-button/inline async; use a **progress bar** for determinate multi-step (uploads, report generation) with `role="progressbar"` + value attrs.

### 5.17 Stat cards (KPI)

**Usage:** dashboard metrics — patients today, queue length, revenue (KES), beds occupied, pending claims.

**Anatomy:** label (`text-sm muted`) → value (`text-3xl mono tabular-nums`) → delta (▲/▼ with success/danger colour + period) → optional sparkline / progress / leading icon in a tinted chip. Optional click-through to the detail report.

**States:** `default · loading (skeleton) · interactive (hover/focus if clickable) · error · no-data ("—")`.

**A11y:** value + label associated; delta direction conveyed in text not colour alone ("▲ 12% vs yesterday"); clickable card = single link; currency formatted via i18n (`KES 1,240,500.00`).

### 5.18 Charts & visualisation containers

**Usage:** trends and distributions via **Recharts** (foundation §10) — line (volumes over time), bar (revenue by department/branch), donut/pie (payer mix), area (occupancy), stacked bar (triage distribution).

**Container anatomy:** card with title + optional period/segment control + legend + the chart canvas + footer note/source. Responsive width; fixed sensible height; `ResponsiveContainer`.

**States:** `loading (skeleton chart) · empty ("no data for this period") · error (retry) · partial`. Period/comparison controls live in the header.

**Colour:** use the brand/secondary + semantic palette; for categorical series use a curated 8-colour qualitative set distinguishable by **both hue and a pattern/marker** where feasible; triage charts use triage constants.

**A11y:** chart has an accessible name (`aria-label`/`<title>`) and a **text/table alternative** (toggle "View as table") since SVG charts are not natively readable; tooltips keyboard-reachable; do not encode meaning by colour alone (add labels/markers); ensure legend text meets contrast. Calendar views use **FullCalendar** (foundation §10) with keyboard navigation and event labels.

### 5.19 Forms — composition & patterns
- **Layout:** logical fieldsets in cards; `<legend>` per group; 1–2 columns responsive; related fields aligned.
- **Required/optional:** mark the minority; if most are required, mark optional ones instead.
- **Inline validation** on blur for format, on submit for cross-field; never validate-as-you-type aggressively.
- **Sticky action bar** for long forms (Save / Cancel) with dirty-state guard on navigation.
- **Autosave drafts** for long clinical notes; show "Saved" / "Saving…" status.
- **Patient-safety confirmations** for clinical submissions (orders, prescriptions, dispense, discharge).

---

## 6. Key screen wireframes

ASCII layouts (LTR). All icon glyphs are placeholders for the SVG registry. All strings are i18n keys at build time.

### 6.1 Dashboard (role-adaptive)

```
Breadcrumb: Dashboard
┌ Page header ──────────────────────────────────────────────────────────────┐
│ Good morning, Dr. Mwangi              Branch: NRB ▾   [+ New consultation]  │
├ Stat cards (col-span-3 each) ─────────────────────────────────────────────┤
│ ┌Patients today┐ ┌In queue┐ ┌Revenue (KES)┐ ┌Beds occupied┐               │
│ │   142        │ │  12    │ │ 1,240,500   │ │  38 / 50      │               │
│ │ ▲ 8% vs yest │ │ ⏱ avg 14m│ │ ▲ 3%       │ │ ▮▮▮▮▮▮▯ 76% │               │
│ └──────────────┘ └────────┘ └─────────────┘ └───────────────┘               │
├ Main (col-span-8) ─────────────────────┬ Side (col-span-4) ───────────────┤
│ ┌ Patient volume — last 7 days ───────┐│ ┌ My queue ──────────────────────┐│
│ │  [ line chart ]   [View as table]   ││ │ DOC-007 Amina O.   ⏱ waiting   ││
│ └─────────────────────────────────────┘│ │ DOC-008 J. Kamau   ⏱ waiting   ││
│ ┌ Revenue by department ──────────────┐│ │ [Call next]                    ││
│ │  [ bar chart ]                      ││ └────────────────────────────────┘│
│ └─────────────────────────────────────┘│ ┌ Clinical alerts (3) ───────────┐│
│                                         │ │ ⚠ Critical K+ result — view    ││
│                                         │ │ ⚠ Drug interaction flagged     ││
│                                         │ └────────────────────────────────┘│
└─────────────────────────────────────────┴───────────────────────────────────┘
```
Admin sees branch-comparison + financial KPIs; Pharmacist sees dispense queue + low-stock; Cashier sees collections + shift. Each card click-throughs to its report.

### 6.2 Patient registration

```
Breadcrumb: Patients / Register
┌ Register patient ───────────────────────────────  [Cancel] [Save & queue ▾]┐
│ ┌ Identity ────────────────────────────────────────────────────────────┐  │
│ │ First name*        | Last name*        | Other names                   │  │
│ │ DOB* [📅]  Age(auto)| Sex*  ( )M ( )F ( )Other | National ID           │  │
│ │ Patient no.: PAT-2026-000043 (auto on save)                            │  │
│ └─────────────────────────────────────────────────────────────────────┘  │
│ ┌ Contact ─────────────────────────────────────────────────────────────┐  │
│ │ Phone* [+254 ____]  | Email           | County ▾ | Town | Address     │  │
│ │ Next of kin name | relationship ▾ | NOK phone                          │  │
│ └─────────────────────────────────────────────────────────────────────┘  │
│ ┌ Clinical & payer ────────────────────────────────────────────────────┐  │
│ │ Blood group ▾ | ⚠ Allergies [+ add chips] | Chronic conditions chips  │  │
│ │ Payer: ( ) Cash  ( ) SHA  ( ) Insurer ▾   | Member no.                 │  │
│ └─────────────────────────────────────────────────────────────────────┘  │
│ Sticky footer: [Cancel]            [Save] [Save & send to Triage queue]    │
└────────────────────────────────────────────────────────────────────────────┘
```
Inline duplicate-check on name+DOB+phone (warns, links to existing). Phone auto-formats `+254`. Allergy chips use `danger` styling. "Save & queue" creates a Reception/Triage ticket.

### 6.3 Patient profile

```
Context bar (sticky): [avatar] Amina Otieno  PAT-2026-000042  F/34
                      ⚠ Allergy: Penicillin   • SHA payer   [Actions ▾]
Breadcrumb: Patients / Amina Otieno
┌ Tabs: Overview | Encounters | Vitals | Orders & Results | Prescriptions |
│        Billing | Documents | Appointments | Audit                          │
├ Overview ─────────────────────────────────┬ Side panel ───────────────────┤
│ ┌ Demographics card ──────────────────┐   │ ┌ Alerts ──────────────────┐  │
│ │ Phone, NOK, address, payer …        │   │ │ ⚠ Penicillin allergy     │  │
│ └─────────────────────────────────────┘   │ │ ⚠ Hypertension (chronic) │  │
│ ┌ Active problems / chronic ─────────┐    │ └──────────────────────────┘  │
│ │ • Hypertension  • Type 2 diabetes  │    │ ┌ Recent visits timeline ──┐  │
│ └─────────────────────────────────────┘   │ │ 12 Jun · Consultation    │  │
│ ┌ Latest vitals (mini) ──────────────┐    │ │ 02 Jun · Lab — CBC       │  │
│ │ BP 138/88 · HR 78 · T 36.8 · SpO2 98│   │ └──────────────────────────┘  │
│ └─────────────────────────────────────┘   │ [Start consultation]          │
└────────────────────────────────────────────┴───────────────────────────────┘
```

### 6.4 Queue board (department display)

```
Breadcrumb: Queue / Board — Doctor consultation (NRB)         [⛶ Fullscreen]
┌ Filters: Department ▾  Status ▾  [Refresh ⟳ live]      Avg wait: 14m  Now: 10:42 ┐
├ Now serving ───────────────┬ Next up ─────────────┬ Waiting ──────────────────┤
│  ┌──────────────────────┐  │ DOC-008  J. Kamau    │ DOC-010  P. Wanjiru        │
│  │   DOC-007            │  │ [Yellow ≤60m]        │ [Green ≤120m]              │
│  │   Amina Otieno      │  │ ⏱ 06:12              │ ⏱ 18:40                    │
│  │   Room 3 · Dr Mwangi│  │ DOC-009  M. Achieng  │ DOC-011  S. Mutua          │
│  │   [● In progress]   │  │ [Green ≤120m]        │ [Blue ≤240m]               │
│  └──────────────────────┘  │                      │ + 6 more                   │
├ Emergency bypass lane (z, red banner) ────────────────────────────────────────┤
│  ⚠ TRI-014  Unknown male  [Red · Immediate]  → routed to Resus               │
└────────────────────────────────────────────────────────────────────────────────┘
Staff station view adds: [Call next] [Recall] [Hold] [Skip/No-show] [Complete]
```
Kiosk/fullscreen: enlarged type (`text-xl`+), auto-refresh via broadcasting, audible "next" chime (respect mute). Triage colour drives ordering; emergency bypass always top.

### 6.5 Triage

```
Context bar: [avatar] J. Kamau  PAT-2026-000051  M/41   [Allergy: none]
Breadcrumb: Triage / J. Kamau
┌ Triage assessment ───────────────────────────────  [Cancel] [Save & route]┐
│ ┌ Presenting complaint ───────────────────────────────────────────────┐   │
│ │ [ textarea ]                          Onset ▾   Pain score [0–10] ──○│   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│ ┌ Vitals ──────────────────────────────────────────────────────────────┐  │
│ │ BP [__/__] mmHg | HR [__] | RR [__] | Temp [__]°C | SpO2 [__]% | wt[]kg│  │
│ │ (out-of-range values auto-flag danger)                                 │  │
│ └────────────────────────────────────────────────────────────────────────┘ │
│ ┌ MTS acuity (select one) ──────────────────────────────────────────────┐  │
│ │ ( )[■Red Immediate] ( )[■Orange ≤10m] (•)[■Yellow ≤60m]               │  │
│ │ ( )[■Green ≤120m]   ( )[■Blue ≤240m]                                   │  │
│ │ Selected: YELLOW — target ≤ 60 min                                     │  │
│ └────────────────────────────────────────────────────────────────────────┘ │
│ Route to ▾: [Doctor — General] ✓ emergency bypass off                       │
│ Footer: [Cancel]                              [Save & send to Doctor queue] │
└────────────────────────────────────────────────────────────────────────────┘
```
Acuity tiles use triage constants (full colour, correct on-colour text). Selecting Red/Orange offers emergency-bypass toggle. Abnormal vitals flag inline.

### 6.6 Doctor consultation / SOAP

```
Context bar: [avatar] Amina Otieno  PAT-2026-000042  F/34  ⚠ Penicillin
Breadcrumb: Clinical / Amina Otieno / Consultation
┌ Left: history rail (col-4) ─────┬ Right: SOAP editor (col-8) ───────────────┐
│ Past encounters (timeline)      │ ┌ Tabs: Subjective|Objective|Assessment|Plan│
│ Active problems                 │ │ S: [ rich textarea, autosave ●Saved ]   ││
│ Allergies (danger)              │ │ O: vitals (from triage) + exam findings  ││
│ Current meds                    │ │ A: Diagnosis [ICD-10 combobox ↻]          ││
│ Latest results (abnormal ▲)     │ │    + problem list updates                 ││
│                                 │ │ P: Orders ▸ [+ Lab] [+ Radiology] [+ Rx]  ││
│                                 │ │    [+ Referral] [+ Admit] · follow-up date││
│                                 │ └──────────────────────────────────────────┘│
│                                 │ ⚠ Drug–allergy / interaction alerts inline   │
│                                 │ Footer: [Save draft]  [Sign & complete ▾]    │
└─────────────────────────────────┴──────────────────────────────────────────────┘
```
Ordering opens a drawer per order type. "Sign & complete" = confirmation modal (restates patient + orders) → routes to next queue station. Clinical alerts block where unsafe.

### 6.7 Pharmacy dispense

```
Breadcrumb: Pharmacy / Dispense / RX-NRB-2026-008812
┌ Master (col-4): Dispense queue ──┬ Detail (col-8): Prescription ──────────────┐
│ [search Rx / patient]            │ Patient: Amina Otieno PAT-2026-000042 ⚠Pen │
│ ▸ RX-..8812 Amina O. [waiting]   │ Prescriber: Dr Mwangi · 22 Jun 10:50       │
│ ▸ RX-..8813 J. Kamau [waiting]   │ ┌ Items ───────────────────────────────┐  │
│ ▸ RX-..8810 M. A.   [partial]    │ │ Drug          | Dose | Qty | Stock |✔ │  │
│                                  │ │ Amoxicillin   | 500mg| 21  | 240  |▢ │  │
│                                  │ │   ⚠ allergy match: Penicillin class!  │  │
│                                  │ │ Paracetamol   | 1g   | 30  | 12 ⚠low|▢ │  │
│                                  │ └───────────────────────────────────────┘  │
│                                  │ Counselling notes [textarea]                │
│                                  │ Footer:[Hold][Partial] [Dispense & charge ▾]│
└──────────────────────────────────┴────────────────────────────────────────────┘
```
Allergy/interaction match blocks the item (must override with reason, audit-logged). Stock decremented on dispense; low/out-of-stock flagged. "Dispense & charge" confirmation names patient + quantities (§1.4) and pushes to Billing.

### 6.8 Lab results

```
Breadcrumb: Laboratory / Worklist / LAB-NRB-260622-0007
┌ Worklist (col-4) ───────────────┬ Result entry (col-8) ─────────────────────┐
│ Filters: status ▾ priority ▾    │ LAB-NRB-260622-0007 · CBC · Amina Otieno   │
│ ▸ LAB-..0007 CBC   [collected]  │ Sample: collected 09:30 · received 09:42   │
│ ▸ LAB-..0008 U&E   [in-process] │ ┌ Analytes ────────────────────────────┐  │
│ ▸ LAB-..0009 LFT   [reported]   │ │ Test   | Result | Unit | Ref range |Fl│  │
│                                 │ │ Hgb    | 9.1    | g/dL | 12–16    |▼ L│  │
│                                 │ │ WBC    | 14.2   | 10⁹/L| 4–11     |▲ H│  │
│                                 │ │ Plt    | 250    | 10⁹/L| 150–450  |   │  │
│                                 │ │ (▲H/▼L abnormal = danger; crit=banner)│  │
│                                 │ └───────────────────────────────────────┘  │
│                                 │ Tech notes [textarea]                       │
│                                 │ Footer: [Save draft] [Verify & release ▾]   │
└─────────────────────────────────┴──────────────────────────────────────────────┘
```
Abnormal flagged with arrow + colour + label (not colour alone). Critical values trigger a `z-max` banner + notify ordering doctor on release. Released results appear in patient profile + portal.

### 6.9 Billing / invoice + M-Pesa

```
Context bar: Amina Otieno PAT-2026-000042
Breadcrumb: Billing / Invoices / INV-NRB-2026-001934
┌ Invoice ─────────────────────────────────────────  [Print] [Void ▾]  [Pay ▾]┐
│ INV-NRB-2026-001934 · 22 Jun 2026 · Status: [● Unpaid]   Payer: SHA + Cash   │
│ ┌ Line items ──────────────────────────────────────────────────────────┐   │
│ │ Item                     | Qty | Unit (KES) | Amount (KES)             │   │
│ │ Consultation — General   |  1  |  1,500.00  |   1,500.00               │   │
│ │ CBC                      |  1  |  1,200.00  |   1,200.00               │   │
│ │ Amoxicillin 500mg ×21    | 21  |     20.00  |     420.00               │   │
│ ├──────────────────────────────────────────────────────────────────────┤   │
│ │ Subtotal 3,120.00 · SHA covers 1,800.00 · Patient due  KES 1,320.00   │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│ ┌ Pay (drawer/modal) ──────────────────────────────────────────────────┐   │
│ │ Method: (•) M-Pesa STK  ( ) Cash  ( ) Card                            │   │
│ │ Phone [+254 712 345678]   Amount [KES 1,320.00]   [Send STK push]     │   │
│ │ → Status: ⏳ Awaiting customer PIN …  → ✓ Paid · RCP-NRB-2026-001120  │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```
Money is mono + `tabular-nums`, `KES` formatted. STK push shows live polling states (sent → awaiting PIN → success/failed/timeout) via broadcasting; success generates receipt + queue completion. SHA split shown explicitly.

### 6.10 Inpatient bed board

```
Breadcrumb: Inpatient / Bed board (NRB)
┌ Filters: Ward ▾  Status ▾   Occupancy 38/50 (76%)   [Admit patient]         ┐
├ Ward A — General (12 beds) ────────────────────────────────────────────────┤
│ ┌A1 ████┐ ┌A2 ████┐ ┌A3 ░░░░┐ ┌A4 ████┐ ┌A5 ▓▓▓▓┐ ┌A6 ████┐               │
│ │Occupied│ │Occupied│ │Vacant │ │Occupied│ │Cleaning│ │Occupied│           │
│ │A.Otieno│ │J.Kamau │ │  —    │ │M.A.   │ │  —    │ │P.W.   │               │
│ │Dr M ⚠  │ │Dr N    │ │[Assign]│ │Dr M   │ │       │ │Dr K   │               │
│ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘           │
├ Ward B — Maternity (8) ─ Ward C — ICU (6, ▲high acuity) … ────────────────┤
│ Legend: ████ Occupied  ░░░░ Vacant  ▓▓▓▓ Cleaning  ▒▒▒▒ Reserved  ╳ Blocked │
└────────────────────────────────────────────────────────────────────────────┘
```
Bed states are colour + pattern + label. Click a bed → drawer (patient, admitting doctor `ADM-…` no., LOS, actions: transfer/discharge/assign). Vacant beds show `[Assign]`. ICU acuity highlighted.

### 6.11 Reporting dashboards

```
Breadcrumb: Reports / Financial
┌ Financial reports ──── Period [This month ▾] Branch [All ▾] [Export CSV/PDF]┐
├ Stat row ──────────────────────────────────────────────────────────────────┤
│ [Revenue KES 28.4M ▲5%] [Collected 24.1M] [Outstanding 4.3M] [SHA pend 2.1M]│
├ Charts ─────────────────────────────────────────────────────────────────────┤
│ ┌ Revenue trend (line) [View as table] ┐ ┌ Payer mix (donut) ───────────┐  │
│ │   [ chart ]                          │ │ Cash 42% · SHA 38% · Ins 20% │  │
│ └──────────────────────────────────────┘ └──────────────────────────────┘  │
│ ┌ Revenue by department (bar) ─────────────────────────────────────────┐    │
│ │   [ chart ]                                                          │    │
│ └──────────────────────────────────────────────────────────────────────┘    │
│ ┌ Detail table (sortable, filterable, paginated, export) ──────────────┐    │
│ └──────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```
Every chart offers "View as table" for a11y/export. Period + branch + comparison filters in the header. Tabs/links to Clinical, Operational, Compliance/Audit report sets.

### 6.12 Patient portal (separate shell)

```
Top: Afya  [Home][Appointments][Records][Results][Bills][Messages]  [EN/SW][☀/🌙][Avatar]
┌ Home ──────────────────────────────────────────────────────────────────────┐
│ Welcome, Amina                                                              │
│ ┌ Next appointment ─────────────┐ ┌ Outstanding bill ────────────────────┐ │
│ │ 25 Jun · 10:00 · Dr Mwangi   │ │ KES 1,320.00 due  [Pay with M-Pesa]  │ │
│ │ [Reschedule] [Cancel]         │ └──────────────────────────────────────┘ │
│ └───────────────────────────────┘ ┌ New results (1) ─────────────────────┐ │
│ ┌ My prescriptions ─────────────┐ │ CBC — 22 Jun  [View]                 │ │
│ │ Amoxicillin 500mg · active    │ └──────────────────────────────────────┘ │
│ └───────────────────────────────┘                                          │
│ [Book appointment]   [Message care team]   [Download records]              │
└────────────────────────────────────────────────────────────────────────────┘
```
Larger type (`text-base`+), generous touch targets (≥48px), simplified language, mobile-first single column, full EN/SW. Results show patient-friendly explanations; pay flow mirrors §6.9 STK push. No clinical jargon without a tooltip/expander.

---

## 7. Iconography guidelines

- **Source of truth:** centralized SVG icon registry `src/components/icons`, consumed only via `<Icon name="…" />` (foundation §10). **No emojis, ever**, including in toasts, empty states, and the portal.
- **Style:** single consistent set (outline/stroke, e.g. Lucide-style), `1.5px` stroke, `currentColor` fill so icons inherit text colour and theme automatically. Default sizes `16` (inline), `20` (buttons), `24` (nav/standalone).
- **Naming:** kebab-case semantic names (`alert-triangle`, `check-circle`, `clock`, `megaphone`, `pill`, `flask`, `bed`, `receipt`, `user-x`). Map clinical concepts to stable names; never reference a file path in components.
- **Semantics & a11y:** decorative icons get `aria-hidden="true"`; **icon-only controls require a text label** via `aria-label`; meaningful status icons pair with a text label or `sr-only` text (never icon/colour alone).
- **Consistency:** one icon = one meaning across the app (e.g. `flask` = lab everywhere). Maintain an icon glossary in the registry. Optical alignment with adjacent text baseline; pad to keep target sizes.
- **Sizing/contrast:** icons conveying state meet the same 3:1 non-text contrast as UI components. Avoid filled+detailed icons that lose clarity at 16px.

---

## 8. Motion

Motion is functional — it explains spatial/state relationships and directs attention. It is never decorative-only and always defers to `prefers-reduced-motion`.

- **Durations:** micro (hover/press/toggle) `100–150ms`; small transitions (dropdown, tooltip, toast) `150–200ms`; medium (modal, drawer, tab panel) `200–300ms`; page/route `250–300ms`. Nothing above `~400ms` in app chrome.
- **Easing:** standard `cubic-bezier(0.2, 0, 0, 1)` (emphasized-decelerate) for entrances; `ease-in` for exits; linear only for spinners/progress.
- **Patterns:** modals fade+scale (`.97→1`); drawers slide from edge (respect writing direction); toasts fade+slide-up; dropdowns fade+slight translate; tab panels crossfade; skeleton shimmer subtle; queue/list reorders animate position (FLIP) so a moved ticket is trackable; optimistic toggles spring then settle.
- **Attention, sparingly:** a brief highlight pulse on a newly-arrived queue ticket or critical alert (once, then static). Never loop attention animations except indeterminate progress.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, replace movement with instant or opacity-only changes; disable shimmer/parallax/auto-carousels; the global CSS rule (§2.11) clamps durations. Functionality must be identical.
- **Performance:** animate only `transform`/`opacity`; avoid layout-thrashing properties. No motion on large data-grids during scroll.

---

## 9. Accessibility checklist (WCAG 2.1 AA)

**Perceivable**
- [ ] Text contrast ≥ 4.5:1 (≥ 3:1 large text); verified in **both** themes including soft badges and triage on-colour text.
- [ ] Non-text/UI contrast ≥ 3:1 (borders, icons, focus rings, chart elements).
- [ ] Information never by colour alone — status uses colour **+ icon/label** (triage, queue, lab flags, billing).
- [ ] All meaningful images/icons have text alternatives; decorative ones `aria-hidden`.
- [ ] Charts provide a table/text alternative.
- [ ] Content reflows to 320px width without loss; supports 200% zoom.
- [ ] `prefers-color-scheme` respected as the theme default.

**Operable**
- [ ] Every interactive element keyboard-reachable and operable; logical tab order.
- [ ] Visible focus indicator on all focusable elements (2px ring + offset).
- [ ] No keyboard traps; modals/drawers trap intentionally and restore focus on close.
- [ ] `Esc` closes overlays; `Enter`/`Space` activate; arrow keys for composite widgets (tabs, menus, grids).
- [ ] Touch targets ≥ 44×44px (≥ 48px on portal/bedside).
- [ ] Skip-to-content link; landmark regions (`header`, `nav`, `main`, `aside`).
- [ ] No content flashes > 3×/sec; reduced-motion honoured.
- [ ] Command palette and all high-frequency flows fully keyboard-completable.

**Understandable**
- [ ] Inputs have persistent visible labels; placeholders are not labels.
- [ ] Errors identified in text, specific and actionable, linked via `aria-describedby`; error summary on long forms.
- [ ] Consistent navigation, naming, and component behaviour across the app.
- [ ] Destructive/clinical actions confirmed with explicit, subject-stating dialogs.
- [ ] Language of page (`lang`) set and updated on EN/SW switch; `dir` set for RTL readiness.

**Robust**
- [ ] Semantic HTML first; ARIA only to fill gaps and always valid.
- [ ] Async updates announced via `aria-live` (queue, results, toasts, save state) with correct politeness.
- [ ] Custom widgets follow the ARIA Authoring Practices patterns (combobox, tabs, dialog, grid).
- [ ] Tested with keyboard-only, screen reader (NVDA/VoiceOver), and automated (axe) + manual audits in CI.
- [ ] State (`aria-busy`, `aria-disabled`, `aria-current`, `aria-invalid`, `aria-expanded`, `aria-selected`) reflects UI truthfully.

---

## 10. Content, i18n & RTL readiness

### 10.1 Voice & content
- **Clear, calm, professional.** Short sentences, active voice, no jargon in patient-facing copy (expand abbreviations or tooltip them).
- **Action-oriented buttons:** verb + object ("Save patient", "Send STK push", "Verify & release"), never "OK/Submit" alone.
- **Errors:** what happened + how to fix, never blame ("Couldn't send STK push — check the phone number and try again").
- **Numbers/dates/money:** locale-formatted via i18n; money `KES 1,234,567.89`; dates rendered in `Africa/Nairobi`; IDs in mono (`PAT-2026-000042`). Use 24h or locale-appropriate time.
- **Sentence case** for UI text and buttons; Title Case avoided.

### 10.2 Internationalisation (react-i18next)
- **No hardcoded user-facing strings** (foundation §10) — every string is a key; namespaces per feature.
- Locales: **`en` + `sw` (Kiswahili)**; switchable at runtime via the topbar toggle, persisted on the user profile in the database, sets `<html lang>`.
- **Pluralisation & interpolation** via ICU/i18next ("{{count}} patient / {{count}} patients" with Swahili plural rules).
- **No string concatenation** to build sentences; use full interpolated templates so word order is translatable.
- **Allow for text expansion** (Swahili strings often longer): never fix widths to English; truncate with tooltip, wrap gracefully; test layouts at +30–40% length.
- Clinical/standard terms (triage levels, SOAP, ICD-10) kept consistent and glossary-controlled across locales.

### 10.3 RTL readiness
- Although launch locales are LTR, build RTL-ready so future Arabic/other locales need no rework:
  - Use **logical properties** (`ms-*`/`me-*`, `ps-*`/`pe-*`, `start`/`end`) over `left/right` in Tailwind; set `dir` on `<html>` from the active locale.
  - Drawers/sidebars, breadcrumbs separators, chevrons, progress and queue-flow arrows mirror with direction.
  - Keep numerals, IDs, money, phone numbers, and clinical codes **LTR** even inside RTL text (`dir="ltr"` spans / `bdi`).
  - Icons that imply direction (back/forward, next-in-queue) flip; symmetric icons don't.
  - Verify focus order and tab order follow visual order after mirroring.

---

*End of document 15 — UI/UX Design System. Consistent with `00-foundation.md` v1.0.*
