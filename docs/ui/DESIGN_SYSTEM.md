# Design System — HRMS SaaS

Status: For review (planner). Production-level visual + interaction spec for the Frontend agent. Visual language: calm, dense, enterprise B2B. No decorative gradients, no large animations, no consumer/gaming styling. Target WCAG 2.2 AA.

Implementation note: tokens below are design intent, framework-agnostic. The Frontend agent maps them to the chosen styling layer (CSS variables / Tailwind theme / design-token file). Do not hardcode hex values in components — consume tokens.

## 1. Color tokens

### Brand & neutrals (light theme is primary; dark theme is a later enhancement)
| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#F7F8FA` | App background |
| `--color-surface` | `#FFFFFF` | Cards, tables, panels |
| `--color-surface-muted` | `#F1F3F5` | Table header, secondary fills |
| `--color-border` | `#E3E6EA` | Dividers, input borders |
| `--color-border-strong` | `#C7CDD4` | Focused/hover borders |
| `--color-text` | `#1A1D21` | Primary text (≥ 7:1 on surface) |
| `--color-text-muted` | `#5B636C` | Secondary text (≥ 4.5:1) |
| `--color-text-disabled` | `#9AA1A9` | Disabled (non-essential only) |
| `--color-primary` | `#1C4E80` | Primary actions, active nav (corporate blue) |
| `--color-primary-hover` | `#163C63` | Hover |
| `--color-primary-subtle` | `#E7EEF6` | Selected row, active nav bg |
| `--color-focus-ring` | `#2563EB` | Focus outline (3:1 against adjacent) |

### Status colors (semantic — always pair color with icon + text, never color alone)
| Token | Value | Meaning |
|---|---|---|
| `--color-success` / `-subtle` | `#1E7D44` / `#E6F4EC` | Active, approved, paid, success |
| `--color-warning` / `-subtle` | `#B7791F` / `#FBF3E2` | Pending, on notice, expiring |
| `--color-danger` / `-subtle` | `#C0392B` / `#FBEAE8` | Rejected, failed, exited, destructive |
| `--color-info` / `-subtle` | `#1C6E8C` / `#E4F1F6` | Informational, draft |
| `--color-neutral` / `-subtle` | `#5B636C` / `#F1F3F5` | Inactive, archived, unknown |

Status→domain mapping (reused everywhere): employee `active`→success, `on_notice`→warning, `inactive`/`exited`→neutral/danger; payroll `draft`→info, `calculated`→info, `review`→warning, `approved`/`locked`→success, `failed`→danger; approvals `pending`→warning, `approved`→success, `rejected`→danger, `changes_requested`→info.

## 2. Typography tokens
Font: system UI stack / Inter (one family). No display/decorative fonts.
| Token | Size / line-height / weight | Use |
|---|---|---|
| `--font-display` | 28 / 36 / 600 | Page hero (rare) |
| `--font-h1` | 22 / 30 / 600 | Page title |
| `--font-h2` | 18 / 26 / 600 | Section title |
| `--font-h3` | 15 / 22 / 600 | Card/subsection |
| `--font-body` | 14 / 22 / 400 | Default body/table |
| `--font-body-sm` | 13 / 20 / 400 | Secondary, table dense |
| `--font-caption` | 12 / 16 / 500 | Labels, badges, meta |
| `--font-mono` | 13 / 20 / 400 | Codes, IDs, amounts in tables |
Numeric/currency cells use tabular figures. Minimum body size 13px; never below 12px for essential text.

## 3. Spacing, sizing, radius, shadow
- **Spacing scale (4px base):** `0,4,8,12,16,20,24,32,40,48,64`. Tokens `--space-1`…`--space-16`.
- **Control heights:** sm 28px, md 36px (default), lg 44px (primary CTAs, touch). Mobile tap targets ≥ 44×44.
- **Radius:** `--radius-sm 4px` (inputs, badges), `--radius-md 8px` (cards, modals), `--radius-full` (avatars, pills).
- **Shadow (subtle only):** `--shadow-sm` cards; `--shadow-md` dropdowns/popovers; `--shadow-lg` modals/drawers. No colored or glow shadows.
- **Container:** content max-width 1440px; table/data pages may go full-bleed. Grid: 12-col, 24px gutter desktop.

