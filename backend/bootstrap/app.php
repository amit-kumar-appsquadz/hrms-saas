<?php

use App\Http\Middleware\DenyByDefault;
use App\Http\Middleware\EnsureTenantAudience;
use App\Http\Middleware\ResolveTenant;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            // Tenant plane: /api/v1/* (routes/api.php).
            Route::middleware('api')
                ->prefix('api/v1')
                ->group(base_path('routes/api.php'));

            // Platform plane: /api/v1/platform/* (routes/platform.php).
            // Strict, server-side-separate namespace from the tenant plane (ADR-007).
            Route::middleware('api')
                ->prefix('api/v1/platform')
                ->group(base_path('routes/platform.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Two plane middleware groups.
        //
        //   - `tenant`   group  -> B1-05 host/tenant resolution (fail-closed) +
        //                          B1-07 tenant-audience auth gate.
        //   - `platform` group  -> B1-03 (platform audience + identity + authorizer);
        //                          still DENY-BY-DEFAULT in this worktree (B1-03 is a
        //                          parallel task not merged here).
        //
        // Both MUST FAIL CLOSED: a request on a plane group is rejected unless it
        // satisfies that plane's guard. The only intentionally-open routes are the
        // plane health checks, registered OUTSIDE these groups.
        //
        // Tenant group composition (order matters):
        //   1. ResolveTenant in `required` mode binds exactly one tenant from the
        //      host or fails closed (400) — never a default tenant.
        //   2. EnsureTenantAudience authenticates the `tenant`-audience token
        //      WITHIN that resolved tenant (401 otherwise), rejecting platform
        //      tokens and cross-tenant users.
        $middleware->group('tenant', [
            ResolveTenant::class.':required',
            EnsureTenantAudience::class,
        ]);

        $middleware->group('platform', [
            DenyByDefault::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
