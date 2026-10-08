/**
 * Centralized PLATFORM-level demo data (SaaS operator / Super Admin console).
 *
 * Kept separate from the tenant demo seed (`seed.ts`) to mirror the platform ↔
 * tenant boundary. All of this corresponds to documented platform API gaps
 * (docs/ui/API_GAPS.md § Platform console) — nothing is a real endpoint.
 */

import type {
  PlatformAuditEntry,
  PlatformPlan,
  PlatformSecurityAlert,
  PlatformSummary,
  PlatformTenant,
  PlatformTenantOnboarding,
  PlatformUser,
  TenantStatus,
  PlanTier,
} from "@/types/platform";

const TENANT_NAMES: { name: string; sub: string; contact: string; admin: string }[] = [
  { name: "Acme Technologies", sub: "acme", contact: "Priya Verma", admin: "Rahul Gupta" },
  { name: "Globex Industries", sub: "globex", contact: "Anil Kapoor", admin: "Sunita Rao" },
  { name: "Initech Software", sub: "initech", contact: "Meena Iyer", admin: "Vikas Nair" },
  { name: "Umbrella Retail", sub: "umbrella", contact: "Rohit Sharma", admin: "Kavita Desai" },
  { name: "Stark Manufacturing", sub: "stark", contact: "Deepak Menon", admin: "Asha Pillai" },
  { name: "Wayne Logistics", sub: "wayne", contact: "Sanjay Bose", admin: "Nikhil Reddy" },
  { name: "Hooli Media", sub: "hooli", contact: "Farah Khan", admin: "Imran Sheikh" },
  { name: "Soylent Foods", sub: "soylent", contact: "Geeta Rao", admin: "Manoj Patel" },
  { name: "Vehement Capital", sub: "vehement", contact: "Arjun Mehta", admin: "Ritu Agarwal" },
  { name: "Pied Piper Labs", sub: "piedpiper", contact: "Shalini Gupta", admin: "Varun Joshi" },
  { name: "Massive Dynamic", sub: "massive", contact: "Harish Kumar", admin: "Pooja Chatterjee" },
  { name: "Nakatomi Realty", sub: "nakatomi", contact: "Lakshmi Nair", admin: "Gaurav Singh" },
  { name: "Cyberdyne Systems", sub: "cyberdyne", contact: "Mohan Das", admin: "Sneha Kulkarni" },
  { name: "Oscorp Pharma", sub: "oscorp", contact: "Ananya Bose", admin: "Rajeev Menon" },
];

const PLANS: PlanTier[] = ["enterprise", "growth", "growth", "starter", "enterprise", "growth", "starter", "growth", "starter", "growth", "enterprise", "starter", "growth", "starter"];
const STATUSES: TenantStatus[] = ["active", "active", "active", "trial", "active", "active", "trial", "active", "suspended", "active", "active", "trial", "active", "provisioning"];
const REGIONS = ["ap-south-1 (Mumbai)", "ap-south-1 (Mumbai)", "ap-south-2 (Hyderabad)"];

function price(plan: PlanTier): number {
  return plan === "enterprise" ? 180 : plan === "growth" ? 120 : 60;
}

export const platformTenants: PlatformTenant[] = TENANT_NAMES.map((t, i) => {
  const plan = PLANS[i]!;
  const status = STATUSES[i]!;
  const employees = status === "provisioning" ? 0 : 40 + ((i * 137) % 1800);
  const mrr = status === "active" ? employees * price(plan) : 0;
  return {
    id: i + 1,
    name: t.name,
    subdomain: `${t.sub}.app.example.com`,
    status,
    plan,
    employees,
    companies: 1 + (i % 3),
    primary_contact: t.contact,
    contact_email: `${t.contact.split(" ")[0]!.toLowerCase()}@${t.sub}.com`,
    admin_name: t.admin,
    admin_email: `${t.admin.split(" ")[0]!.toLowerCase()}.admin@${t.sub}.com`,
    region: REGIONS[i % REGIONS.length]!,
    created_at: `20${22 + (i % 3)}-${String(1 + (i % 12)).padStart(2, "0")}-${String(1 + (i % 27)).padStart(2, "0")}`,
    trial_ends_at: status === "trial" ? `2024-08-${String(5 + (i % 20)).padStart(2, "0")}` : null,
    mrr,
    storage_gb: Math.round((employees / 50) * 1.4 * 10) / 10,
    api_calls_30d: employees * 1200 + ((i * 9973) % 50000),
    health: status === "suspended" ? "down" : i % 7 === 0 ? "degraded" : "healthy",
  };
});

