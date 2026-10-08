/**
 * PLATFORM-LEVEL models — the SaaS operator console (Super Admin).
 *
 * These are deliberately kept in their own file, separate from the tenant-level
 * domain models in `domain.ts`, to reinforce the security boundary:
 *
 *   SUPER ADMIN  = platform-level SaaS operator (cross-tenant, outside a tenant
 *                  subdomain) — modelled here.
 *   TENANT ADMIN / HR ADMIN / MANAGER / EMPLOYEE = tenant-level roles — modelled
 *                  in `domain.ts` and `services/auth.ts`.
 *
 * Super Admin is NOT a tenant role. Every shape here corresponds to a
 * documented platform API gap (docs/ui/API_GAPS.md § Platform console). No
 * production endpoint is invented — these are served by the demo layer.
 */

/**
 * Tenant lifecycle status (ADR-008). Authoritative set:
 *   provisioning → trial → active → suspended → inactive
 * `inactive` is the terminal churned/offboarded state (drives DPDP retention),
 * distinct from the reversible `suspended`. Mirrors openapi.yaml `TenantStatus`.
 */
export type TenantStatus = "provisioning" | "trial" | "active" | "suspended" | "inactive";
export type PlanTier = "starter" | "growth" | "enterprise";

/**
 * Fixed platform role enum (ADR-007 §4 / backend B1-03). These are the ONLY
 * platform roles; configurable platform RBAC is a documented future extension.
 * Mirrors openapi.yaml `PlatformRole`. NOT tenant roles.
 */
export type PlatformRole =
  | "PLATFORM_SUPER_ADMIN"
  | "PLATFORM_SUPPORT"
  | "PLATFORM_OPERATIONS"
  | "PLATFORM_AUDITOR";

export interface PlatformTenant {
  id: number;
  name: string;
  subdomain: string;
  status: TenantStatus;
  plan: PlanTier;
  employees: number;
  companies: number;
  primary_contact: string;
  contact_email: string;
  admin_name: string;
  admin_email: string;
  region: string;
  created_at: string;
  trial_ends_at: string | null;
  mrr: number;
  storage_gb: number;
  api_calls_30d: number;
  health: "healthy" | "degraded" | "down";
}

export interface PlatformTenantOnboarding {
  id: number;
  name: string;
  subdomain: string;
  primary_contact: string;
  plan: PlanTier;
  stage: "customer_info" | "subdomain" | "admin_invite" | "provisioning" | "activated";
  progress: number;
  started_at: string;
}

export interface PlatformUser {
  id: number;
  name: string;
  email: string;
  platform_role: PlatformRole;
  status: "active" | "invited" | "disabled";
  mfa: boolean;
  last_login: string | null;
}

export interface PlatformAuditEntry {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  category: "tenant_lifecycle" | "platform_config" | "security" | "billing" | "access";
  ip: string;
  device: string;
}

export interface PlatformPlan {
  tier: PlanTier;
  name: string;
  price_per_employee: number;
  min_commit: number;
  max_employees: number | null;
  features: string[];
  tenants: number;
}

export interface PlatformSecurityAlert {
  id: number;
  severity: "info" | "warning" | "danger";
  message: string;
  tenant: string | null;
  at: string;
}

export interface PlatformSummary {
  total_tenants: number;
  active_tenants: number;
  trial_tenants: number;
  suspended_tenants: number;
  total_employees: number;
  mrr: number;
  tenant_growth: { month: string; value: number }[];
  usage_by_plan: { label: string; value: number; color: string }[];
  tenant_status_split: { label: string; value: number; color: string }[];
  system_health: { service: string; status: "operational" | "degraded" | "down"; uptime: string }[];
  recent_activity: { actor: string; action: string; time: string }[];
}
