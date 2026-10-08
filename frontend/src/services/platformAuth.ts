/**
 * PLATFORM authentication / identity (platform operator console).
 *
 * Deliberately separate from the tenant `services/auth.ts`. Platform roles are
 * NOT tenant roles and never share the tenant `/auth/me` permission set.
 *
 * ── B1 scope (ADR-007 / B1_PLAN.md B1-15, human decision E-1: FOUNDATIONS ONLY)
 * Platform login, MFA, and `/platform/auth/me` are FOUNDATIONS in B1 — the
 * backend built the guard + token audience primitives, but the end-user login/
 * MFA UX flow and live identity issuance are B2/B3 (SEC-2/SEC-3). So this
 * identity source INTENTIONALLY STAYS DEMO-BACKED and is flagged as "FE ahead of
 * contract" in docs/ui/API_GAPS.md. We do NOT wire /platform/auth/* to live in
 * B1 even though those paths exist in openapi.yaml.
 *
 * What B1-15 DID change here: the demo identity now speaks the FIXED PlatformRole
 * enum (ADR-007 §4 / B1-03) and the reconciled `platform.*` catalog (incl.
 * `platform.tenant.access`, which replaces the old `platform.tenant.impersonate`),
 * via the single source of truth in `@/lib/platformRoles`. The demo preview
 * switcher still exposes narrower roles so the client can preview them.
 */

import { delay } from "@/lib/demo/paginate";
import {
  PLATFORM_ROLES,
  roleFromDemoSlug,
  roleLabel,
  permissionsForRole,
  platformPermissionCatalog,
  type PlatformPermission,
  type PlatformRole,
  type PlatformRoleSlug,
} from "@/lib/platformRoles";

export type { PlatformRole, PlatformRoleSlug, PlatformPermission } from "@/lib/platformRoles";

export interface PlatformIdentity {
  id: number;
  name: string;
  email: string;
  /** Fixed enum role (ADR-007 §4). */
  platform_role: PlatformRole;
  /** Human label for the role (UI chrome). */
  platform_role_label: string;
  permissions: PlatformPermission[];
}

/** Re-export the fixed `platform.*` catalog for callers that need it. */
export { platformPermissionCatalog };

/**
 * Preview role list for the demo switcher. Now keyed by the FIXED enum roles
 * (incl. PLATFORM_AUDITOR, which had no demo slug) rather than the old demo
 * slugs — the reconciliation surfaced the full fixed set to the UI.
 */
export const platformRoles = PLATFORM_ROLES.map((role) => ({
  role,
  name: roleLabel(role),
}));

const DEMO_EMAIL: Record<PlatformRole, { name: string; email: string }> = {
  PLATFORM_SUPER_ADMIN: { name: "Platform Super Admin", email: "superadmin@platform.example.com" },
  PLATFORM_OPERATIONS: { name: "Platform Operations", email: "ops@platform.example.com" },
  PLATFORM_SUPPORT: { name: "Platform Support", email: "support@platform.example.com" },
  PLATFORM_AUDITOR: { name: "Platform Auditor", email: "auditor@platform.example.com" },
};

/**
 * DEMO-backed platform identity (NOT wired to live `/platform/auth/me` in B1 —
 * see file header). Accepts either a fixed enum role or a legacy demo slug and
 * reconciles both to the fixed enum + its `platform.*` permissions.
 */
export async function getPlatformIdentity(
  role: PlatformRole | PlatformRoleSlug = "PLATFORM_SUPER_ADMIN",
): Promise<PlatformIdentity> {
  const resolved: PlatformRole = (PLATFORM_ROLES as readonly string[]).includes(role)
    ? (role as PlatformRole)
    : roleFromDemoSlug(role);
  const who = DEMO_EMAIL[resolved];
  return delay({
    id: 1,
    name: who.name,
    email: who.email,
    platform_role: resolved,
    platform_role_label: roleLabel(resolved),
    permissions: permissionsForRole(resolved),
  });
}
