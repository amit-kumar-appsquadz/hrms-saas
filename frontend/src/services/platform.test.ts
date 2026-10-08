import { describe, it, expect } from "vitest";
import { listTenants, getPlatformSummary, getTenant } from "./platform";
import { getPlatformIdentity, platformRoles } from "./platformAuth";

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
    expect(s.active_tenants + s.trial_tenants + s.suspended_tenants).toBeLessThanOrEqual(s.total_tenants);
    expect(s.total_tenants).toBeGreaterThan(0);
  });

  it("returns a tenant by id", async () => {
    const t = await getTenant(1);
    expect(t).toBeDefined();
    expect(t?.subdomain).toContain(".app.example.com");
  });
});

describe("platform identity (separate from tenant roles)", () => {
  it("Super Admin holds platform.* permissions, never tenant permissions", async () => {
    const id = await getPlatformIdentity("super-admin");
    expect(id.permissions.length).toBeGreaterThan(0);
    expect(id.permissions.every((p) => p.startsWith("platform."))).toBe(true);
    // No tenant-level permission leaks into the platform identity.
    expect(id.permissions.some((p) => p.startsWith("employees.") || p.startsWith("payroll."))).toBe(false);
  });

  it("narrower platform roles get fewer permissions", async () => {
    const sa = await getPlatformIdentity("super-admin");
    const support = await getPlatformIdentity("support-engineer");
    expect(support.permissions.length).toBeLessThan(sa.permissions.length);
    expect(support.permissions).not.toContain("platform.settings.manage");
  });

  it("exposes a preview role list", () => {
    expect(platformRoles.map((r) => r.slug)).toContain("super-admin");
    expect(platformRoles.map((r) => r.slug)).toContain("support-engineer");
  });
});
