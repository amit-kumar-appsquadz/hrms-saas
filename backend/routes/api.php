<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Tenant plane routes (/api/v1/*)
|--------------------------------------------------------------------------
|
| These routes serve the TENANT plane. In production they are reached via a
| per-tenant subdomain (<tenant>.app.example.com/api/v1/*) per the OpenAPI
| contract `servers` block. Host/tenant resolution lands in B1-05; the tenant
| auth guard (audience "tenant") lands in B1-07.
|
| In B1-00 everything here (except health) sits behind the `tenant` middleware
| group, which is DENY-BY-DEFAULT until B1-07 wires the real guard. No business
| logic is added in this task.
|
*/

// Intentionally-open operational health check for the tenant plane.
// This is the ONLY open tenant-plane route in B1-00. It does not read tenant
// context and performs no DB work (sub-millisecond, no cloud calls).
Route::get('/health', function (Request $request) {
    return response()->json([
        'status' => 'ok',
        'plane' => 'tenant',
    ]);
})->name('tenant.health');

// Deny-by-default placeholder group. Real tenant-plane endpoints are added by
// later B1/B2/B3 tasks behind the `tenant` guard.
Route::middleware('tenant')->group(function () {
    // No tenant-plane business routes in B1-00 (foundations only).
});
