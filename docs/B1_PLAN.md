# B1 Implementation Plan — Platform + Tenant Foundation

Status: Planner deliverable (executable task plan). Converts the accepted architecture (ADR-001, ADR-007, ADR-008, `openapi.yaml`, `docs/MULTI_AGENT_PLAN.md`, `docs/BACKEND_ROADMAP.md`) into B1 tasks. **The planner implements no production code.** No accepted ADR decision is changed by this plan.

## 0. Scope reconciliation (read first — one escalation)

The B1 brief lists "platform and tenant authentication" (item 3) and "platform → tenant read-only access sessions" (item 10). The accepted `BACKEND_ROADMAP.md`/`MULTI_AGENT_PLAN.md` sequence **full login/MFA flows into B2** and the **live read-only access-session issuance into B3** (SEC-2/SEC-3 gates). ADRs do **not** pin these to a sprint — the sprint split lives in the roadmap (a planner artifact), so B1 may legitimately build the *foundations* without contradicting any accepted decision.

Resolution applied in this plan (no ADR change):
- **B1 builds the auth/access-session FOUNDATIONS**: two separate identity stores, two auth guards, token **audience** issuance + verification primitives, route-group skeletons, and the `platform_access_sessions` table + state model. 
- **B1 does NOT ship** end-user login UX flows, MFA enrolment/verification, password reset, or live access-session token minting into a tenant — those remain **B2 (auth+MFA)** and **B3 (access-session issuance)** behind SEC-2/SEC-3.
- B1 proves the **boundary** (audience/namespace/identity/host) with minimal, test-only token issuance; it does not expose the full `/auth/login` or `/platform/auth/login` user flows as "done".

> **ESCALATION E-1 (human confirm, non-blocking):** confirm this B1=foundations / B2=flows / B3=access-session-issuance split, OR authorize pulling full platform+tenant login/MFA and live access-session issuance into B1. Default (this plan): foundations only. See §Escalations.

> **ESCALATION E-2 (human confirm):** `devops.json` says "active from Sprint 7", but the roadmap assigns devops the B1 compose/CI/routing task (and devops owns `.github/**`, `docker/**`, `docker-compose*`). This plan assigns those files to **devops** per the roadmap. Confirm devops is active in B1, or temporarily grant backend those files. Default (this plan): devops active for B1 infra tasks.

Everything else in the B1 brief (items 1,2,4,5,6,7,8,9,11) is fully in-scope and unambiguous.

## 1. B1 dependency graph

```
                         ┌────────────────────────────────────────────┐
                         │ B1-00 Scaffold Laravel app + skeletons (BE) │  (must finish first)
                         └───────────────┬────────────────────────────┘
                                         │
        ┌──────────────┬────────────────┼─────────────────┬───────────────┐
        ▼              ▼                 ▼                 ▼               ▼
  B1-01 tenants    B1-02 platform    B1-05 host/      B1-08 CI +      (DevOps infra
  schema+status    identity store    tenant resolver  compose +       runs parallel
  (ADR-008) (BE)   platform_users    + reserved-host  openapi drift   after B1-00)
        │          (BE)              fail-closed (BE)  (DevOps)
        │              │                 │
        │              ▼                 ▼
        │         B1-03 platform    B1-06 BelongsToTenant
        │         auth guard +      trait + global scope
        │         audience +        + tenant context (BE)
        │         PlatformRole           │
        │         enum/Authorizer        ▼
        │         (BE)              B1-07 tenant auth guard +
        │              │            audience "tenant" (BE)
        ▼              ▼                 │
  B1-04 tenant   B1-09 platform    ─────┤
  lifecycle      audit store            │
  state machine  platform_audit_logs    │
  (BE)           (Mongo) (BE)           │
        │              │                │
        └──────┬───────┴────────┬───────┘
               ▼                 ▼
      B1-10 platform_access_sessions table + read-only
      session STATE model (no live minting) (BE)
               │
               ▼
      B1-11 tenant audit store foundation audit_logs (Mongo) (BE)
               │
   ┌───────────┴──────────────────────────────┐
   ▼                                            ▼
 B1-12 QA: isolation + audience + host +    B1-13 QA: lifecycle
 access-session-state harness (QA)          state-machine tests (QA)
   └───────────────────┬────────────────────┘
                       ▼
            B1-14 SEC-1 security review (Security-reviewer)  ← GATE
                       ▼
            B1-15 Frontend: platform services demo→live for B1 surface (FE)  [parallel-capable, see notes]
                       ▼
                 B1 Definition of Done
```

