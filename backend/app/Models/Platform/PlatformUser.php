<?php

namespace App\Models\Platform;

use App\Platform\PlatformRole;
use Database\Factories\Platform\PlatformUserFactory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * PlatformUser — the PLATFORM plane identity (ADR-007 §1, §4, §8).
 *
 * This is the ONLY platform identity source. It is deliberately separate from
 * the tenant `App\Models\User` (`users` table): there is NO shared/universal
 * user table and NO foreign key between the planes. A tenant user has no row
 * here, and a platform user is never a tenant user.
 *
 * Platform-owned: this model MUST NOT use the `BelongsToTenant` trait/global
 * scope and the `platform_users` table has NO `tenant_id`. Platform actors are
 * cross-tenant by design (ADR-007 §4, §8); applying the tenant scope here would
 * be a cross-plane bug.
 *
 * Authentication guard (`platform` audience) + the `PlatformRole` enum +
 * `PlatformAuthorizer` (role -> `platform.*` permissions) are implemented in
 * B1-03. This model only provides the identity store.
 */
class PlatformUser extends Authenticatable
{
    use HasFactory, Notifiable;

    /**
     * Bind the factory explicitly: the model lives in the `App\Models\Platform`
     * namespace, which Laravel's default factory resolver does not discover.
     */
    protected static function newFactory(): Factory
    {
        return PlatformUserFactory::new();
    }

    /**
     * Explicit table name. The platform identity store is a distinct table
     * from the tenant `users` table — never shared.
     *
     * @var string
     */
    protected $table = 'platform_users';

    /**
     * Mass-assignable attributes.
     *
     * `platform_role` is intentionally included but must only ever be set to
     * one of the fixed Phase-1 values (constrained at the DB layer in the
     * migration; the PlatformRole enum cast arrives with B1-03).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'platform_role',
        'status',
        'mfa_enabled',
        'last_login_at',
    ];

    /**
     * Hidden for serialization — never expose the credential.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Attribute casts.
     *
     * `password` => 'hashed' delegates to the framework hasher, so assigning a
     * plaintext password hashes it automatically (same mechanism as the tenant
     * User model). `platform_role` is cast to the fixed {@see PlatformRole} enum
     * (B1-03): reads return a PlatformRole; writes accept the enum or its backing
     * string. The stored string values are IDENTICAL to the four pinned by B1-02's
     * migration — the cast adds no new values.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'platform_role' => PlatformRole::class,
            'mfa_enabled' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }
}
