<?php

namespace Tests\Feature\Tenancy;

use App\Http\Middleware\ResolveTenant;
use App\Tenancy\TenantResolver;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * B1-05 — the REAL lookup seam (no fake). Proves the integration assumption:
 * when B1-01's `App\Models\Tenant` model / `tenants` table is NOT present in
 * this worktree, the resolver fails closed (no tenant), and a candidate tenant
 * subdomain reports "unavailable" (non-enumerating) rather than guessing.
 *
 * When B1-01 lands this behaviour flips automatically: the model becomes
 * resolvable, the table exists, and real tenants resolve — no code change here.
 */
class TenantResolverSeamTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Config::set('tenancy.base_domain', 'app.example.com');
        Config::set('tenancy.reserved_labels', ['app', 'www', 'platform', 'admin', 'api', 'static']);
        Config::set('tenancy.serveable_statuses', ['trial', 'active']);

        Route::middleware(ResolveTenant::class)->get('/__seam/soft', fn () => response()->json(['ok' => true]));
    }

    public function test_real_resolver_reports_table_unavailable_without_b1_01(): void
    {
        $resolver = $this->app->make(TenantResolver::class);

        // In this worktree B1-01 is not merged: no Tenant model and no table.
        // The guard must report unavailable so lookups fail closed.
        $this->assertFalse(
            $resolver->tenantsTableAvailable(),
            'Expected tenants table/model to be unavailable in the B1-05 worktree '
            .'(B1-01 is a parallel wave-1 task). If this fails, B1-01 may have been '
            .'merged — update the integration note.'
        );
    }

    public function test_candidate_subdomain_fails_closed_when_table_absent(): void
    {
        // A plausible tenant label, but with no `tenants` table it must resolve
        // to "unavailable" (non-enumerating), never a default/guessed tenant.
        $this->getJson('http://acme.app.example.com/__seam/soft')
            ->assertNotFound()
            ->assertJson(['error' => ['code' => 'tenant_unavailable']]);
    }

    public function test_base_host_still_resolves_to_no_tenant_when_table_absent(): void
    {
        // Base/reserved hosts never hit the lookup, so they still pass through.
        $this->getJson('http://app.example.com/__seam/soft')
            ->assertOk()
            ->assertJson(['ok' => true]);
    }
}
