/**
 * Navigation tree (NAVIGATION.md / INFORMATION_ARCHITECTURE.md).
 *
 * Each item carries the permission set that makes it visible. The sidebar
 * filters by GET /auth/me permissions; empty groups collapse entirely
 * (NAVIGATION.md "Permission-aware behavior"). `anyOf: []` means always visible.
 */

import type { IconName } from "@/components/ui/Icon";

export interface NavItem {
  label: string;
  href: string;
  anyOf?: string[];
  badge?: "approvals";
}

export interface NavGroup {
  label: string;
  icon: IconName;
  anyOf?: string[];
  items: NavItem[];
}

export const adminNav: NavGroup[] = [
  {
    label: "Dashboard",
    icon: "dashboard",
    items: [{ label: "Overview", href: "/dashboard", anyOf: ["dashboard.view"] }],
  },
  {
    label: "Organization",
    icon: "organization",
    anyOf: ["organization.view"],
    items: [
      { label: "Companies", href: "/organization/companies", anyOf: ["organization.view"] },
      { label: "Locations", href: "/organization/locations", anyOf: ["organization.view"] },
      { label: "Departments", href: "/organization/departments", anyOf: ["organization.view"] },
      { label: "Designations", href: "/organization/designations", anyOf: ["organization.view"] },
      { label: "Grades", href: "/organization/grades", anyOf: ["organization.view"] },
      { label: "Org hierarchy", href: "/organization/hierarchy", anyOf: ["organization.view"] },
      { label: "Reporting tree", href: "/organization/reporting", anyOf: ["organization.view"] },
      { label: "Holidays", href: "/organization/holidays", anyOf: ["organization.view"] },
      { label: "Work calendars", href: "/organization/calendars", anyOf: ["organization.view"] },
    ],
  },
  {
    label: "Employees",
    icon: "employees",
    anyOf: ["employees.view"],
    items: [
      { label: "All employees", href: "/employees", anyOf: ["employees.view"] },
      { label: "Add employee", href: "/employees/new", anyOf: ["employees.create"] },
      { label: "Onboarding", href: "/employees/onboarding", anyOf: ["employees.onboard", "employees.create"] },
      { label: "Transfers & changes", href: "/employees/transfers", anyOf: ["employees.edit"] },
      { label: "Exits", href: "/employees/exits", anyOf: ["employees.edit"] },
    ],
  },
  {
    label: "Attendance",
    icon: "attendance",
    anyOf: ["attendance.view", "attendance.approve"],
    items: [
      { label: "Overview", href: "/attendance", anyOf: ["attendance.view"] },
      { label: "Daily", href: "/attendance/daily", anyOf: ["attendance.view"] },
      { label: "Monthly", href: "/attendance/monthly", anyOf: ["attendance.view"] },
      { label: "Regularizations", href: "/attendance/regularizations", anyOf: ["attendance.approve", "attendance.view"] },
      { label: "Shifts", href: "/attendance/shifts", anyOf: ["attendance.policy.manage", "attendance.view"] },
      { label: "Reports", href: "/attendance/reports", anyOf: ["attendance.view"] },
    ],
  },
  {
    label: "Leave",
    icon: "leave",
    anyOf: ["leave.view", "leave.approve"],
    items: [
      { label: "Overview", href: "/leave", anyOf: ["leave.view"] },
      { label: "Approvals", href: "/leave/approvals", anyOf: ["leave.approve"] },
      { label: "Balances", href: "/leave/balances", anyOf: ["leave.view"] },
      { label: "Team calendar", href: "/leave/team-calendar", anyOf: ["leave.view", "leave.approve"] },
      { label: "Leave types", href: "/leave/types", anyOf: ["leave.type.manage"] },
      { label: "Leave policies", href: "/leave/policies", anyOf: ["leave.policy.manage"] },
    ],
  },
  {
    label: "Payroll",
    icon: "payroll",
    anyOf: ["payroll.view"],
    items: [
      { label: "Dashboard", href: "/payroll", anyOf: ["payroll.view"] },
      { label: "Salary components", href: "/payroll/components", anyOf: ["payroll.component.manage"] },
      { label: "Salary structures", href: "/payroll/structures", anyOf: ["payroll.structure.manage"] },
      { label: "Compensation", href: "/payroll/compensation", anyOf: ["payroll.compensation.view"] },
      { label: "Payroll runs", href: "/payroll/runs", anyOf: ["payroll.view"] },
      { label: "Payslips", href: "/payroll/payslips", anyOf: ["payroll.view"] },
      { label: "Exceptions", href: "/payroll/exceptions", anyOf: ["payroll.view"] },
      { label: "Reports", href: "/payroll/reports", anyOf: ["payroll.view"] },
    ],
  },
  {
    label: "Compliance",
    icon: "compliance",
    anyOf: ["compliance.view"],
    items: [
      { label: "Dashboard", href: "/compliance", anyOf: ["compliance.view"] },
      { label: "Provident Fund", href: "/compliance/pf", anyOf: ["compliance.view"] },
      { label: "ESI", href: "/compliance/esi", anyOf: ["compliance.view"] },
      { label: "Professional Tax", href: "/compliance/pt", anyOf: ["compliance.view"] },
      { label: "TDS", href: "/compliance/tds", anyOf: ["compliance.view"] },
      { label: "Gratuity", href: "/compliance/gratuity", anyOf: ["compliance.view"] },
      { label: "Bonus", href: "/compliance/bonus", anyOf: ["compliance.view"] },
      { label: "Statutory reports", href: "/compliance/reports", anyOf: ["compliance.export", "compliance.view"] },
    ],
  },
  {
    label: "Documents",
    icon: "documents",
    anyOf: ["documents.view"],
    items: [
      { label: "All documents", href: "/documents", anyOf: ["documents.view"] },
      { label: "Categories", href: "/documents/categories", anyOf: ["documents.view"] },
      { label: "Bulk upload", href: "/documents/bulk", anyOf: ["documents.upload"] },
    ],
  },
  {
    label: "Workflows",
    icon: "workflow",
    anyOf: ["workflows.instance.view", "workflows.definition.manage", "workflows.approve"],
    items: [
      { label: "Pending approvals", href: "/approvals", anyOf: ["workflows.approve"], badge: "approvals" },
      { label: "Definitions", href: "/workflows/definitions", anyOf: ["workflows.definition.manage"] },
      { label: "Instances", href: "/workflows/instances", anyOf: ["workflows.instance.view", "workflows.definition.manage"] },
      { label: "Delegation", href: "/workflows/delegation", anyOf: ["workflows.approve"] },
    ],
  },
  {
    label: "Reports",
    icon: "reports",
    anyOf: ["reports.view"],
    items: [
      { label: "Standard reports", href: "/reports", anyOf: ["reports.view"] },
      { label: "Saved reports", href: "/reports/saved", anyOf: ["reports.view"] },
      { label: "Scheduled reports", href: "/reports/scheduled", anyOf: ["reports.view"] },
    ],
  },
  {
    label: "Administration",
    icon: "admin",
    anyOf: ["admin.user.view", "admin.role.view"],
    items: [
      { label: "Users", href: "/admin/users", anyOf: ["admin.user.view"] },
      { label: "Roles & permissions", href: "/admin/roles", anyOf: ["admin.role.view"] },
      { label: "Invitations", href: "/admin/invitations", anyOf: ["admin.user.invite"] },
      { label: "Sessions & security", href: "/admin/sessions", anyOf: ["admin.user.view"] },
    ],
  },
  {
    label: "Settings",
    icon: "settings",
    anyOf: ["settings.view"],
    items: [
      { label: "Tenant & company", href: "/settings", anyOf: ["settings.view"] },
      { label: "Localization", href: "/settings/localization", anyOf: ["settings.view"] },
      { label: "Notifications", href: "/settings/notifications", anyOf: ["settings.view"] },
      { label: "Security & MFA", href: "/settings/security", anyOf: ["settings.security.manage", "settings.view"] },
      { label: "Data retention", href: "/settings/retention", anyOf: ["settings.view"] },
      { label: "Custom fields", href: "/settings/custom-fields", anyOf: ["settings.view"] },
    ],
  },
  {
    label: "Audit",
    icon: "audit",
    anyOf: ["audit.view"],
    items: [{ label: "Audit log", href: "/audit", anyOf: ["audit.view"] }],
  },
];

