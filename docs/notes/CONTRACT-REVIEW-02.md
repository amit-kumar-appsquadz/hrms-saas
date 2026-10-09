# CONTRACT-REVIEW-02 — Approved decisions applied & reconciled (planner)

What changed: Applied the 7 human-approved architectural decisions + the additional authentication requirement across all affected artifacts, and ran a consistency scan. No backend code written; no frontend code modified. Supersedes the open questions in CONTRACT-REVIEW-01.

Decisions applied: (1) two-plane model accepted, boundary enforced **server-side** (identity/audience/namespace/context/checks), not URL/host; (2) **same base domain**, no `admin.app.example.com`, separate `/platform/login` and `/login` experiences, tenant subdomain preserved; (3) platform→tenant access = **read-only, reason-required, ≤15-min, audited**, write impersonation deferred; (4) subscriptions = **record-keeping only**, billing-provider seam, no payment APIs; (5) platform audit = **separate `platform_audit_logs` collection**; (6) platform RBAC = **fixed role enum** (`PLATFORM_SUPER_ADMIN/SUPPORT/OPERATIONS/AUDITOR`) + `PlatformAuthorizer` extension seam, no RBAC tables; (7) lifecycle `provisioning→trial→active→suspended→inactive`, 30-day configurable trial, immutable unique subdomain, legal retention flagged.

Artifacts updated:
- **ADR-007** → Accepted; rewritten for same-domain + server-side boundary, read-only access session, fixed role enum, separate audit collection, both-plane mandatory MFA.
- **ADR-001** → amended with "Platform plane and reserved hosts" (reserved/base host carries no tenant; platform on base host; tenant subdomain resolution unchanged, fail-closed).
- **ADR-008** → Accepted; resolved parameters (30-day trial, immutable subdomain, operator conversion, retention policy flagged).
- **openapi.yaml** → base-domain platform server (removed admin host); `platformAuth` desc (fixed enum, server-side boundary); added read-only `/platform/tenants/{id}/access-sessions` (POST/DELETE) + `PlatformAccessSession`; `PlatformRole` enum; `Subscription` record-keeping + `billing_metadata`; `PlatformSettings` `default_trial_days`/`trial_expiry_behavior`/`inactive_retention_days`. No `impersonate`, no admin host, no `bearerAuth` remain.
- **New:** `docs/ui/ROUTING_AND_SESSIONS.md` (host/login/session/access-session model).
- **Updated:** `PLATFORM_API_SPEC.md`, `TENANT_ONBOARDING_SPEC.md`, `DATA_MODEL_CHANGES.md`, `BACKEND_ROADMAP.md` (B1–B3), `MULTI_AGENT_PLAN.md` (SEC gates, QA, devops), `API_GAPS.md` (promoted access-session; deferred write-impersonation; FE-ahead-of-contract list), `NAVIGATION.md`, `PAGE_INVENTORY.md`.

Consistency scan: grepped docs + contract for `admin.app.example.com`, `/impersonate`, `platform_audit` (bare), old role-label strings, `pending`, `bearerAuth`, `security: []`. Remaining matches are intentional (historical notes; "rejected"-context mentions; FE→enum mapping tables; correct `security: []` on unauthenticated endpoints).

Conflicts found & resolved:
- ADR-007 draft said platform on `admin.app.example.com` → **conflict with decision 2**; rewrote to same base domain and amended ADR-001 so the base/reserved host carries no tenant without changing subdomain resolution (ADR-001 behavior preserved — no weakening).
- Old impersonation gap/perm (`platform.tenant.impersonate`) → replaced by read-only `platform.tenant.access` + `access-sessions` contract.
- Platform role strings vs fixed enum → unified on the enum; FE mapping documented.

How to verify: open `openapi.yaml` in an OpenAPI viewer/linter — confirm it parses; two servers (tenant subdomain + base domain, no admin host); `platformAuth`≠`tenantAuth`; `/platform/*` require `platformAuth`; login/forgot/reset/activate/mfa-verify use `security: []`; `access-sessions` present and read-only; no dangling `$ref` (`PlatformRole`, `PlatformAccessSession` defined). Cross-check ROUTING_AND_SESSIONS.md ↔ ADR-001 amendment ↔ ADR-007 §2.
