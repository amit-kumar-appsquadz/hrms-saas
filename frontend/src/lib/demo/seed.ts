/**
 * Centralized demo seed data (DEMO_MODE_ARCHITECTURE: "Centralize demo data and
 * services. Do not scatter hardcoded arrays throughout components.")
 *
 * Realistic Indian mid-market HRMS data for the client demo. Sensitive values
 * are already masked at rest here (PAN XXXXX1234X, bank last-4) to mirror
 * ADR-006 — the demo never carries plaintext PAN/bank.
 */

import type {
  Employee,
  EmployeeSummary,
  EmployeeStatus,
  Role,
} from "@/types/api";
import type {
  Announcement,
  ApprovalItem,
  AttendanceDay,
  AuditEntry,
  Company,
  ComplianceAlert,
  ComplianceStatute,
  DashboardSummary,
  Delegation,
  Department,
  Designation,
  DocumentCategory,
  DocumentRecord,
  EmployeeDetail,
  EmployeeExit,
  Grade,
  Holiday,
  Invitation,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  LifecycleChange,
  Location,
  NotificationItem,
  OnboardingCandidate,
  OrgNode,
  Payslip,
  PayrollRegisterRow,
  PayrollRun,
  PermissionDef,
  Regularization,
  ReportDef,
  SalaryComponent,
  SalaryStructure,
  SearchResult,
  SessionRecord,
  Shift,
  UserRecord,
  WorkCalendar,
  WorkflowDefinition,
  WorkflowInstance,
} from "@/types/domain";

const AVATAR_COLORS = [
  "#1C4E80",
  "#1E7D44",
  "#B7791F",
  "#1C6E8C",
  "#7A3E9D",
  "#C0392B",
];

const FIRST = [
  "Aarav", "Vivaan", "Aditya", "Diya", "Ananya", "Ishaan", "Kabir", "Saanvi",
  "Rohan", "Meera", "Arjun", "Priya", "Karthik", "Neha", "Rahul", "Pooja",
  "Siddharth", "Divya", "Vikram", "Sneha", "Nikhil", "Anjali", "Varun", "Kavya",
  "Harsh", "Riya", "Manish", "Shreya", "Gaurav", "Tanvi",
];
const LAST = [
  "Sharma", "Verma", "Iyer", "Nair", "Reddy", "Patel", "Gupta", "Mehta",
  "Rao", "Singh", "Chatterjee", "Desai", "Kulkarni", "Menon", "Pillai",
  "Agarwal", "Banerjee", "Joshi", "Bose", "Chauhan",
];

const DEPARTMENTS = [
  "Engineering", "Product", "Sales", "Marketing", "Human Resources",
  "Finance", "Customer Success", "Operations", "Legal", "IT",
];
const DESIGNATIONS = [
  "Software Engineer", "Senior Engineer", "Engineering Manager", "Product Manager",
  "Account Executive", "HR Business Partner", "Finance Analyst", "Support Lead",
  "Operations Manager", "Designer",
];
const LOCATIONS_LIST = ["Bengaluru", "Mumbai", "Hyderabad", "Pune", "Gurugram", "Chennai"];
const COMPANIES_LIST = ["Acme Technologies Pvt Ltd", "Acme Services LLP"];
const GRADES_LIST = ["L1", "L2", "L3", "L4", "L5", "M1", "M2"];
const STATUSES: EmployeeStatus[] = ["active", "active", "active", "active", "on_notice", "inactive", "exited"];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length] as T;
}

export interface DemoEmployeeRow extends Employee {
  _summary: EmployeeSummary;
  _detail: EmployeeDetail;
}

