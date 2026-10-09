<?php

namespace App\Providers;

use App\Platform\Audit\InMemoryPlatformAuditLogStore;
use App\Platform\Audit\PlatformAuditLogStore;
use App\Platform\InitialAdminChecker;
use App\Platform\StubInitialAdminChecker;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // --- B1-04 tenant lifecycle seams (temporary bindings) ---------------
        //
        // Platform audit store (B1-09 seam): until the real append-only Mongo
        // `platform_audit_logs` store ships (B1-09), bind an in-memory
        // implementation so lifecycle transitions still emit — and tests can
        // assert — a platform-audit event. B1-09 replaces this binding.
        $this->app->singleton(PlatformAuditLogStore::class, InMemoryPlatformAuditLogStore::class);

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