Hard "must-finish-before" edges:
- **B1-00 before everything** (nothing exists to edit until the Laravel app + route-group skeletons exist).
- **B1-02 before B1-03** (guard needs the identity store).
- **B1-05 before B1-06/B1-07** (tenant context + guards depend on host resolution).
- **B1-01 before B1-04** (lifecycle machine needs the status column).
- **B1-02, B1-05, B1-06, B1-07, B1-09 before B1-10** (access-session state sits on both planes + audit).
- **All backend B1-01…B1-11 before QA B1-12/B1-13.**
- **QA green before SEC-1 (B1-14).** SEC-1 is the merge gate.
- **FE B1-15** can develop in parallel against the contract but **integration-verifies after** the backend endpoints exist; it must not block SEC-1.

## 2. B1 task list

Conventions: branch `agent/<TASK-ID>`, worktree per task (GIT_WORKFLOW.md); commits prefixed with the task ID; note in `docs/notes/<TASK-ID>.md` at done; agents never push/merge/apply.

---

### B1-00 — Scaffold Laravel app + two-plane route skeletons
- **Objective:** Create the `backend/` Laravel (Octane) app with two route groups wired but not implemented: tenant plane (`routes/api.php` → `/api/v1/*`) and platform plane (`routes/platform.php` → `/api/v1/platform/*`), each behind its own (empty) middleware group. No business logic.
- **Owning agent:** Backend.
- **Dependencies:** none.
- **Files/components:** `backend/` app skeleton, `backend/routes/api.php`, `backend/routes/platform.php`, `backend/app/Http/Kernel.php` (two middleware groups: `tenant`, `platform`), `composer.json`, `backend/phpunit.xml`, `.env.example`, `docs/notes/B1-00.md`.
- **Acceptance:** app boots; `GET /api/v1/health` (tenant) and `GET /api/v1/platform/health` (platform) return 200 via distinct middleware groups; `php artisan test` runs (0 tests ok); no secrets committed.
- **Security:** middleware groups are empty placeholders — they must **deny by default** until guards land (B1-03/B1-07); no route is publicly writable yet.
- **Tests:** smoke test that both health routes resolve through their own group.
- **Parallel:** no — blocks all other B1 tasks.

---

### B1-01 — `tenants` table + lifecycle status column (ADR-008)
- **Objective:** Migration extending/creating `tenants` with the accepted columns: `subdomain` (unique, immutable), `status` enum `provisioning|trial|active|suspended|inactive`, `plan`, `region`, `primary_contact`, `contact_email`, `trial_ends_at`, `suspended_at`, `suspended_reason`, `offboarded_at`, `db_connection` (seam). Platform-owned; **no `tenant_id`**.
- **Owning agent:** Backend.
- **Dependencies:** B1-00.
- **Files/components:** `backend/database/migrations/*_tenants.php`, `backend/app/Models/Tenant.php` (platform-owned model, NOT `BelongsToTenant`), `docs/notes/B1-01.md`.
- **Acceptance:** migration runs on MySQL; `UNIQUE(subdomain)`, `INDEX(status)` present; status enum matches ADR-008 exactly (no `pending`); `Tenant` model has no tenant global scope.
- **Security:** `tenants` is platform-owned; model must not accidentally receive `BelongsToTenant`; subdomain immutability enforced at the model (guarded setter / updateable-attrs excludes subdomain).
- **Tests:** migration + schema assertion; status enum values; subdomain-immutability unit test.
- **Parallel:** yes (with B1-02, B1-05, B1-08 after B1-00).