function buildEmployees(count: number): DemoEmployeeRow[] {
  const rows: DemoEmployeeRow[] = [];
  for (let i = 0; i < count; i++) {
    const first = pick(FIRST, i);
    const last = pick(LAST, i * 3 + 1);
    const name = `${first} ${last}`;
    const dept = pick(DEPARTMENTS, i);
    const desig = pick(DESIGNATIONS, i);
    const status = pick(STATUSES, i * 2 + i);
    const code = `ACM${String(1001 + i)}`;
    const email = `${first.toLowerCase()}.${last.toLowerCase()}@acme.co.in`;
    const company = pick(COMPANIES_LIST, i);
    const grade = pick(GRADES_LIST, i);
    const loc = pick(LOCATIONS_LIST, i);
    const color = pick(AVATAR_COLORS, i);
    const panMasked = `XXXXX${String(1000 + ((i * 37) % 9000))}${String.fromCharCode(65 + (i % 26))}`;
    const bankLast4 = String(1000 + ((i * 53) % 9000));
    const doj = `20${18 + (i % 6)}-${String(1 + (i % 12)).padStart(2, "0")}-${String(1 + (i % 27)).padStart(2, "0")}`;
    const managerId = i > 4 ? 1 + ((i * 7) % 5) : null;

    const summary: EmployeeSummary = {
      id: i + 1,
      employee_code: code,
      full_name: name,
      work_email: email,
      department: dept,
      designation: desig,
      status,
    };

    const employee: Employee = {
      id: i + 1,
      employee_code: code,
      full_name: name,
      work_email: email,
      manager_id: managerId,
      company_id: (i % 2) + 1,
      department_id: (i % DEPARTMENTS.length) + 1,
      designation_id: (i % DESIGNATIONS.length) + 1,
      grade_id: (i % GRADES_LIST.length) + 1,
      location_id: (i % LOCATIONS_LIST.length) + 1,
      date_of_joining: doj,
      status,
      pan_masked: panMasked,
      bank_account_last4: bankLast4,
      custom_fields: { shirt_size: pick(["S", "M", "L", "XL"], i), employee_type: pick(["Permanent", "Contract"], i) },
      created_at: `${doj}T09:00:00+05:30`,
    };

    const detail: EmployeeDetail = {
      id: i + 1,
      employee_code: code,
      full_name: name,
      work_email: email,
      personal_email: `${first.toLowerCase()}${i}@gmail.com`,
      phone: `+91 ${90000 + (i % 9999)} ${String(10000 + ((i * 7) % 89999))}`,
      avatar_color: color,
      status,
      company,
      department: dept,
      designation: desig,
      grade,
      location: loc,
      manager: managerId ? `${pick(FIRST, managerId)} ${pick(LAST, managerId * 3 + 1)}` : null,
      date_of_joining: doj,
      date_of_birth: `19${80 + (i % 20)}-${String(1 + (i % 12)).padStart(2, "0")}-${String(1 + (i % 27)).padStart(2, "0")}`,
      gender: pick(["Male", "Female"], i),
      marital_status: pick(["Single", "Married"], i),
      blood_group: pick(["O+", "A+", "B+", "AB+", "O-"], i),
      nationality: "Indian",
      employment_type: pick(["Permanent", "Permanent", "Contract"], i),
      confirmation_date: status === "active" ? `${doj.slice(0, 4)}-${doj.slice(5, 7)}-28` : null,
      probation_months: 6,
      notice_period_days: pick([30, 60, 90], i),
      pan_masked: panMasked,
      bank_account_last4: bankLast4,
      bank_name: pick(["HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak Mahindra"], i),
      bank_ifsc_masked: `${pick(["HDFC", "ICIC", "SBIN", "UTIB", "KKBK"], i)}0XXXXXX`,
      tax_regime: i % 2 === 0 ? "new" : "old",
      current_address: `${100 + i}, 4th Cross, ${loc}, India`,
      permanent_address: `${200 + i}, Main Road, ${pick(LOCATIONS_LIST, i + 2)}, India`,
      reportees:
        managerId === null
          ? Array.from({ length: 3 }, (_, r) => ({
              id: 100 + r,
              name: `${pick(FIRST, i + r + 1)} ${pick(LAST, i + r)}`,
              designation: pick(DESIGNATIONS, i + r),
            }))
          : [],
      qualifications: [
        { degree: pick(["B.Tech", "B.E.", "MBA", "B.Sc"], i), institute: pick(["IIT Madras", "VIT Vellore", "BITS Pilani", "Anna University"], i), year: `20${10 + (i % 10)}` },
      ],
      experience: [
        { company: pick(["Infosys", "TCS", "Wipro", "Flipkart", "Zomato"], i), role: "Associate", from: "2016", to: "2019" },
      ],
      emergency_contacts: [
        { name: `${pick(FIRST, i + 5)} ${last}`, relation: pick(["Spouse", "Parent", "Sibling"], i), phone: `+91 98${String(100000 + ((i * 11) % 899999))}` },
      ],
      custom_fields: { "Shirt size": pick(["S", "M", "L", "XL"], i), "Employee type": pick(["Permanent", "Contract"], i) },
    };

    rows.push({ ...employee, _summary: summary, _detail: detail });
  }
  return rows;
}

export const employees = buildEmployees(248);

export const activeEmployeeCount = employees.filter((e) => e.status === "active").length;

/* ----- Roles & permissions ----- */

const PERM_MODULES: Record<string, string[]> = {
  Dashboard: ["view"],
  Employees: ["view", "create", "edit", "delete", "export", "onboard"],
  Organization: ["view", "create", "edit", "archive"],
  Leave: ["view", "apply", "approve", "type.manage", "policy.manage"],
  Attendance: ["view", "punch", "regularize", "approve", "policy.manage"],
  Payroll: ["view", "component.manage", "structure.manage", "compensation.view", "approve", "lock", "publish"],
  Compliance: ["view", "config.manage", "export"],
  Documents: ["view", "upload", "verify", "delete"],
  Workflows: ["definition.manage", "instance.view", "approve"],
  Reports: ["view", "export", "export.sensitive"],
  Admin: ["user.view", "user.invite", "role.view", "role.edit"],
  Settings: ["view", "manage", "security.manage"],
  Audit: ["view", "export"],
};

export const permissionCatalog: PermissionDef[] = Object.entries(PERM_MODULES).flatMap(
  ([module, actions]) =>
    actions.map((action) => ({
      slug: `${module.toLowerCase()}.${action}`,
      module,
      action,
      label: `${module}: ${action}`,
    })),
);

