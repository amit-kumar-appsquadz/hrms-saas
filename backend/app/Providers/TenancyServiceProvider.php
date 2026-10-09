<?php

namespace App\Providers;

use App\Auth\TenantGuard;
use App\Http\Middleware\EnsureTenantAudience;
use App\Http\Middleware\ResolveTenant;
use App\Tenancy\Audit\AuditCollection;
use App\Tenancy\Audit\AuditLogStore;
use App\Tenancy\Audit\InMemoryAuditCollection;
use App\Tenancy\Audit\MongoAuditLogStore;
use App\Tenancy\Audit\MongoDBAuditCollection;
use App\Tenancy\TenantCacheKey;
use App\Tenancy\TenantConnectionResolver;
use App\Tenancy\TenantContext;
use App\Tenancy\TenantResolver;
use Illuminate\Contracts\Auth\Guard;
use Illuminate\Routing\Router;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;
use MongoDB\Client;
use RuntimeException;

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

        // --- B1-11 tenant audit store (SEPARATE from platform B1-09) ---------
        //
        // The tenant-plane audit store (B1-11) is the append-only sink for
        // tenant `audit_logs` (ADR-007 §7 separate collection; ADR-003 "behind
        // an interface"). It mirrors the platform-side wiring (B1-09) but writes
        // to a SEPARATE collection and stamps/filters by the resolved tenant_id.
        //
        // Driver-selected binding (same pattern as B1-09):
        //   - 'mongodb' (prod / local docker): the real MongoDB adapter, wired
        //     from config/audit.php (URI + database from env/Secrets Manager).
        //   - 'fake' (tests, and until the Mongo driver is installed): an
        //     in-memory collection so tests make NO cloud calls (steering).
        $this->app->singleton(AuditCollection::class, function (): AuditCollection {
            $driver = (string) config('audit.tenant.driver', 'fake');
            $collectionName = (string) config('audit.tenant.collection', MongoAuditLogStore::COLLECTION);

            if ($driver === 'mongodb') {
                $uri = config('audit.tenant.mongo.uri');
                $database = (string) config('audit.tenant.mongo.database');

                if (! is_string($uri) || $uri === '') {
                    throw new RuntimeException(
                        'Tenant audit driver is "mongodb" but MONGODB_URI is not configured. '
                        .'Provide the Atlas connection (via Secrets Manager/env); never commit it (ADR-003).'
                    );
                }

                // Requires the mongodb PHP extension + mongodb/mongodb driver.
                // A human provisions Atlas/PrivateLink and installs the driver
                // (steering rule 6); not exercised by the test suite. The
                // MongoDB\Client import resolves lazily — only when this branch
                // runs (driver=mongodb), so the file loads fine without the
                // driver present (same pattern as B1-09's AppServiceProvider).
                $client = new Client($uri);
                $mongoCollection = $client->selectCollection($database, $collectionName);

                return new MongoDBAuditCollection($mongoCollection, $collectionName);
            }

            // Default: in-memory fake (append-only, same contract). No Mongo.
            return new InMemoryAuditCollection($collectionName);
        });

        $this->app->singleton(AuditLogStore::class, function ($app): AuditLogStore {
            return new MongoAuditLogStore(
                $app->make(AuditCollection::class),
                $app->make(TenantContext::class),
            );
        });
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
