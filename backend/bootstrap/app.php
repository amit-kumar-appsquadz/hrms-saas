<?php

use App\Http\Middleware\DenyByDefault;
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
        // Two plane middleware groups, both DENY-BY-DEFAULT in B1-00.
        //
        // These are the empty placeholder groups referenced by the B1 plan. The
        // real guards replace the DenyByDefault placeholder here:
        //   - `platform` group  -> B1-03 (platform audience + identity + authorizer)
        //   - `tenant`   group  -> B1-05/B1-07 (host/tenant context + tenant audience)
        //
        // They must FAIL CLOSED: any route placed in a plane group is rejected until
        // its guard lands. The only intentionally-open routes are the plane health
        // checks, which are registered OUTSIDE these groups.
        $middleware->group('tenant', [
            DenyByDefault::class,
        ]);

        $middleware->group('platform', [
            DenyByDefault::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