export const roles: Role[] = [
  { id: 1, name: "Tenant Admin", slug: "tenant-admin", permissions: permissionCatalog.map((p) => p.slug), created_at: "2023-01-10T09:00:00+05:30" },
  { id: 2, name: "HR Admin", slug: "hr-admin", permissions: permissionCatalog.filter((p) => ["Dashboard", "Employees", "Organization", "Leave", "Attendance", "Documents", "Reports", "Audit"].includes(p.module)).map((p) => p.slug), created_at: "2023-01-10T09:00:00+05:30" },
  { id: 3, name: "HR Manager", slug: "hr-manager", permissions: ["dashboard.view", "employees.view", "employees.edit", "leave.view", "leave.approve", "attendance.view", "reports.view"], created_at: "2023-02-01T09:00:00+05:30" },
  { id: 4, name: "Payroll Admin", slug: "payroll-admin", permissions: permissionCatalog.filter((p) => ["Dashboard", "Payroll", "Compliance", "Reports"].includes(p.module)).map((p) => p.slug), created_at: "2023-02-01T09:00:00+05:30" },
  { id: 5, name: "Manager", slug: "manager", permissions: ["dashboard.view", "employees.view", "leave.approve", "attendance.view", "attendance.approve", "workflows.approve"], created_at: "2023-03-01T09:00:00+05:30" },
  { id: 6, name: "Employee", slug: "employee", permissions: ["dashboard.view", "leave.apply", "attendance.punch", "documents.view"], created_at: "2023-03-01T09:00:00+05:30" },
];

/* ----- Organization ----- */

export const companies: Company[] = COMPANIES_LIST.map((legal, i) => ({
  id: i + 1,
  legal_name: legal,
  display_name: legal.replace(" Pvt Ltd", "").replace(" LLP", ""),
  short_code: i === 0 ? "ACM-T" : "ACM-S",
  pan_masked: `XXXXX${1000 + i}A`,
  gstin: `29ABCDE${1234 + i}F1Z${i}`,
  locations_count: i === 0 ? 4 : 2,
  employee_count: i === 0 ? 180 : 68,
  status: "active",
}));

export const locations: Location[] = LOCATIONS_LIST.map((city, i) => ({
  id: i + 1,
  name: `${city} Office`,
  company: pick(COMPANIES_LIST, i),
  city,
  state: pick(["Karnataka", "Maharashtra", "Telangana", "Maharashtra", "Haryana", "Tamil Nadu"], i),
  type: i === 0 ? "HO" : "Branch",
  employee_count: 20 + ((i * 17) % 60),
  status: "active",
}));

export const departments: Department[] = DEPARTMENTS.map((name, i) => ({
  id: i + 1,
  name,
  company: pick(COMPANIES_LIST, i),
  parent: i > 6 ? DEPARTMENTS[0]! : null,
  head: `${pick(FIRST, i)} ${pick(LAST, i)}`,
  employee_count: 8 + ((i * 13) % 40),
  status: "active",
}));

export const designations: Designation[] = DESIGNATIONS.map((title, i) => ({
  id: i + 1,
  title,
  company: pick(COMPANIES_LIST, i),
  grade: pick(GRADES_LIST, i),
  employee_count: 5 + ((i * 11) % 30),
}));

export const grades: Grade[] = GRADES_LIST.map((name, i) => ({
  id: i + 1,
  name,
  company: COMPANIES_LIST[0]!,
  level: i + 1,
  salary_band: `₹${(6 + i * 3)}L – ₹${(9 + i * 3)}L`,
  employee_count: 10 + ((i * 9) % 50),
}));

export const holidays: Holiday[] = [
  { id: 1, date: "2024-01-26", name: "Republic Day", type: "Public", location: "All", recurring: true },
  { id: 2, date: "2024-03-25", name: "Holi", type: "Public", location: "All", recurring: true },
  { id: 3, date: "2024-04-11", name: "Eid-ul-Fitr", type: "Public", location: "All", recurring: false },
  { id: 4, date: "2024-08-15", name: "Independence Day", type: "Public", location: "All", recurring: true },
  { id: 5, date: "2024-10-02", name: "Gandhi Jayanti", type: "Public", location: "All", recurring: true },
  { id: 6, date: "2024-11-01", name: "Kannada Rajyotsava", type: "Restricted", location: "Bengaluru Office", recurring: true },
  { id: 7, date: "2024-11-01", name: "Diwali", type: "Public", location: "All", recurring: false },
  { id: 8, date: "2024-12-25", name: "Christmas", type: "Public", location: "All", recurring: true },
];

export const workCalendars: WorkCalendar[] = [
  { id: 1, name: "Standard 5-Day", scope: "All companies", working_days: "Mon–Fri", week_off: "Sat, Sun", holiday_list: "India 2024" },
  { id: 2, name: "6-Day Operations", scope: "Operations dept", working_days: "Mon–Sat", week_off: "Sun", holiday_list: "India 2024" },
  { id: 3, name: "Support Rotational", scope: "Customer Success", working_days: "Rotational", week_off: "Rotational", holiday_list: "India 2024" },
];

export const orgHierarchy: OrgNode = {
  id: "acme",
  name: "Acme Technologies",
  subtitle: "248 employees",
  children: DEPARTMENTS.slice(0, 6).map((d, i) => ({
    id: `d${i}`,
    name: d,
    subtitle: `${departments[i]?.employee_count ?? 0} employees`,
    children: [
      { id: `d${i}-t1`, name: `${d} — Team A`, subtitle: "6 employees" },
      { id: `d${i}-t2`, name: `${d} — Team B`, subtitle: "5 employees" },
    ],
  })),
};

export const reportingTree: OrgNode = {
  id: "ceo",
  name: "Aarav Sharma",
  subtitle: "Chief Executive Officer",
  children: [
    {
      id: "vp1",
      name: "Priya Verma",
      subtitle: "VP Engineering",
      children: [
        { id: "m1", name: "Rohan Iyer", subtitle: "Engineering Manager · 6 reports" },
        { id: "m2", name: "Neha Nair", subtitle: "Engineering Manager · 5 reports" },
      ],
    },
    {
      id: "vp2",
      name: "Vikram Reddy",
      subtitle: "VP Sales",
      children: [{ id: "m3", name: "Kavya Patel", subtitle: "Sales Manager · 8 reports" }],
    },
  ],
};

