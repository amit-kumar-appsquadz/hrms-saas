/**
 * Domain / UI models for modules whose APIs are NOT yet in openapi.yaml.
 *
 * Every shape here corresponds to a documented API gap (docs/ui/API_GAPS.md).
 * These are served by the demo-service layer (src/lib/demo) so the client can
 * navigate the full product. They are intentionally kept separate from the
 * contract types (types/api.ts). When the planner adds the real endpoints to
 * openapi.yaml, these models are reconciled with the generated contract types.
 */

import type { EmployeeStatus } from "./api";

export type { EmployeeStatus };

/* ----- Organization ----- */

export interface Company {
  id: number;
  legal_name: string;
  display_name: string;
  short_code: string;
  pan_masked: string;
  gstin: string;
  locations_count: number;
  employee_count: number;
  status: "active" | "archived";
}

export interface Location {
  id: number;
  name: string;
  company: string;
  city: string;
  state: string;
  type: "HO" | "Branch" | "Site";
  employee_count: number;
  status: "active" | "archived";
}

export interface Department {
  id: number;
  name: string;
  company: string;
  parent: string | null;
  head: string | null;
  employee_count: number;
  status: "active" | "archived";
}

export interface Designation {
  id: number;
  title: string;
  company: string;
  grade: string | null;
  employee_count: number;
}

export interface Grade {
  id: number;
  name: string;
  company: string;
  level: number;
  salary_band: string | null;
  employee_count: number;
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
  type: "Public" | "Restricted" | "Optional";
  location: string;
  recurring: boolean;
}

export interface WorkCalendar {
  id: number;
  name: string;
  scope: string;
  working_days: string;
  week_off: string;
  holiday_list: string;
}

export interface OrgNode {
  id: string;
  name: string;
  subtitle: string;
  children?: OrgNode[];
}

/* ----- Employee extensions ----- */

export interface EmployeeDetail {
  id: number;
  employee_code: string;
  full_name: string;
  work_email: string;
  personal_email: string;
  phone: string;
  avatar_color: string;
  status: EmployeeStatus;
  company: string;
  department: string;
  designation: string;
  grade: string;
  location: string;
  manager: string | null;
  date_of_joining: string;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  blood_group: string;
  nationality: string;
  employment_type: string;
  confirmation_date: string | null;
  probation_months: number;
  notice_period_days: number;
  pan_masked: string;
  bank_account_last4: string;
  bank_name: string;
  bank_ifsc_masked: string;
  tax_regime: "old" | "new";
  current_address: string;
  permanent_address: string;
  reportees: { id: number; name: string; designation: string }[];
  qualifications: { degree: string; institute: string; year: string }[];
  experience: { company: string; role: string; from: string; to: string }[];
  emergency_contacts: { name: string; relation: string; phone: string }[];
  custom_fields: Record<string, string>;
}

export interface OnboardingCandidate {
  id: number;
  name: string;
  designation: string;
  department: string;
  stage: "invited" | "details" | "documents" | "verification" | "account" | "completed";
  progress: number;
  owner: string;
  start_date: string;
}

export interface LifecycleChange {
  id: number;
  employee: string;
  type: "Transfer" | "Promotion" | "Manager change";
  effective_date: string;
  details: string;
  status: "pending" | "approved" | "rejected";
}

export interface EmployeeExit {
  id: number;
  employee: string;
  exit_type: string;
  last_working_day: string;
  reason: string;
  stage: "Notice" | "Clearance" | "F&F" | "Settled";
}

/* ----- RBAC / Users ----- */

export interface UserRecord {
  id: number;
  email: string;
  employee: string | null;
  roles: string[];
  status: "active" | "invited" | "disabled";
  mfa: boolean;
  last_login: string | null;
}

export interface Invitation {
  id: number;
  email: string;
  roles: string[];
  invited_by: string;
  invited_at: string;
  status: "pending" | "accepted" | "expired";
}

export interface SessionRecord {
  id: number;
  user: string;
  ip: string;
  device: string;
  last_active: string;
  current: boolean;
}

export interface PermissionDef {
  slug: string;
  module: string;
  action: string;
  label: string;
}

/* ----- Attendance ----- */

export interface AttendanceDay {
  id: number;
  employee: string;
  employee_code: string;
  shift: string;
  first_in: string | null;
  last_out: string | null;
  worked_hours: string;
  status: "present" | "absent" | "half_day" | "leave" | "holiday" | "week_off";
  late: boolean;
  early: boolean;
  source: "web" | "mobile" | "biometric" | "import";
}

export interface Shift {
  id: number;
  name: string;
  start: string;
  end: string;
  break_mins: number;
  grace_mins: number;
  night: boolean;
}

export interface Regularization {
  id: number;
  employee: string;
  date: string;
  requested_in: string;
  requested_out: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
}

