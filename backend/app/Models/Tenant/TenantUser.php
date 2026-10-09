<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;

/**
 * TenantUser (B1-07 stub) — the TENANT-plane identity.
 * ----------------------------------------------------
 * A tenant user lives in the tenant-owned `users` table and is identified ONLY
 * within its tenant (`tenant_id` + `email`). This is a SEPARATE identity from
 * the platform identity store (`platform_users`, B1-02): there is deliberately
 * NO shared/universal user table (ADR-007 §1, §8). A platform operator has no
 * row here and a tenant user has no row in `platform_users`.
 *
 * SCOPE (B1 = foundations only, B1_PLAN §0 / §B1-07):
 *   This is a minimal stub for the tenant auth guard to resolve against. The
 *   full tenant user model (profile, RBAC, invites, encrypted PII) is B2/B3.
 *   Only `id, tenant_id, email, password, status, name` matter here.
 *
 * TENANCY (steering rule 2 — the isolation mechanism):
 *   `users` is a TENANT-OWNED table (`tenant_id`, composite indexes starting
 *   with `tenant_id`). The `App\Tenancy\BelongsToTenant` global scope (B1-06)
 *   must auto-filter every query here by the resolved tenant and auto-fill
 *   `tenant_id` on insert. That trait is NOT present in this task's base branch
 *   (built on agent/B1-05; B1-06 is a parallel wave-2 task — see
 *   docs/notes/B1-07.md), so it is NOT applied here to avoid reimplementing it.
 *
 *   DOES THIS LEAVE A GAP? No. The {@see \App\Auth\TenantGuard} does NOT rely on
 *   the global scope for isolation: it resolves the subject EXPLICITLY scoped to
 *   the tenant currently bound in {@see \App\Tenancy\TenantContext} and
 *   additionally re-checks the resolved row's `tenant_id` against the context
 *   (the "double check"). Cross-tenant authentication is therefore rejected with
 *   or without the global scope. When B1-06 is integrated, add
 *   `use \App\Tenancy\BelongsToTenant;` to this model for defence-in-depth on
 *   all OTHER tenant queries; the guard's explicit check remains.
 */
class TenantUser extends Authenticatable
{
    use HasFactory;

    /**
     * This stub maps onto the scaffold `users` table (converted to tenant-owned
     * by the B1-07 migration). B2 may rename/extend; the table name is pinned
     * here so the guard and the generic App\Models\User do not diverge silently.
     */
    protected $table = 'users';

    /**
     * Mass-assignable attributes for the stub. `tenant_id` is intentionally NOT
     * fillable from request input — it is set from the resolved tenant context
     * (by the BelongsToTenant trait once integrated, or explicitly in factories/
     * seeders), never from user-supplied data.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'status',
    ];

    /**
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    /**
     * Whether this tenant user is in a state that may authenticate. Full status
     * semantics (invited/disabled/locked) are B2; the stub treats only `active`
     * as authenticatable.
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Create a dedicated factory for the stub (tenant-scoped — the caller must
     * provide `tenant_id` so a user is never created outside a tenant).
     */
    protected static function newFactory(): \Database\Factories\Tenant\TenantUserFactory
    {
        return \Database\Factories\Tenant\TenantUserFactory::new();
    }
}
