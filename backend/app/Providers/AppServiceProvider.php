<?php

namespace App\Providers;

use App\Platform\Audit\InMemoryPlatformAuditCollection;
use App\Platform\Audit\MongoDBPlatformAuditCollection;
use App\Platform\Audit\MongoPlatformAuditLogStore;
use App\Platform\Audit\PlatformAuditCollection;
use App\Platform\Audit\PlatformAuditLogStore;
use App\Platform\InitialAdminChecker;
use App\Platform\StubInitialAdminChecker;
use Illuminate\Support\ServiceProvider;
use MongoDB\Client;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // --- B1-09 platform audit store (replaces the B1-04 in-memory seam) ---
        //
        // The tenant lifecycle service (B1-04) records a platform-audit event
        // per transition through the PlatformAuditLogStore seam. B1-09 swaps the
        // temporary in-memory placeholder for the real append-only Mongo store
        // writing to the SEPARATE `platform_audit_logs` collection
        // (ADR-007 §7 / ADR-003).
        //
        // The store is driver-agnostic: it depends on the PlatformAuditCollection
        // seam. We bind that collection by driver:
        //   - 'mongodb' (prod / local docker): the real MongoDB adapter, wired
        //     from config/audit.php (URI + database from env/Secrets Manager).
        //   - 'fake' (tests, and until the Mongo driver is installed): an
        //     in-memory collection so tests make NO cloud calls (steering).
        $this->app->singleton(PlatformAuditCollection::class, function (): PlatformAuditCollection {
            $driver = (string) config('audit.platform.driver', 'fake');
            $collectionName = (string) config('audit.platform.collection', MongoPlatformAuditLogStore::COLLECTION);

            if ($driver === 'mongodb') {
                $uri = config('audit.platform.mongo.uri');
                $database = (string) config('audit.platform.mongo.database');

                if (! is_string($uri) || $uri === '') {
                    throw new RuntimeException(
                        'Platform audit driver is "mongodb" but MONGODB_URI is not configured. '
                        .'Provide the Atlas connection (via Secrets Manager/env); never commit it (ADR-003).'
                    );
                }

                // Requires the mongodb PHP extension + mongodb/mongodb driver.
                // A human provisions Atlas/PrivateLink and installs the driver
                // (steering rule 6); not exercised by the test suite.
                $client = new Client($uri);
                $mongoCollection = $client->selectCollection($database, $collectionName);

                return new MongoDBPlatformAuditCollection($mongoCollection, $collectionName);
            }

            // Default: in-memory fake (append-only, same contract). No Mongo.
            return new InMemoryPlatformAuditCollection($collectionName);
        });

        $this->app->singleton(PlatformAuditLogStore::class, function ($app): PlatformAuditLogStore {
            return new MongoPlatformAuditLogStore($app->make(PlatformAuditCollection::class));
        });

        // Initial-admin existence guard (B4 seam): the tenant `users` table and
        // the platform-triggered initial-admin invite do not exist until B4, so
        // the activation guard's existence check is stubbed (defaults to "admin
        // exists"). The guard HOOK in TenantLifecycle is real. B4 replaces this.
        $this->app->bind(InitialAdminChecker::class, StubInitialAdminChecker::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