/* ----- Leave ----- */

export interface LeaveBalance {
  type: string;
  code: string;
  opening: number;
  accrued: number;
  used: number;
  pending: number;
  available: number;
  color: string;
}

export interface LeaveType {
  id: number;
  name: string;
  code: string;
  paid: boolean;
  accrual_based: boolean;
  unit: "day" | "half-day" | "hour";
  requires_attachment: boolean;
  encashable: boolean;
  color: string;
}

export interface LeaveRequest {
  id: number;
  employee: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  applied_on: string;
  approver: string | null;
}

/* ----- Payroll ----- */

export interface SalaryComponent {
  id: number;
  name: string;
  code: string;
  type: "earning" | "deduction" | "reimbursement" | "statutory";
  taxable: boolean;
  basis: string;
  show_on_payslip: boolean;
}

export interface SalaryStructure {
  id: number;
  name: string;
  ctc: number;
  components: number;
  assigned_to: string;
  effective_from: string;
}

export interface PayrollRun {
  id: number;
  period: string;
  scope: string;
  employees: number;
  gross_total: number;
  net_total: number;
  stage:
    | "draft"
    | "validate"
    | "calculate"
    | "review"
    | "approve"
    | "lock"
    | "payslips"
    | "publish";
  status: "in_progress" | "completed" | "failed";
  created_on: string;
}

export interface PayrollRegisterRow {
  employee: string;
  employee_code: string;
  gross: number;
  deductions: number;
  statutory: number;
  lop: number;
  net: number;
  exception: string | null;
}

export interface Payslip {
  id: number;
  period: string;
  employee: string;
  gross: number;
  net: number;
  status: "generated" | "published";
}

/* ----- Compliance ----- */

export interface ComplianceStatute {
  key: "pf" | "esi" | "pt" | "tds" | "gratuity" | "bonus";
  name: string;
  status: "compliant" | "pending" | "action_required";
  due_date: string;
  last_filing: string;
}

export interface ComplianceAlert {
  id: number;
  severity: "info" | "warning" | "danger";
  message: string;
  statute: string;
  due: string;
}

/* ----- Documents ----- */

export interface DocumentRecord {
  id: number;
  name: string;
  category: string;
  employee: string;
  uploaded_by: string;
  uploaded_at: string;
  status: "pending" | "verified" | "rejected" | "expired";
  expiry: string | null;
  sensitive: boolean;
}

export interface DocumentCategory {
  id: number;
  name: string;
  required_for_onboarding: boolean;
  sensitive: boolean;
  allowed_types: string;
  expiry_tracking: boolean;
}

/* ----- Workflow / Approvals ----- */

export interface ApprovalItem {
  id: number;
  type: string;
  subject: string;
  requester: string;
  submitted: string;
  age_hours: number;
  current_step: string;
  priority: "normal" | "high";
}

export interface WorkflowDefinition {
  id: number;
  name: string;
  trigger: string;
  active: boolean;
  instances: number;
  version: number;
}

export interface WorkflowInstance {
  id: number;
  type: string;
  subject: string;
  initiator: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | "escalated";
  current_step: string;
  age_hours: number;
  timeline: WorkflowStep[];
}

export interface WorkflowStep {
  step: string;
  approver: string;
  decision: "approved" | "rejected" | "pending" | "changes_requested";
  comment: string | null;
  timestamp: string | null;
}

export interface Delegation {
  id: number;
  delegate: string;
  types: string;
  from: string;
  to: string;
  status: "active" | "scheduled" | "ended";
}

/* ----- Notifications ----- */

export interface NotificationItem {
  id: number;
  category:
    | "approvals"
    | "requests"
    | "leave"
    | "attendance"
    | "payroll"
    | "documents"
    | "compliance"
    | "system";
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  link: string;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  posted_by: string;
  posted_at: string;
}

/* ----- Audit ----- */

export interface AuditEntry {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  ip: string;
  request_id: string;
  changes: { field: string; before: string; after: string }[];
}

/* ----- Reports ----- */

export interface ReportDef {
  id: string;
  group: string;
  name: string;
  description: string;
  sensitive: boolean;
}

/* ----- Dashboard ----- */

export interface DashboardSummary {
  total_employees: number;
  active_employees: number;
  new_joiners: number;
  exits: number;
  on_leave_today: number;
  present_pct: number;
  pending_approvals: number;
  payroll_status: string;
  compliance_alerts: number;
  headcount_trend: { month: string; value: number }[];
  department_distribution: { label: string; value: number }[];
  status_distribution: { label: string; value: number; color: string }[];
  attendance_trend: { day: string; present: number; absent: number; leave: number }[];
  upcoming_events: { label: string; date: string; type: string }[];
  recent_activity: { actor: string; action: string; time: string }[];
}

/* ----- Global search ----- */

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
}
