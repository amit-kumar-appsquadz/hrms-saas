<?php

namespace App\Http\Middleware;

use App\Tenancy\TenantConnectionResolver;
use App\Tenancy\TenantContext;
use App\Tenancy\TenantResolver;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * ResolveTenant (B1-05) — same-domain host resolution + fail-closed guard.
 * ------------------------------------------------------------------------
 * Resolves the tenant for a request from its host (`<tenant>.app.example.com`)
 * and binds it into {@see TenantContext}. Implements ADR-001's "Tenant
 * resolution from subdomain" + the "Platform plane and reserved hosts"
 * amendment, reconciled with ADR-007 and status-gated by ADR-008.
 *
 * BEHAVIOUR MATRIX (acceptance):
 *   acme.app.example.com      -> resolve tenant `acme` (if serveable status)
 *   app.example.com (base)    -> NO tenant (platform/base host); request continues
 *   www|platform|admin|api|static.app.example.com (reserved) -> NO tenant
 *   <unknown>.app.example.com -> 404-style NOT FOUND, NON-ENUMERATING
 *   suspended/provisioning/inactive tenant -> access REFUSED, NON-ENUMERATING
 *
 * FAIL-CLOSED (the core isolation guarantee, ADR-001 amendment / ADR-007 §1):
 *   This middleware NEVER selects a default tenant. For a tenant-scoped route it
 *   either resolves exactly one tenant or returns an error. "No tenant" is left
 *   as an EMPTY context; it is the downstream tenant guard/global scope that
 *   turns an empty context on a tenant-scoped operation into a 401/400 (B1-07 /
 *   B1-06). To make the guarantee enforceable even before those land, this
 *   middleware supports a strict mode (`resolve.tenant:required`) that itself
 *   fails closed when no tenant is resolvable.
 *
 * The host is ROUTING ONLY and is not trusted as the security boundary — that
 * is identity + token audience + permission namespace + resolved tenant context
 * (ADR-007 §1), enforced by the guards. This middleware's job is strictly to map
 * host -> tenant (or no-tenant) without ever guessing.
 *
 * NON-ENUMERATION: an unknown subdomain and a non-serveable tenant return the
 * SAME generic response, so an attacker cannot tell whether a given tenant
 * exists from the resolver's behaviour.
 */
class ResolveTenant
{
    public function __construct(
        private readonly TenantContext $context,
        private readonly TenantResolver $resolver,
        private readonly TenantConnectionResolver $connections,
    ) {}

    /**
     * @param  string|null  $mode  Pass `required` (route middleware param
     *                             `resolve.tenant:required`) to FAIL CLOSED when
     *                             no tenant is resolvable on a tenant-scoped
     *                             route. Omit for base-host-tolerant resolution
     *                             (e.g. base-domain tenant login, where the
     *                             tenant is established later from the session).
     */
    public function handle(Request $request, Closure $next, ?string $mode = null): Response
    {
        // Defensive reset so a long-lived worker (Octane) can never carry a
        // tenant from a previous request into this one.
        $this->context->reset();

        $host = $this->normalizeHost($request->getHost());
        $label = $this->tenantLabel($host);

        // Base/apex host or no tenant label => NO tenant (platform/base host).
        // The platform plane and base-host tenant login live here and are
        // unaffected: they resolve identity/tenant later, not from the host.
        if ($label === null) {
            return $this->continueWithoutTenant($request, $next, $mode);
        }

        // Reserved labels (`app`,`www`,`platform`,`admin`,`api`,`static`) are
        // NEVER tenant subdomains (ADR-001 amendment). Treat as NO tenant.
        if ($this->isReservedLabel($label)) {
            return $this->continueWithoutTenant($request, $next, $mode);
        }

        // Candidate tenant subdomain -> single indexed lookup.
        $tenant = $this->resolver->findBySubdomain($label);

        // Unknown subdomain -> NOT FOUND, non-enumerating. (Same shape as a
        // non-serveable status below, so existence is not revealed.)
        if ($tenant === null) {
            return $this->tenantUnavailable();
        }

        // Status gate (ADR-008): only serveable statuses may be accessed.
        // provisioning/suspended/inactive -> refused, non-enumerating.
        if (! $this->isServeable($tenant)) {
            return $this->tenantUnavailable();
        }

        // Success: bind exactly one tenant into the context. Resolve its DB
        // connection through the ADR-001 seam (Phase 1: always shared).
        $this->context->setTenant(
            tenantId: $tenant->id,
            subdomain: $label,
            tenant: $tenant,
        );

        // The connection resolver is invoked so the seam is exercised on the
        // live path (Phase 1 returns the shared connection); call sites remain
        // agnostic to placement.
        $this->connections->connectionFor($tenant);

        return $next($request);
    }

