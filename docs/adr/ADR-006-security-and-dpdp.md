# ADR-006: Security and DPDP

Status: Accepted (Sprint 0). Security review validates implementation in S1-07, S2-06, S4-06, S6-03, S12-05.

## Context
The platform stores sensitive personal and financial data (PAN, bank details, salary, identity documents) for employees across many tenants, under India's DPDP Act. We need field-level encryption, strict tenant-scoped access, a defined Aadhaar stance, searchability for encrypted fields, and DPDP processes (consent, access, erasure, breach).

## Decision
### Encryption
- **Shared AWS KMS key strategy for Phase 1.** One KMS CMK (per environment) is used for field-level encryption, with strict tenant context and access controls enforced in the application layer (every decrypt happens inside a tenant-scoped request/worker; ADR-001). The per-tenant-key option is deferred and noted as a future enhancement behind the encryption service abstraction.
- **Field-level encryption** (envelope encryption via KMS data keys) for sensitive fields: PAN, bank account number, IFSC where it identifies an individual's account, salary/compensation amounts, and other identity numbers. Encryption/decryption goes through a single `FieldEncryptor` service so the key strategy can change (shared -> per-tenant) without touching models.
- Data in transit TLS everywhere; data at rest encrypted (RDS, S3, EBS, Atlas) with KMS.

### Aadhaar
- **Never store full Aadhaar numbers.** If Aadhaar is needed for verification, store only a masked reference (last 4) and/or a one-way verification token/reference id from an authorized flow — never the raw 12-digit number, never a reversible encryption of it.

### Searchable encrypted data
- Where an encrypted field must be looked up, **do not query ciphertext directly.** Use:
  - **Blind index**: a keyed HMAC of the normalized plaintext stored in a separate indexed column for exact-match lookup (e.g. find employee by PAN). The HMAC key is KMS-managed and distinct from the encryption key.
  - **Last-four / masked column**: a non-reversible partial (e.g. bank account last 4) for display and coarse filtering.
  - Range/sort on encrypted values is not supported; derive non-sensitive summary columns when a range query is genuinely required.

### Access control and tenancy
- All access is tenant-scoped (ADR-001 global scope). Decryption is permission-gated via RBAC (S2-03); viewing salary/bank/PAN requires an explicit permission, and each access is audited (ADR-003).
- KMS key policy grants decrypt only to the app roles that need it; `security/log-archive` records key usage (ADR-002).

### DPDP processes
- **Consent:** record consent for processing categories with timestamp/version; expose consent state.
- **Access/portability:** a data-subject access request produces the employee's personal data export.
- **Erasure:** erasure requests delete/anonymize personal data, reconciled against statutory retention (payroll/audit records retained where law requires — ADR-003); document what is erased vs retained-and-why.
- **Breach process:** detection via CloudTrail/GuardDuty/alarms (ADR-002), documented notification runbook within DPDP timelines, immutable audit trail in the log-archive account.

## Consequences
- Shared KMS key is simpler and cheaper for Phase 1 but means tenant isolation of key material relies on the application layer; the `FieldEncryptor` + blind-index key seam lets us move to per-tenant keys later without a data model change (a key-rotation/re-encryption migration would still be needed).
- Blind indexes add a column and write-time cost per searchable encrypted field but keep exact-match lookups fast without exposing plaintext.
- Field-level encryption breaks native SQL filtering/sorting on those columns — call sites must use blind-index/last-four columns; enforced by code review and S4-06/S12-05.
- DPDP erasure vs statutory retention is a genuine conflict that needs a documented policy per data category (coordinate with compliance-payroll).

## Alternatives considered
- **Per-tenant KMS keys in Phase 1:** stronger cryptographic isolation and cleaner per-tenant erasure (crypto-shredding), but higher KMS cost/complexity and key-management overhead before pilot. Deferred behind the abstraction.
- **Application-managed keys (not KMS):** avoids KMS cost but loses managed rotation, auditability, and HSM backing. Not chosen.
- **Transparent full-column DB encryption only:** protects at rest but not from an app-layer compromise and gives no field-level access control. Insufficient alone; used in addition for at-rest.

## Assumptions
- Shared KMS key per environment is acceptable to the first pilot tenant(s); no contractual requirement for per-tenant key isolation in Phase 1.
- An authorized/compliant Aadhaar verification mechanism is available if/when Aadhaar verification is actually required (may be out of Phase-1 scope).

## Open questions
- Confirm the exact list of fields classified as "sensitive -> field-encrypted" vs "restricted -> RBAC only" (needs compliance input; drives the ERD annotations).
- DPDP erasure vs retention matrix per data category — who signs off (compliance/legal)?
- Is Aadhaar verification in Phase-1 scope at all, or deferred? If deferred, no Aadhaar field exists yet.
