# Application Shell — HRMS SaaS

Status: For review (planner). Defines unauthenticated auth screens, the authenticated layout, error pages, and session handling. Tenant is resolved from the subdomain (ADR-001) — no tenant is entered or selected by normal users.

## 1. Unauthenticated screens

All auth screens: single-column, centered card on `--color-bg`, tenant branding (logo/name) resolved from subdomain, no app chrome. API: `openapi.yaml` auth paths (exist today).

| Screen | Route | API | Notes / states |
|---|---|---|---|
| Login | `/login` | `POST /auth/login` | Email + password. On `mfa_required` → MFA step with `challenge_id`. `401`→inline "invalid credentials"; `429`→rate-limit message w/ retry-after; `422`→field errors. |
| MFA verify | `/login/mfa` | `POST /auth/mfa/verify` | 6-digit TOTP, auto-advance, paste support, "use recovery code" link. Carries `challenge_id`. Resend/again on failure. |
| Forgot password | `/forgot-password` | *gap: `POST /auth/password/forgot`* | Email input; always shows neutral "if the account exists…" (no user enumeration). |
| Reset password | `/reset-password?token=` | *gap: `POST /auth/password/reset`* | New password + confirm, strength meter, token validity error state. |
| Logout | action | `POST /auth/logout` | Clears session, redirects to `/login`, shows "signed out" toast. |
| Set password / activate (invited user) | `/activate?token=` | *gap: `POST /auth/activate`* | First-time password set + optional MFA enrolment. |
| MFA enrolment | `/mfa/setup` | *gap: `POST /auth/mfa/setup` + confirm* | QR + secret, verify code, recovery codes shown once (download/copy). Used in activation and from profile. |

Session expiry handling: on any `401` from an authenticated call, interrupt with a **re-auth modal** (preserves unsaved form state where possible) → if re-auth fails, route to `/login?reason=session_expired`. A **timeout warning** (configurable in tenant security settings) appears before expiry with an "extend session" action (`POST /auth/refresh`).

## 2. Authenticated layout

Two layout families, chosen by role/context (see FRONTEND_ARCHITECTURE route groups):
- **Admin/HR layout** — persistent left sidebar + top bar; dense, desktop-first.
- **Self-service layout** — simplified top bar + bottom tab bar on mobile; employee/manager focus.

### Top navigation bar (all authenticated users)
Left→right:
1. **Sidebar toggle** (collapses to icon rail / off-canvas on mobile).
2. **Tenant/company context** — tenant logo + name (from subdomain, read-only). **Company selector** dropdown appears only when the user has access to >1 company within the tenant; selection scopes org/employee/report data and is persisted.
3. **Global search** — command-style (`/` or `Ctrl/Cmd+K`) across permitted entities (see SELF_SERVICE §Search). Results grouped by type, permission- and tenant-filtered.
4. **Notifications bell** — unread count badge; opens notification panel (see SELF_SERVICE §Notifications).
5. **Help/support** — docs link, keyboard-shortcuts, "contact support" (prefills `request_id` of last error).
6. **User profile menu** — avatar; name/email/role; My profile, My settings, MFA/security, Switch company (if applicable), Sign out.

### Left sidebar (role-aware)
- Grouped navigation per NAVIGATION.md; sections and items filtered by permissions from `GET /auth/me`.
- Active state, collapsible groups, icon rail when collapsed, counts/badges (e.g. "Approvals 3").
- Pinned/favorites (optional, user preference — see API_GAPS for persisted prefs).

### Content region
- **Breadcrumbs** (reflect IA hierarchy; last crumb = current page; clickable ancestors).
- **Page header**: title + optional subtitle/entity status badge + **action area** (primary action right-aligned, overflow menu for secondary/destructive).
- **Page body**: the four-states contract (loading/empty/error/content).
- **Context panel/drawer** region for quick-view/edit.

### Responsive navigation
- Desktop/laptop: full sidebar.
- Tablet: icon-rail sidebar, expandable on hover/tap.
- Mobile: off-canvas drawer menu + a **bottom tab bar** for self-service (Home, Attendance/Leave, Approvals, Payslips/Profile, More).

## 3. System / error pages

| Page | Trigger | Content |
|---|---|---|
| Unauthorized `/401` | No/expired session on a protected route | "Please sign in" + go to login (usually handled by session-expiry flow). |
| Forbidden `/403` | Authenticated but lacks permission (`403`) | "You don't have access to this." + back + request-access/help. No data leaked. |
| Not found `/404` | Unknown route or `404` resource (scoped to tenant) | "Not found in this workspace." + back/search. |
| Server error `/500` | `5xx` / render crash (error boundary) | Neutral message + `request_id` + retry + support link. No stack traces. |
| Maintenance `/maintenance` | Planned downtime (optional) | Static informational. |
| Offline/network | Fetch failure | Toast + inline retry; preserve state. |

All error pages: within app shell when authenticated (keep nav), standalone when not; keyboard-focusable primary action; `role=alert` for the message.

## 4. Shell data dependencies
- `GET /auth/me` — identity, roles, permissions → drives nav, company selector, permission gates. Fetched once on load, cached, refreshed on re-auth.
- Company list for selector — *gap: `GET /companies` (org module)*.
- Notifications count/list — *gap: notifications API*.
- Global search — *gap: search API*.
- User preferences (sidebar, saved views, density) — *gap: preferences API* (localStorage fallback until then).

## 5. Loading / empty / error for the shell itself
- Initial app boot: full-screen branded skeleton until `GET /auth/me` resolves; on failure → login or `/500`.
- Nav renders optimistically from cached `me`; a stale-permission `403` on navigation routes to `/403` and triggers a `me` refresh.