export const selfNav: NavGroup[] = [
  {
    label: "Self-service",
    icon: "self",
    items: [
      { label: "My dashboard", href: "/me" },
      { label: "My profile", href: "/me/profile" },
      { label: "My attendance", href: "/me/attendance" },
      { label: "My leave", href: "/me/leave" },
      { label: "My payslips", href: "/me/payslips" },
      { label: "My documents", href: "/me/documents" },
      { label: "My requests", href: "/me/requests" },
      { label: "My tax declaration", href: "/me/tax" },
      { label: "Announcements", href: "/me/announcements" },
      { label: "Personal settings", href: "/me/settings" },
    ],
  },
  {
    label: "Team",
    icon: "team",
    anyOf: ["leave.approve", "attendance.approve", "workflows.approve"],
    items: [
      { label: "Team dashboard", href: "/team", anyOf: ["employees.view", "leave.approve"] },
      { label: "Team members", href: "/team/members", anyOf: ["employees.view"] },
      { label: "Team attendance", href: "/team/attendance", anyOf: ["attendance.view", "attendance.approve"] },
      { label: "Approvals", href: "/team/approvals", anyOf: ["leave.approve", "workflows.approve"] },
      { label: "Team requests", href: "/team/requests", anyOf: ["workflows.approve"] },
      { label: "Team reports", href: "/team/reports", anyOf: ["reports.view"] },
    ],
  },
];
