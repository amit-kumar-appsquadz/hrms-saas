# Tenant Onboarding Specification (backend contract)

Status: **Accepted** (contract-review round 2). Implements ADR-008 against the `/platform/*` contract. Owned by the platform plane (ADR-007). No tenant endpoint participates except the final tenant-admin activation + login.

## Flow (authoritative)
```
Platform operator (platform plane, platformAuth + MFA — app.example.com/platform/login)
  │
  1. Create tenant         POST /platform/tenants              → tenants.status = provisioning
  │                         (name, subdomain [unique + not reserved + validated], plan, region)
  2. Configure tenant      PUT  /platform/tenants/{id}          (plan, region, localization defaults)
  │                         + async provisioning: schema seed, Redis prefix, default roles/permissions
  3. Create initial admin  POST /platform/tenants/{id}/admin    → tenant users row (tenant_id, Tenant Admin role),
  │                         status=invited, activation email  [THE ONE cross-plane write — ADR-007 §5, double-audited]
  4. Activate tenant       POST /platform/tenants/{id}/activate → status = trial | active   (guards below)
  │
  ▼ (hand-off to tenant plane)
  5. Tenant Admin login    POST /auth/activate (set password) then POST /auth/login (+ MFA mandatory)
  │                         via app.example.com/login or <tenant>.app.example.com/login
  6. Tenant application    normal tenant-scoped usage (ADR-001)
```
`POST /platform/onboarding` is the wizard orchestrator that performs 1→3 in one call and tracks a `tenant_onboarding` record (`stage`, `progress`); step 4 remains an explicit operator action (activation is a decision, not a side effect).

## Entities (platform-owned unless noted)
- `tenants` (existing, extended) — the bridge table; see DATA_MODEL_CHANGES.md. Lifecycle columns owned by platform plane; `subdomain` read by the tenant resolver.
- `tenant_onboarding` — in-flight provisioning record (stage/progress), platform-owned.
- `subscriptions` + `plans` — plan assignment and **record-keeping only** (Phase 1; no billing provider), platform-owned.
- Initial `users` row — **tenant-owned** (`tenant_id`), created via the sanctioned cross-plane write.

## State machine (ADR-008, approved)
Statuses: `provisioning → trial → active → suspended → inactive` (+ reactivate; `inactive` terminal). `pending` is **not** used.
Allowed transitions and guards:
- `provisioning → trial|active` **only if** an initial Tenant Admin exists and provisioning completed. Else `409`.
- `trial → active` (operator conversion — no payment integration in Phase 1).
- `active|trial → suspended` (reason required) → tenant login blocked.
- `suspended → active|trial` (reactivate).
- `active|trial|suspended → inactive` (offboard) → starts retention clock (policy; see below).
- Any illegal transition → `409 Conflict` with `Error`.
Every transition writes a **`platform_audit_logs`** entry (actor, from→to, reason, target tenant, request id).

## Approved lifecycle parameters (decision 7)
- **Trial:** default **30 days** (`tenants.trial_ends_at`), configurable at platform level (`platform_settings.default_trial_days`). On expiry without conversion → `suspend` (Phase-1 default, `platform_settings.trial_expiry_behavior`).
- **trial → active:** operator action (no payment integration; subscriptions record-keeping only).
- **Subdomain:** required, unique, DNS-safe, **not a reserved label** (`app`,`www`,`platform`,`admin`,`api`,`static`,… — ADR-001 amendment), validated at onboarding, **immutable after creation** in Phase 1.
- **`inactive` retention:** offboarding sets `inactive` and starts a retention clock, but the **retention period is a legal/compliance policy** (`platform_settings.inactive_retention_days`, **NULL = no auto-purge** until legal sign-off). Non-blocking for build.

## Status rationale (no gratuitous statuses — brief §4)
See ADR-008 table. `suspended` (reversible/billing, retains data) ≠ `inactive` (terminal/churn, drives DPDP retention+purge). `pending` rejected as a synonym of `provisioning`.

## Resolver behavior (tenant plane)
Reads `tenants.status`:
- `active`/`trial` → resolve + allow login.
- `provisioning`/`suspended`/`inactive` → refuse with a neutral, non-enumerating message; no tenant data loaded.
- Reserved/base hosts (`app.example.com`, etc.) → "no tenant" (platform console unaffected; ADR-001 amendment).

## FE alignment
The FE demo uses `active|trial|suspended|provisioning` (no `inactive`). Backend uses the full approved set. FE must add `inactive` handling (filter + badge + "offboarded" copy) at live-switch. Tracked in API_GAPS.

## Acceptance criteria
- Creating a tenant yields `provisioning`; tenant login refused until activated.
- Activation rejected (`409`) without an initial admin or before provisioning completes.
- Suspended/inactive tenants cannot authenticate.
- Every lifecycle transition appears in `/platform/audit` (`platform_audit_logs`).
- Subdomain unique + reserved-label check; duplicate/reserved → `409`/`422`; immutable after create.
- The initial-admin write creates a tenant-scoped user and is audited on both planes.
