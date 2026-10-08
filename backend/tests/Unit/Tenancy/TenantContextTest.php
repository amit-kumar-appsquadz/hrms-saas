<?php

namespace Tests\Unit\Tenancy;

use App\Tenancy\TenantContext;
use App\Tenancy\TenantResolutionException;
use Tests\TestCase;

/**
 * B1-05 — TenantContext fail-closed invariants.
 */
class TenantContextTest extends TestCase
{
    public function test_starts_empty_with_no_default_tenant(): void
    {
        $ctx = new TenantContext;

        $this->assertFalse($ctx->hasTenant());
        $this->assertNull($ctx->tenantId());
        $this->assertNull($ctx->subdomain());
    }

    public function test_require_tenant_id_throws_when_empty(): void
    {
        $ctx = new TenantContext;

        $this->expectException(TenantResolutionException::class);
        $ctx->requireTenantId();
    }

    public function test_set_and_read_tenant(): void
    {
        $ctx = new TenantContext;
        $tenant = (object) ['id' => 7, 'subdomain' => 'acme'];

        $ctx->setTenant(7, 'acme', $tenant);

        $this->assertTrue($ctx->hasTenant());
        $this->assertSame(7, $ctx->tenantId());
        $this->assertSame(7, $ctx->requireTenantId());
        $this->assertSame('acme', $ctx->subdomain());
        $this->assertSame($tenant, $ctx->tenant());
    }

    public function test_reset_clears_tenant(): void
    {
        $ctx = new TenantContext;
        $ctx->setTenant(7, 'acme');

        $ctx->reset();

        $this->assertFalse($ctx->hasTenant());
        $this->assertNull($ctx->tenantId());
    }
}
