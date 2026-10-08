/**
 * Consolidated feature services for modules whose APIs are documented gaps
 * (docs/ui/API_GAPS.md). All demo-backed. Each function is the single entry
 * point the UI uses; when the planner adds the real endpoint, only the body of
 * the function changes (route to apiFetch) — no UI change.
 */

import { delay, paginate } from "@/lib/demo/paginate";
import * as seed from "@/lib/demo/seed";
import type { Paginated, Role } from "@/types/api";
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
  Grade,
  Holiday,
  Invitation,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  Location,
  NotificationItem,
  OrgNode,
  PayrollRegisterRow,
  PayrollRun,
  Payslip,
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

function page<T>(items: T[], p?: number, pp?: number): Promise<Paginated<T>> {
  return delay(paginate(items, p, pp));
}

/* Dashboard */
export const getDashboard = (): Promise<DashboardSummary> => delay(seed.dashboardSummary);

/* Organization */
export const listCompanies = (p?: number, pp?: number): Promise<Paginated<Company>> => page(seed.companies, p, pp);
export const listLocations = (p?: number, pp?: number): Promise<Paginated<Location>> => page(seed.locations, p, pp);
export const listDepartments = (p?: number, pp?: number): Promise<Paginated<Department>> => page(seed.departments, p, pp);
export const listDesignations = (p?: number, pp?: number): Promise<Paginated<Designation>> => page(seed.designations, p, pp);
export const listGrades = (p?: number, pp?: number): Promise<Paginated<Grade>> => page(seed.grades, p, pp);
export const listHolidays = (p?: number, pp?: number): Promise<Paginated<Holiday>> => page(seed.holidays, p, pp);
export const listCalendars = (): Promise<WorkCalendar[]> => delay(seed.workCalendars);
export const getOrgHierarchy = (): Promise<OrgNode> => delay(seed.orgHierarchy);
export const getReportingTree = (): Promise<OrgNode> => delay(seed.reportingTree);

/* RBAC / Users */
export const listRoles = (p?: number, pp?: number): Promise<Paginated<Role>> => page(seed.roles, p, pp);
export const getRole = (id: number): Promise<Role | undefined> => delay(seed.roles.find((r) => r.id === id));
export const getPermissionCatalog = (): Promise<PermissionDef[]> => delay(seed.permissionCatalog);
export const listUsers = (p?: number, pp?: number): Promise<Paginated<UserRecord>> => page(seed.users, p, pp);
export const listInvitations = (): Promise<Invitation[]> => delay(seed.invitations);
export const listSessions = (): Promise<SessionRecord[]> => delay(seed.sessions);

/* Attendance */
export const listAttendance = (p?: number, pp?: number): Promise<Paginated<AttendanceDay>> => page(seed.attendanceDays, p, pp);
export const listShifts = (): Promise<Shift[]> => delay(seed.shifts);
export const listRegularizations = (): Promise<Regularization[]> => delay(seed.regularizations);

/* Leave */
export const getLeaveBalances = (): Promise<LeaveBalance[]> => delay(seed.leaveBalances);
export const listLeaveTypes = (): Promise<LeaveType[]> => delay(seed.leaveTypes);
export const listLeaveRequests = (): Promise<LeaveRequest[]> => delay(seed.leaveRequests);

/* Payroll */
export const listSalaryComponents = (): Promise<SalaryComponent[]> => delay(seed.salaryComponents);
export const listSalaryStructures = (): Promise<SalaryStructure[]> => delay(seed.salaryStructures);
export const listPayrollRuns = (): Promise<PayrollRun[]> => delay(seed.payrollRuns);
export const getPayrollRun = (id: number): Promise<PayrollRun | undefined> => delay(seed.payrollRuns.find((r) => r.id === id));
export const getPayrollRegister = (p?: number, pp?: number): Promise<Paginated<PayrollRegisterRow>> => page(seed.payrollRegister, p, pp);
export const listPayslips = (p?: number, pp?: number): Promise<Paginated<Payslip>> => page(seed.payslips, p, pp);
export const listMyPayslips = (): Promise<Payslip[]> => delay(seed.myPayslips);
export const getPayrollExceptions = (): Promise<PayrollRegisterRow[]> => delay(seed.payrollRegister.filter((r) => r.exception));

/* Compliance */
export const listComplianceStatutes = (): Promise<ComplianceStatute[]> => delay(seed.complianceStatutes);
export const listComplianceAlerts = (): Promise<ComplianceAlert[]> => delay(seed.complianceAlerts);

/* Documents */
export const listDocuments = (p?: number, pp?: number): Promise<Paginated<DocumentRecord>> => page(seed.documents, p, pp);
export const listDocumentCategories = (): Promise<DocumentCategory[]> => delay(seed.documentCategories);

/* Workflows / Approvals */
export const listApprovals = (): Promise<ApprovalItem[]> => delay(seed.approvals);
export const listWorkflowDefinitions = (): Promise<WorkflowDefinition[]> => delay(seed.workflowDefinitions);
export const listWorkflowInstances = (): Promise<WorkflowInstance[]> => delay(seed.workflowInstances);
export const getWorkflowInstance = (id: number): Promise<WorkflowInstance | undefined> => delay(seed.workflowInstances.find((w) => w.id === id));
export const listDelegations = (): Promise<Delegation[]> => delay(seed.delegations);

/* Notifications */
export const listNotifications = (): Promise<NotificationItem[]> => delay(seed.notifications);
export const listAnnouncements = (): Promise<Announcement[]> => delay(seed.announcements);

/* Audit */
export const listAudit = (p?: number, pp?: number): Promise<Paginated<AuditEntry>> => page(seed.auditEntries, p, pp);

/* Reports */
export const listReports = (): Promise<ReportDef[]> => delay(seed.reportCatalog);

/* Global search */
export const search = (q: string): Promise<SearchResult[]> => delay(seed.buildSearchResults(q), 150);
