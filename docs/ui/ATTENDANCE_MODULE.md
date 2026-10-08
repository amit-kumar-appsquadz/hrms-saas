# Attendance Module — HRMS SaaS

Status: For review (planner). Future-ready UI; backend lands in S9–S10 (shifts/rosters, check-in/out + geo-fence, punch ingestion → SQS, biometric push, regularization via workflow, reports). All APIs are **gaps**. Punch data lives in MongoDB Atlas via `PunchStore` (ADR-003) — the UI reads it through a REST facade, never Mongo directly.

Views are separated by audience: **Employee**, **Manager**, **HR/Admin**.

## 1. Attendance dashboard (`/attendance`) — HR/Admin
- KPIs: present today, absent, on leave, late marks, pending regularizations, missing punches.
- Widgets: today's attendance by department/location, trend (7/30-day), exceptions list.
- States: loading skeleton KPIs; empty (attendance not yet configured → link to shifts/policies); error.

## 2. Daily attendance (`/attendance/daily`) — HR/Manager
- `DataTable`: employee, shift, first-in, last-out, worked hours, status (present/absent/half-day/leave/holiday/WO), late/early flags, source. Date picker (single day), filters (dept/location/shift/status).
- Bulk: mark/adjust (permission-gated), export.

## 3. Monthly attendance (`/attendance/monthly`) — HR
- Matrix grid: employees × days of month, cell = status glyph (color + letter, never color alone). Legend, month navigation, department/location filter.
- Export to Excel; feeds payroll LOP (expert-verified later).

## 4. Employee attendance / My attendance (`/me/attendance`) — Employee
- Calendar + list of own punches, worked hours, status; monthly summary (present/absent/leave/late).
- **Punch in/out** control: web check-in/out with geo capture (S9 geo-fence); shows last punch, location, source. Mobile-first.
- Raise **regularization** from a day with missing/incorrect punch.

## 5. Punch in/out & sources
- Sources shown per punch: web, mobile, biometric device (eSSL/ZKTeco — S10), bulk import. Device/source + geo displayed; tampering/outside-fence flagged.
- Punch ingestion is async (SQS, ADR-004) — UI shows "recorded" optimistically only for the user's own web/mobile punch after server ack; device punches appear as they ingest.

## 6. Regularization (`/attendance/regularizations`)
- Employee: apply (date, requested in/out, reason, attachment). Manager/HR: approve/reject/request-changes via **workflow engine** (S4/S10).
- List by status; approval queue integrates with Workflows "Pending approvals".

## 7. Shifts (`/attendance/shifts`) — HR/Admin
- Define shifts: name, start/end, break, grace, half-day/overtime thresholds, night-shift handling. CRUD + archive. Assign to employees/groups.

## 8. Rosters (`/attendance/rosters`) — HR/Manager
- Assign shifts to employees across a date range (grid: employee × date → shift). Copy week, rotation patterns, bulk assign, conflict detection.

## 9. Attendance policies (`/attendance/policies`) — HR/Admin
- Configure late-mark rules, grace periods, half-day logic, overtime eligibility, auto-absent, geo-fence enforcement, min hours. Config-driven; linked to work calendars (Organization module).

## 10. Reports (`/attendance/reports`)
- Daily/monthly summaries, late/early, overtime, absenteeism, muster roll; filters + saved/scheduled; export CSV/Excel/PDF (queued for large ranges). Permission-gated.

## Views by role (summary)
| Capability | Employee | Manager | HR | Admin |
|---|:--:|:--:|:--:|:--:|
| Punch in/out (self) | ✓ | ✓ | ✓ | ✓ |
| View own attendance | ✓ | ✓ | ✓ | ✓ |
| View team attendance | – | ✓ | ✓ | ✓ |
| Apply regularization | ✓ | ✓ | ✓ | ✓ |
| Approve regularization | – | ✓ | ✓ | ✓ |
| Configure shifts/rosters/policies | – | roster (team) | ✓ | ✓ |
| Attendance reports | own | team | ✓ | ✓ |

Permissions: `attendance.view.self/team/all`, `attendance.punch`, `regularization.apply/approve`, `shift.manage`, `roster.manage`, `attendance.policy.manage`, `attendance.report`.

States/responsive: all lists paginated + four-states; mobile prioritizes My attendance + punch + regularization; admin grids are desktop-first.
