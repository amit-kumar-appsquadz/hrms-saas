<?php

namespace App\Http;

/**
 * HTTP middleware group reference (B1-00).
 *
 * Laravel 12 removed the legacy `Illuminate\Foundation\Http\Kernel` subclass as the
 * place to declare HTTP middleware. The two plane middleware groups that the B1 plan
 * attributes to this file — `tenant` and `platform` — are instead declared in
 * `bootstrap/app.php` via `->withMiddleware()->group(...)`, which is the Laravel 12
 * source of truth.
 *
 * Both groups started DENY-BY-DEFAULT in B1-00 (see App\Http\Middleware\DenyByDefault):
 *   - `platform` -> still DenyByDefault; real guard lands in B1-03
 *   - `tenant`   -> replaced in B1-07 by ResolveTenant (fail-closed) + EnsureTenantAudience
 *
 * This class is intentionally a documentation/placeholder seam only. It declares no
 * runtime behaviour and is NOT bound into the container (Laravel 12 does not resolve
 * an App\Http\Kernel). It exists so the file named in the B1-00 task is present and
 * cross-references the actual configuration location. Do not reintroduce a legacy
 * Foundation HTTP kernel here — it would conflict with bootstrap/app.php.
 *
 * @see \Illuminate\Foundation\Configuration\Middleware
 */
final class Kernel
{
    /**
     * The plane middleware groups, mirrored here for discoverability.
     * Authoritative definition lives in bootstrap/app.php.
     *
     * B1-07 replaced the `tenant` group's DenyByDefault placeholder with
     * host/tenant resolution (fail-closed) + the tenant-audience auth gate. The
     * `platform` group keeps the DenyByDefault placeholder until B1-03 lands.
     *
     * @var array<string, list<class-string>>
     */
    public const PLANE_MIDDLEWARE_GROUPS = [
        'tenant' => [
            \App\Http\Middleware\ResolveTenant::class,
            \App\Http\Middleware\EnsureTenantAudience::class,
        ],
        'platform' => [\App\Http\Middleware\DenyByDefault::class],
    ];
}