/* ----- Employee lifecycle ----- */

export const onboardingCandidates: OnboardingCandidate[] = [
  { id: 1, name: "Ritika Malhotra", designation: "Software Engineer", department: "Engineering", stage: "documents", progress: 45, owner: "Neha Nair", start_date: "2024-07-01" },
  { id: 2, name: "Aman Khanna", designation: "Account Executive", department: "Sales", stage: "verification", progress: 65, owner: "Kavya Patel", start_date: "2024-07-08" },
  { id: 3, name: "Sana Qureshi", designation: "Product Manager", department: "Product", stage: "account", progress: 85, owner: "Priya Verma", start_date: "2024-07-15" },
  { id: 4, name: "Dev Choudhary", designation: "Finance Analyst", department: "Finance", stage: "invited", progress: 10, owner: "Rahul Gupta", start_date: "2024-07-22" },
];

export const lifecycleChanges: LifecycleChange[] = [
  { id: 1, employee: "Rohan Iyer", type: "Promotion", effective_date: "2024-08-01", details: "Senior Engineer → Engineering Manager", status: "pending" },
  { id: 2, employee: "Sneha Rao", type: "Transfer", effective_date: "2024-07-15", details: "Bengaluru → Pune", status: "approved" },
  { id: 3, employee: "Nikhil Singh", type: "Manager change", effective_date: "2024-07-10", details: "Reports to Priya Verma", status: "approved" },
];

export const employeeExits: EmployeeExit[] = [
  { id: 1, employee: "Harsh Chauhan", exit_type: "Resignation", last_working_day: "2024-08-20", reason: "Better opportunity", stage: "Notice" },
  { id: 2, employee: "Divya Joshi", exit_type: "Resignation", last_working_day: "2024-07-05", reason: "Relocation", stage: "F&F" },
  { id: 3, employee: "Manish Bose", exit_type: "Retirement", last_working_day: "2024-06-30", reason: "Superannuation", stage: "Settled" },
];

/* ----- Users / RBAC ----- */

export const users: UserRecord[] = employees.slice(0, 40).map((e, i) => ({
  id: e.id,
  email: e.work_email,
  employee: e.full_name,
  roles: [pick(["Employee", "Manager", "HR Admin", "Payroll Admin", "Tenant Admin"], i)],
  status: pick<UserRecord["status"]>(["active", "active", "active", "invited", "disabled"], i),
  mfa: i % 3 !== 0,
  last_login: i % 5 === 0 ? null : `2024-07-${String(10 + (i % 18)).padStart(2, "0")}T${String(8 + (i % 10)).padStart(2, "0")}:30:00+05:30`,
}));

export const invitations: Invitation[] = [
  { id: 1, email: "ritika.m@acme.co.in", roles: ["Employee"], invited_by: "Neha Nair", invited_at: "2024-07-01T10:00:00+05:30", status: "pending" },
  { id: 2, email: "aman.k@acme.co.in", roles: ["Employee"], invited_by: "Kavya Patel", invited_at: "2024-06-28T11:00:00+05:30", status: "accepted" },
  { id: 3, email: "old.user@acme.co.in", roles: ["Manager"], invited_by: "Priya Verma", invited_at: "2024-05-01T09:00:00+05:30", status: "expired" },
];

export const sessions: SessionRecord[] = [
  { id: 1, user: "You", ip: "103.21.44.12", device: "Chrome · Windows", last_active: "Just now", current: true },
  { id: 2, user: "You", ip: "103.21.44.12", device: "Safari · iPhone", last_active: "2 hours ago", current: false },
  { id: 3, user: "You", ip: "49.207.1.88", device: "Firefox · macOS", last_active: "Yesterday", current: false },
];

/* ----- Attendance ----- */

export const attendanceDays: AttendanceDay[] = employees.slice(0, 60).map((e, i) => ({
  id: e.id,
  employee: e.full_name,
  employee_code: e.employee_code,
  shift: pick(["General", "Morning", "Night"], i),
  first_in: i % 7 === 0 ? null : `0${8 + (i % 2)}:${String((i * 7) % 59).padStart(2, "0")}`,
  last_out: i % 7 === 0 ? null : `1${7 + (i % 2)}:${String((i * 11) % 59).padStart(2, "0")}`,
  worked_hours: i % 7 === 0 ? "0h" : `${8 + (i % 2)}h ${(i * 5) % 59}m`,
  status: pick<AttendanceDay["status"]>(["present", "present", "present", "present", "late" as never, "absent", "leave", "week_off"], i) as AttendanceDay["status"],
  late: i % 5 === 0,
  early: i % 9 === 0,
  source: pick<AttendanceDay["source"]>(["web", "mobile", "biometric", "import"], i),
})).map((d) => ({ ...d, status: d.status === ("late" as never) ? "present" : d.status }));

export const shifts: Shift[] = [
  { id: 1, name: "General", start: "09:00", end: "18:00", break_mins: 60, grace_mins: 15, night: false },
  { id: 2, name: "Morning", start: "06:00", end: "14:00", break_mins: 30, grace_mins: 10, night: false },
  { id: 3, name: "Evening", start: "14:00", end: "22:00", break_mins: 30, grace_mins: 10, night: false },
  { id: 4, name: "Night", start: "22:00", end: "06:00", break_mins: 45, grace_mins: 15, night: true },
];

