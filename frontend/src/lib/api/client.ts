/**
 * Thin typed fetch wrapper for the LIVE API (FRONTEND_ARCHITECTURE §5).
 *
 * Responsibilities:
 *  - inject the tenant-scoped base URL (from subdomain) + bearer auth
 *  - standard headers + request_id capture
 *  - uniform error normalization to the contract Error / ValidationErrorBody
 *
 * This is only exercised when NEXT_PUBLIC_DATA_MODE=live. The demo build routes
 * feature services to the demo layer instead, so this wrapper stays unused but
 * ready — switching to live needs no UI change (DEMO_MODE_ARCHITECTURE).
 *
 * It never invents endpoints: callers pass paths that exist in openapi.yaml.
 */

import { apiBaseUrl } from "../config";
import { resolveTenantFromHost } from "../tenant";

export class ApiRequestError extends Error {
  code: string;
  status: number;
  requestId?: string;
  fields?: Record<string, string[]>;

  constructor(opts: {
    message: string;
    code: string;
    status: number;
    requestId?: string;
    fields?: Record<string, string[]>;
  }) {
    super(opts.message);
    this.name = "ApiRequestError";
    this.code = opts.code;
    this.status = opts.status;
    this.requestId = opts.requestId;
    this.fields = opts.fields;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  token?: string;
  signal?: AbortSignal;
}

function currentTenant(): string {
  if (typeof window !== "undefined") {
    return resolveTenantFromHost(window.location.host);
  }
  return resolveTenantFromHost(null);
}

function buildQuery(query?: RequestOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const base = apiBaseUrl(currentTenant());
  const url = `${base}${path}${buildQuery(options.query)}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (err) {
    throw new ApiRequestError({
      message: "Network error. Please check your connection and retry.",
      code: "network_error",
      status: 0,
    });
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const error = json?.error ?? {};
    throw new ApiRequestError({
      message: error.message ?? "Something went wrong.",
      code: error.code ?? "error",
      status: res.status,
      requestId: error.request_id,
      fields: error.fields,
    });
  }

  return json as T;
}