---

### B1-02 — Platform identity store (`platform_users`)
- **Objective:** `platform_users` table + model: `id, name, email UNIQUE, password_hash, platform_role (enum), status, mfa_enabled, last_login_at`. Separate from tenant `users`. No universal-user table (forbidden).
- **Owning agent:** Backend.
- **Dependencies:** B1-00.
- **Files/components:** `backend/database/migrations/*_platform_users.php`, `backend/app/Models/Platform/PlatformUser.php`, `docs/notes/B1-02.md`.
- **Acceptance:** table + model exist; `UNIQUE(email)`; `platform_role` constrained to the fixed enum (B1-03); **no FK to and no shared table with tenant `users`**; platform-owned (no `tenant_id`).
- **Security:** this is the ONLY platform identity source; a tenant user must have no row here. Password hashing uses the framework hasher; `mfa_enabled` default true (enforced in B2).
- **Tests:** table/model unit; assert no `tenant_id`; assert distinct from tenant users table.
- **Parallel:** yes.

---

### B1-03 — Platform auth guard + `platform` audience + PlatformRole enum + PlatformAuthorizer
- **Objective:** Platform authentication guard that only authenticates `platform_users`; issue/verify tokens with **audience `platform`**; define the fixed `PlatformRole` enum (`PLATFORM_SUPER_ADMIN|PLATFORM_SUPPORT|PLATFORM_OPERATIONS|PLATFORM_AUDITOR`) and a code-mapped `PlatformAuthorizer` → `platform.*` permissions. **No `platform_roles` table.** No login UX (that is B2) — just the guard + token primitives + authorization service, exercised by tests.
- **Owning agent:** Backend.
- **Dependencies:** B1-00, B1-02.
- **Files/components:** `backend/app/Auth/PlatformGuard.php`, `backend/app/Auth/TokenAudience.php`, `backend/app/Platform/PlatformRole.php` (enum), `backend/app/Platform/PlatformAuthorizer.php`, platform middleware (`EnsurePlatformAudience`, `AuthorizePlatform`), `docs/notes/B1-03.md`.
- **Acceptance:** a `platform`-audience token authenticates a `platform_user`; a `tenant`-audience token is **rejected** by the platform guard; `PlatformAuthorizer::permissionsFor(role)` returns the fixed `platform.*` map from PLATFORM_API_SPEC; `platform.*` and `tenant.*` sets are provably disjoint (unit assertion).
- **Security:** audience check is server-side and independent of path/host (ADR-007 §1). PlatformAuthorizer carries no `tenant.*`. Extension seam documented (future configurable RBAC) but not built.
- **Tests:** audience-match accept/reject; role→permission map; platform/tenant permission-disjointness; wrong-store rejection.
- **Parallel:** after B1-02; parallel with B1-05/B1-06/B1-07.

---

### B1-04 — Tenant lifecycle state machine (ADR-008)
- **Objective:** Pure domain service enforcing the accepted transitions (`provisioning→trial|active`, `trial→active|suspended|inactive`, `active→suspended|inactive`, `suspended→active|trial|inactive`; illegal → domain error mapped to `409 Conflict`). Guards: activate requires provisioning complete + initial admin exists (admin existence check stubbed until B4; the guard hook exists).
- **Owning agent:** Backend.
- **Dependencies:** B1-01.
- **Files/components:** `backend/app/Platform/TenantLifecycle.php`, status transition map, `docs/notes/B1-04.md`.
- **Acceptance:** every legal transition allowed; every illegal transition throws → maps to `409` with the contract `Error` shape; `pending` does not exist; no transition out of `inactive`.
- **Security:** lifecycle writes are platform-plane only (enforced when wired to endpoints in B2/B3); each transition emits a `platform_audit_logs` event via B1-09.
- **Tests:** exhaustive transition matrix (legal + illegal); 409 mapping; audit-event emitted per transition.
- **Parallel:** after B1-01; parallel with B1-02/B1-03/B1-05.