export const regularizations: Regularization[] = [
  { id: 1, employee: "Rahul Gupta", date: "2024-07-10", requested_in: "09:15", requested_out: "18:30", reason: "Biometric not captured", status: "pending" },
  { id: 2, employee: "Pooja Mehta", date: "2024-07-09", requested_in: "09:00", requested_out: "17:45", reason: "WFH — forgot web punch", status: "pending" },
  { id: 3, employee: "Varun Rao", date: "2024-07-08", requested_in: "10:00", requested_out: "19:00", reason: "Client visit", status: "approved" },
];

/* ----- Leave ----- */

export const leaveBalances: LeaveBalance[] = [
  { type: "Casual Leave", code: "CL", opening: 12, accrued: 7, used: 4, pending: 1, available: 14, color: "#1C4E80" },
  { type: "Sick Leave", code: "SL", opening: 12, accrued: 6, used: 3, pending: 0, available: 15, color: "#1E7D44" },
  { type: "Earned Leave", code: "EL", opening: 18, accrued: 10, used: 6, pending: 2, available: 20, color: "#B7791F" },
  { type: "Comp Off", code: "CO", opening: 0, accrued: 3, used: 1, pending: 0, available: 2, color: "#1C6E8C" },
];

export const leaveTypes: LeaveType[] = [
  { id: 1, name: "Casual Leave", code: "CL", paid: true, accrual_based: true, unit: "day", requires_attachment: false, encashable: false, color: "#1C4E80" },
  { id: 2, name: "Sick Leave", code: "SL", paid: true, accrual_based: true, unit: "day", requires_attachment: true, encashable: false, color: "#1E7D44" },
  { id: 3, name: "Earned Leave", code: "EL", paid: true, accrual_based: true, unit: "day", requires_attachment: false, encashable: true, color: "#B7791F" },
  { id: 4, name: "Loss of Pay", code: "LOP", paid: false, accrual_based: false, unit: "day", requires_attachment: false, encashable: false, color: "#C0392B" },
  { id: 5, name: "Maternity Leave", code: "ML", paid: true, accrual_based: false, unit: "day", requires_attachment: true, encashable: false, color: "#7A3E9D" },
];

export const leaveRequests: LeaveRequest[] = [
  { id: 1, employee: "You", type: "Earned Leave", from: "2024-07-22", to: "2024-07-24", days: 3, reason: "Family function", status: "pending", applied_on: "2024-07-12", approver: "Rohan Iyer" },
  { id: 2, employee: "You", type: "Sick Leave", from: "2024-06-18", to: "2024-06-18", days: 1, reason: "Fever", status: "approved", applied_on: "2024-06-18", approver: "Rohan Iyer" },
  { id: 3, employee: "Sneha Rao", type: "Casual Leave", from: "2024-07-25", to: "2024-07-25", days: 1, reason: "Personal", status: "pending", applied_on: "2024-07-14", approver: "You" },
  { id: 4, employee: "Nikhil Singh", type: "Earned Leave", from: "2024-07-29", to: "2024-08-02", days: 5, reason: "Vacation", status: "pending", applied_on: "2024-07-13", approver: "You" },
];

/* ----- Payroll ----- */

export const salaryComponents: SalaryComponent[] = [
  { id: 1, name: "Basic", code: "BASIC", type: "earning", taxable: true, basis: "40% of CTC", show_on_payslip: true },
  { id: 2, name: "House Rent Allowance", code: "HRA", type: "earning", taxable: true, basis: "50% of Basic", show_on_payslip: true },
  { id: 3, name: "Special Allowance", code: "SPL", type: "earning", taxable: true, basis: "Balancing", show_on_payslip: true },
  { id: 4, name: "Provident Fund", code: "PF", type: "statutory", taxable: false, basis: "12% of Basic", show_on_payslip: true },
  { id: 5, name: "Professional Tax", code: "PT", type: "statutory", taxable: false, basis: "State slab", show_on_payslip: true },
  { id: 6, name: "Income Tax (TDS)", code: "TDS", type: "statutory", taxable: false, basis: "Projected", show_on_payslip: true },
  { id: 7, name: "Telephone Reimbursement", code: "TEL", type: "reimbursement", taxable: false, basis: "Fixed ₹1,000", show_on_payslip: true },
];

export const salaryStructures: SalaryStructure[] = [
  { id: 1, name: "Standard — L1/L2", ctc: 800000, components: 6, assigned_to: "L1, L2 grades", effective_from: "2024-04-01" },
  { id: 2, name: "Standard — L3/L4", ctc: 1800000, components: 7, assigned_to: "L3, L4 grades", effective_from: "2024-04-01" },
  { id: 3, name: "Management — M1/M2", ctc: 3500000, components: 8, assigned_to: "M1, M2 grades", effective_from: "2024-04-01" },
];

export const payrollRuns: PayrollRun[] = [
  { id: 1, period: "July 2024", scope: "All companies", employees: 248, gross_total: 42800000, net_total: 36500000, stage: "review", status: "in_progress", created_on: "2024-07-25" },
  { id: 2, period: "June 2024", scope: "All companies", employees: 246, gross_total: 42500000, net_total: 36200000, stage: "publish", status: "completed", created_on: "2024-06-25" },
  { id: 3, period: "May 2024", scope: "All companies", employees: 244, gross_total: 42100000, net_total: 35900000, stage: "publish", status: "completed", created_on: "2024-05-25" },
];

