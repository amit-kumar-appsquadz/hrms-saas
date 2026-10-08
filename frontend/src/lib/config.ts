/**
 * Runtime configuration + data-mode switch.
 *
 * DEMO vs LIVE (DEMO_MODE_ARCHITECTURE):
 *   UI → feature service → (live API service | demo service) → data
 * The demo build ships in "demo" mode so the client can navigate the whole
 * product. Switching NEXT_PUBLIC_DATA_MODE=live routes feature services to the
 * real openapi.yaml-backed client without any UI rewrite.
 */

export type DataMode = "demo" | "live";

export const config = {
  dataMode: (process.env.NEXT_PUBLIC_DATA_MODE as DataMode) || "demo",
  defaultTenant: process.env.NEXT_PUBLIC_DEFAULT_TENANT || "acme",
  apiBaseUrlTemplate:
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "https://{tenant}.app.example.com/api/v1",
  // Platform plane (ADR-007): served from the SAME base domain under /platform/*
  // — NOT a tenant subdomain and NOT a separate admin host. The platform API
  // base is therefore the apex host, never tenant-scoped.
  platformApiBaseUrl:
    process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL ||
    "https://app.example.com/api/v1/platform",
} as const;

export const isDemo = config.dataMode === "demo";

/** Build the tenant-scoped API base URL from a resolved subdomain slug. */
export function apiBaseUrl(tenant: string): string {
  return config.apiBaseUrlTemplate.replace("{tenant}", tenant);
}

/** Platform-plane API base URL (base domain, no tenant scope — ADR-007). */
export function platformApiBaseUrl(): string {
  return config.platformApiBaseUrl;
}