---

### B1-05 — Same-domain host resolution + reserved/base-host fail-closed (ADR-001 amendment)
- **Objective:** Middleware resolving tenant from `<tenant>.app.example.com`; the base/apex host and reserved labels (`app`,`www`,`platform`,`admin`,`api`,`static`) resolve to **no tenant**; a tenant-scoped request with no resolvable tenant **fails closed** (400/401), never defaults to a tenant. Platform plane (`/platform/*` on base host) is unaffected. **No separate admin host.**
- **Owning agent:** Backend.
- **Dependencies:** B1-00.
- **Files/components:** `backend/app/Http/Middleware/ResolveTenant.php`, `backend/app/Tenancy/TenantContext.php`, `backend/app/Tenancy/TenantConnectionResolver.php` (shared-conn seam, ADR-001), reserved-label config, `docs/notes/B1-05.md`.
- **Acceptance:** `acme.app.example.com` → tenant `acme`; `app.example.com` / reserved labels → no tenant; tenant-scoped route with no tenant → fail-closed (no default); unknown subdomain → not-found (non-enumerating); `suspended/provisioning/inactive` tenant → login refused (status read via B1-01).
- **Security:** fail-closed is the core isolation guarantee; no silent default tenant; host is routing-only, not the security boundary.
- **Tests:** host-resolution matrix (tenant/base/reserved/unknown); fail-closed assertion; status-gated resolution.
- **Parallel:** yes (after B1-00); blocks B1-06/B1-07.

---

### B1-06 — `BelongsToTenant` trait + global scope + tenant context binding
- **Objective:** The `BelongsToTenant` trait (global scope filtering by resolved `tenant_id`, auto-fills `tenant_id` on insert, tenant-prefixed cache keys `t:{id}:`), bound to `TenantContext` from B1-05. A sample tenant-owned model + table to exercise it (e.g. a minimal `tenant_pings` fixture) — real tenant tables arrive in B4.
- **Owning agent:** Backend.
- **Dependencies:** B1-05.
- **Files/components:** `backend/app/Tenancy/BelongsToTenant.php`, cache-key helper, fixture model/migration for tests, `docs/notes/B1-06.md`.
- **Acceptance:** queries on a `BelongsToTenant` model are auto-scoped to the current tenant; insert auto-fills `tenant_id`; a scope-bypass requires an explicit documented method + comment (steering rule 2); cache keys are tenant-prefixed.
- **Security:** this trait IS the tenant isolation mechanism; a missing scope = cross-tenant leak. Any bypass path must be explicit + tested.
- **Tests:** auto-scope read; auto-fill insert; **cross-tenant read blocked** (tenant A cannot see tenant B rows); cache-key prefixing.
- **Parallel:** after B1-05; parallel with B1-07.

---

### B1-07 — Tenant auth guard + `tenant` audience
- **Objective:** Tenant authentication guard that authenticates tenant `users` within the resolved tenant context; issue/verify tokens with **audience `tenant`**; reject `platform`-audience tokens. No login UX (B2) — guard + token primitives + middleware only, exercised by tests. (A minimal tenant `users` table stub is created here or reused from B1-00 for the guard to resolve against; full user model/RBAC is B2/B3.)
- **Owning agent:** Backend.
- **Dependencies:** B1-05 (tenant context), B1-00.
- **Files/components:** `backend/app/Auth/TenantGuard.php`, `EnsureTenantAudience` middleware, minimal `users` migration/model stub (`id, tenant_id, email, password_hash, status`), `docs/notes/B1-07.md`.
- **Acceptance:** a `tenant`-audience token authenticates a tenant user **within its tenant**; a `platform`-audience token is **rejected** by the tenant guard; a tenant user from tenant B cannot authenticate into tenant A's context.
- **Security:** audience + tenant-context double check; `users` is tenant-owned (`BelongsToTenant`); no shared identity with `platform_users`.
- **Tests:** audience accept/reject; cross-tenant user rejection; platform-token-on-tenant-endpoint rejection.
- **Parallel:** after B1-05; parallel with B1-06.

