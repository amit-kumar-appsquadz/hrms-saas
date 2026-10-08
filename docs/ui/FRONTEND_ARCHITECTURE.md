# Frontend Architecture — HRMS SaaS (Next.js)

Status: For review (planner). Implementation target: Next.js (App Router). This is specification only — no source files. The frontend consumes `openapi.yaml` as the single contract (steering rule 1) and never invents endpoints; missing APIs are tracked in `API_GAPS.md`.

## 1. Tenancy at the edge
- Tenant is resolved from the **subdomain** `<tenant>.app.example.com` (ADR-001). Middleware reads the host, derives the tenant slug, and attaches it to the request context (header/cookie) so every API call hits the correct per-tenant base URL (`https://{tenant}.app.example.com/api/v1`).
- No tenant id in URLs or client state beyond the resolved slug. Unknown/invalid subdomain → tenant-not-found page.
- Dev: subdomain simulated via host mapping / env; no cloud calls in tests (steering).

## 2. Routing structure (App Router route groups)
```
app/
  (auth)/            # unauthenticated: login, mfa, forgot/reset, activate
  (app)/             # authenticated admin/HR shell (sidebar + topbar)
    dashboard/
    organization/
    employees/
    attendance/
    leave/
    payroll/
    compliance/
    documents/
    workflows/
    approvals/
    reports/
    notifications/
    admin/           # users, roles
    settings/
    audit/
  (self)/            # authenticated self-service shell (employee/manager)
    me/
    team/
  (platform)/        # super-admin console (separate; pending scope decision)
  error pages: not-found, forbidden(403), unauthorized(401), error(500)
```
- **Layouts:** root layout (providers, theme), `(auth)` layout (centered card), `(app)` layout (admin shell), `(self)` layout (simplified + mobile tab bar). Nested layouts per module where a module needs persistent sub-nav (e.g. employee profile tabs, payroll run stepper).
- Deep-linkable sub-states: employee profile tabs, payroll run stages, filtered table views (filters/sort/page in URL search params).

## 3. Authentication & permission boundaries
- **Auth boundary:** middleware guards `(app)`/`(self)`/`(platform)` — no valid session → redirect to `/login` (session-expiry flow in APPLICATION_SHELL). Auth via Sanctum (bearer token for API, or SPA/cookie session for the first-party app — contract notes both).
- **Permission guards:** after `GET /auth/me`, a permissions context gates routes and UI. Route-level guard (does the user hold any permission required by this route?) + component-level guards (`<Can permission="…">`). Direct nav to a forbidden route → `/403`; stale-permission `403` triggers a `me` refresh.
- **Least privilege by default:** unknown permission → hidden.

## 4. Server vs client components
- **Server components (default):** page shells, initial data fetch for read views (lists, detail), SEO-irrelevant but faster first paint, keeps tokens/secrets server-side.
- **Client components:** interactive widgets — tables with client state, forms, wizards, command palette, charts, anything with event handlers or browser APIs. Marked `"use client"` at the leaf, not the page root, to minimize client bundle.
- Sensitive data is fetched server-side where possible and never embedded in client bundles beyond what the user may see.

## 5. API client architecture
- **Generated types from `openapi.yaml`** (openapi-typescript or similar) → a typed client. Regenerated on contract change; CI check that the client matches the contract. The contract is the source of truth; drift fails CI.
- Thin fetch wrapper: injects tenant base URL + auth, standard headers, `request_id` capture, and **uniform error normalization** to the contract `Error`/`ValidationErrorBody` shapes.
- Centralized status handling: `401`→session flow, `403`→forbidden/restricted, `404`, `422`→field errors, `429`→retry-after toast, `5xx`→error boundary.

## 6. State management strategy
- **Server state:** a data-fetching/cache library (e.g. TanStack Query) for lists/detail — query keys **namespaced by tenant** to prevent cross-tenant cache bleed (mirrors ADR-001 cache-key rule). Invalidate on mutation.
- **URL state:** filters, sort, pagination, active tab, selected period — in search params (shareable, back-safe).
- **Client/UI state:** local component state + a light global store only for shell concerns (sidebar, current company, toasts). Avoid a heavy global store.
- **Auth/permissions:** context from `GET /auth/me`, cached, refreshed on re-auth/`403`.

## 7. Data fetching & caching
- Reads: server components for first load; client query library for interaction/refetch. Pagination server-side (`PaginatedEnvelope`).
- Caching: per-tenant cache keys; short stale time for volatile data (attendance/approvals), longer for static config (roles, org, components). Explicit invalidation after writes.
- Long-running work (import, export, payroll calc, bulk ops, report generation) is a **queued job** (steering rule 3): kick off → poll/subscribe to job status → notify + surface result. Never block the request.

## 8. Mutations, optimistic updates & concurrency
- Mutations pessimistic by default (await server, then invalidate/refetch). Optimistic only for trivial toggles (mark notification read).
- Concurrency: for edit-heavy records, send updated-at / version for conflict detection; on conflict show a merge/reload prompt.
- All destructive/approval/money mutations await server + reflect audit outcome.

## 9. Error boundaries & resilience
- Route-segment error boundaries → `/500`-style fallback with `request_id` + retry, isolated per segment (one widget/section failing doesn't blank the shell).
- `not-found` boundaries for `404` resources. Global boundary at root as last resort.
- Offline/network: retry affordances + preserve form state.

## 10. Loading & skeletons
- `loading.tsx` per route segment → skeletons matching final layout (DESIGN_SYSTEM §4). Suspense for streamed server data. Avoid layout shift.

## 11. Accessibility & i18n in architecture
- A11y baked into shared components (DESIGN_SYSTEM §9); CI a11y checks (axe) on key pages.
- i18n-ready structure (string externalization) even if English-only at launch; locale/timezone/currency from tenant settings; date/number formatting centralized.

## 12. Performance alignment (steering rule 3: p95<200ms, p99<500ms)
- Server-side pagination always; no client-side mega-lists. Avoid N+1 by requesting the fields the view needs (backend concern, but UI requests minimal projections — e.g. `EmployeeSummary` for lists).
- Code-split per route group; lazy-load heavy widgets (charts, builder canvas, PDF viewer).
- Prefetch likely-next navigation; cache static config.

## 13. Testing (frontend)
- Component/unit tests, integration tests against a mock of `openapi.yaml` (contract-driven mocks), and e2e for critical flows (login+MFA, employee CRUD, apply/approve leave, payroll run stages). Cross-tenant isolation assertions where the UI handles tenant context. No cloud calls in tests (steering). QA owns test depth (steering team model).

## 14. Build/CI touchpoints (frontend portion)
- Lint, typecheck, contract-type-generation check, unit/integration/e2e, a11y, build. Part of the S1-03 CI pipeline. Frontend work begins S2 (login/forgot-password) per backlog.
