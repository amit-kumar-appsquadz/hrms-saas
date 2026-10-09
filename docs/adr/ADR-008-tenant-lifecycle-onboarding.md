# ADR-008: Tenant lifecycle and onboarding

Status: **Accepted** (human-approved, contract-review round 2). Depends on ADR-001, ADR-007. The 4 previous open questions are resolved by approved decision 7 (see "Resolved parameters").

## Context
The platform console provisions and manages tenants. We need a single authoritative tenant **state machine** and an onboarding flow, owned by the platform plane (ADR-007). The frontend demo exposes statuses `active | trial | suspended | provisioning` and a 5-step onboarding wizard; the review brief proposes `pending | trial | active | suspended | inactive`. These must be reconciled into one documented set, and we must not add a status "merely because it sounds useful" (brief §4).

## Decision

### Tenant status set (authoritative)
| Status | Meaning | Login allowed? | Rationale (why it exists) |
|---|---|---|---|
| `provisioning` | Tenant record created; subdomain/DB/seed being set up; initial admin not yet active. | No | A real, observable state during async provisioning (demo's `provisioning`, brief's `pending`). The two names denote the same thing — we pick **`provisioning`** (matches the implemented FE) and treat `pending` as a rejected synonym. Needed so the console can show "setup in progress" and the resolver can refuse login. |
| `trial` | Active and usable, but on a time-boxed trial (`trial_ends_at` set). | Yes | Distinct billing/lifecycle meaning from `active`; drives trial-expiry handling and MRR = 0. Needed because the sales/billing model has trials (demo has trial tenants). |
| `active` | Fully provisioned, paid/committed, operating normally. | Yes | The normal operating state. Required. |
| `suspended` | Temporarily disabled (non-payment, policy, security, or operator action); data retained. | No (blocked with a clear message) | Reversible disable without data loss. Required for billing/abuse response; demo has suspended tenants. Distinct from `inactive` because it is reversible and short-term. |
| `inactive` | Churned/offboarded; retained only for the data-retention window, then purged (DPDP, ADR-006). | No | Terminal lifecycle state separate from `suspended`: it drives the retention/erasure clock and excludes the tenant from active counts/MRR. **Kept** because suspension (reversible, billing) and offboarding (terminal, DPDP retention) are genuinely different and have different data-handling consequences. |

Rejected: `pending` (synonym of `provisioning` — avoid two names for one state). No other statuses added.

### State transitions (platform-plane only, each audited)
```
            provision
   (none) ───────────────▶ provisioning
                               │ activate (admin confirmed, setup done)
                               ▼
        ┌──────────── trial ◀──┴──▶ active ────────────┐
        │  convert   │   (trial→active on conversion)   │
        │            │                                   │
        │   suspend  ▼            suspend                ▼
        └───────▶ suspended ◀───────────────────── suspended
                     │ reactivate                        │ reactivate
                     ▼                                    ▼
                  (back to trial/active)            (back to active)
                     │ offboard                          │ offboard
                     ▼                                    ▼
                               inactive  ──(retention window elapses)──▶ purge
```
Allowed transitions (anything else is rejected):
- `provisioning → trial | active` (activation)
- `trial → active` (conversion), `trial → suspended`, `trial → inactive`
- `active → suspended`, `active → inactive`
- `suspended → active | trial` (reactivate), `suspended → inactive` (offboard)
- `inactive → (purge)` after the retention window (not a status; a deletion/anonymization job)
No transition out of `inactive` back to live (a re-signed customer is a new provisioning). Every transition writes a platform-audit entry with actor, from→to, reason.

### Onboarding flow (matches implemented FE wizard; ADR-007 §6 for admin creation)
```
Super Admin
  → Create tenant        POST /platform/tenants            → status=provisioning
  → Configure tenant     PUT  /platform/tenants/{id}        (plan, region, localization defaults)
  → Create initial admin POST /platform/tenants/{id}/admin  → invites first Tenant Admin (tenant-plane user, status=invited)
  → Activate tenant      POST /platform/tenants/{id}/activate → status=trial|active (guards: admin exists, provisioning complete)
  → Tenant Admin login   (tenant plane: /auth/activate then /auth/login on the subdomain)
  → Tenant application
```
`POST /platform/onboarding` is the orchestrating convenience endpoint the wizard calls (customer info + subdomain-availability check + plan + initial-admin invite) and returns a `tenant_onboarding` record with `stage` + `progress`; it drives the discrete endpoints above. Subdomain availability is checked via `GET /platform/tenants?subdomain=` (or a dedicated check) before create.

### Ownership & boundary
- All lifecycle writes are **platform-plane** (`platform.tenant.*` permissions), never a tenant endpoint.
- The initial Tenant Admin is created as a **tenant-plane** `users` row (with `tenant_id`) via a platform-triggered invite — the one sanctioned cross-plane write, audited on both planes (ADR-007 §5), recorded in `platform_audit_logs`.
- The tenant resolver reads `tenants.status` and refuses login for `provisioning/suspended/inactive` with a clear, non-enumerating message. The resolver treats reserved/base hosts as "no tenant" (ADR-001 amendment), so the platform console at `app.example.com/platform/*` is unaffected by tenant status.

## Resolved parameters (approved decision 7)
- **Status set:** `provisioning → trial → active → suspended → inactive`. `pending` is **not** introduced (explicitly rejected as a synonym of `provisioning`).
- **Trial period:** default **30 days**, stored as `tenants.trial_ends_at`; the 30-day default is **configurable at the platform level** (`platform_settings.default_trial_days`). Trial-expiry behavior (auto-suspend vs grace) is a platform-settings policy; Phase-1 default = move `trial → suspended` on expiry unless converted (operator action — see billing below).
- **trial → active conversion:** an **operator action** in Phase 1 (no payment integration; subscriptions are record-keeping only — ADR-007 decision 4). The activate/convert endpoint sets `active` and records the subscription.
- **Subdomain:** required, **unique**, validated at onboarding (DNS-safe, not a reserved label per ADR-001), and **immutable after creation** in Phase 1 — no arbitrary post-creation renaming. (A deliberate, audited rename is a future decision, not Phase 1.)
- **`inactive` retention:** offboarding sets `inactive` and starts a retention clock, but the **final retention period is a legal/compliance policy** (DPDP + statutory payroll retention) that is **not yet approved**. The purge/anonymization job ships behind a configurable retention setting that is **unset (no auto-purge) by default** until legal sign-off; this does not block build.

## Consequences
- One documented status set removes the demo-vs-brief ambiguity; the FE must align its one extra/renamed value (`pending`→not used; it already uses `provisioning`).
- `inactive` + retention window ties tenant offboarding to the DPDP erasure policy (ADR-006 open question) — a purge job and retention matrix are required before any real offboarding.
- Activation has guards (admin invited, provisioning complete) → the activate endpoint validates state, not just flips a flag.

## Open questions (remaining)
- `inactive` **retention window length** — legal/compliance policy input (DPDP + statutory payroll retention). Non-blocking: no auto-purge until a retention period is explicitly configured after legal sign-off.
