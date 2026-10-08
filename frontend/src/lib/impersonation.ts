/**
 * DEMO-ONLY tenant "View tenant" affordance from the platform console.
 *
 * This is a demonstration affordance so a platform operator can show entering a
 * customer's workspace. It is clearly labelled in the UI (a banner) and is NOT a
 * security mechanism.
 *
 * Reconciliation (ADR-007 §6, B1-15): the PRODUCTION equivalent is a READ-ONLY,
 * reason-required, 15-minute, fully-audited platform→tenant **access-session**
 * (permission `platform.tenant.access`, endpoints
 * POST/DELETE /platform/tenants/{id}/access-sessions) — NOT write impersonation,
 * which is deliberately absent from the contract. B1 built only the backend
 * FOUNDATIONS (access-session state model, no live token minting), so this FE
 * affordance STAYS DEMO-ONLY and is flagged "FE ahead of contract". The
 * read-only access banner wiring is preserved for the B3 live switch.
 *
 * Entering a tenant does not grant platform permissions inside the tenant app,
 * and vice versa (separate session storage — lib/session.ts).
 */

import {
  setImpersonation,
  clearImpersonation,
  getImpersonation,
  setSession,
  setPreviewRole,
  type ImpersonationContext,
} from "./session";

/** Enter a tenant workspace from the platform console (demo). */
export function enterTenant(ctx: ImpersonationContext) {
  setImpersonation(ctx);
  // Give the tenant app a session + a sensible default tenant role to preview.
  setSession("demo-impersonation-token");
  setPreviewRole("tenant-admin");
}

/** Leave the impersonated tenant and return to the platform console. */
export function exitTenant() {
  clearImpersonation();
}

export { getImpersonation };
export type { ImpersonationContext };
