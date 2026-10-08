/**
 * Platform role + permission reconciliation (ADR-007 §4/§6, B1-03, PLATFORM_API_SPEC).
 *
 * This module is the single source of truth on the frontend for:
 *  1. the FIXED platform role enum (Phase 1) — identical to openapi.yaml
 *     `PlatformRole` and the backend B1-03 enum. These are the ONLY platform
 *     roles; configurable platform RBAC is a documented future extension.
 *  2. the fixed `platform.*` permission catalog, aligned to PLATFORM_API_SPEC
 *     (note: `platform.tenant.access` — the read-only support access-session —
 *     REPLACES the old demo label `platform.tenant.impersonate`; ADR-007 §6
 *     names it an "access-session", read-only, NOT impersonate).
 *  3. the role → permission map (PLATFORM_API_SPEC "Fixed role enum → permissions").
 *  4. the reconciliation from the FE DEMO slugs to the fixed enum, incl. the two
 *     documented mismatches:
 *       - demo "billing-admin" has NO fixed enum value → reconciled to
 *         PLATFORM_OPERATIONS (which carries settings view) and still granted
 *         platform.billing.manage, per PLATFORM_API_SPEC "Frontend reconciliation".
 *       - PLATFORM_AUDITOR has NO demo slug → added here as a first-class role.
 *
 * This is a FRONTEND label-mapping reconciliation only. It changes NO contract
 * and invents NO backend role. The server remains the authority on permissions.
 */

export type PlatformRole =
  | "PLATFORM_SUPER_ADMIN"
  | "PLATFORM_SUPPORT"
  | "PLATFORM_OPERATIONS"
  | "PLATFORM_AUDITOR";

export const PLATFORM_ROLES: readonly PlatformRole[] = [
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
  "PLATFORM_OPERATIONS",
  "PLATFORM_AUDITOR",
] as const;

/**
 * Fixed `platform.*` permission catalog (PLATFORM_API_SPEC "Platform permission
 * catalog"). `platform.tenant.access` is the read-only support access-session
 * permission that REPLACES the demo's `platform.tenant.impersonate`.
 */
export const platformPermissionCatalog = [
  "platform.dashboard.view",
  "platform.tenant.view",
  "platform.tenant.create",
  "platform.tenant.edit",
  "platform.tenant.activate",
  "platform.tenant.suspend",
  "platform.tenant.access", // read-only support session (was: platform.tenant.impersonate)
  "platform.user.view",
  "platform.user.manage",
  "platform.audit.view",
  "platform.settings.view",
  "platform.settings.manage",
  "platform.billing.manage",
] as const;

export type PlatformPermission = (typeof platformPermissionCatalog)[number];

const ALL: PlatformPermission[] = [...platformPermissionCatalog];

/**
 * Human-readable display label for each fixed role (used in the UI chrome and
 * the role-preview switcher). Distinct from the enum value sent/received over
 * the contract.
 */
export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  PLATFORM_SUPER_ADMIN: "Super Admin",
  PLATFORM_SUPPORT: "Support",
  PLATFORM_OPERATIONS: "Operations",
  PLATFORM_AUDITOR: "Auditor",
};

/**
 * Role → permissions (PLATFORM_API_SPEC "Fixed role enum → permissions").
 *   SUPER_ADMIN  — all platform.*
 *   OPERATIONS   — dashboard, tenant view/create/edit/activate/suspend/access,
 *                  audit, settings view (+ billing.manage via the billing-admin
 *                  reconciliation; see note above)
 *   SUPPORT      — dashboard, tenant view, tenant access (read-only), audit view
 *   AUDITOR      — read-only everywhere: dashboard, tenant view, audit view,
 *                  settings view
 */
export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, PlatformPermission[]> = {
  PLATFORM_SUPER_ADMIN: ALL,
  PLATFORM_OPERATIONS: [
    "platform.dashboard.view",
    "platform.tenant.view",
    "platform.tenant.create",
    "platform.tenant.edit",
    "platform.tenant.activate",
    "platform.tenant.suspend",
    "platform.tenant.access",
    "platform.audit.view",
    "platform.settings.view",
    "platform.billing.manage",
  ],
  PLATFORM_SUPPORT: [
    "platform.dashboard.view",
    "platform.tenant.view",
    "platform.tenant.access",
    "platform.audit.view",
  ],
  PLATFORM_AUDITOR: [
    "platform.dashboard.view",
    "platform.tenant.view",
    "platform.audit.view",
    "platform.settings.view",
  ],
};

/**
 * Legacy FE DEMO role slugs (FE-DEMO-02). Preserved only so the demo preview
 * switcher and any persisted demo state keep working; each slug reconciles to
 * exactly one fixed enum role below.
 */
export type PlatformRoleSlug =
  | "super-admin"
  | "platform-operator"
  | "support-engineer"
  | "billing-admin";

/**
 * Reconciliation: demo slug → fixed enum role (ADR-007 §4; two documented
 * mismatches resolved):
 *   super-admin       → PLATFORM_SUPER_ADMIN
 *   platform-operator → PLATFORM_OPERATIONS
 *   support-engineer  → PLATFORM_SUPPORT
 *   billing-admin     → PLATFORM_OPERATIONS  (no fixed "billing" role exists;
 *                       OPERATIONS carries platform.billing.manage per spec)
 * (PLATFORM_AUDITOR has no demo slug — it is reachable only via the fixed enum.)
 */
export const DEMO_SLUG_TO_ROLE: Record<PlatformRoleSlug, PlatformRole> = {
  "super-admin": "PLATFORM_SUPER_ADMIN",
  "platform-operator": "PLATFORM_OPERATIONS",
  "support-engineer": "PLATFORM_SUPPORT",
  "billing-admin": "PLATFORM_OPERATIONS",
};

/** Resolve a demo slug to the fixed enum role (defaults to SUPER_ADMIN). */
export function roleFromDemoSlug(slug: string): PlatformRole {
  return DEMO_SLUG_TO_ROLE[slug as PlatformRoleSlug] ?? "PLATFORM_SUPER_ADMIN";
}

/** Permissions granted to a fixed enum role. */
export function permissionsForRole(role: PlatformRole): PlatformPermission[] {
  return PLATFORM_ROLE_PERMISSIONS[role] ?? [];
}

/** Human label for a fixed enum role. */
export function roleLabel(role: PlatformRole): string {
  return PLATFORM_ROLE_LABELS[role] ?? role;
}
