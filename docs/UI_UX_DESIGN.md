# Exam System — UI/UX Design Spec & Redesign Roadmap

> A professional, modern redesign of the WMSU Exam System. Admin console first, then public views.
> Design direction: **Modernized Gentelella** — a refined dark sidebar + top navbar with breadcrumbs, admin user menu, and dashboard stat tiles, updated with a cleaner 2026 aesthetic.

---

## 1. Vision & Goals

The system is currently functional but styled almost entirely with ad-hoc inline styles. The redesign replaces this with a **single design system** (design tokens + shared UI components) and a **consistent application shell**, making the product look professional, modern, and trustworthy.

**Goals**

- Professional, consistent look across every page.
- One source of truth for colors, spacing, type, radius, and shadows.
- Reusable UI kit that removes per-page duplication (toasts, modals, tables, empty states).
- Responsive: mobile-first with polished tablet/desktop layouts.
- Zero regression on the exam experience (anti-cheat, fullscreen, PWA).

**Non-goals (for now)**

- No new backend features.
- No data-model changes.
- No exam anti-cheat behavior changes.

---

## 2. Design Principles

1. **Clarity over decoration** — data-dense admin surfaces stay readable; whitespace guides the eye.
2. **Consistency** — one button, one card, one table style everywhere.
3. **Modern Gentelella DNA** — dark sidebar + light content + top bar + stat tiles, but flattened (no heavy gradients, no dated bevels).
4. **Mobile-first** — the public pages and exam are used heavily on phones.
5. **Accessibility** — sufficient contrast, visible focus states, semantic markup.
6. **No behavior drift** — visual-only changes to exam flow.

---

## 3. Design Tokens

All tokens are defined once (Tailwind `@theme` + CSS variables) and referenced by every component/page. Inline hex values must be removed from page code.

### 3.1 Color Palette

| Token | Value | Usage |
| --- | --- | --- |
| `--color-navy-900` | `#0b1b3a` | Sidebar bg, darkest surfaces |
| `--color-navy-800` | `#0f2044` | Primary brand / headers / primary buttons |
| `--color-navy-700` | `#1a4fad` | Hover states, links, active accents |
| `--color-navy-100` | `#ddeeff` | Soft brand backgrounds, active nav fill |
| `--color-accent` | `#e8a020` | Brand accent (logo, highlights) |
| `--color-surface` | `#ffffff` | Cards, modals, tables |
| `--color-canvas` | `#f4f7fd` | Content background |
| `--color-border` | `#d6e1f2` | Card/table borders |
| `--color-border-strong` | `#b9cbe8` | Input borders |
| `--color-text` | `#1a2a3a` | Primary text |
| `--color-muted` | `#5a7090` | Secondary text |
| `--color-faint` | `#8fa6c8` | Tertiary text / placeholders |
| `--color-success` | `#1a7a4a` | Present / correct / positive |
| `--color-success-bg` | `#d4f5e2` | Success pill background |
| `--color-warning` | `#b8860b` | Late / caution |
| `--color-warning-bg` | `#fff3d4` | Warning pill background |
| `--color-danger` | `#c0392b` | Delete / absent / wrong |
| `--color-danger-bg` | `#fdecea` | Danger pill background |

Status mapping (single source of truth):

- **Present / Correct / Pass (≥80%)** → `success`
- **Late / Fair (60–79%)** → `warning`
- **Absent / Fail / Delete** → `danger`
- **Info / neutral** → `navy-700`

### 3.2 Typography

| Role | Font | Sizes |
| --- | --- | --- |
| Body / UI | `IBM Plex Sans` (already loaded) | 12 / 13 / 14 / 15 |
| Headings | `IBM Plex Sans` 600–700 | 16 / 18 / 20 / 24 |
| Data / IDs / scores / code | `IBM Plex Mono` | 11 / 12 |

Type scale tokens: `text-xs` 11px · `text-sm` 12px · `text-base` 13px · `text-md` 14px · `text-lg` 15px · `text-xl` 17px · `text-2xl` 20px · `text-3xl` 24px.

### 3.3 Spacing, Radius, Shadows

