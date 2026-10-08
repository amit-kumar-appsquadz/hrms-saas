/**
 * DEMO-ONLY tenant impersonation ("View tenant" from the platform console).
 *
 * This is a demonstration affordance so a Super Admin can show entering a
 * customer's workspace. It is clearly labelled in the UI (an impersonation
 * banner) and is NOT a security mechanism — in production, impersonation would
 * be an audited, consent-gated backend capability (documented as a platform API
 * gap). Entering a tenant does not grant platform permissions inside the tenant
 * app, and vice versa.
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
