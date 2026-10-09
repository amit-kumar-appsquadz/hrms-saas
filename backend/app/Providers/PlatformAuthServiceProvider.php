<?php

namespace App\Providers;

use App\Auth\PlatformGuard;
use Illuminate\Contracts\Auth\Guard;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;

/**
 * PlatformAuthServiceProvider — registers the custom `platform` auth guard driver
 * (B1-03).
 *
 * The `platform` guard (config/auth.php → guards.platform) uses this driver. It
 * builds a {@see PlatformGuard} bound to the `platform_users` user provider, so
 * the platform plane authenticates ONLY against the platform identity store and
 * enforces the `platform` token audience (ADR-007 §1, §3).
 *
 * Resolved per-request (not a singleton) because it depends on the current
 * Request's bearer token.
 */
class PlatformAuthServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Auth::extend('platform', function ($app, string $name, array $config): Guard {
            $provider = Auth::createUserProvider($config['provider'] ?? null);

            return new PlatformGuard($provider, $app['request']);
        });
    }
}
