# Sprint B1 — Orchestration Summary (Platform + Tenant Foundation)

Orchestrator run. Authoritative plan: `docs/B1_PLAN.md`. Broader backlog: `tasks/backlog.json`.
Human decisions applied this run: **E-1 = B1 is foundations-only** (full login/MFA → B2; live read-only access-session token issuance → B3); **E-2 = DevOps activated for B1 infra only** (does not change the Sprint-7 global policy).

**Status: all B1 tasks implemented; SEC-1 gate = PASS. Ready for human review + merge to `sprint/1`.** No task was marked done in `backlog.json` (not my job unless asked). Nothing was pushed or merged to `main`/`sprint`; agents committed only on their own `agent/<ID>` branches in per-task worktrees.

---

## B1 ↔ backlog reconciliation (as required before execution)

B1_PLAN.md is authoritative for execution; S1-01…S1-07 are the nearest backlog lines. S1 and B1 are NOT identical — B1 adds the whole platform plane the Sprint-1 backlog does not list.

| B1 task | Backlog equivalent | Relationship |
|---|---|---|
| B1-00 Scaffold + two-plane route skeletons | S1-01 | Partial (two-plane groups are a B1 addition) |
| B1-01 `tenants` table + lifecycle status | S1-04 (part) | Partial |
| B1-02 Platform identity store `platform_users` | — | **Platform-foundation (no backlog equivalent)** |
| B1-03 Platform guard + audience + PlatformRole + Authorizer | — | **Platform-foundation (no backlog equivalent)** |
| B1-04 Tenant lifecycle state machine | — | **Platform-foundation (no backlog equivalent)** |
| B1-05 Host resolution + reserved/base fail-closed | S1-04 (part) | Partial (ADR-001-amendment work beyond S1-04) |
| B1-06 `BelongsToTenant` trait + global scope | S1-05 | Direct map |
| B1-07 Tenant auth guard + `tenant` audience | — | **Platform-foundation / plane-separation (no backlog equivalent)** |
| B1-08 CI + docker-compose + OpenAPI drift + secret scan | S1-02 + S1-03 | Direct map (two backlog tasks combined) |
| B1-09 Platform audit store `platform_audit_logs` | — | **Platform-foundation (no backlog equivalent)** |
| B1-10 `platform_access_sessions` + read-only state model | — | **Platform-foundation (no backlog equivalent)** |
| B1-11 Tenant audit store foundation `audit_logs` | pre-work for S4-01 | **Foundation ahead of backlog** |
| B1-12 QA isolation/audience/host/access-session harness | S1-06 | Partial/expanded |
| B1-13 QA lifecycle state-machine tests | — | **Platform-foundation (no backlog equivalent)** |
| B1-14 SEC-1 security review (merge gate) | S1-07 | Direct map (expanded to plane separation) |
| B1-15 Frontend platform services demo→live | — | **Platform-foundation (no backlog equivalent)** |

---

## Tasks done / blocked

Legend: branch = `agent/<ID>`; tests run on sqlite `:memory:` (no cloud calls, per steering).

| Task | Agent | Status | Branch | Tests (as reported + re-run) |
|---|---|---|---|---|
| B1-00 Scaffold two-plane skeleton | backend | DONE | agent/B1-00 | 7 passed |
| B1-01 tenants table + status | backend | DONE | agent/B1-01 | 10 (file) / 17 (suite) |
| B1-02 platform_users store | backend | DONE | agent/B1-02 | 14 (file) / 31 (suite) |
| B1-03 platform guard + audience + authorizer | backend | DONE | agent/B1-03 | 45 passed |
| B1-04 tenant lifecycle state machine | backend | DONE | agent/B1-04 | 52 passed |
| B1-05 host resolution + fail-closed | backend | DONE | agent/B1-05 | 37 passed |
| B1-06 BelongsToTenant + global scope | backend | DONE | agent/B1-06 | 18 (file) / 55 (suite) |
| B1-07 tenant guard + tenant audience | backend | DONE | agent/B1-07 | 12 (file) / 49 (suite) |
| B1-08 CI + compose + drift + secret scan | devops | DONE (see note) | agent/B1-08 | config-validated; drift check + backend/frontend job cmds run locally |
| B1-09 platform audit store | backend | DONE | agent/B1-09 | 9 (file) / 61 (suite) |
| B1-10 platform_access_sessions state model | backend | DONE | agent/B1-10 | 22 (file) / 43 (suite) |
| B1-11 tenant audit store foundation | backend | DONE | agent/B1-11 | 17 (file) / 72 (suite) |
| B1-12 QA SEC-1 evidence harness (assembled backend) | qa | DONE | agent/B1-12 | **247 passed, 0 failed** (49 SEC-1) |
| B1-13 QA lifecycle suite | qa | DONE | agent/B1-13 | 59 (file) / 141 (suite); SEC-1 re-run saw 94 lifecycle |
| B1-14 SEC-1 security review | security-reviewer | DONE — **PASS** | docs/reviews/B1-14.md | re-ran 247 / 49 / 94 to confirm |

