# Data-Model Changes — Platform plane (contract review round 2, approved)

Status: **Accepted** (reflects approved decisions). Additions required by the platform console (ADR-007) and tenant lifecycle (ADR-008), reconciled against `docs/data-model.md`, the frontend platform implementation (`frontend/src/types/platform.ts`, `lib/demo/platform.ts`), and `API_GAPS.md`. Each entry lists why, ownership, security, indexes, audit.

Legend: 🔒 field-encrypted (ADR-006). All platform-owned tables are **not** tenant-scoped (no `tenant_id`, no `BelongsToTenant`) — that is the point of the plane separation.

## 1. `tenants` (EXTEND existing)
Already exists (the one non-tenant-scoped relational table in `data-model.md`: `id, name, subdomain, db_connection, status, created_at`). Extend:
| Column | Type | Why | Notes |
|---|---|---|---|
| `status` | enum | ADR-008 lifecycle | `provisioning/trial/active/suspended/inactive` (NO `pending`) |
| `plan` | string/FK→`plans` | console shows/assigns plan | — |
| `region` | string | console; ADR-002 residency | default `ap-south-1` |
| `primary_contact`, `contact_email` | string | customer contact | not employee PII |
| `trial_ends_at` | datetime null | 30-day trial (ADR-008) | default from `platform_settings.default_trial_days` |
| `suspended_at`, `suspended_reason` | datetime/string null | suspension record | reason required |
| `offboarded_at` | datetime null | starts retention clock | DPDP; purge only if retention configured |
- **Ownership:** platform. **Security:** written only by platform plane; `subdomain`+`status` read by tenant resolver. **Indexes:** `UNIQUE(subdomain)` (immutable after create — ADR-008), `INDEX(status)`. **Audit:** every change → `platform_audit_logs`. **`db_connection`** stays (TenantConnectionResolver seam, ADR-001). **Reserved labels** (`app`,`www`,`platform`,`admin`,`api`,`static`,…) are rejected as subdomains at onboarding (ADR-001 amendment).

## 2. `plans` (NEW, platform-owned)
Why: console assigns subscription tiers; FE `PlatformPlan`. Columns: `id, tier, name, price_per_employee, min_commit, max_employees null, features(json), active`. Indexes: `UNIQUE(tier)`. Audit: `platform_config`. Security: platform-only.

## 3. `subscriptions` (NEW, platform-owned) — RECORD-KEEPING ONLY (approved decision 4)
Why: a tenant's plan assignment + commercial fields (`PlatformTenantDetail.subscription`). **Phase 1 = record-keeping; no payment-provider integration.** Columns: `id, tenant_id→tenants (platform FK, NOT the scope discriminator), plan_id→plans, status(trialing/active/past_due/cancelled), seats, price_per_employee, mrr, trial_start, trial_end, subscription_start, subscription_end, billing_metadata(json)`.
- `billing_metadata` is an **opaque future seam** (e.g. external provider customer/subscription ids) so a billing provider can be added later **without an architectural change** — unused in Phase 1.
- Indexes: `INDEX(tenant_id)`, `INDEX(plan_id)`, `INDEX(status)`. Audit: `billing`. Security: platform-only. **No payment APIs / workflows invented.**

## 4. `tenant_onboarding` (NEW, platform-owned)
Why: track in-flight provisioning for the wizard (`TenantOnboarding`). Columns: `id, tenant_id null→tenants, name, subdomain, plan, primary_contact, admin_email, stage(enum), progress, started_at, completed_at null`. Indexes: `INDEX(stage)`, `UNIQUE(subdomain)` (prevents duplicate in-flight). Audit: `tenant_lifecycle`. Security: platform-only; `admin_email` is a business contact, not tenant PII.

## 5. `platform_users` (NEW, platform-owned)
Why: operator identities — **must not** live in tenant `users` (ADR-007 §2). Columns: `id, name, email UNIQUE, password_hash, platform_role(enum, see #6), status(active/invited/disabled), mfa_enabled(true), last_login_at`. Indexes: `UNIQUE(email)`. Audit: `security`. Security: separate identity store; MFA mandatory; separate token audience.

## 6. Platform RBAC — FIXED ROLE ENUM (approved decision 6; NO new tables)
**Decision:** platform authorization uses a **fixed enum on `platform_users.platform_role`** — `PLATFORM_SUPER_ADMIN`, `PLATFORM_SUPPORT`, `PLATFORM_OPERATIONS`, `PLATFORM_AUDITOR` — with a **code-defined** map to `platform.*` permissions. 
- **No** `platform_roles` / `platform_permissions` / `platform_role_permissions` tables are created in Phase 1.
- **Extension point:** authorization goes through a `PlatformAuthorizer` abstraction that today reads the enum→permission map; a future phase can back it with tables without changing call sites. Documented so backend does not over-build.
- Platform roles/permissions remain completely separate from tenant RBAC.

## 7. `platform_audit_logs` (NEW — SEPARATE Mongo collection; approved decision 5)
Why: immutable cross-tenant/operator audit (ADR-007 §5/§7). **Separate MongoDB Atlas collection `platform_audit_logs`**, never mixed with tenant `audit_logs`; accessed via a `PlatformAuditLogStore` interface.
- Shape (`PlatformAuditEntry`): `_id, timestamp, actor(platform_user), action, target(resource), target_tenant_id(null), category(tenant_lifecycle|platform_config|security|billing|access), request_id, result/status, reason(null), access_session_context(null), ip, device`.
- Indexes: `{category:1, timestamp:-1}`, `{actor:1, timestamp:-1}`, `{target_tenant_id:1, timestamp:-1}`. Append-only; retention aligned with `security/log-archive` (ADR-002). Security: platform-only read (`platform.audit.view`).

## 8. `platform_access_sessions` (NEW, platform-owned) — READ-ONLY support access (approved decision 3)
Why: Phase-1 read-only platform→tenant access (ADR-007 §6), replacing the deferred write-impersonation model. Columns: `id, platform_user_id→platform_users, tenant_id→tenants, mode('read_only'), reason, started_at, expires_at (≤ started_at+15min), ended_at null, request_id`. Indexes: `INDEX(platform_user_id)`, `INDEX(tenant_id)`, `INDEX(expires_at)`. Audit: every start/end → `platform_audit_logs` (category `access`) + tenant audit trail. Security: the minted tenant-context token is read-only, audience `tenant`, `platform_access=true`, no writes, no `platform.*`.
- **Write/full impersonation DEFERRED** (future decision) — no `impersonation_sessions` write model and no `impersonated_by`-write claim in Phase 1.

## What is NOT changing
- Tenant-plane tables (`companies`, `employees`, RBAC, workflow, documents, etc.) are **unchanged**. The platform plane never adds columns to or reads PII from them.
- The global `BelongsToTenant` scope and `tenant_id`-first index rule (ADR-001) are untouched and remain absolute on the tenant plane.

## Index / tenancy summary
- Platform tables: conventional PKs/uniques; **no `tenant_id` discriminator** (platform-owned — brief §8 satisfied). Where they reference a tenant (`subscriptions`, `tenant_onboarding`, `platform_access_sessions`), it is a plain FK to `tenants`, used only on the platform plane.
- Tenant tables: mandatory `tenant_id`, global scope, `tenant_id`-first composite indexes/uniques (brief §9 — unchanged).
- `tenants.subdomain` unique + `status` indexed is the hot path for the tenant resolver.

## Open questions (remaining)
- `inactive` **retention period** — legal/compliance policy (`platform_settings.inactive_retention_days`, NULL=no purge until signed off). Non-blocking.