export const payrollRegister: PayrollRegisterRow[] = employees.slice(0, 50).map((e, i) => {
  const gross = 50000 + ((i * 3137) % 180000);
  const stat = Math.round(gross * 0.12);
  const ded = Math.round(gross * 0.05);
  const lop = i % 11 === 0 ? Math.round(gross * 0.06) : 0;
  return {
    employee: e.full_name,
    employee_code: e.employee_code,
    gross,
    deductions: ded,
    statutory: stat,
    lop,
    net: gross - stat - ded - lop,
    exception: i % 11 === 0 ? "LOP applied — 2 days" : i % 17 === 0 ? "Bank details missing" : null,
  };
});

export const payslips: Payslip[] = payrollRuns.flatMap((run) =>
  employees.slice(0, 6).map((e, i) => ({
    id: run.id * 100 + i,
    period: run.period,
    employee: e.full_name,
    gross: 80000 + i * 12000,
    net: 68000 + i * 10000,
    status: run.stage === "publish" ? "published" : "generated",
  })),
);

export const myPayslips: Payslip[] = payrollRuns.map((run, i) => ({
  id: 900 + i,
  period: run.period,
  employee: "You",
  gross: 125000,
  net: 104500,
  status: run.stage === "publish" ? "published" : "generated",
}));

/* ----- Compliance ----- */

export const complianceStatutes: ComplianceStatute[] = [
  { key: "pf", name: "Provident Fund (PF)", status: "compliant", due_date: "2024-08-15", last_filing: "2024-07-14" },
  { key: "esi", name: "ESI", status: "compliant", due_date: "2024-08-15", last_filing: "2024-07-14" },
  { key: "pt", name: "Professional Tax (PT)", status: "pending", due_date: "2024-07-31", last_filing: "2024-06-28" },
  { key: "tds", name: "TDS", status: "action_required", due_date: "2024-07-31", last_filing: "2024-06-07" },
  { key: "gratuity", name: "Gratuity", status: "compliant", due_date: "—", last_filing: "—" },
  { key: "bonus", name: "Statutory Bonus", status: "compliant", due_date: "2024-11-30", last_filing: "2023-11-28" },
];

export const complianceAlerts: ComplianceAlert[] = [
  { id: 1, severity: "danger", message: "TDS challan for Q1 FY25 pending filing", statute: "TDS", due: "2024-07-31" },
  { id: 2, severity: "warning", message: "PT payment for Karnataka due in 4 days", statute: "PT", due: "2024-07-31" },
  { id: 3, severity: "warning", message: "3 employees missing UAN numbers", statute: "PF", due: "—" },
  { id: 4, severity: "info", message: "ESI contribution period ends Sep 2024", statute: "ESI", due: "2024-09-30" },
];

/* ----- Documents ----- */

export const documents: DocumentRecord[] = employees.slice(0, 45).flatMap((e, i) => [
  { id: i * 2 + 1, name: "PAN Card.pdf", category: "ID Proof", employee: e.full_name, uploaded_by: e.full_name, uploaded_at: "2024-05-10", status: pick<DocumentRecord["status"]>(["verified", "pending", "rejected", "expired"], i), expiry: null, sensitive: true },
  { id: i * 2 + 2, name: "Offer Letter.pdf", category: "Employment", employee: e.full_name, uploaded_by: "HR Admin", uploaded_at: "2024-05-11", status: "verified", expiry: null, sensitive: false },
]);

export const documentCategories: DocumentCategory[] = [
  { id: 1, name: "ID Proof", required_for_onboarding: true, sensitive: true, allowed_types: "PDF, JPG, PNG", expiry_tracking: false },
  { id: 2, name: "Address Proof", required_for_onboarding: true, sensitive: true, allowed_types: "PDF, JPG", expiry_tracking: false },
  { id: 3, name: "Education", required_for_onboarding: true, sensitive: false, allowed_types: "PDF", expiry_tracking: false },
  { id: 4, name: "Employment", required_for_onboarding: false, sensitive: false, allowed_types: "PDF", expiry_tracking: false },
  { id: 5, name: "Contract", required_for_onboarding: false, sensitive: true, allowed_types: "PDF", expiry_tracking: true },
];

/* ----- Workflow / Approvals ----- */

export const approvals: ApprovalItem[] = [
  { id: 1, type: "Leave", subject: "Sneha Rao — Casual Leave (1 day)", requester: "Sneha Rao", submitted: "2024-07-14", age_hours: 20, current_step: "L1 — Manager", priority: "normal" },
  { id: 2, type: "Leave", subject: "Nikhil Singh — Earned Leave (5 days)", requester: "Nikhil Singh", submitted: "2024-07-13", age_hours: 44, current_step: "L1 — Manager", priority: "high" },
  { id: 3, type: "Regularization", subject: "Rahul Gupta — 10 Jul attendance", requester: "Rahul Gupta", submitted: "2024-07-11", age_hours: 70, current_step: "L1 — Manager", priority: "normal" },
  { id: 4, type: "Profile change", subject: "Pooja Mehta — bank details update", requester: "Pooja Mehta", submitted: "2024-07-12", age_hours: 52, current_step: "L1 — HR", priority: "normal" },
  { id: 5, type: "Comp change", subject: "Rohan Iyer — promotion increment", requester: "Priya Verma", submitted: "2024-07-10", age_hours: 96, current_step: "L2 — Payroll", priority: "high" },
];

