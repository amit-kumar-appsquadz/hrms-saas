<?php

namespace App\Platform;

use App\Models\Tenant;

/**
 * Guard seam for the ADR-008 activation precondition "an initial Tenant Admin
 * exists".
 *
 * ADR-008: activating a tenant (`provisioning → trial|active`) requires that
 * provisioning is complete AND an initial admin has been created/invited. The
 * initial admin is a tenant-plane `users` row created via a platform-triggered
 * invite — that cross-plane write and the tenant `users` table do NOT exist yet
 * (they arrive in B4). So the admin-existence check is STUBBED here behind this
 * interface; the GUARD HOOK is wired into {@see TenantLifecycle} now.
 *
 * B4 INTEGRATION POINT: replace the stub binding with an implementation that
 * checks for an active/invited initial admin in the tenant's `users` table.
 */
interface InitialAdminChecker
{
    /**
     * Whether the given tenant has an initial admin (invited or active).
     */
    public function hasInitialAdmin(Tenant $tenant): bool;
}
