<?php

use App\Http\Middleware\DenyByDefault;
use App\Http\Middleware\Platform\AuthorizePlatform;
use App\Http\Middleware\Platform\EnsurePlatformAudience;
use App\Http\Middleware\EnsureTenantAudience;
use App\Http\Middleware\ResolveTenant;
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
            Route::middleware('api')
                ->prefix('api/v1')
                ->group(base_path('routes/api.php'));

            Route::middleware('api')
                ->prefix('api/v1/platform')
                ->group(base_path('routes/platform.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Tenant plane: resolve tenant first, then authenticate tenant audience.
        // Both fail closed.
        $middleware->group('tenant', [
            ResolveTenant::class.':required',
            EnsureTenantAudience::class,
        ]);

        // Platform plane: authenticate platform audience and identity.
        // Authorization is applied per endpoint through the alias below.
        $middleware->group('platform', [
            EnsurePlatformAudience::class,
        ]);

        $middleware->alias([
            'platform.authorize' => AuthorizePlatform::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Map tenant lifecycle domain errors to HTTP 409.
        $exceptions->render(function (TenantLifecycleException $e, Request $request): JsonResponse {
            return $e->render($request);
        });
    })->create();
