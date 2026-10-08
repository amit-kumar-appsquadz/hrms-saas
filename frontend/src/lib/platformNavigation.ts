/**
 * PLATFORM console navigation (Super Admin). Separate tree from the tenant
 * navigation (lib/navigation.ts). Items are gated by platform permissions
 * (platform.*), never tenant permissions.
 */

import type { IconName } from "@/components/ui/Icon";

export interface PlatformNavItem {
  label: string;
  href: string;
  icon: IconName;
  anyOf?: string[];
}

export const platformNav: PlatformNavItem[] = [
  { label: "Platform dashboard", href: "/platform", icon: "dashboard", anyOf: ["platform.dashboard.view"] },
  { label: "Tenants", href: "/platform/tenants", icon: "building", anyOf: ["platform.tenant.view"] },
  { label: "Tenant onboarding", href: "/platform/onboarding", icon: "organization", anyOf: ["platform.tenant.create"] },
  { label: "Platform users", href: "/platform/users", icon: "admin", anyOf: ["platform.user.view"] },
  { label: "Platform audit", href: "/platform/audit", icon: "audit", anyOf: ["platform.audit.view"] },
  { label: "Plans & settings", href: "/platform/settings", icon: "settings", anyOf: ["platform.settings.view"] },
];