export const workflowDefinitions: WorkflowDefinition[] = [
  { id: 1, name: "Leave Approval", trigger: "Leave request", active: true, instances: 142, version: 3 },
  { id: 2, name: "Regularization Approval", trigger: "Regularization", active: true, instances: 58, version: 2 },
  { id: 3, name: "Profile Change Approval", trigger: "Employee change", active: true, instances: 31, version: 1 },
  { id: 4, name: "Compensation Change", trigger: "Salary change", active: true, instances: 12, version: 2 },
  { id: 5, name: "Exit Clearance", trigger: "Exit", active: false, instances: 8, version: 1 },
];

export const workflowInstances: WorkflowInstance[] = [
  {
    id: 1, type: "Leave", subject: "Nikhil Singh — Earned Leave (5 days)", initiator: "Nikhil Singh", status: "pending", current_step: "L1 — Manager", age_hours: 44,
    timeline: [
      { step: "Submitted", approver: "Nikhil Singh", decision: "approved", comment: "Vacation", timestamp: "2024-07-13T10:00:00+05:30" },
      { step: "L1 — Manager", approver: "You", decision: "pending", comment: null, timestamp: null },
    ],
  },
  {
    id: 2, type: "Comp change", subject: "Rohan Iyer — promotion increment", initiator: "Priya Verma", status: "pending", current_step: "L2 — Payroll", age_hours: 96,
    timeline: [
      { step: "Submitted", approver: "Priya Verma", decision: "approved", comment: "Promotion to EM", timestamp: "2024-07-10T09:00:00+05:30" },
      { step: "L1 — HR", approver: "Rahul Gupta", decision: "approved", comment: "Verified", timestamp: "2024-07-11T14:00:00+05:30" },
      { step: "L2 — Payroll", approver: "Payroll Admin", decision: "pending", comment: null, timestamp: null },
    ],
  },
];

export const delegations: Delegation[] = [
  { id: 1, delegate: "Neha Nair", types: "Leave, Regularization", from: "2024-08-01", to: "2024-08-10", status: "scheduled" },
];

/* ----- Notifications ----- */

export const notifications: NotificationItem[] = [
  { id: 1, category: "approvals", title: "Leave request awaiting approval", body: "Nikhil Singh applied for 5 days Earned Leave.", timestamp: "2024-07-14T09:10:00+05:30", read: false, link: "/approvals" },
  { id: 2, category: "approvals", title: "Regularization pending", body: "Rahul Gupta raised a regularization for 10 Jul.", timestamp: "2024-07-13T16:40:00+05:30", read: false, link: "/approvals" },
  { id: 3, category: "payroll", title: "July payroll in review", body: "The July 2024 run is ready for your review.", timestamp: "2024-07-13T11:00:00+05:30", read: false, link: "/payroll/runs/1" },
  { id: 4, category: "leave", title: "Your leave was approved", body: "Your Sick Leave on 18 Jun was approved.", timestamp: "2024-06-18T10:00:00+05:30", read: true, link: "/me/leave" },
  { id: 5, category: "documents", title: "Document verified", body: "Your Offer Letter was verified by HR.", timestamp: "2024-05-11T15:00:00+05:30", read: true, link: "/me/documents" },
  { id: 6, category: "compliance", title: "TDS filing due", body: "Q1 FY25 TDS challan is due on 31 Jul.", timestamp: "2024-07-10T08:00:00+05:30", read: true, link: "/compliance/tds" },
];

export const announcements: Announcement[] = [
  { id: 1, title: "Annual appraisal cycle opens 1 August", body: "The FY25 appraisal cycle begins on 1 August. Managers will receive forms by email.", posted_by: "People Team", posted_at: "2024-07-12T09:00:00+05:30" },
  { id: 2, title: "New health insurance partner", body: "We have moved to a new group health insurance provider effective 1 July with higher coverage.", posted_by: "HR Admin", posted_at: "2024-07-01T09:00:00+05:30" },
  { id: 3, title: "Office closed for Independence Day", body: "All offices will remain closed on 15 August.", posted_by: "Admin", posted_at: "2024-06-30T09:00:00+05:30" },
];

/* ----- Audit ----- */

export const auditEntries: AuditEntry[] = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  timestamp: `2024-07-${String(1 + (i % 25)).padStart(2, "0")}T${String(8 + (i % 10)).padStart(2, "0")}:${String((i * 7) % 59).padStart(2, "0")}:00+05:30`,
  actor: pick(["Rahul Gupta", "Priya Verma", "Neha Nair", "Payroll Admin", "You"], i),
  action: pick(["employee.updated", "role.updated", "leave.approved", "payroll.calculated", "document.verified", "login.success"], i),
  entity_type: pick(["Employee", "Role", "LeaveRequest", "PayrollRun", "Document", "User"], i),
  entity_id: String(1000 + i),
  ip: `103.21.44.${10 + (i % 240)}`,
  request_id: `req_${(i + 1).toString(36)}${(i * 97).toString(36)}`,
  changes:
    i % 3 === 0
      ? [{ field: "designation", before: "Software Engineer", after: "Senior Engineer" }]
      : i % 3 === 1
      ? [{ field: "status", before: "active", after: "on_notice" }]
      : [],
}));

/* ----- Reports ----- */

