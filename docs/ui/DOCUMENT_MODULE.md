# Document Management Module — HRMS SaaS

Status: For review (planner). Sprint anchor: S5 (upload via presigned URLs — MinIO local / S3 prod; employee documents UI). Data model: `employee_documents` (`type`, `s3_key`, `filename`). Access is presigned + permission-gated. Sensitive documents (identity, bank, salary letters) use secure access flows and are audited (ADR-003/006).

## 1. Employee documents (`/employees/{id}/documents`, `/documents`)
- Per-employee document list and a tenant-wide document view (HR). Columns: name/filename, category, type, uploaded by, uploaded at, status (pending/verified/rejected/expired), expiry, actions.
- Filters: category, status, expiry (expiring soon / expired), employee/department. Search by name.
- Row actions: preview, download, verify/reject, replace, delete/archive (permission-gated).
- States: empty ("No documents" + Upload), loading, error.

## 2. Document categories (`/documents/categories`) — HR/Admin
- Define categories (ID proof, address proof, education, offer letter, salary slip, contract, etc.): name, required-for-onboarding flag, sensitive flag, allowed file types/size, expiry-tracking, retention policy (DPDP).
- CRUD + archive. Permissions: `document.category.manage`.

## 3. Upload
- Dropzone (drag+drop + browse): category select, type/size validation client-side (+ server), per-file progress, multiple files.
- **Presigned flow:** request presigned URL (API gap) → upload directly to storage → confirm metadata to backend. UI shows uploading → scanning (virus-scan pending) → stored/verified states.
- Bulk upload (§6) for HR.

## 4. Preview & download
- Inline preview (PDF/image) via **short-lived presigned URL**; open-externally; download. Non-previewable types → download only.
- Sensitive documents: preview/download requires `document.view.sensitive`; each access is logged (actor, doc, time) to the audit store.

## 5. Verification & expiry
- Verify/reject workflow: HR marks verified or rejects with reason (notifies employee). Optional multi-step verification via workflow engine.
- Expiry tracking: expiry date per document; "expiring soon"/"expired" badges; dashboard/compliance alerts; reminders to employee/HR.

## 6. Bulk upload (`/documents/bulk`)
- HR uploads many files mapped to employees/categories (CSV manifest or filename convention); runs as a **queued job** with a row-level result report (matched/unmatched/errors). Steering rule 3 (>300ms → queue).

## 7. Access permissions & audit trail
- Permissions: `document.view.self`, `document.view.team`, `document.view.all`, `document.view.sensitive`, `document.upload`, `document.verify`, `document.delete`, `document.category.manage`, `document.bulk.upload`.
- Employees see own documents (self-service); managers see team (if permitted); HR sees scope/all.
- **Audit trail per document:** upload, view/download (sensitive), verify/reject, replace, delete — all recorded (ADR-003) and visible in a document audit panel.
- **DPDP:** retention/erasure per category; identity docs honor erasure vs statutory-retention policy (ADR-006).

## States / responsive
- Four-states on all lists; upload progress + retry; mobile = view/download/upload for self-service (employee uploading own docs), HR bulk ops desktop-first.