---

### B1-08 — CI pipeline + docker-compose + OpenAPI→types drift check + secret scan
- **Objective:** docker-compose (MySQL, Mongo, Redis, MinIO) for local dev/tests; CI running lint + `php artisan test` + build + **openapi→types drift check** + gitleaks secret scan. No cloud calls in tests (steering). **No separate admin hostname** anywhere in config.
- **Owning agent:** DevOps (see ESCALATION E-2).
- **Dependencies:** B1-00 (needs the app to lint/test).
- **Files/components:** `docker-compose.yml`, `.github/workflows/ci.yml`, `docker/**`, `docs/infra/B1-08.md` (or `docs/notes/B1-08.md`).
- **Acceptance:** `docker compose up` brings up MySQL/Mongo/Redis/MinIO; CI green on B1-00 skeleton; drift check fails if the hand-mirrored client diverges from `openapi.yaml`; gitleaks runs; config references base domain + `*.app.example.com` only (no admin host).
- **Security:** secret scanning on; no secrets in CI logs; test DBs are ephemeral/local.
- **Tests:** CI self-check (workflow runs on a PR); compose health.
- **Parallel:** yes (after B1-00); independent of B1-01…B1-07.

---

### B1-09 — Platform audit store (`platform_audit_logs`, separate Mongo collection)
- **Objective:** `PlatformAuditLogStore` interface + Mongo implementation writing to the **separate `platform_audit_logs` collection** (never mixed with tenant audit): fields `timestamp, actor, action, target, target_tenant_id, category(tenant_lifecycle|platform_config|security|billing|access), request_id, result, reason, access_session_context, ip, device`. Append-only.
- **Owning agent:** Backend.
- **Dependencies:** B1-00 (and B1-02 for actor typing).
- **Files/components:** `backend/app/Platform/Audit/PlatformAuditLogStore.php` (interface) + `MongoPlatformAuditLogStore.php`, indexes, `docs/notes/B1-09.md`.
- **Acceptance:** events written to `platform_audit_logs` (NOT `audit_logs`); indexes `{category,timestamp}`, `{actor,timestamp}`, `{target_tenant_id,timestamp}`; append-only (no update/delete API); lifecycle transitions (B1-04) emit events.
- **Security:** separate collection is an accepted decision (ADR-007 §7); platform-only read; immutable.
- **Tests:** write+read event; collection-name assertion (separate from tenant); append-only (no mutate path); lifecycle emits.
- **Parallel:** after B1-00/B1-02; parallel with tenancy tasks.

---

### B1-10 — `platform_access_sessions` table + read-only session STATE model
- **Objective:** `platform_access_sessions` table + domain model for the read-only platform→tenant access session: `id, platform_user_id, tenant_id, mode('read_only'), reason, started_at, expires_at (≤ started_at+15min), ended_at, request_id`. **State + validation only — NO live tenant-token minting** (that is B3/SEC-3). Enforce `mode=read_only`, TTL ≤ 15 min, reason required, at the model/validation layer.
- **Owning agent:** Backend.
- **Dependencies:** B1-02, B1-05, B1-06, B1-07, B1-09.
- **Files/components:** `backend/database/migrations/*_platform_access_sessions.php`, `backend/app/Platform/AccessSession.php`, `docs/notes/B1-10.md`.
- **Acceptance:** table + model exist (platform-owned, FK to `tenants` + `platform_users`, no scope discriminator); constructing a session requires a non-empty `reason`; `expires_at` capped at +15 min; `mode` fixed to `read_only`; **no code path mints a tenant token in B1** (write/full impersonation explicitly absent).
- **Security:** this models the single hardened cross-plane read path (ADR-007 §6). B1 proves the shape + invariants; the token-minting + double-audit wiring is gated to B3/SEC-3. No write impersonation anywhere.
- **Tests:** TTL cap; reason-required; mode read_only; platform-owned (no `tenant_id` scope); assert no minting API exposed.
- **Parallel:** no — integrates both planes + audit; near the end of the backend chain.