- Spacing scale: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48` (Tailwind `--spacing`).
- Radius: `--radius-sm` 6px (inputs, small pills) · `--radius-md` 10px (cards) · `--radius-lg` 14px (modals, hero).
- Shadows:
  - `--shadow-card` `0 1px 2px rgba(11,27,58,.06), 0 4px 16px rgba(11,27,58,.06)`
  - `--shadow-modal` `0 24px 64px rgba(0,0,0,.25)`
  - `--shadow-pop` `0 8px 24px rgba(0,0,0,.18)`
- Z-index scale: content `0` · sticky header `30` · sidebar `40` · overlay `50` · modal `60` · toast `70`.

### 3.4 Motion

- Hover transitions `150ms ease`; sidebar slide `250ms ease`; modal/`fadeIn` `250ms`.
- No motion without purpose; keep exam timer visuals calm.

---

## 4. Application Shell (Admin)

Inspired by Gentelella's structure, modernized.

```
┌────────────┬──────────────────────────────────────────────┐
│  SIDEBAR   │  TOP NAVBAR                                  │
│  (collaps.)│  ☰ Page Title        [Search] [Admin ▾]      │
│  nav group ├──────────────────────────────────────────────┤
│  • Dashboard│  Breadcrumb / contextual actions            │
│  • Classes  │                                              │
│  • Exams    │  CONTENT                                     │
│  • Monitoring│  (max-width container, cards grid)          │
│  • System   │                                              │
│  footer:    │                                              │
│  Student ▾  │                                              │
└────────────┴──────────────────────────────────────────────┘
```

### 4.1 Sidebar

- Desktop: fixed width `240px`, **collapsible** to `64px` (icon-only) via the hamburger in the top bar.
- Mobile: off-canvas drawer sliding over content, backdrop click-to-close.
- Sections: **Overview · Classes & Students · Exams · Monitoring · System** (keep current grouping).
- Active item: `navy-100` pill + `navy-800` text (or inverted dark fill); hover `white/8%`.
- Footer: "Student Portal" link + admin identity + Logout.

### 4.2 Top Navbar

- Sticky, white (or `navy-800` on mobile), height `56px`.
- Left: hamburger (toggles sidebar), page title.
- Right: admin avatar chip → dropdown menu (Student Portal, Logout).

### 4.3 Page Header

Every page renders through a shared `PageHeader`:

- Title (`text-2xl`, 600)
- Optional subtitle/meta line
- Optional breadcrumb (e.g. `Exams / {title}`)
- Optional action buttons on the right

### 4.4 Content

- Centered container: `max-width 1000px`, padding `24px 16px`.
- Responsive card grid: `repeat(auto-fill, minmax(280px, 1fr))`.
- Consistent section spacing `24px`.

---

## 5. UI Component Kit

New shared kit in `src/components/ui/`, exported from an index barrel. Every page consumes these; no page re-implements them.

| Component | API (props) | Notes |
| --- | --- | --- |
| `Button` | `variant` (primary/outline/danger/ghost), `size` (sm/md), `icon`, `loading`, `disabled` | Replaces `.btn` classes + inline button styles |
| `Card` | `title`, `icon`, `actions`, `padded`, `className` | Standard surface container |
| `PageHeader` | `title`, `subtitle`, `breadcrumb`, `actions` | Top-of-page header block |
| `StatCard` | `icon`, `value`, `label`, `tone`, `suffix` | Dashboard/Results tiles |
| `Table` | `columns`, `rows`, `striped`, `hover`, `emptyText`, `footer` | Unified data table + empty state |
| `Badge` | `tone` (success/warning/danger/info/neutral), `outline` | Status pills, Q-counts, scores |
| `Input` / `Select` / `TextArea` | `label`, `error`, `icon`, `hint` | Consistent form controls |
| `Modal` | `open`, `title`, `onClose`, `footer`, `size` | Backdrop + centered panel, focus trap, ESC close |
| `Toast` (Provider) | `toast.success/error/info(msg)` | Replaces the duplicated toast blocks in every page |
| `EmptyState` | `icon`, `title`, `body`, `action` | Dashed placeholder blocks |
| `Spinner` / `Loading` | `label` | Loading states |
| `ConfirmDialog` | `open`, `title`, `body`, `danger`, `onConfirm` | Wraps Modal for destructive confirms (delete exam/class/session) |

### Recurring patterns

- **Tables**: white bg, `1px` border, sticky header in `navy-800`, striped rows (`surface` / `canvas`), row hover `navy-100`, footer summary row, `IBM Plex Mono` for IDs/scores/time.
- **Forms**: labeled inputs, `8px` radius, `1.5px` border; focus ring `navy-700`.
- **Empty states**: dashed border, centered icon, title + body + optional CTA.
- **Toasts**: fixed top-center, colored by tone, auto-dismiss.

---

## 6. Page-by-Page Redesign Checklist

### 6.1 Admin Pages (Phase 1)

- [ ] **AdminLayout** — new shell (sidebar + topbar + breadcrumb + user menu). Refactor `AdminLayout.jsx`.
- [ ] **Dashboard** (`Dashboard.jsx`) — add stat tile row: Total Exams, Submissions, Students, Classes. Redesign exam list rows (badge for status: Open/Expired/No deadline, time, submissions). Keep copy-ID / copy-link actions.
- [ ] **Classes** (`Classes.jsx`) — class card grid, clean tab bar (Enrollments / Attendance / History / Check-ins / Exams), form controls via `Input`/`Select`, QR + report modals via `Modal`, delete via `ConfirmDialog`.
- [ ] **CreateExam** (`CreateExam.jsx`) — consistent form sections, question editor cards, focus rings, save/cancel buttons.
- [ ] **QuestionBank** (`QuestionBank.jsx`) — table + card views, bulk import surface, filter/sort controls.
- [ ] **Results** (`Results.jsx`) — `StatCard` tiles, unified score table (score pill → `Badge`), keep question analytics + distribution bars.
- [ ] **Answers** (`Answers.jsx`) — answer matrix + per-answer review, accept/reject actions styled consistently.
- [ ] **Regrade** (`Regrade.jsx`) — confirm flow via `ConfirmDialog`, result feedback via `Toast`.
- [ ] **Preview** (`Preview.jsx`) — polished read-only question rendering.
- [ ] **Proctor** (`Proctor.jsx`) — live status badges, session controls.
- [ ] **ActivityLog** (`ActivityLog.jsx`) — action `Badge` per log line, refresh button.

### 6.2 Public Pages (Phase 2)

- [ ] **Landing** (`Landing.jsx`) — modern hero card: brand header, exam-ID lookup, primary action links with icons; keep InstallPrompt.
- [ ] **StudentRecords** (`StudentRecords.jsx`) — student lookup, profile header card, per-class attendance + results.
- [ ] **Leaderboard** (`Leaderboard.jsx`) — podium/top-3 highlight, ranked table.
- [ ] **StudentEnroll** (`StudentEnroll.jsx`) — clean multi-step or single form card.
- [ ] **Checkin** (`Checkin.jsx`) — success/failure states styled clearly.
- [ ] **AuthGate** (`AuthGate.jsx`) — admin login card alignment with new tokens.

### 6.3 Exam Experience (Phase 3 — visual only)

- [ ] **Exam** (`Exam.jsx`) — gate, instructions, and in-progress chrome updated to new tokens.
- [ ] **QuestionCard** (`QuestionCard.jsx`) — modernized question + choice styling; keep interactions identical.
- [ ] **Timer** (`Timer.jsx`) — refreshed styling; behavior unchanged.

---

## 7. Do-Not-Break Rules

- **Anti-cheat**: `body.exam-active` user-select locks, right-click/copy-paste/devtools blockers, fullscreen enforcement — untouched.
- **PWA**: manifest, service worker registration (`sw.js`), install prompt — untouched.
- **Routing**: all `/admin/*`, `/exam`, `/leaderboard`, `/checkin`, `/enroll`, `/records` routes and query params (`?id=`, `?class=`) unchanged.
- **API**: no changes to `src/api.js`.
- **Data semantics**: no changes to how scores, attendance, or analytics are computed.

---

## 8. Tech Stack Decisions

- **Tailwind CSS v4** via `@tailwindcss/vite` plugin (CSS-first config, no `tailwind.config.js`). Tokens live in `@theme` in CSS.
- `src/styles.css` → split into `src/styles/{tokens,base,components}.css`. Keep legacy classes that other pages rely on during migration, then remove as pages convert.
- Keep `lucide-react`, IBM Plex fonts, React Router.
- No new runtime dependencies beyond Tailwind.

---

## 9. Roadmap

| Milestone | Deliverables | Exit criteria |
| --- | --- | --- |
| **M1 Foundation** | Tailwind wired in; token CSS; UI kit (Button, Card, PageHeader, StatCard, Table, Badge, Input/Select/TextArea, Modal, Toast, EmptyState, Spinner, ConfirmDialog) | `pnpm build` passes; tokens visible on a sample page |
| **M2 Admin Shell** | New `AdminLayout` (sidebar + topbar + breadcrumb + user menu) | All admin routes render inside new shell at mobile + desktop |
| **M3 Admin Pages** | All 10 admin pages migrated to UI kit | No inline hex colors in admin pages; every flow still works |
| **M4 Public Pages** | Landing, Records, Leaderboard, Enroll, Checkin, AuthGate | Public flows match new look |
| **M5 Exam Polish** | Exam, QuestionCard, Timer restyled | Anti-cheat/fullscreen verified intact |
| **M6 Verify & Release** | Responsive pass, PWA check, build, optional deploy | Ready to ship |

**Status (as of this pass):** M1–M5 ✅ complete — `pnpm build` green (CSS 45.51 kB, JS 380.12 kB). M6 remaining (responsive pass, PWA/manifest check).

---

## 10. Definition of Done

- [ ] No remaining hard-coded inline colors/spacing in migrated pages (tokens/components only).
- [ ] One toast/modal implementation used everywhere.
- [ ] Responsive: mobile (<768px), tablet, desktop all verified.
- [ ] `pnpm build` clean; preview works.
- [ ] Anti-cheat, PWA, routing, and API untouched and verified.