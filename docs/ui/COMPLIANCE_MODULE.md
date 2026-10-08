# Indian Compliance Module — HRMS SaaS

Status: For review (planner). UI architecture for future statutory modules. Sprint anchor: S11 statutory spec, S13 (PF/ESI/PT + ECR export), S14 (TDS + declarations), S15 (Form 24Q/16 drafts). All APIs are **gaps**.

**Non-negotiable (steering 5):** this UI is **configuration-driven and display-only** for statutory logic. It does **not** encode legal rates, slabs, thresholds, or formulas — those are backend values, expert-verified, and shown as data. Every compliance screen is built to be reviewed by the compliance/payroll specialist. All compliance PRs are `needs-expert`.

## 1. Compliance dashboard (`/compliance`) — Payroll/Tenant Admin
- Status cards per statute (PF, ESI, PT, TDS, Gratuity, Bonus): current period status, due dates, pending filings, last challan.
- **Compliance alerts** panel: upcoming due dates, failed/missing filings, config gaps (e.g. employee missing PF number). Severity-coded.
- States: loading; empty (compliance not configured → setup CTA); error.

## 2. Provident Fund (PF) (`/compliance/pf`)
- Config: establishment code, applicability rules (as data), employee PF/UAN numbers, opt-out flags. Display computed PF (employee/employer/EPS/admin) per run — values from engine.
- **ECR export** (S13): generate ECR file for the period (queued), download, history.

## 3. ESI (`/compliance/esi`)
- Config: ESI code, applicability (wage-threshold as config data), employee ESI/IP numbers. Display computed ESI contributions per run; contribution-period handling; return/challan export.

## 4. Professional Tax (PT) (`/compliance/pt`)
- **State-wise** (data model `locations.state`): PT slabs/rules stored as per-state config (expert-maintained), not hardcoded. Display computed PT per employee by state; state-wise summary; challan/return export.

## 5. TDS (Income Tax) (`/compliance/tds`) — S14
- Employee **tax declaration & investment proofs** flow: regime selection (old/new), declared investments (80C/80D/HRA/etc.), proof upload, verification by payroll, projected tax.
- Display computed monthly TDS from engine (both regimes supported by backend). Quarterly summary.
- Admin: declaration windows, proof verification queue, bulk reminders.

## 6. Gratuity (`/compliance/gratuity`)
- Eligibility tracking (tenure), provisioned/payable amount display (computed), triggered at F&F (S16). Config-driven.

## 7. Bonus (`/compliance/bonus`)
- Statutory bonus eligibility/calculation display (computed), payout period, register.

## 8. Statutory reports & challans (`/compliance/reports`)
- PF ECR, ESI returns, PT challans, Form 24Q (quarterly TDS), Form 16 (annual) drafts — generated server-side (S15), listed with period/status, download, regenerate; large generations queued. All marked "draft — expert verification required" until signed off.

## Cross-cutting
- **Config over code:** every rate/slab/threshold is editable config data surfaced read-mostly in the UI; changes are versioned, effective-dated, audited, and gated behind `compliance.config.manage` + `needs-expert`.
- **Permissions:** `compliance.view`, `compliance.config.manage`, `compliance.filing.manage`, `tds.declaration.submit` (employee), `tds.proof.verify`, `compliance.export`.
- **Audit:** all config changes and filings audited (ADR-003).
- **States/responsive:** desktop-first admin; employee TDS declaration is mobile-friendly. Exports/report generation are queued with notification.

## Role capability summary
| Capability | PA | TA | EMP |
|---|:--:|:--:|:--:|
| View compliance dashboard | ✓ | ✓ | – |
| Manage statutory config | ✓* | ✓* | – |
| Generate challans/returns/forms | ✓ | ✓ | – |
| Submit own tax declaration/proofs | – | – | ✓ |
| Verify declarations/proofs | ✓ | ✓ | – |

`*` `needs-expert`; config changes require expert verification before taking effect in a live run.
