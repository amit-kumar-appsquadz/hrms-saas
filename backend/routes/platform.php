<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Platform plane routes (/api/v1/platform/*)
|--------------------------------------------------------------------------
|
| These routes serve the PLATFORM plane. In production they are reached on the
| base domain (app.example.com/api/v1/platform/*) per the OpenAPI contract
| `servers` block and ADR-007 (platform vs tenant plane). The platform auth
| guard (audience "platform") and PlatformAuthorizer land in B1-03.
|
| In B1-00 everything here (except health) sits behind the `platform` middleware
| group, which is DENY-BY-DEFAULT until B1-03 wires the real guard. No business
| logic is added in this task.
|
| NOTE: these routes are registered with the `/api/v1/platform` prefix in
| bootstrap/app.php, keeping them a strict, server-side-separate namespace from
| the tenant plane (not merely a path convention).
|
*/

// Intentionally-open operational health check for the platform plane.
// This is the ONLY open platform-plane route in B1-00. Separate handler from the
// tenant health route so the two planes resolve through distinct route files/groups.
Route::get('/health', function (Request $request) {
    return response()->json([
        'status' => 'ok',
        'plane' => 'platform',
    ]);
})->name('platform.health');

// Deny-by-default placeholder group. Real platform-plane endpoints are added by
// later B1 tasks behind the `platform` guard.
Route::middleware('platform')->group(function () {
    // B1-03 probe route: NOT a business endpoint. It exists so the plane boundary
    // (platform-audience guard + per-permission authorizer) is exercised end-to-end
    // through the real middleware stack by the feature tests. Requires a valid
    // platform-audience token (EnsurePlatformAudience) AND the `platform.dashboard.view`
    // permission (platform.authorize). Real endpoints land in B2+.
    Route::get('/_probe', function () {
        return response()->json([
            'plane' => 'platform',
            'actor' => optional(auth('platform')->user())->getAuthIdentifier(),
        ]);
    })
        ->middleware('platform.authorize:platform.dashboard.view')
        ->name('platform.probe');

    // Second probe guarding a high-privilege permission (`platform.user.manage`,
    // granted only to PLATFORM_SUPER_ADMIN) so the per-permission authorizer's
    // 403 path is exercised end-to-end.
    Route::get('/_probe-manage', function () {
        return response()->json(['plane' => 'platform', 'scope' => 'user.manage']);
    })
        ->middleware('platform.authorize:platform.user.manage')
        ->name('platform.probe.manage');
});
