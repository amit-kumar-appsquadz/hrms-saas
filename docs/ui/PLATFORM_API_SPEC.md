# Platform / Super Admin API Specification

Status: **Accepted** (contract-review round 2; reflects approved decisions). Companion to ADR-007 (platform vs tenant plane) and ADR-008 (tenant lifecycle). All endpoints below are in `openapi.yaml` under `/platform/*` with the `platformAuth` scheme. This is the human-readable contract: auth boundary, authorization, schemas, validation, pagination/filtering/sorting, errors, audit, and tenant-context rules.

## Security model (ADR-007, approved)
- **Boundary is server-side, not the URL/host:** identity store (`platform_users`) + token audience (`platform`) + permission namespace (`platform.*`) + no tenant global scope + explicit per-endpoint checks. The `/platform/*` prefix and the base host are routing conveniences only.
- **Same base domain, no admin hostname:** platform console at `app.example.com/platform/login`; tenant at `app.example.com/login` and/or `<tenant>.app.example.com`. Separate login experiences; the two auth systems are never merged.
- **Auth:** `platformAuth` bearer, audience `platform`, **MFA mandatory**, short session. Tenant tokens rejected here; platform tokens rejected by tenant endpoints (audience check).
- **Authorization:** `platform.*` only, via a **fixed role enum** (Phase 1): `PLATFORM_SUPER_ADMIN`, `PLATFORM_SUPPORT`, `PLATFORM_OPERATIONS`, `PLATFORM_AUDITOR`. No configurable platform-RBAC tables; code-mapped through a `PlatformAuthorizer` seam.
- **Tenant context:** cross-tenant by design; operate on platform-owned tables + administrative tenant fields only (status/plan/usage/counts) — **never tenant PII**. Any tenant-data read goes via `TenantConnectionResolver` and is audited.
- **Audit:** every platform write + every access-session emits a `platform_audit_logs` entry (separate Mongo collection — ADR-007 §7): actor, action, target resource, target tenant (if any), timestamp, request/correlation id, result/status, reason (where required), access-session context (where applicable).

### Platform permission catalog (`platform.*`)
`platform.dashboard.view`, `platform.tenant.view`, `platform.tenant.create`, `platform.tenant.edit`, `platform.tenant.activate`, `platform.tenant.suspend`, `platform.tenant.access` (read-only support session — replaces the old `impersonate`), `platform.user.view`, `platform.user.manage`, `platform.audit.view`, `platform.settings.view`, `platform.settings.manage`, `platform.billing.manage`.

### Fixed role enum → permissions (Phase 1)
| Role | Permissions |
|---|---|
| `PLATFORM_SUPER_ADMIN` | all `platform.*` |
| `PLATFORM_OPERATIONS` | dashboard, tenant view/create/edit/activate/suspend/access, audit, settings view |
| `PLATFORM_SUPPORT` | dashboard, tenant view, tenant access (read-only), audit view |
| `PLATFORM_AUDITOR` | dashboard view, tenant view, audit view, settings view (read-only everywhere) |

