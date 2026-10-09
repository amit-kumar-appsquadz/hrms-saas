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

// Tenant-plane group: host/tenant resolution (fail-closed) + tenant-audience
// auth gate (B1-05 + B1-07). Any route here requires a resolvable tenant AND a
// valid `tenant`-audience token for that tenant.
Route::middleware('tenant')->group(function () {
    // Minimal authenticated probe used by the B1-07 feature tests to exercise
    // the gate end-to-end (audience accept/reject, platform-token rejection,
    // cross-tenant rejection). No business logic — real tenant endpoints land
    // in B2/B3.
    Route::get('/_probe', function (Request $request) {
        $user = \Illuminate\Support\Facades\Auth::guard('tenant')->user();

        return response()->json([
            'plane' => 'tenant',
            'tenant_id' => app(\App\Tenancy\TenantContext::class)->tenantId(),
            'user_id' => $user?->getAuthIdentifier(),
        ]);
    })->name('tenant.probe');
});
