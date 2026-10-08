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
 * Both groups are DENY-BY-DEFAULT in B1-00 (see App\Http\Middleware\DenyByDefault):
 *   - `platform` -> real guard lands in B1-03
 *   - `tenant`   -> real guard lands in B1-05/B1-07
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
     * @var array<string, list<class-string>>
     */
    public const PLANE_MIDDLEWARE_GROUPS = [
        'tenant' => [\App\Http\Middleware\DenyByDefault::class],
        'platform' => [\App\Http\Middleware\DenyByDefault::class],
    ];
}