---

### B1-11 — Tenant audit store foundation (`audit_logs`, Mongo)
- **Objective:** `AuditLogStore` interface + Mongo implementation for the **tenant** `audit_logs` collection (separate from platform), tenant-scoped by `tenant_id`. Foundation only (full tenant audit viewer is B5); needed so B1-10 double-audit and B1-04 have a tenant-side sink to target in later wiring.
- **Owning agent:** Backend.
- **Dependencies:** B1-06 (tenant context).
- **Files/components:** `backend/app/Tenancy/Audit/AuditLogStore.php` + `MongoAuditLogStore.php`, indexes `{tenant_id,occurred_at}`, `docs/notes/B1-11.md`.
- **Acceptance:** tenant events written to `audit_logs` scoped by `tenant_id`; **collection is separate from `platform_audit_logs`**; append-only; cross-tenant read blocked at the store level.
- **Security:** tenant audit must never land in platform collection and vice versa (ADR-007 §7); `tenant_id` always present.
- **Tests:** write/read tenant-scoped; separation-from-platform assertion; cross-tenant isolation at store.
- **Parallel:** after B1-06; parallel with B1-09.

---

### B1-12 — QA: isolation + audience + host + access-session-state harness
- **Objective:** Automated test suite proving the B1 security invariants end to end.
- **Owning agent:** QA.
- **Dependencies:** all backend B1-01…B1-11 merged into the sprint branch.
- **Files/components:** `backend/tests/Feature/Tenancy/*`, `backend/tests/Feature/Platform/*`, `docs/notes/B1-12.md`.
- **Acceptance (all must pass):**
  - cross-tenant read blocked by global scope (tenant A ↛ tenant B);
  - **token-audience isolation:** platform token rejected on tenant endpoints and vice versa;
  - tenant user cannot authenticate via the platform guard; platform user is not a tenant user;
  - **base/reserved host carries no tenant** (fail-closed), no default tenant;
  - `platform.*` ∩ `tenant.*` = ∅;
  - access-session state invariants (read_only, ≤15 min, reason required; no minting path);
  - platform vs tenant audit written to **separate collections**.
- **Security:** these are the SEC-1 evidence tests; must be deterministic, no cloud calls.
- **Tests:** this task *is* the tests.
- **Parallel:** after backend; parallel with B1-13.

---

### B1-13 — QA: tenant lifecycle state-machine tests
- **Objective:** Exhaustive lifecycle tests (legal/illegal transitions, 409 mapping, `inactive` terminal, subdomain immutability + reserved-label rejection, status-gated resolver).
- **Owning agent:** QA.
- **Dependencies:** B1-01, B1-04, B1-05 merged.
- **Files/components:** `backend/tests/Feature/Platform/LifecycleTest.php`, `docs/notes/B1-13.md`.
- **Acceptance:** full transition matrix green; illegal → `409` `Error` shape; immutable subdomain; reserved labels rejected (`422`); `suspended/provisioning/inactive` block login.
- **Security:** lifecycle gating prevents access to non-active tenants.
- **Tests:** this task *is* the tests.
- **Parallel:** after backend; parallel with B1-12.

---

### B1-14 — SEC-1 security review (merge gate)
- **Objective:** Read-only review of the B1 plane-separation + tenancy against ADR-001/007; verdict written to `docs/reviews/B1-14.md`. **This is the B1 merge gate.**
- **Owning agent:** Security-reviewer.
- **Dependencies:** B1-12 + B1-13 green.
- **Files/components:** `docs/reviews/B1-14.md` only (read-only elsewhere).
- **Acceptance (sign-off checklist):** boundary enforced server-side (audience + namespace + identity + context), not URL/host; no universal user table; no `platform_roles` table; no admin host; `platform_access_sessions` has no minting/write path; separate audit collections; fail-closed host resolution; global scope absolute; no secrets.
- **Security:** this is the gate; a FAIL blocks merge and returns tasks to Backend/QA.
- **Tests:** review verifies QA tests exist and are meaningful (not just present).
- **Parallel:** no — terminal gate before DoD.

