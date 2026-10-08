<?php

namespace Tests\Feature\Tenancy;

use App\Http\Middleware\ResolveTenant;
use App\Tenancy\TenantContext;
use App\Tenancy\TenantResolver;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Route;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * B1-05 — host/tenant resolution + reserved/base-host fail-closed (ADR-001
 * amendment, ADR-007 §1, ADR-008 status gating).
 *
 * The suite proves the acceptance matrix WITHOUT depending on B1-01's `Tenant`
 * model/schema (parallel wave-1 task). It swaps the lookup seam
 * ({@see TenantResolver}) for an in-memory fake, so these tests exercise the
 * middleware's routing + fail-closed + status-gate logic deterministically with
 * no DB and no cloud calls. A separate test proves the REAL resolver fails
 * closed when B1-01 is absent.
 */
class ResolveTenantTest extends TestCase
{
    private FakeTenantResolver $fakeResolver;

    protected function setUp(): void
    {
        parent::setUp();

        Config::set('tenancy.base_domain', 'app.example.com');
        Config::set('tenancy.reserved_labels', ['app', 'www', 'platform', 'admin', 'api', 'static']);
        Config::set('tenancy.serveable_statuses', ['trial', 'active']);

        // Swap the lookup seam for an in-memory fake with a known tenant set.
        $this->fakeResolver = new FakeTenantResolver([
            'acme' => (object) ['id' => 101, 'subdomain' => 'acme', 'status' => 'active', 'db_connection' => null],
            'globex' => (object) ['id' => 102, 'subdomain' => 'globex', 'status' => 'trial', 'db_connection' => null],
            'initech' => (object) ['id' => 103, 'subdomain' => 'initech', 'status' => 'suspended', 'db_connection' => null],
            'umbrella' => (object) ['id' => 104, 'subdomain' => 'umbrella', 'status' => 'provisioning', 'db_connection' => null],
            'soylent' => (object) ['id' => 105, 'subdomain' => 'soylent', 'status' => 'inactive', 'db_connection' => null],
        ]);
        $this->app->instance(TenantResolver::class, $this->fakeResolver);

        // Probe routes exercising the middleware in both modes.
        Route::middleware(ResolveTenant::class)->get('/__t/soft', function (TenantContext $ctx) {
            return response()->json([
                'has_tenant' => $ctx->hasTenant(),
                'tenant_id' => $ctx->tenantId(),
                'subdomain' => $ctx->subdomain(),
            ]);
        });

        Route::middleware(ResolveTenant::class.':required')->get('/__t/required', function (TenantContext $ctx) {
            return response()->json([
                'has_tenant' => $ctx->hasTenant(),
                'tenant_id' => $ctx->tenantId(),
            ]);
        });
    }

    private function on(string $host, string $uri = '/__t/soft')
    {
        // Drive the request through an absolute URL so Request::getHost()
        // reflects the tenant subdomain under test (a bare Host header is not
        // honoured by the test client's host resolution).
        return $this->getJson('http://'.$host.$uri);
    }

    // --- Resolution matrix ---------------------------------------------------

    public function test_tenant_subdomain_resolves_to_tenant(): void
    {
        $this->on('acme.app.example.com')
            ->assertOk()
            ->assertJson(['has_tenant' => true, 'tenant_id' => 101, 'subdomain' => 'acme']);
    }

    public function test_trial_tenant_is_serveable(): void
    {
        $this->on('globex.app.example.com')
            ->assertOk()
            ->assertJson(['has_tenant' => true, 'tenant_id' => 102]);
    }

    public function test_base_apex_host_resolves_to_no_tenant(): void
    {
        $this->on('app.example.com')
            ->assertOk()
            ->assertJson(['has_tenant' => false, 'tenant_id' => null]);
    }

    #[DataProvider('reservedLabels')]
    public function test_reserved_labels_resolve_to_no_tenant(string $label): void
    {
        $this->on($label.'.app.example.com')
            ->assertOk()
            ->assertJson(['has_tenant' => false, 'tenant_id' => null]);
    }

    public static function reservedLabels(): array
    {
        return [
            ['app'], ['www'], ['platform'], ['admin'], ['api'], ['static'],
        ];
    }

    public function test_unknown_subdomain_is_not_found_and_non_enumerating(): void
    {
        $this->on('does-not-exist.app.example.com')
            ->assertNotFound()
            ->assertJson(['error' => ['code' => 'tenant_unavailable']]);
    }

    public function test_deep_or_unrelated_host_resolves_to_no_tenant(): void
    {
        // Nested label is not a Phase-1 tenant host.
        $this->on('a.b.app.example.com')
            ->assertOk()
            ->assertJson(['has_tenant' => false]);

        // Unrelated host (dev localhost / unmapped custom domain).
        $this->on('localhost')
            ->assertOk()
            ->assertJson(['has_tenant' => false]);
    }

    // --- Fail-closed ---------------------------------------------------------

    public function test_required_mode_fails_closed_on_base_host(): void
    {
        $this->getJson('http://app.example.com/__t/required')
            ->assertStatus(400)
            ->assertJson(['error' => ['code' => 'tenant_required']]);
    }

    public function test_required_mode_fails_closed_on_reserved_host(): void
    {
        $this->getJson('http://platform.app.example.com/__t/required')
            ->assertStatus(400)
            ->assertJson(['error' => ['code' => 'tenant_required']]);
    }

    public function test_required_mode_never_defaults_to_a_tenant(): void
    {
        // No tenant resolvable -> fail closed; MUST NOT pick any tenant.
        $response = $this->getJson('http://app.example.com/__t/required');
        $response->assertStatus(400);
        $this->assertArrayNotHasKey('tenant_id', $response->json());
    }

    public function test_required_mode_resolves_a_real_tenant(): void
    {
        $this->getJson('http://acme.app.example.com/__t/required')
            ->assertOk()
            ->assertJson(['has_tenant' => true, 'tenant_id' => 101]);
    }

    // --- Status gating (ADR-008), non-enumerating ---------------------------

    #[DataProvider('nonServeableTenants')]
    public function test_non_serveable_statuses_are_refused_non_enumerating(string $host): void
    {
        // Same shape/status as an unknown subdomain -> cannot tell them apart.
        $this->on($host.'.app.example.com')
            ->assertNotFound()
            ->assertJson(['error' => ['code' => 'tenant_unavailable']]);
    }

    public static function nonServeableTenants(): array
    {
        return [
            'suspended' => ['initech'],
            'provisioning' => ['umbrella'],
            'inactive' => ['soylent'],
        ];
    }

    public function test_unknown_and_suspended_return_identical_response(): void
    {
        $unknown = $this->on('nope.app.example.com');
        $suspended = $this->on('initech.app.example.com');

        $this->assertSame($unknown->status(), $suspended->status());
        $this->assertSame($unknown->json(), $suspended->json());
    }
}

/**
 * In-memory lookup seam for the host-resolution tests. Mirrors
 * TenantResolver::findBySubdomain() without touching the DB or B1-01's model.
 */
class FakeTenantResolver extends TenantResolver
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