export function getPlatformTenant(id: number): PlatformTenant | undefined {
  return platformTenants.find((t) => t.id === id);
}

export const platformOnboarding: PlatformTenantOnboarding[] = [
  { id: 1, name: "Zenith Analytics", subdomain: "zenith", primary_contact: "Neha Shah", plan: "growth", stage: "admin_invite", progress: 60, started_at: "2024-07-12" },
  { id: 2, name: "Lumen Energy", subdomain: "lumen", primary_contact: "Karan Malhotra", plan: "enterprise", stage: "provisioning", progress: 80, started_at: "2024-07-14" },
  { id: 3, name: "Brightside Edu", subdomain: "brightside", primary_contact: "Divya Pillai", plan: "starter", stage: "customer_info", progress: 20, started_at: "2024-07-15" },
];

export const platformUsers: PlatformUser[] = [
  { id: 1, name: "Platform Super Admin", email: "superadmin@platform.example.com", platform_role: "Super Admin", status: "active", mfa: true, last_login: "2024-07-15T09:10:00+05:30" },
  { id: 2, name: "Ops — Deepa R", email: "deepa@platform.example.com", platform_role: "Platform Operator", status: "active", mfa: true, last_login: "2024-07-15T08:40:00+05:30" },
  { id: 3, name: "Support — Vivek N", email: "vivek@platform.example.com", platform_role: "Support Engineer", status: "active", mfa: true, last_login: "2024-07-14T18:20:00+05:30" },
  { id: 4, name: "Billing — Anita K", email: "anita@platform.example.com", platform_role: "Billing Admin", status: "active", mfa: false, last_login: "2024-07-13T11:00:00+05:30" },
  { id: 5, name: "Ops — Rohan M", email: "rohan@platform.example.com", platform_role: "Platform Operator", status: "invited", mfa: false, last_login: null },
];

export const platformAudit: PlatformAuditEntry[] = [
  { id: 1, timestamp: "2024-07-15T09:12:00+05:30", actor: "Platform Super Admin", action: "tenant.suspended", target: "Vehement Capital", category: "tenant_lifecycle", ip: "203.0.113.9", device: "Chrome · macOS" },
  { id: 2, timestamp: "2024-07-14T16:05:00+05:30", actor: "Ops — Deepa R", action: "tenant.created", target: "Lumen Energy", category: "tenant_lifecycle", ip: "203.0.113.4", device: "Firefox · Windows" },
  { id: 3, timestamp: "2024-07-14T11:30:00+05:30", actor: "Platform Super Admin", action: "plan.updated", target: "Growth plan — price change", category: "billing", ip: "203.0.113.9", device: "Chrome · macOS" },
  { id: 4, timestamp: "2024-07-13T19:45:00+05:30", actor: "Support — Vivek N", action: "tenant.impersonated", target: "Umbrella Retail (support session)", category: "access", ip: "203.0.113.21", device: "Chrome · Windows" },
  { id: 5, timestamp: "2024-07-13T10:15:00+05:30", actor: "Ops — Deepa R", action: "tenant.activated", target: "Massive Dynamic", category: "tenant_lifecycle", ip: "203.0.113.4", device: "Firefox · Windows" },
  { id: 6, timestamp: "2024-07-12T14:00:00+05:30", actor: "Platform Super Admin", action: "platform_setting.updated", target: "Default session timeout → 30m", category: "platform_config", ip: "203.0.113.9", device: "Chrome · macOS" },
  { id: 7, timestamp: "2024-07-12T08:50:00+05:30", actor: "Platform Super Admin", action: "platform_user.invited", target: "rohan@platform.example.com", category: "access", ip: "203.0.113.9", device: "Chrome · macOS" },
  { id: 8, timestamp: "2024-07-11T22:30:00+05:30", actor: "System", action: "security.failed_login_spike", target: "Oscorp Pharma", category: "security", ip: "—", device: "—" },
];