---

### B1-15 — Frontend: platform services demo→live for the B1 surface
- **Objective:** Switch the FE platform console's **in-scope** services (platform auth skeleton, tenant list/detail read, onboarding read, summary) from demo→live against the contract where B1 endpoints exist; reconcile platform role labels → fixed `PlatformRole` enum; add tenant `inactive` status handling. Where B1 only built foundations (login/MFA, access-session issuance), the FE stays on demo for those and is clearly flagged (API_GAPS "FE ahead of contract").
- **Owning agent:** Frontend.
- **Dependencies:** contract (already landed) for development; **integration-verifies after** the relevant backend endpoints exist. Must NOT block SEC-1.
- **Files/components:** `frontend/src/services/platform*.ts` (service bodies only), role-label mapping, `inactive` status UI, `docs/notes/B1-15.md`.
- **Acceptance:** platform services call live endpoints where available; role labels mapped to the fixed enum; `inactive` rendered; no tenant modules switched; typecheck/lint/tests green; no backend/contract files touched.
- **Security:** FE never holds a tenant+platform session simultaneously granting cross privileges; separate session storage preserved; read-only access banner wiring kept for B3.
- **Tests:** FE unit tests for role-label mapping + `inactive`; platform/tenant session-separation test preserved.
- **Parallel:** develops in parallel throughout B1; integration step is last. Does not gate SEC-1.

## 3. Agent assignment

| Agent | B1 tasks | Writes (per ownership) |
|---|---|---|
| **Backend** | B1-00, B1-01, B1-02, B1-03, B1-04, B1-05, B1-06, B1-07, B1-09, B1-10, B1-11 | `backend/**`, `docker-compose*` (handed to devops here), `docs/notes/**` |
| **DevOps** | B1-08 (CI, compose, drift check, secret scan) | `.github/**`, `docker/**`, `docker-compose*`, `docs/infra/**` |
| **QA** | B1-12, B1-13 | `backend/tests/**`, `docs/notes/**` |
| **Security-reviewer** | B1-14 (SEC-1 gate) | `docs/reviews/**` only |
| **Frontend** | B1-15 | `frontend/**`, `docs/notes/**` |
| **Planner** | this plan; contract already landed | `docs/**` (no code) |

No two agents write the same files in the same window (compose assigned solely to devops; backend defers compose to B1-08). Backend owns all `backend/**` production code; QA owns `backend/tests/**` only.

## 4. Parallel execution groups

Execute in waves; within a wave, tasks run concurrently in separate worktrees.

- **Wave 0 (serial, blocks all):** B1-00.
- **Wave 1 (parallel):** B1-01, B1-02, B1-05, B1-08.  *(DevOps B1-08 runs alongside backend.)*
- **Wave 2 (parallel):** B1-03 (needs B1-02), B1-04 (needs B1-01), B1-06 (needs B1-05), B1-07 (needs B1-05), B1-09 (needs B1-02).
- **Wave 3 (parallel):** B1-11 (needs B1-06).  *(B1-10 waits.)*
- **Wave 4 (serial):** B1-10 (needs B1-02/05/06/07/09).
- **Wave 5 (parallel QA):** B1-12, B1-13 (all backend merged).
- **Wave 6 (gate):** B1-14 SEC-1.
- **Frontend B1-15:** develops across Waves 1–4, integration-verifies after Wave 4, does **not** gate Wave 6.

Critical path: **B1-00 → B1-05 → B1-06/07 → B1-10 → B1-12/13 → B1-14**.

## 5. Security gates

