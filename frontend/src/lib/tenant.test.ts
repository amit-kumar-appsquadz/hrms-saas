import { describe, it, expect } from "vitest";
import { resolveTenantFromHost } from "./tenant";
import { config } from "./config";

describe("resolveTenantFromHost", () => {
  it("extracts the tenant slug from a subdomain", () => {
    expect(resolveTenantFromHost("acme.app.example.com")).toBe("acme");
    expect(resolveTenantFromHost("globex.app.example.com:443")).toBe("globex");
  });

  it("falls back to the default tenant on localhost", () => {
    expect(resolveTenantFromHost("localhost:3000")).toBe(config.defaultTenant);
    expect(resolveTenantFromHost("127.0.0.1")).toBe(config.defaultTenant);
  });

  it("falls back for reserved subdomains and bare domains", () => {
    expect(resolveTenantFromHost("www.example.com")).toBe(config.defaultTenant);
    expect(resolveTenantFromHost("example.com")).toBe(config.defaultTenant);
    expect(resolveTenantFromHost(null)).toBe(config.defaultTenant);
  });
});