export const platformPlans: PlatformPlan[] = [
  { tier: "starter", name: "Starter", price_per_employee: 60, min_commit: 50, max_employees: 200, features: ["Core HR", "Leave", "Attendance", "Email support"], tenants: platformTenants.filter((t) => t.plan === "starter").length },
  { tier: "growth", name: "Growth", price_per_employee: 120, min_commit: 200, max_employees: 2000, features: ["Everything in Starter", "Payroll", "Compliance", "Workflows", "Priority support"], tenants: platformTenants.filter((t) => t.plan === "growth").length },
  { tier: "enterprise", name: "Enterprise", price_per_employee: 180, min_commit: 1000, max_employees: null, features: ["Everything in Growth", "SSO/SAML", "Custom reports", "Dedicated CSM", "99.9% SLA"], tenants: platformTenants.filter((t) => t.plan === "enterprise").length },
];

export const platformSecurityAlerts: PlatformSecurityAlert[] = [
  { id: 1, severity: "danger", message: "Repeated failed logins detected for Oscorp Pharma admin", tenant: "Oscorp Pharma", at: "2024-07-15T07:30:00+05:30" },
  { id: 2, severity: "warning", message: "Vehement Capital suspended for non-payment", tenant: "Vehement Capital", at: "2024-07-15T09:12:00+05:30" },
  { id: 3, severity: "warning", message: "2 platform operators without MFA enabled", tenant: null, at: "2024-07-14T10:00:00+05:30" },
  { id: 4, severity: "info", message: "Scheduled DR drill (ap-south-2) completed successfully", tenant: null, at: "2024-07-13T02:00:00+05:30" },
];

const active = platformTenants.filter((t) => t.status === "active");

export const platformSummary: PlatformSummary = {
  total_tenants: platformTenants.length,
  active_tenants: active.length,
  trial_tenants: platformTenants.filter((t) => t.status === "trial").length,
  suspended_tenants: platformTenants.filter((t) => t.status === "suspended").length,
  total_employees: platformTenants.reduce((s, t) => s + t.employees, 0),
  mrr: platformTenants.reduce((s, t) => s + t.mrr, 0),
  tenant_growth: [
    { month: "Feb", value: 8 }, { month: "Mar", value: 9 }, { month: "Apr", value: 11 },
    { month: "May", value: 12 }, { month: "Jun", value: 13 }, { month: "Jul", value: 14 },
  ],
  usage_by_plan: [
    { label: "Starter", value: platformTenants.filter((t) => t.plan === "starter").length, color: "#5B636C" },
    { label: "Growth", value: platformTenants.filter((t) => t.plan === "growth").length, color: "#1C4E80" },
    { label: "Enterprise", value: platformTenants.filter((t) => t.plan === "enterprise").length, color: "#1E7D44" },
  ],
  tenant_status_split: [
    { label: "Active", value: active.length, color: "#1E7D44" },
    { label: "Trial", value: platformTenants.filter((t) => t.status === "trial").length, color: "#B7791F" },
    { label: "Suspended", value: platformTenants.filter((t) => t.status === "suspended").length, color: "#C0392B" },
    { label: "Provisioning", value: platformTenants.filter((t) => t.status === "provisioning").length, color: "#1C6E8C" },
  ],
  system_health: [
    { service: "API (ap-south-1)", status: "operational", uptime: "99.98%" },
    { service: "Web app", status: "operational", uptime: "99.99%" },
    { service: "Payroll engine", status: "operational", uptime: "99.95%" },
    { service: "Attendance ingestion (SQS)", status: "degraded", uptime: "99.70%" },
    { service: "Document storage (S3)", status: "operational", uptime: "100%" },
  ],
  recent_activity: [
    { actor: "Platform Super Admin", action: "suspended Vehement Capital", time: "2 hours ago" },
    { actor: "Ops — Deepa R", action: "created tenant Lumen Energy", time: "Yesterday" },
    { actor: "Support — Vivek N", action: "started a support session on Umbrella Retail", time: "2 days ago" },
    { actor: "Ops — Deepa R", action: "activated Massive Dynamic", time: "2 days ago" },
  ],
};