**Blocked tasks: none.**

**Not executed this run:**
- **B1-15 (Frontend platform services demo→live).** The plan allows it to develop in parallel and explicitly says it must NOT gate SEC-1; it was not required for the backend foundation or the SEC-1 gate. Recommend running it next against the assembled contract-backed endpoints (demo-only for login/MFA/access-session, which stay B2/B3). This is the one planned B1 task not yet done.

**Retry note:** B1-08 first attempt returned a transport error ("Client network error"). On retry the DevOps agent found its prior work staged in the per-task worktree, completed it, and committed. No partial artifacts leaked into the repo root.

---

## Review verdicts

- **SEC-1 (B1-14): PASS** — `docs/reviews/B1-14.md`. All 10 sign-off items verified against the actual code (server-side boundary; no universal user table; no `platform_roles` table; no admin host; absolute fail-closed global scope with a single named/tested bypass; access-session has no minting/write-impersonation path with read_only/≤15min/reason enforced; separate append-only audit collections; ADR-008 lifecycle with no `pending`, immutable subdomain, illegal→409; no committed secrets; QA tests meaningful). No Critical/High findings. Because the verdict is PASS, no rework/re-review loop was triggered.
- Two LOW/informational follow-ups from SEC-1 (not B1 blockers, already deferred by plan):
  - LOW-1: `StubInitialAdminChecker` defaults admin-exists=true — **B4 Backend** must replace with a real checker before the activate endpoint goes live.
  - LOW-2: B1 test-only HMAC token has no `exp`/replay handling — **B2 Backend** production scheme (Sanctum/JWT) must enforce `exp`, short platform session, MFA. Carry into SEC-2.

---

## Integration state (important for the human merge)

Each backend task was built and tested in its own `agent/<ID>` worktree. They were NOT merged to a single `sprint/1` branch by the orchestrator (the orchestrator has no terminal here; GIT_WORKFLOW.md assigns branch/worktree/merge to the `scripts/orchestrate.py` / `scripts/sprint_git.py` tooling run by a human). **QA task B1-12 did assemble all backend branches (B1-00,01,02,03,04,05,06,07,09,10,11) onto `agent/B1-12` and ran the full suite green (247/0)** — so the merge is proven to integrate, but the authoritative `sprint/1` assembly + PR is still a human step.

Reconciliations the human/integrator must preserve when assembling `sprint/1` (all additive, already resolved on `agent/B1-12`):
1. `bootstrap/app.php` — both plane middleware groups (platform = `EnsurePlatformAudience` + `platform.authorize`; tenant = `ResolveTenant:required` + `EnsureTenantAudience`) + the `TenantLifecycleException` 409 render hook.
2. `bootstrap/providers.php` — both `TenancyServiceProvider` and `PlatformAuthServiceProvider`.
3. `config/auth.php` — both `platform` and `tenant` guards + `platform_users` / `tenant_users` providers.
4. `config/audit.php` — one file with BOTH `platform` (`platform_audit_logs`) and `tenant` (`audit_logs`) blocks (B1-09 + B1-11).
5. `database/factories/UserFactory.php` — defaults `tenant_id => 1` so B1-03's tenant-user tests pass against B1-07's tenant-owned `users`. Test-support only; if a real `users.tenant_id → tenants.id` FK is later added, point those tests at a real tenant row / `TenantUserFactory::forTenant()`.