| Gate | When | Owner | Pass criteria | On fail |
|---|---|---|---|---|
| **Guard-by-default** | end of B1-00 | Backend self-check | both middleware groups deny unauthenticated by default | fix before Wave 1 |
| **SEC-1** (the B1 gate) | after B1-12 + B1-13 green | Security-reviewer | server-side boundary (audience/namespace/identity/context); fail-closed host; global scope absolute; separate audit collections; no universal user table; no `platform_roles`; no admin host; access-session has no minting path; no secrets | tasks returned to Backend/QA; re-run; no merge to `sprint/<N>` until PASS |

SEC-1 is a **hard merge gate** (MULTI_AGENT_PLAN.md). The security-reviewer is read-only and writes only `docs/reviews/B1-14.md`.

## 6. QA gates

All must be green before SEC-1:
1. Cross-tenant read blocked (global scope).
2. Token-audience isolation both directions.
3. Tenant user ∉ platform identity; platform user ∉ tenant identity.
4. Base/reserved host → no tenant (fail-closed, no default).
5. `platform.*` ∩ `tenant.*` = ∅.
6. Lifecycle transition matrix (legal/illegal → 409); `inactive` terminal; subdomain immutable; reserved labels rejected; non-active tenants blocked from login.
7. Access-session state invariants (read_only, ≤15 min, reason) and **no token-minting path** in B1.
8. Platform vs tenant audit in **separate collections**, both append-only.
9. CI green (lint, test, build, openapi drift, gitleaks); no cloud calls in tests.

## 7. B1 Definition of Done

B1 is **done** when:
- All tasks B1-00…B1-15 merged into `sprint/<N>` via per-task `agent/<ID>` branches (GIT_WORKFLOW.md); agents did not push/merge/apply; human merged the PR.
- **Both planes exist and are provably separate:** separate identity stores (`platform_users` vs `users`), separate guards, separate token audiences, disjoint permission namespaces — enforced **server-side**, verified by B1-12.
- **Tenant isolation is absolute:** `BelongsToTenant` global scope; cross-tenant read blocked; base/reserved host fails closed with no default tenant (B1-05/06/12).
- **Tenant lifecycle** state machine matches ADR-008 (no `pending`); immutable unique subdomain; non-active statuses block login (B1-04/13).
- **Platform RBAC** is the fixed `PlatformRole` enum via `PlatformAuthorizer`; **no `platform_roles` table** (B1-03).
- **Audit foundations:** `platform_audit_logs` and tenant `audit_logs` exist as **separate** append-only Mongo collections (B1-09/11).
- **Read-only access-session** table + invariants exist (read_only, ≤15 min, reason); **no token minting / no write impersonation** in B1 (B1-10).
- **Same-domain routing** only; **no admin hostname** anywhere; CI green incl. OpenAPI drift + secret scan (B1-08).
- **QA gates (§6) all green; SEC-1 (B1-14) PASS** with a written verdict in `docs/reviews/B1-14.md`.
- Each task has a `docs/notes/<ID>.md` (what changed, risks, how to verify); no secrets committed; commits carry the task ID.
- **No accepted ADR decision changed**; the two escalations (E-1 scope split, E-2 devops activation) are confirmed by the human or explicitly deferred.

## Escalations (human decisions; do not self-resolve)
- **E-1 — B1 auth/access-session scope split.** This plan builds *foundations* (identity stores, guards, audiences, access-session state) in B1 and defers full login/MFA flows to B2 and live access-session token issuance to B3 (per BACKEND_ROADMAP + SEC-2/SEC-3). Confirm, or authorize pulling full flows into B1. **Does not block starting Waves 0–2.**
- **E-2 — DevOps active in B1.** `devops.json` says "active from Sprint 7," but the roadmap gives devops the B1 CI/compose/routing task and devops owns those files. This plan assigns B1-08 to devops. Confirm devops is active for B1 infra, or temporarily grant backend `.github/**`+`docker/**` for B1-08 only.

> Neither escalation changes an accepted ADR decision; both are sprint-mechanics confirmations.
