/**
 * Tenant resolution from the subdomain (ADR-001, FRONTEND_ARCHITECTURE §1).
 *
 * `<tenant>.app.example.com` → slug `tenant`. There is no tenant id in URLs or
 * client state beyond the resolved slug. In local dev (localhost / no
 * subdomain) we fall back to the configured default tenant so the demo runs.
 */

import { config } from "./config";

const RESERVED = new Set(["www", "app", "api", "admin", "localhost"]);

export function resolveTenantFromHost(host: string | null | undefined): string {
  if (!host) return config.defaultTenant;

  // Strip port.
  const hostname = host.split(":")[0] ?? host;

  // localhost / IP → default tenant for dev.
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
  ) {
    return config.defaultTenant;
  }

  const parts = hostname.split(".");
  // Need at least sub.domain.tld to have a tenant subdomain.
  if (parts.length < 3) return config.defaultTenant;

  const slug = parts[0];
  if (!slug || RESERVED.has(slug)) return config.defaultTenant;

  return slug;
}