Enforcement gaps that only exist on MySQL (sqlite tests degrade them by design; a human must confirm on MySQL at migrate time): `platform_users.platform_role` CHECK, `platform_access_sessions` mode/TTL CHECKs, and the real FKs (`platform_access_sessions` → `platform_users`/`tenants`; and the `users.tenant_id` FK when hardened). The Mongo audit path (`driver=mongodb`) needs `mongodb/mongodb` + the PHP ext + Atlas wiring installed by a human (never applied by agents).

---

## Notes / deviations from the plan text (not architecture changes, no ADR touched)

- **Laravel 12, not 11.** B1-00 could not install Laravel 11 — Composer blocked every 11.x patch under active security advisories. The agent moved to Laravel `^12.0` (resolves clean) rather than pin a vulnerable release. HTTP middleware groups therefore live in `bootstrap/app.php` (Laravel 12's location); `app/Http/Kernel.php` is kept as a documented mirror. No ADR/contract change. **If you require 11.x, that needs a human advisory-exception decision.**
- **B1_PLAN reserved-label "422".** The plan's B1-13 acceptance mentions a `422` on reserved-label *creation*; B1 has no tenant-create/onboarding endpoint yet (B2/B3), so `422` is unreachable in B1. The reachable, tested B1 guarantee is "reserved label resolves to no tenant" (fail-closed at resolution). Flagged for the planner; no contract change proposed.
- **Pint on the B1-00 skeleton.** CI (B1-08) runs Pint `continue-on-error` because 5 pre-existing style findings sit in B1-00 skeleton files (backend-owned, not devops's to edit). Follow-up: a backend task runs `vendor/bin/pint` to clean the skeleton, then CI drops `continue-on-error` to make lint a hard gate.

---

## HUMAN CHECKLIST (gates + owner="You" tasks)

Backlog tasks owned by **You** (human) — none fall in Sprint 1; the Sprint-0 `You` items (AWS org, TRAI DLT, customer-size decision) and later-sprint `You` items are tracked in `backlog.json` and are out of scope for this run.

Human gates to action for B1 (all backlog Sprint-1 human gates are "You review diff" / "You read report"):

1. **Review and resolve the Laravel 11→12 decision** (accept 12, or require an 11.x advisory exception).
2. **Review each `agent/B1-*` diff** (plan gate "You review diff" for B1-00/01/02/03/04/05/06/07/08/09/10/11, and QA B1-12/B1-13). Suggested: inspect on `agent/B1-12` where everything is assembled and green.
3. **Read the SEC-1 report** `docs/reviews/B1-14.md` (gate "You read report"). Verdict: PASS.
4. **Assemble and merge `sprint/1`** via `scripts/sprint_git.py` / `scripts/orchestrate.py` (orchestrator/agents never merge to `main`). Preserve the 5 reconciliations listed under "Integration state".
5. **Confirm MySQL-only constraints** by running migrations against MySQL (CHECK constraints + FKs that degrade on sqlite).
6. **Decide on B1-15 (frontend)** — run it next (does not gate SEC-1) to switch the platform console's in-scope services to live; keep login/MFA/access-session on demo (B2/B3).
7. **Carry forward** LOW-1 (B4: real initial-admin checker before activate endpoint) and LOW-2 (B2/SEC-2: production token `exp`/replay/MFA).
8. **Do NOT mark backlog tasks done** until you have reviewed/merged; the orchestrator did not modify `backlog.json`.

---

## Honesty notes

- Every "DONE" above was verified by me reading the actual files the agent produced (not just trusting the summary), and the key test counts were independently re-run by the SEC-1 reviewer on the assembled branch (247/0).
- The orchestrator cannot itself run git/branch/worktree/merge operations or Docker/GitHub Actions in this environment (no terminal tool). Where execution was not possible (Docker bring-up, gitleaks binary, GitHub Actions, MySQL-only constraints, live Mongo), it is called out as "config/code provided, not executed here" rather than claimed as passing — consistent with the agents' own honest reporting.
- B1 is NOT "complete/merged": implementation + tests + notes exist, SEC-1 is PASS, but the human gates above (review, `sprint/1` merge, MySQL constraint confirmation, B1-15) remain.
