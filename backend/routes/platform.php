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
    // No platform-plane business routes in B1-00 (foundations only).
});