## 4. Component library (variants + states + a11y)
Each component defines states: `default, hover, focus-visible, active, disabled, loading, error, readonly`. All interactive components are keyboard-operable with a visible focus ring (`--color-focus-ring`, ≥2px, never removed).

- **Button** — variants: `primary, secondary, tertiary/ghost, danger, link`; sizes sm/md/lg; icon-only (requires `aria-label`); loading shows spinner + disables + preserves width. Danger variant required for destructive actions.
- **Input / Textarea / Number / Password** — label always present (visible, not placeholder-only); description + error slots; `aria-invalid` + `aria-describedby` on error; password reveal toggle; number inputs for currency use mono tabular.
- **Select / Combobox / Multi-select** — searchable; async option loading with loading state; keyboard navigable (`role=listbox`); clear affordance; large option sets paginate/virtualize.
- **Date / Date-range / Time picker** — keyboard entry + calendar; tenant timezone; min/max; locale `DD MMM YYYY`.
- **Checkbox / Radio / Switch** — switch only for immediate-effect toggles; checkbox for form selection; grouped with `fieldset/legend`.
- **Table** — see TABLE SYSTEM §5.
- **Card / Stat card (KPI)** — title, value, delta, trend sparkline (optional), state (loading skeleton / empty / error).
- **Tabs** — `role=tablist`; supports 19-tab employee profile (overflow → scroll/menu); deep-linkable via URL hash/segment.
- **Drawer (side panel)** — for quick view/edit without losing list context; focus-trapped; `Esc` closes with dirty-guard.
- **Modal / Dialog** — focus-trapped, `aria-modal`, labelled by title, returns focus to trigger; max one at a time.
- **Dropdown / Menu** — `role=menu`; row-action overflow menus.
- **Badge / Tag / Pill** — status badges (icon+text+color), count badges, removable filter tags.
- **Alert / Banner** — page-level (info/success/warning/danger), dismissible where non-critical; `role=status`/`alert`.
- **Toast / Notification** — transient confirmations and `429`/network errors; `role=status`; auto-dismiss (not for errors needing action).
- **Timeline** — audit history, workflow progress, employee lifecycle.
- **Steps / Stepper** — multi-step wizards (onboarding, payroll run, exit); shows completed/current/upcoming/error.
- **Progress** — linear (uploads, imports, payroll run %) and indeterminate.
- **Skeleton** — matches final layout shape (table rows, cards, form).
- **Empty state** — icon + heading + one-line explanation + primary CTA (+ secondary help link).
- **Confirmation dialog** — standard (confirm/cancel) and **destructive** (typed confirmation).
- **File upload / Dropzone** — drag+drop + browse; type/size validation; per-file progress; retry; virus-scan pending state (documents).
- **Document preview** — PDF/image inline viewer via presigned URL; download; "open externally"; permission-gated.
- **Charts** — bar, line/area (trends), donut (distribution), stacked bar. Color-blind-safe palette; data table fallback for screen readers; no 3D/decorative chart styles.
- **Avatar** — initials fallback; status dot optional.
- **Breadcrumb, Pagination, Search field, Filter bar, Saved-view selector** — shared shell components (see APPLICATION_SHELL / TABLE SYSTEM).