(The FE demo's role labels — Super Admin / Platform Operator / Support Engineer / Billing Admin — map to this enum; see "Frontend reconciliation". Billing-admin maps to `PLATFORM_OPERATIONS` + `platform.billing.manage` or a later role; reconcile at live-switch.)

## Endpoint contract

| Endpoint | Method | Auth | Permission | Request | Response | Audit | Notes |
|---|---|---|---|---|---|---|---|
| `/platform/auth/login` | POST | none (`security: []`) | – | `LoginRequest` | `LoginResponse` (MFA always required) | login attempt | audience `platform` |
| `/platform/auth/mfa/verify` | POST | none | – | `MfaVerifyRequest` | `TokenResponse` | login success | — |
| `/platform/auth/logout` | POST | platformAuth | – | – | 204 | logout | — |
| `/platform/auth/me` | GET | platformAuth | (any) | – | `PlatformCurrentUser` | – | only `platform.*` perms |
| `/platform/summary` | GET | platformAuth | `platform.dashboard.view` | – | `PlatformSummary` | – | cross-tenant aggregate |
| `/platform/tenants` | GET | platformAuth | `platform.tenant.view` | q/status/plan/subdomain/sort + page | paginated `PlatformTenant` | – | admin fields only |
| `/platform/tenants` | POST | platformAuth | `platform.tenant.create` | `TenantProvisionRequest` | `PlatformTenant` (provisioning) | ✔ tenant_lifecycle | subdomain unique+validated |
| `/platform/tenants/{id}` | GET | platformAuth | `platform.tenant.view` | – | `PlatformTenantDetail` | – | +subscription/usage |
| `/platform/tenants/{id}` | PUT | platformAuth | `platform.tenant.edit` | `TenantConfigureRequest` | `PlatformTenantDetail` | ✔ | no HR data; subdomain NOT editable |
| `/platform/tenants/{id}/admin` | POST | platformAuth | `platform.tenant.edit` | name+email | 201 | ✔ (both planes → `platform_audit_logs` + tenant audit) | **cross-plane write** → tenant `users` + invite |
| `/platform/tenants/{id}/activate` | POST | platformAuth | `platform.tenant.activate` | target_status | `PlatformTenant` | ✔ | guards (ADR-008); `409` bad transition |
| `/platform/tenants/{id}/suspend` | POST | platformAuth | `platform.tenant.suspend` | reason (required) | `PlatformTenant` | ✔ | blocks tenant login |
| `/platform/tenants/{id}/reactivate` | POST | platformAuth | `platform.tenant.activate` | – | `PlatformTenant` | ✔ | suspended→active/trial |
| **`/platform/tenants/{id}/access-sessions`** | POST | platformAuth | `platform.tenant.access` | reason (required) | `PlatformAccessSession` (read-only token, ≤15 min) | ✔ category=access, with reason | **Phase-1 READ-ONLY support access** |
| **`/platform/tenants/{id}/access-sessions/{sid}`** | DELETE | platformAuth | `platform.tenant.access` | – | 204 | ✔ | end session early |
| `/platform/onboarding` | GET | platformAuth | `platform.tenant.view` | page | paginated `TenantOnboarding` | – | in-flight |
| `/platform/onboarding` | POST | platformAuth | `platform.tenant.create` | `TenantOnboardingRequest` | `TenantOnboarding` | ✔ | orchestrator; `409` subdomain taken |
| `/platform/users` | GET | platformAuth | `platform.user.view` | page | paginated `PlatformUser` | – | — |
| `/platform/users` | POST | platformAuth | `platform.user.manage` | `PlatformUserWriteRequest` | `PlatformUser` | ✔ security | invite operator; `platform_role` enum |
| `/platform/audit` | GET | platformAuth | `platform.audit.view` | category/actor/from/to + page | paginated `PlatformAuditEntry` | – | from `platform_audit_logs`, append-only |
| `/platform/plans` | GET | platformAuth | `platform.settings.view` | – | `PlatformPlan[]` | – | — |
| `/platform/settings` | GET/PUT | platformAuth | `platform.settings.view` / `.manage` | `PlatformSettings` | `PlatformSettings` | ✔ platform_config | incl. `default_trial_days` (30) |

### Read-only access session (ADR-007 §6) — the ONLY platform→tenant data path
- `POST /platform/tenants/{id}/access-sessions` requires `platform.tenant.access` + a mandatory `reason`.
- Returns `PlatformAccessSession`: a scoped **tenant-context token** (audience `tenant`, `platform_access=true`, `platform_actor` claim, `mode=read_only`, `expires_at` ≤ 15 min). It grants **read-only** tenant access, **no writes**, and **no `platform.*`** inside the tenant.
- Tenant UI must show a persistent "Platform/support access — read only" banner.
- Double-audited: `platform_audit_logs` (category `access`, reason, session id, target tenant) + tenant audit trail (actor = platform operator, flagged platform-access).
- Write/full impersonation is **deferred** and intentionally **not** in the contract.

### Validation highlights
- `TenantProvisionRequest.subdomain`: required, DNS-safe (`^[a-z][a-z0-9-]{1,30}[a-z0-9]$`), **not a reserved label** (`app`, `www`, `platform`, `admin`, `api`, `static` …), unique → `409` if taken; immutable after creation (ADR-008). Availability via `GET /platform/tenants?subdomain=`.
- `activate`: `409` if from→to transition is illegal or guards fail (no admin / provisioning incomplete).
- `suspend` / `access-sessions`: `reason` required (audited).
- Platform user `email` unique within the platform identity store; invite flow mirrors `/auth/activate` on the platform store.

## NOT exposed (deliberately)
- No endpoint returns another tenant's employees/documents/payroll/PII. Tenant data is reached only inside a tenant-plane request or a **read-only access session**.
- **Write/full impersonation**: not in the contract (future decision).
- **Live billing/payment APIs**: not in the contract (Phase 1 record-keeping only; `Subscription.billing_metadata` is the future seam).

## Frontend reconciliation
The FE platform console (`docs/notes/FE-DEMO-02.md`) is demo-backed. At live-switch:
- Map demo platform roles → the fixed enum above.
- Rename the demo "View tenant / impersonation" affordance to a **read-only access session** with mandatory reason, 15-min TTL, and the read-only banner; it is currently **ahead of the backend contract** and must be reconciled (see API_GAPS "FE demo ahead of contract").
- Add tenant status `inactive` handling.

## Classification (brief §2)
All endpoints above are **Class A — in OpenAPI now** (including the read-only access-session, which is now sufficiently defined). Remaining **Class D — future decision**: write/full impersonation, live billing integration, configurable platform RBAC. Remaining **policy** item: `inactive` retention period (legal sign-off).