    /**
     * Continue the request with NO tenant bound. In `required` mode this fails
     * closed (tenant-scoped route reached without a resolvable tenant); otherwise
     * the empty context is passed through for base-host/platform flows.
     */
    private function continueWithoutTenant(Request $request, Closure $next, ?string $mode): Response
    {
        if ($mode === 'required') {
            // FAIL CLOSED: a tenant-scoped route demanded a tenant and the host
            // carries none. NEVER default to a tenant.
            return $this->tenantRequired();
        }

        return $next($request);
    }

    /**
     * Lower-case and strip a trailing dot / port from the host.
     */
    private function normalizeHost(string $host): string
    {
        $host = strtolower(trim($host));
        $host = rtrim($host, '.');

        // getHost() usually excludes the port, but be defensive.
        if (($pos = strpos($host, ':')) !== false) {
            $host = substr($host, 0, $pos);
        }

        return $host;
    }

    /**
     * Extract the tenant label from a host, or null when the host is the base
     * domain itself (no label) or does not sit under the base domain.
     *
     * Only a SINGLE leftmost label directly under the base domain is treated as
     * a tenant candidate (`acme.app.example.com`). Deeper or unrelated hosts
     * resolve to no tenant (fail-closed), never a guessed tenant.
     */
    private function tenantLabel(string $host): ?string
    {
        $base = $this->normalizeHost((string) config('tenancy.base_domain', 'app.example.com'));

        // Exact base/apex host -> no label (platform/base host).
        if ($host === $base) {
            return null;
        }

        $suffix = '.'.$base;

        // Host must end with ".<base_domain>" to be a tenant subdomain.
        if (! str_ends_with($host, $suffix)) {
            // Unrelated host (e.g. localhost in dev, custom domain not yet
            // mapped). No tenant — fail-closed, do not guess.
            return null;
        }

        $label = substr($host, 0, -strlen($suffix));

        // Must be a single DNS label (no further dots). `a.b.app.example.com`
        // is not a Phase-1 tenant host -> no tenant.
        if ($label === '' || str_contains($label, '.')) {
            return null;
        }

        return $label;
    }

    /**
     * Whether a label is reserved (never a tenant subdomain).
     */
    private function isReservedLabel(string $label): bool
    {
        $reserved = (array) config('tenancy.reserved_labels', []);

        return in_array($label, array_map('strtolower', $reserved), true);
    }

    /**
     * Whether a resolved tenant's status is serveable (ADR-008). Reads
     * `tenants.status` (B1-01). Defensive against a missing attribute -> not
     * serveable (fail-closed).
     */
    private function isServeable(object $tenant): bool
    {
        $status = $tenant->status ?? null;

        // Normalise enum-backed or string statuses to a scalar string.
        if ($status instanceof \BackedEnum) {
            $status = $status->value;
        }

        if (! is_string($status) || $status === '') {
            return false;
        }

        $serveable = (array) config('tenancy.serveable_statuses', []);

        return in_array($status, $serveable, true);
    }

    /**
     * Fail-closed response: a tenant-scoped route was reached with no resolvable
     * tenant. 400 Bad Request — the request cannot be served without a tenant.
     * No default tenant is ever selected.
     */
    private function tenantRequired(): Response
    {
        return response()->json([
            'error' => [
                'code' => 'tenant_required',
                'message' => 'This request must be made within a tenant workspace.',
            ],
        ], Response::HTTP_BAD_REQUEST);
    }

    /**
     * Non-enumerating "tenant unavailable" response used for BOTH an unknown
     * subdomain AND a non-serveable (provisioning/suspended/inactive) tenant, so
     * the caller cannot distinguish "does not exist" from "exists but disabled".
     * 404 Not Found with a generic message.
     */
    private function tenantUnavailable(): Response
    {
        return response()->json([
            'error' => [
                'code' => 'tenant_unavailable',
                'message' => 'This workspace is not available. '
                    .'Check the address or contact your administrator.',
            ],
        ], Response::HTTP_NOT_FOUND);
    }
}