## 5. Table system (enterprise data grid)
One shared `DataTable` powers every list. Capabilities:
- **Server-side pagination** (reads `PaginatedEnvelope.meta`; page/per_page in URL).
- **Sorting** (server-side; single-column default; `?sort=field,-field2`). Sort state in URL and announced to SR.
- **Filtering** — filter bar with typed filters (text, select, date-range, status); active filters shown as removable tags; filters in URL.
- **Column visibility** — show/hide columns; persisted per user per table (localStorage + optional server preference, see API_GAPS).
- **Saved views** — named filter+sort+column presets (e.g. "On notice this month"); shareable; default view per role.
- **Row selection** — single + range + select-all-matching (across pages, with explicit "all N selected" affordance).
- **Bulk actions** — act on selection; show count; destructive bulk requires confirmation; long-running bulk (import/export/mass update) runs on a queue job and surfaces progress (steering rule 3: >300ms → queue).
- **Row actions** — inline primary + overflow menu; permission-filtered.
- **Export** — CSV/Excel/PDF; large exports are queued jobs with notification on completion; sensitive columns require `*.export.sensitive`.
- **Density** — comfortable/compact toggle.
- **Responsive** — desktop: full grid; tablet: hide low-priority columns; mobile: table collapses to stacked cards (label:value) with primary action; horizontal scroll only as last resort.
- **A11y** — real `<table>` semantics, `<th scope>`, caption, `aria-sort`, keyboard row/cell navigation, selection announced.

## 6. Form system
- **Validation** — client-side for immediate feedback (required, format, range) + always re-validated server-side. Server `422` `ValidationErrorBody.error.fields` maps field→messages (field key = form field name).
- **Required fields** marked with text + `aria-required`; never color-only.
- **Field-level errors** rendered below field, `aria-describedby`, focus moves to first error on submit; error summary at top for long forms.
- **Server validation errors** merged into the same field slots; non-field errors shown in a form-level alert with `request_id`.
- **Autosave** — wizards/drafts autosave with "Saved HH:MM" indicator and conflict handling.
- **Dirty-state** — navigation guard ("You have unsaved changes") on route change/close.
- **Multi-step** — stepper, per-step validation, resumable draft, review step before submit.
- **Draft state** — explicit Draft vs Submitted; drafts visible only to creator.

## 7. Modal / drawer patterns
- Quick-view and short edits → drawer (keeps list context). Full create/complex edit → dedicated page or large modal.
- Confirmations → modal. Destructive → typed-confirmation modal, danger button, explicit scope statement.
- One modal/drawer at a time; nested dialogs disallowed (use a wizard instead).

## 8. Responsive rules
Breakpoints: `xs <480`, `sm ≥480`, `md ≥768` (tablet), `lg ≥1024` (laptop), `xl ≥1280`, `2xl ≥1536`.
- **≥lg (desktop/laptop):** primary HR/admin experience — persistent left sidebar, multi-column, full tables.
- **md (tablet):** collapsible sidebar (icon rail), tables drop low-priority columns, forms single-column.
- **<md (mobile):** off-canvas nav + bottom tab bar for self-service; tables → stacked cards; wizards full-screen; prioritize employee & manager self-service tasks (view payslip, apply leave, approve, punch).

## 9. Accessibility rules (WCAG 2.2 AA)
- Full keyboard operability; logical tab order; visible focus (`:focus-visible`), never `outline:none` without replacement.
- Semantic HTML first (`nav, main, header, table, button, label`); ARIA only to fill gaps.
- Contrast ≥ 4.5:1 text, ≥ 3:1 large text/UI boundaries/focus ring. Status never conveyed by color alone (icon + text).
- Landmarks + skip-to-content link; one `h1` per page; ordered headings.
- Accessible tables (§5), forms (§6), modals (focus trap + return + `Esc`), menus (arrow-key nav).
- Live regions: toasts `role=status`, async errors `role=alert`, table loading/empty announced.
- Reduced motion honored (`prefers-reduced-motion`); motion is functional (≤200ms), never decorative.
- Target size ≥ 24×24 CSS px (AA 2.2); touch ≥ 44×44.
- Session-timeout warning is announced and gives time to extend (AA 2.2 — no silent logout data loss).

## 10. Motion & iconography
- Motion: subtle, ≤200ms ease; used for state transitions (drawer, toast), not attention-grabbing.
- Icons: single line-icon set, 20px default, consistent stroke; decorative icons `aria-hidden`, meaningful icons labelled.
