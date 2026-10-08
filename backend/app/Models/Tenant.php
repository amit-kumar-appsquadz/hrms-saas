<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use RuntimeException;

/**
 * Tenant registry (ADR-008 lifecycle, ADR-007 platform plane).
 *
 * PLATFORM-OWNED: this model intentionally does NOT use the `BelongsToTenant`
 * trait / tenant global scope. The `tenants` table has no `tenant_id`; it is the
 * registry the tenant resolver reads, so scoping it to a tenant would be a
 * bootstrap paradox. Any future tenant-scoped behaviour must NOT be added here.
 *
 * Lifecycle status values are the authoritative ADR-008 set
 * (provisioning|trial|active|suspended|inactive); `pending` does not exist.
 *
 * @property string $subdomain
 * @property string $status
 */
class Tenant extends Model
{
    use HasFactory;

    /**
     * Authoritative ADR-008 lifecycle statuses. Single source of truth for the
     * model layer (the DB enum mirrors this on MySQL; sqlite stores a string).
     *
     * @var list<string>
     */
    public const STATUSES = ['provisioning', 'trial', 'active', 'suspended', 'inactive'];

    /**
     * Statuses that permit tenant login (ADR-008). Used by the resolver (B1-05).
     *
     * @var list<string>
     */
    public const LOGIN_ALLOWED_STATUSES = ['trial', 'active'];

    /**
     * Mass-assignable attributes. `subdomain` is present so it can be set on
     * CREATE, but it is immutable afterwards — enforced in booted() below.
     *
     * @var list<string>
     */
    protected $fillable = [
        'subdomain',
        'name',
        'status',
        'plan',
        'region',
        'primary_contact',
        'contact_email',
        'trial_ends_at',
        'suspended_at',
        'suspended_reason',
        'offboarded_at',
        'db_connection',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'trial_ends_at' => 'datetime',
            'suspended_at' => 'datetime',
            'offboarded_at' => 'datetime',
        ];
    }

    /**
     * Model boot hooks: enforce subdomain immutability (ADR-008 — no arbitrary
     * post-creation renaming in Phase 1).
     */
    protected static function booted(): void
    {
        static::updating(function (Tenant $tenant): void {
            if ($tenant->isDirty('subdomain')) {
                throw new RuntimeException(
                    'Tenant subdomain is immutable after creation (ADR-008).'
                );
            }
        });
    }

    /**
     * Whether this tenant's status permits login (ADR-008).
     */
    public function canLogin(): bool
    {
        return in_array($this->status, self::LOGIN_ALLOWED_STATUSES, true);
    }
}
