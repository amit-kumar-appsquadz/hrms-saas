/**
 * PLATFORM feature service — the SaaS operator (Super Admin) console.
 *
 * UI → this service → demo layer → data (same abstraction as the tenant
 * services). Every function maps to a documented platform API gap
 * (docs/ui/API_GAPS.md § Platform console); none exist in openapi.yaml yet, so
 * all are demo-backed. When the planner adds a platform API, only the body of
 * the matching function changes — no UI rewrite.
 *
 * This console is PLATFORM-level and intentionally does not touch the tenant
 * `/auth/me` permission model.
 */

import { delay, paginate } from "@/lib/demo/paginate";
import * as p from "@/lib/demo/platform";
import type { Paginated } from "@/types/api";
import type {
  PlatformAuditEntry,
  PlatformPlan,
  PlatformSecurityAlert,
  PlatformSummary,
  PlatformTenant,
  PlatformTenantOnboarding,
  PlatformUser,
} from "@/types/platform";

export const getPlatformSummary = (): Promise<PlatformSummary> => delay(p.platformSummary);

export const listTenants = (page?: number, perPage?: number): Promise<Paginated<PlatformTenant>> =>
  delay(paginate(p.platformTenants, page, perPage));

export const getTenant = (id: number): Promise<PlatformTenant | undefined> =>
  delay(p.getPlatformTenant(id));

export const listTenantOnboarding = (): Promise<PlatformTenantOnboarding[]> =>
  delay(p.platformOnboarding);

export const listPlatformUsers = (): Promise<PlatformUser[]> => delay(p.platformUsers);

export const listPlatformAudit = (page?: number, perPage?: number): Promise<Paginated<PlatformAuditEntry>> =>
  delay(paginate(p.platformAudit, page, perPage));

export const listPlatformPlans = (): Promise<PlatformPlan[]> => delay(p.platformPlans);

export const listSecurityAlerts = (): Promise<PlatformSecurityAlert[]> => delay(p.platformSecurityAlerts);
