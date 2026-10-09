<?php

namespace Tests\Feature\Platform;

use App\Models\Tenant;
use App\Platform\TenantLifecycle;
use App\Platform\TenantLifecycleException;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * B1-04 — HTTP mapping of lifecycle domain errors.
 *
 * Proves that a {@see TenantLifecycleException} thrown from a request maps to
 * HTTP 409 Conflict with the contract `Error` shape
 * (openapi.yaml #/components/schemas/Error):
 *
 *   { "error": { "code": string, "message": string, "request_id"?: string } }
 *
 * A throwaway route is registered that drives the real service into an illegal
 * transition, so the mapping is exercised exactly as a platform endpoint will
 * exercise it in B2/B3 (the exception handler is wired in bootstrap/app.php).
 */
class TenantLifecycleHttpMappingTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Route::get('/__test__/lifecycle/illegal', function () {
            /** @var TenantLifecycle $service */
            $service = app(TenantLifecycle::class);

            $tenant = new Tenant;
            $tenant->status = 'inactive';
            $tenant->forceFill(['id' => 99]);

            // Illegal: no transition out of inactive.
            $service->transition($tenant, 'active', actor: 'platform-user:1', reason: 'x');

            return response()->json(['ok' => true]);
        });
    }

    public function test_illegal_transition_maps_to_409_with_contract_error_shape(): void
    {
        $response = $this->getJson('/__test__/lifecycle/illegal');

        $response->assertStatus(409);

        $response->assertJsonStructure([
            'error' => ['code', 'message'],
        ]);

        $response->assertJsonPath('error.code', TenantLifecycleException::CODE_TERMINAL_STATE);

        // The response must contain nothing but the contract `error` envelope.
        $this->assertSame(['error'], array_keys($response->json()));
    }

    public function test_request_id_header_is_echoed_into_error_when_present(): void
    {
        $response = $this->getJson('/__test__/lifecycle/illegal', [
            'X-Request-Id' => 'req-abc-123',
        ]);

        $response->assertStatus(409);
        $response->assertJsonPath('error.request_id', 'req-abc-123');
    }
}
