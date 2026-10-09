<?php

use App\Http\Middleware\DenyByDefault;
use App\Http\Middleware\Platform\AuthorizePlatform;
use App\Http\Middleware\Platform\EnsurePlatformAudience;
use App\Platform\TenantLifecycleException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
        //   - `tenant`   group  -> still DENY-BY-DEFAULT (real guard: B1-05/B1-07).
        //   - `platform` group  -> B1-03: real platform-audience guard replaces the
        //                          DenyByDefault placeholder.
        //
        // Both FAIL CLOSED: a request not provably authorized for the plane is
        // rejected. The only intentionally-open routes are the plane health checks,
        // registered OUTSIDE these groups.
        $middleware->group('tenant', [
            DenyByDefault::class,
        ]);

        // Platform plane (ADR-007 §1, §3). Authenticate via the `platform` guard,
        // which rejects any non-`platform`-audience token and resolves ONLY against
        // the platform_users identity store. Per-endpoint `platform.*` authorization
        // is applied with the `platform.authorize:<permission>` alias below.
        $middleware->group('platform', [
            EnsurePlatformAudience::class,
        ]);

        $middleware->alias([
            'platform.authorize' => AuthorizePlatform::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // B1-04: map tenant lifecycle domain errors (ADR-008) to HTTP 409
        // Conflict with the contract `Error` shape. The exception also
        // self-renders via render(); this registration is a belt-and-braces
        // fallback and the explicit, documented 409 mapping point for the
        // platform plane.
        $exceptions->render(function (TenantLifecycleException $e, Request $request): JsonResponse {
            return $e->render($request);
        });
    })->create();
