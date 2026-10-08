import { NextResponse, type NextRequest } from "next/server";
import { resolveTenantFromHost } from "@/lib/tenant";

/**
 * Edge tenant resolution (ADR-001, FRONTEND_ARCHITECTURE §1).
 * Reads the host, derives the tenant slug and attaches it as a request header
 * (`x-tenant`) so server components / the API wrapper can scope calls to the
 * correct per-tenant base URL. No tenant id appears in URLs.
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host");
  const tenant = resolveTenantFromHost(host);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-tenant", tenant);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
