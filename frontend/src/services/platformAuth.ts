/**
 * PLATFORM authentication / identity (Super Admin console).
 *
 * Deliberately separate from the tenant `services/auth.ts`. Platform roles are
 * NOT tenant roles and never share the tenant `/auth/me` permission set.
 *
 * All of this is demo-backed (platform auth is an API gap — docs/ui/API_GAPS.md
 * § Platform console). The demo Super Admin holds all platform permissions so
 * every platform screen is navigable; a preview switcher lets the client see
 * narrower platform roles (Operator / Support / Billing).
 */

import { delay } from "@/lib/demo/paginate";

export type PlatformRoleSlug = "super-admin" | "platform-operator" | "support-engineer" | "billing-admin";

export interface PlatformIdentity {
  id: number;
  name: string;
  email: string;
  platform_role: string;
  permissions: string[];
}

/** Platform permission catalog — distinct namespace (`platform.*`). */
export const platformPermissionCatalog = [
  "platform.dashboard.view",
  "platform.tenant.view",
  "platform.tenant.create",
  "platform.tenant.edit",
  "platform.tenant.activate",
  "platform.tenant.suspend",
  "platform.tenant.impersonate",
  "platform.user.view",
  "platform.user.manage",
  "platform.audit.view",
  "platform.settings.view",
  "platform.settings.manage",
  "platform.billing.manage",
] as const;

const ALL = [...platformPermissionCatalog];

const PLATFORM_ROLES: Record<PlatformRoleSlug, { name: string; permissions: string[] }> = {
  "super-admin": { name: "Super Admin", permissions: ALL },
  "platform-operator": {
    name: "Platform Operator",
    permissions: ["platform.dashboard.view", "platform.tenant.view", "platform.tenant.create", "platform.tenant.edit", "platform.tenant.activate", "platform.tenant.suspend", "platform.tenant.impersonate", "platform.audit.view"],
  },
  "support-engineer": {
    name: "Support Engineer",
    permissions: ["platform.dashboard.view", "platform.tenant.view", "platform.tenant.impersonate", "platform.audit.view"],
  },
  "billing-admin": {
    name: "Billing Admin",
    permissions: ["platform.dashboard.view", "platform.tenant.view", "platform.settings.view", "platform.billing.manage", "platform.audit.view"],
  },
};

export const platformRoles = (Object.keys(PLATFORM_ROLES) as PlatformRoleSlug[]).map((slug) => ({
  slug,
  name: PLATFORM_ROLES[slug].name,
}));

export async function getPlatformIdentity(roleSlug: PlatformRoleSlug = "super-admin"): Promise<PlatformIdentity> {
  const cfg = PLATFORM_ROLES[roleSlug] ?? PLATFORM_ROLES["super-admin"];
  return delay({
    id: 1,
    name: "Platform Super Admin",
    email: "superadmin@platform.example.com",
    platform_role: cfg.name,
    permissions: cfg.permissions,
  });
}
