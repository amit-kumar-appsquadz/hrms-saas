/**
 * Auth feature service. /auth/* endpoints EXIST in openapi.yaml.
 *
 * In demo mode we simulate login + the permission context from GET /auth/me so
 * the client can experience the login + MFA flow and role-aware navigation. The
 * demo user is a Tenant Admin (holds all permissions) so every module is
 * navigable; a role switcher in the shell lets the client preview other roles.
 */

import { isDemo } from "@/lib/config";
import { apiFetch } from "@/lib/api/client";
import { delay } from "@/lib/demo/paginate";
import { permissionCatalog } from "@/lib/demo/seed";
import type {
  CurrentUser,
  LoginRequest,
  LoginResponse,
  MfaVerifyRequest,
  TokenResponse,
} from "@/types/api";

export const DEMO_MFA_CHALLENGE = "demo-challenge";
export const DEMO_MFA_CODE = "123456";

export async function login(req: LoginRequest): Promise<LoginResponse> {
  if (isDemo) {
    // Any password works in the demo; email containing "mfa" triggers the MFA step.
    if (req.email.includes("mfa")) {
      return delay({ mfa_required: true, challenge_id: DEMO_MFA_CHALLENGE } as const);
    }
    return delay({ token: "demo-token", token_type: "Bearer", expires_in: 3600 });
  }
  return apiFetch<LoginResponse>("/auth/login", { method: "POST", body: req });
}

export async function verifyMfa(req: MfaVerifyRequest): Promise<TokenResponse> {
  if (isDemo) {
    if (req.code !== DEMO_MFA_CODE) {
      const err = new Error("Invalid code. For the demo, use 123456.");
      throw err;
    }
    return delay({ token: "demo-token", token_type: "Bearer", expires_in: 3600 });
  }
  return apiFetch<TokenResponse>("/auth/mfa/verify", { method: "POST", body: req });
}

export async function getCurrentUser(roleSlug?: string): Promise<CurrentUser> {
  if (isDemo) {
    return delay(demoUserForRole(roleSlug ?? "tenant-admin"));
  }
  return apiFetch<CurrentUser>("/auth/me");
}

export async function logout(): Promise<void> {
  if (isDemo) {
    await delay(null, 150);
    return;
  }
  await apiFetch<void>("/auth/logout", { method: "POST" });
}

/* ----- Demo role → permissions mapping (mirrors NAVIGATION.md defaults) ----- */

const ALL = permissionCatalog.map((p) => p.slug);

const ROLE_PERMS: Record<string, { roles: string[]; permissions: string[] }> = {
  "tenant-admin": { roles: ["Tenant Admin"], permissions: ALL },
  "hr-admin": {
    roles: ["HR Admin"],
    permissions: ALL.filter((s) =>
      /^(dashboard|employees|organization|leave|attendance|documents|reports|audit|workflows|settings)\./.test(s),
    ).filter((s) => !s.startsWith("payroll") && !s.startsWith("compliance")),
  },
  manager: {
    roles: ["Manager"],
    permissions: [
      "dashboard.view", "employees.view", "leave.view", "leave.approve",
      "attendance.view", "attendance.approve", "workflows.approve", "reports.view",
    ],
  },
  "payroll-admin": {
    roles: ["Payroll Admin"],
    permissions: ALL.filter((s) => /^(dashboard|payroll|compliance|reports)\./.test(s)),
  },
  employee: {
    roles: ["Employee"],
    permissions: ["dashboard.view", "leave.apply", "attendance.punch", "documents.view"],
  },
};

export const demoRoles = Object.entries(ROLE_PERMS).map(([slug, v]) => ({
  slug,
  name: v.roles[0]!,
}));

function demoUserForRole(roleSlug: string): CurrentUser {
  const cfg = ROLE_PERMS[roleSlug] ?? ROLE_PERMS["tenant-admin"]!;
  return {
    id: 1,
    email: "demo.admin@acme.co.in",
    employee_id: 1,
    roles: cfg.roles,
    permissions: cfg.permissions,
  };
}
