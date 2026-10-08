import { describe, it, expect } from "vitest";
import { listTenants, getPlatformSummary, getTenant } from "./platform";
import { getPlatformIdentity, platformRoles } from "./platformAuth";
import { platformTenants } from "@/lib/demo/platform";
import { statusMeta } from "@/lib/status";
import {
  roleFromDemoSlug,
  permissionsForRole,
  roleLabel,
  platformPermissionCatalog,
  PLATFORM_ROLES,
} from "@/lib/platformRoles";

describe("platform service (demo mode)", () => {
  it("paginates tenants with contract-shaped meta", async () => {
    const res = await listTenants(1, 10);
    expect(res.data.length).toBeLessThanOrEqual(10);
    expect(res.meta.page).toBe(1);
    expect(res.meta.total).toBeGreaterThan(0);
    expect(res.meta.total_pages).toBe(Math.ceil(res.meta.total / 10));
  });

  it("summary status counts are internally consistent", async () => {
    const s = await getPlatformSummary();
    expect(
      s.active_tenants + s.trial_tenants + s.suspended_tenants,
    ).toBeLessThanOrEqual(s.total_tenants);
    expect(s.total_tenants).toBeGreaterThan(0);
  });

  it("returns a tenant by id", async () => {
    const t = await getTenant(1);
    expect(t).toBeDefined();
    expect(t?.subdomain).toContain(".app.example.com");
  });

  it("filters tenants by status (incl. inactive)", async () => {
    const res = await listTenants(1, 100, { status: "inactive" });
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data.every((t) => t.status === "inactive")).toBe(true);
  });
});

describe("platform identity (separate from tenant roles, fixed enum)", () => {
  it("Super Admin holds platform.* permissions, never tenant permissions", async () => {
    const id = await getPlatformIdentity("PLATFORM_SUPER_ADMIN");
    expect(id.platform_role).toBe("PLATFORM_SUPER_ADMIN");
    expect(id.permissions.length).toBeGreaterThan(0);
    expect(id.permissions.every((p) => p.startsWith("platform."))).toBe(true);
    // No tenant-level permission leaks into the platform identity.
    expect(
      id.permissions.some((p) => p.startsWith("employees.") || p.startsWith("payroll.")),
    ).toBe(false);
  });

  it("narrower platform roles get fewer permissions", async () => {
    const sa = await getPlatformIdentity("PLATFORM_SUPER_ADMIN");
    const support = await getPlatformIdentity("PLATFORM_SUPPORT");
    expect(support.permissions.length).toBeLessThan(sa.permissions.length);
    expect(support.permissions).not.toContain("platform.settings.manage");
  });

  it("exposes the fixed enum role list incl. PLATFORM_AUDITOR", () => {
    const roles = platformRoles.map((r) => r.role);
    expect(roles).toContain("PLATFORM_SUPER_ADMIN");
    expect(roles).toContain("PLATFORM_SUPPORT");
    expect(roles).toContain("PLATFORM_OPERATIONS");
    expect(roles).toContain("PLATFORM_AUDITOR");
  });
});

describe("B1-15 role-label reconciliation (ADR-007 §4 / B1-03)", () => {
  it("maps the three straightforward demo slugs to the fixed enum", () => {
    expect(roleFromDemoSlug("super-admin")).toBe("PLATFORM_SUPER_ADMIN");
    expect(roleFromDemoSlug("platform-operator")).toBe("PLATFORM_OPERATIONS");
    expect(roleFromDemoSlug("support-engineer")).toBe("PLATFORM_SUPPORT");
  });

  it("reconciles the orphan demo slug 'billing-admin' to PLATFORM_OPERATIONS", () => {
    // 'billing-admin' has NO fixed enum value; it reconciles to OPERATIONS,
    // which carries platform.billing.manage (PLATFORM_API_SPEC reconciliation).
    expect(roleFromDemoSlug("billing-admin")).toBe("PLATFORM_OPERATIONS");
    expect(permissionsForRole("PLATFORM_OPERATIONS")).toContain("platform.billing.manage");
  });

  it("adds PLATFORM_AUDITOR (no demo slug) as a first-class read-only role", () => {
    const auditor = permissionsForRole("PLATFORM_AUDITOR");
    expect(auditor).toContain("platform.audit.view");
    // Auditor is read-only: no manage/create/suspend/activate permissions.
    expect(auditor.some((p) => /\.(create|edit|activate|suspend|manage)$/.test(p))).toBe(false);
  });

  it("unknown slugs fall back to PLATFORM_SUPER_ADMIN", () => {
    expect(roleFromDemoSlug("nonsense")).toBe("PLATFORM_SUPER_ADMIN");
  });

  it("every fixed role has a human label", () => {
    for (const role of PLATFORM_ROLES) {
      expect(roleLabel(role)).toBeTruthy();
      expect(roleLabel(role)).not.toBe(role); // label differs from enum value
    }
  });
});

describe("B1-15 permission catalog reconciliation (impersonate → access)", () => {
  it("uses platform.tenant.access and no longer platform.tenant.impersonate", () => {
    expect(platformPermissionCatalog).toContain("platform.tenant.access");
    expect(platformPermissionCatalog as readonly string[]).not.toContain(
      "platform.tenant.impersonate",
    );
  });

  it("every catalog permission is in the platform.* namespace", () => {
    expect(platformPermissionCatalog.every((p) => p.startsWith("platform."))).toBe(true);
  });
});

describe("B1-15 tenant inactive status handling (ADR-008)", () => {
  it("the demo seed includes at least one inactive tenant", () => {
    expect(platformTenants.some((t) => t.status === "inactive")).toBe(true);
  });

  it("statusMeta renders inactive with a non-color-only label", () => {
    expect(statusMeta("inactive")).toEqual({ tone: "neutral", label: "Inactive" });
  });

  it("maps the full ADR-008 lifecycle set to explicit labels (not raw fallback)", () => {
    expect(statusMeta("provisioning").label).toBe("Provisioning");
    expect(statusMeta("trial").label).toBe("Trial");
    expect(statusMeta("active").label).toBe("Active");
    expect(statusMeta("suspended").label).toBe("Suspended");
    expect(statusMeta("inactive").label).toBe("Inactive");
  });

  it("inactive tenants are dormant (no active MRR)", () => {
    const inactive = platformTenants.filter((t) => t.status === "inactive");
    expect(inactive.every((t) => t.mrr === 0)).toBe(true);
  });
});
