/**
 * Client-side session store (demo). In the live app the token comes from the
 * Sanctum login flow and GET /auth/me drives the permission context
 * (FRONTEND_ARCHITECTURE §3). For the demo we persist a lightweight session +
 * a previewable role in localStorage so the shell survives refreshes.
 *
 * No sensitive data is stored here beyond a demo token placeholder.
 */

const TOKEN_KEY = "hrms.demo.token";
const ROLE_KEY = "hrms.demo.role";

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
