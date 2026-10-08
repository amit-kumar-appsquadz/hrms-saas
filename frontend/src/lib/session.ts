/**
 * Client-side session store (demo). In the live app the token comes from the
 * Sanctum login flow and GET /auth/me drives the permission context
 * (FRONTEND_ARCHITECTURE §3). For the demo we persist a lightweight session +
 * a previewable role in localStorage so the shell survives refreshes.
 *
 * No sensitive data is stored here beyond a demo token placeholder.
 *
 * Platform vs tenant: platform (Super Admin) and tenant sessions are tracked
 * with SEPARATE keys. A Super Admin may additionally "view" a tenant — a
 * demo-only impersonation context — which is also stored separately and never
 * grants platform permissions inside the tenant app (or vice versa).
 */

const TOKEN_KEY = "hrms.demo.token";
const ROLE_KEY = "hrms.demo.role";
const PLATFORM_KEY = "hrms.demo.platform";
const IMPERSONATE_KEY = "hrms.demo.impersonate.tenant";

/* ----- Tenant session ----- */

export function setSession(token: string) {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

export function setPreviewRole(roleSlug: string) {
  if (typeof window !== "undefined") localStorage.setItem(ROLE_KEY, roleSlug);
}

export function getPreviewRole(): string {
  if (typeof window === "undefined") return "tenant-admin";
  return localStorage.getItem(ROLE_KEY) ?? "tenant-admin";
}

/* ----- Platform (Super Admin) session — separate from tenant ----- */

export function setPlatformSession(token: string) {
  if (typeof window !== "undefined") localStorage.setItem(PLATFORM_KEY, token);
}

export function clearPlatformSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PLATFORM_KEY);
}

export function isPlatformAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PLATFORM_KEY) !== null;
}

/* ----- Demo-only tenant impersonation ("View tenant" from the platform) ----- */

export interface ImpersonationContext {
  tenantId: number;
  tenantName: string;
  subdomain: string;
}

export function setImpersonation(ctx: ImpersonationContext) {
  if (typeof window !== "undefined") localStorage.setItem(IMPERSONATE_KEY, JSON.stringify(ctx));
}

export function getImpersonation(): ImpersonationContext | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(IMPERSONATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ImpersonationContext;
  } catch {
    return null;
  }
}

export function clearImpersonation() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(IMPERSONATE_KEY);
}
