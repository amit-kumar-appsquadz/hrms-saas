/**
 * PLATFORM feature service — the SaaS operator (platform) console.
 *
 * UI → this service → (live platform API client | demo layer) → data.
 *
 * ── B1-15 demo→live switch (ADR-007 / PLATFORM_API_SPEC / B1_PLAN.md B1-15) ──
 * The platform plane now EXISTS in openapi.yaml under /platform/* with the
 * `platformAuth` scheme. For the B1 surface we route the IN-SCOPE READ services
 * to the live contract via `apiFetchPlatform` (base-domain /platform API — NOT a
 * tenant subdomain, ADR-007). Each live function below targets a path that is
 * REAL in openapi.yaml; we never invent endpoints.
 *
 *   LIVE (endpoint exists in openapi.yaml):
 *     getPlatformSummary     → GET /platform/summary
 *     listTenants            → GET /platform/tenants   (paginated + filters)
 *     getTenant              → GET /platform/tenants/{id}
 *     listTenantOnboarding   → GET /platform/onboarding (paginated)
 *     listPlatformUsers      → GET /platform/users      (paginated)
 *     listPlatformAudit      → GET /platform/audit      (paginated + filters)
 *     listPlatformPlans      → GET /platform/plans
 *
 *   STAYS DEMO (no contract endpoint — flagged in API_GAPS / docs/notes/B1-15):
 *     listSecurityAlerts     → no /platform endpoint exists; dashboard-only
 *                              convenience. Kept demo-backed, clearly flagged.
 *
 * In demo mode (NEXT_PUBLIC_DATA_MODE=demo, the default) every function returns
 * the centralized demo data so the whole console stays navigable without a
 * backend. Switching to live needs no UI change (DEMO_MODE_ARCHITECTURE).
 *
 * This console is PLATFORM-level and intentionally does not touch the tenant
 * `/auth/me` permission model.
 */

import { isDemo } from "@/lib/config";
import { apiFetchPlatform } from "@/lib/api/client";
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
  TenantStatus,
} from "@/types/platform";

export interface TenantListParams {
  page?: number;
  per_page?: number;
  q?: string;
  status?: TenantStatus;
  plan?: string;
}

/** GET /platform/summary (live) | demo. */
export async function getPlatformSummary(): Promise<PlatformSummary> {
  if (isDemo) return delay(p.platformSummary);
  return apiFetchPlatform<PlatformSummary>("/summary");
}

/** GET /platform/tenants (live, paginated + filters) | demo. */
export async function listTenants(
  page?: number,
  perPage?: number,
  params: Omit<TenantListParams, "page" | "per_page"> = {},
): Promise<Paginated<PlatformTenant>> {
  if (isDemo) {
    let rows = p.platformTenants;
    const q = params.q?.trim().toLowerCase();
    if (q) rows = rows.filter((t) => `${t.name} ${t.subdomain}`.toLowerCase().includes(q));
    if (params.status) rows = rows.filter((t) => t.status === params.status);
    if (params.plan) rows = rows.filter((t) => t.plan === params.plan);
    return delay(paginate(rows, page, perPage));
  }
  return apiFetchPlatform<Paginated<PlatformTenant>>("/tenants", {
    query: {
      page,
      per_page: perPage,
      q: params.q,
      status: params.status,
      plan: params.plan,
    },
  });
}

/** GET /platform/tenants/{id} (live) | demo. */
export async function getTenant(id: number): Promise<PlatformTenant | undefined> {
  if (isDemo) return delay(p.getPlatformTenant(id));
  return apiFetchPlatform<PlatformTenant>(`/tenants/${id}`);
}

/** GET /platform/onboarding (live, paginated) | demo. */
export async function listTenantOnboarding(): Promise<PlatformTenantOnboarding[]> {
  if (isDemo) return delay(p.platformOnboarding);
  const res = await apiFetchPlatform<Paginated<PlatformTenantOnboarding>>("/onboarding");
  return res.data;
}

/** GET /platform/users (live, paginated) | demo. */
export async function listPlatformUsers(): Promise<PlatformUser[]> {
  if (isDemo) return delay(p.platformUsers);
  const res = await apiFetchPlatform<Paginated<PlatformUser>>("/users");
  return res.data;
}

/** GET /platform/audit (live, paginated + filters) | demo. */
export async function listPlatformAudit(
  page?: number,
  perPage?: number,
): Promise<Paginated<PlatformAuditEntry>> {
  if (isDemo) return delay(paginate(p.platformAudit, page, perPage));
  return apiFetchPlatform<Paginated<PlatformAuditEntry>>("/audit", {
    query: { page, per_page: perPage },
  });
}

/** GET /platform/plans (live) | demo. */
export async function listPlatformPlans(): Promise<PlatformPlan[]> {
  if (isDemo) return delay(p.platformPlans);
  return apiFetchPlatform<PlatformPlan[]>("/plans");
}

/**
 * Security alerts — NO contract endpoint exists (not in openapi.yaml). This is a
 * dashboard convenience and STAYS DEMO-BACKED, flagged "FE ahead of contract"
 * (API_GAPS / docs/notes/B1-15). Do not invent a /platform/security endpoint.
 */
export const listSecurityAlerts = (): Promise<PlatformSecurityAlert[]> =>
  delay(p.platformSecurityAlerts);
