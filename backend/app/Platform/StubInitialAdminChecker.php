<?php

namespace App\Platform;

use App\Models\Tenant;

/**
 * Stub for {@see InitialAdminChecker}, used until B4 builds the tenant `users`
 * table and the platform-triggered initial-admin invite.
 *
 * Default behaviour: reports that an initial admin EXISTS (returns true), so the
 * activation guard hook is exercised end-to-end without blocking the B1
 * foundations build (there is no tenant `users` table to query yet). The guard
 * HOOK is real and wired; only the existence check is stubbed.
 *
 * The stub value is overridable (per instance) so tests can drive the
 * guard-fails path and prove the activation guard rejects when no admin exists.
 *
 * B4 INTEGRATION POINT: delete this stub and bind a real checker.
 */
final class StubInitialAdminChecker implements InitialAdminChecker
{
    public function __construct(private readonly bool $exists = true) {}

    public function hasInitialAdmin(Tenant $tenant): bool
    {
        return $this->exists;
    }
}