export const reportCatalog: ReportDef[] = [
  { id: "headcount", group: "Employee", name: "Headcount Report", description: "Active headcount by date, with joiners and exits.", sensitive: false },
  { id: "directory", group: "Employee", name: "Employee Directory", description: "Full employee directory with contact and org details.", sensitive: false },
  { id: "newjoiners", group: "Employee", name: "New Joiners", description: "Employees who joined in the selected period.", sensitive: false },
  { id: "deptdist", group: "Organization", name: "Department Distribution", description: "Headcount by department and location.", sensitive: false },
  { id: "attsummary", group: "Attendance", name: "Monthly Attendance Summary", description: "Present/absent/leave by employee for the month.", sensitive: false },
  { id: "leavebal", group: "Leave", name: "Leave Balance Report", description: "Opening, accrued, used and available leave by type.", sensitive: false },
  { id: "salreg", group: "Payroll", name: "Salary Register", description: "Per-employee gross, deductions and net for a run.", sensitive: true },
  { id: "bankadvice", group: "Payroll", name: "Bank Advice", description: "Bank transfer file for a payroll run.", sensitive: true },
  { id: "pfecr", group: "Compliance", name: "PF ECR", description: "Provident Fund ECR file for the period.", sensitive: true },
  { id: "form24q", group: "Compliance", name: "Form 24Q", description: "Quarterly TDS statement (draft — expert verification required).", sensitive: true },
  { id: "attrition", group: "Turnover", name: "Attrition Report", description: "Exits by reason, department and tenure.", sensitive: false },
];

/* ----- Dashboard ----- */

export const dashboardSummary: DashboardSummary = {
  total_employees: 248,
  active_employees: activeEmployeeCount,
  new_joiners: 12,
  exits: 4,
  on_leave_today: 9,
  present_pct: 92,
  pending_approvals: 5,
  payroll_status: "July run in review",
  compliance_alerts: 4,
  headcount_trend: [
    { month: "Feb", value: 221 }, { month: "Mar", value: 228 }, { month: "Apr", value: 235 },
    { month: "May", value: 240 }, { month: "Jun", value: 246 }, { month: "Jul", value: 248 },
  ],
  department_distribution: DEPARTMENTS.slice(0, 7).map((d, i) => ({ label: d, value: departments[i]?.employee_count ?? 10 })),
  status_distribution: [
    { label: "Active", value: activeEmployeeCount, color: "#1E7D44" },
    { label: "On notice", value: employees.filter((e) => e.status === "on_notice").length, color: "#B7791F" },
    { label: "Inactive", value: employees.filter((e) => e.status === "inactive").length, color: "#5B636C" },
    { label: "Exited", value: employees.filter((e) => e.status === "exited").length, color: "#C0392B" },
  ],
  attendance_trend: [
    { day: "Mon", present: 228, absent: 8, leave: 12 }, { day: "Tue", present: 232, absent: 6, leave: 10 },
    { day: "Wed", present: 230, absent: 7, leave: 11 }, { day: "Thu", present: 226, absent: 10, leave: 12 },
    { day: "Fri", present: 229, absent: 8, leave: 11 }, { day: "Sat", present: 60, absent: 2, leave: 4 },
    { day: "Sun", present: 0, absent: 0, leave: 0 },
  ],
  upcoming_events: [
    { label: "Ananya Iyer — Birthday", date: "2024-07-18", type: "birthday" },
    { label: "Rohan — 3 yr anniversary", date: "2024-07-20", type: "anniversary" },
    { label: "Independence Day", date: "2024-08-15", type: "holiday" },
    { label: "Dev Choudhary — probation ends", date: "2024-08-22", type: "probation" },
  ],
  recent_activity: [
    { actor: "Rahul Gupta", action: "updated Rohan Iyer's designation", time: "2 hours ago" },
    { actor: "Priya Verma", action: "approved a leave request", time: "4 hours ago" },
    { actor: "Payroll Admin", action: "calculated the July payroll run", time: "Yesterday" },
    { actor: "Neha Nair", action: "verified an ID document", time: "Yesterday" },
  ],
};

/* ----- Global search ----- */

export function buildSearchResults(q: string): SearchResult[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const results: SearchResult[] = [];

  for (const e of employees) {
    if (
      e.full_name.toLowerCase().includes(query) ||
      e.employee_code.toLowerCase().includes(query) ||
      e.work_email.toLowerCase().includes(query)
    ) {
      results.push({ type: "Employee", id: String(e.id), title: e.full_name, subtitle: `${e.employee_code} · ${e._summary.designation}`, href: `/employees/${e.id}` });
    }
    if (results.filter((r) => r.type === "Employee").length >= 5) break;
  }
  for (const d of departments) {
    if (d.name.toLowerCase().includes(query)) {
      results.push({ type: "Department", id: String(d.id), title: d.name, subtitle: `${d.employee_count} employees`, href: "/organization/departments" });
    }
  }
  for (const c of companies) {
    if (c.display_name.toLowerCase().includes(query)) {
      results.push({ type: "Company", id: String(c.id), title: c.display_name, subtitle: c.short_code, href: "/organization/companies" });
    }
  }
  const quickNav: SearchResult[] = [
    { type: "Navigate", id: "nav-dash", title: "Dashboard", subtitle: "Go to dashboard", href: "/dashboard" },
    { type: "Navigate", id: "nav-emp", title: "Employees", subtitle: "Go to employees", href: "/employees" },
    { type: "Navigate", id: "nav-leave", title: "Leave", subtitle: "Go to leave", href: "/leave" },
    { type: "Navigate", id: "nav-pay", title: "Payroll", subtitle: "Go to payroll", href: "/payroll" },
  ].filter((n) => n.title.toLowerCase().includes(query));

  return [...results, ...quickNav];
}
