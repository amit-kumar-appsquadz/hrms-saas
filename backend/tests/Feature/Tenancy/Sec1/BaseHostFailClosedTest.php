<?php

namespace Tests\Feature\Tenancy\Sec1;

use App\Http\Middleware\ResolveTenant;
use App\Tenancy\TenantContext;
use App\Tenancy\TenantResolver;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Route;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * SEC-1 EVIDENCE — Invariant 4: base/reserved host carries NO tenant (fail-closed).
 * --------------------------------------------------------------------------------
 * B1-12 (QA) SEC-1 harness (B1_PLAN §6.4; ADR-001 amendment, ADR-007 §1). The host
 * is a ROUTING concern, never the security boundary, and it must NEVER silently
 * default to a tenant. This suite proves:
 *
 *   - a real tenant subdomain resolves to exactly that tenant;
 *   - the base/apex host resolves to NO tenant;
 *   - every reserved label (app/www/platform/admin/api/static) resolves to NO tenant;
 *   - a tenant-scoped (required) request with no resolvable tenant FAILS CLOSED
 *     (HTTP 400) and never carries a tenant_id — i.e. no default tenant.
 *
 * Uses an in-memory lookup seam (no DB dependency on B1-01) so the evidence is
 * deterministic with no cloud calls.
 */
final class BaseHostFailClosedTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Config::set('tenancy.base_domain', 'app.example.com');
        Config::set('tenancy.reserved_labels', ['app', 'www', 'platform', 'admin', 'api', 'static']);
        Config::set('tenancy.serveable_statuses', ['trial', 'active']);

        $this->app->instance(TenantResolver::class, new Sec1FakeResolver([
            'acme' => (object) ['id' => 101, 'subdomain' => 'acme', 'status' => 'active', 'db_connection' => null],
        ]));

        Route::middleware(ResolveTenant::class)->get('/__sec1/soft', function (TenantContext $ctx) {
            return response()->json([
                'has_tenant' => $ctx->hasTenant(),
                'tenant_id' => $ctx->tenantId(),
            ]);
        });

        Route::middleware(ResolveTenant::class.':required')->get('/__sec1/required', function (TenantContext $ctx) {
            return response()->json([
                'has_tenant' => $ctx->hasTenant(),
                'tenant_id' => $ctx->tenantId(),
            ]);
        });
    }

    private function on(string $host, string $uri = '/__sec1/soft')
    {
        return $this->getJson('http://'.$host.$uri);
    }

    public function test_real_tenant_subdomain_resolves_to_that_tenant(): void
    {
        $this->on('acme.app.example.com')
            ->assertOk()
            ->assertJson(['has_tenant' => true, 'tenant_id' => 101]);
    }

    public function test_base_apex_host_carries_no_tenant(): void
    {
        $this->on('app.example.com')
            ->assertOk()
            ->assertJson(['has_tenant' => false, 'tenant_id' => null]);
    }

    #[DataProvider('reservedLabels')]
    public function test_reserved_label_carries_no_tenant(string $label): void
    {
        $this->on($label.'.app.example.com')
            ->assertOk()
            ->assertJson(['has_tenant' => false, 'tenant_id' => null]);
    }

    public static function reservedLabels(): array
    {
        return [['app'], ['www'], ['platform'], ['admin'], ['api'], ['static']];
    }

    public function test_tenant_scoped_request_fails_closed_on_base_host(): void
    {
        $this->getJson('http://app.example.com/__sec1/required')
            ->assertStatus(400)
            ->assertJson(['error' => ['code' => 'tenant_required']]);
    }

    public function test_tenant_scoped_request_fails_closed_on_reserved_host(): void
    {
        $this->getJson('http://platform.app.example.com/__sec1/required')
            ->assertStatus(400)
            ->assertJson(['error' => ['code' => 'tenant_required']]);
    }

    public function test_fail_closed_never_defaults_to_a_tenant(): void
    {
        $response = $this->getJson('http://app.example.com/__sec1/required');

        $response->assertStatus(400);
        // The absence of any tenant_id in the response is the "no default tenant"
        // guarantee: there is no silent fallback tenant.
        $this->assertArrayNotHasKey('tenant_id', $response->json());
    }
}

/**
 * In-memory lookup seam so the SEC-1 host evidence has no DB/B1-01 dependency.
 */
final class Sec1FakeResolver extends TenantResolver
{
    /** @param array<string, object> $tenants */
    public function __construct(private array $tenants) {}

    public function findBySubdomain(string $subdomain): ?object
    {
        return $this->tenants[$subdomain] ?? null;
    }

    public function tenantsTableAvailable(): bool
    {
        return true;
    }
}
