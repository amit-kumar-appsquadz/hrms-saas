<?php

namespace App\Providers;

use App\Auth\TenantGuard;
use App\Http\Middleware\EnsureTenantAudience;
use App\Http\Middleware\ResolveTenant;
use App\Tenancy\TenantCacheKey;
use App\Tenancy\TenantConnectionResolver;
use App\Tenancy\TenantContext;
use App\Tenancy\TenantResolver;
use Illuminate\Contracts\Auth\Guard;
use Illuminate\Routing\Router;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;

/**
 * TenancyServiceProvider (B1-05)
 * ------------------------------
 * Wires the host/tenant resolution seam:
 *   - binds {@see TenantContext} as a request-scoped singleton (the single place
 *     the resolved tenant lives — read by the global scope in B1-06 and the
 *     tenant guard in B1-07);
 *   - binds the lookup and connection seams as singletons;
 *   - registers the `resolve.tenant` route-middleware alias so routes/groups can
 *     opt into resolution, and `resolve.tenant:required` can FAIL CLOSED.
 *
 * The provider does NOT force-attach the middleware to the global `tenant`
 * group — that wiring belongs with the tenant auth guard (B1-07), which composes
 * resolution + audience + context. B1-05 provides the mechanism and alias; it is
 * exercised directly by the B1-05 tests via the alias.
 */
class TenancyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // One TenantContext per request lifecycle. Under Octane the container is
        // reset between requests; ResolveTenant also calls reset() defensively.
        $this->app->singleton(TenantContext::class);
        $this->app->singleton(TenantResolver::class);
        $this->app->singleton(TenantConnectionResolver::class);

        // Tenant-prefixed cache-key helper (B1-06). Depends on TenantContext;
        // bound here so `t:{tenant_id}:` prefixing is available app-wide.
        $this->app->singleton(TenantCacheKey::class);
    }

    public function boot(Router $router): void
    {
        // Route-middleware alias. `resolve.tenant` resolves (tolerant);
        // `resolve.tenant:required` fails closed when no tenant is resolvable.
        $router->aliasMiddleware('resolve.tenant', ResolveTenant::class);

        // Tenant-audience auth gate (B1-07). Alias so routes/groups can require
        // a valid tenant-audience token for the resolved tenant.
        $router->aliasMiddleware('tenant.auth', EnsureTenantAudience::class);

        // Register the custom `tenant` auth guard driver (config/auth.php →
        // guards.tenant). It builds a TenantGuard bound to the `tenant_users`
        // provider and the request-scoped TenantContext, so the tenant plane
        // authenticates ONLY tenant users WITHIN the resolved tenant and enforces
        // the `tenant` token audience (ADR-007 §1, §3).
        //
        // Resolved per-request (not a singleton): it depends on the current
        // Request's bearer token and the per-request TenantContext.
        Auth::extend('tenant', function ($app, string $name, array $config): Guard {
            $provider = Auth::createUserProvider($config['provider'] ?? null);

            return new TenantGuard(
                $provider,
                $app['request'],
                $app->make(TenantContext::class),
            );
        });
    }
}
