<?php

namespace App\Platform;

/**
 * PlatformRole — the FIXED Phase-1 platform role enum (ADR-007 §4, approved decision 6).
 *
 * Phase 1 deliberately uses a hard-coded role enum rather than a configurable
 * `platform_roles` table. There is NO `platform_roles` / `platform_role_permissions`
 * table in Phase 1 — authorization is code-mapped through {@see PlatformAuthorizer}.
 *
 * The backing string values are the authoritative stored values and MUST stay
 * identical to the four values pinned by B1-02's `platform_users` migration
 * (`platform_role` ENUM/CHECK). `PlatformUser::$casts` casts the stored string to
 * this enum.
 *
 * Extension seam (documented, NOT built): when configurable platform RBAC arrives
 * (a future ADR), the enum→permission map in {@see PlatformAuthorizer} is the single
 * place to swap from this in-code map to a table-backed lookup. Call sites authorize
 * through the PlatformAuthorizer and never read this enum's permission set directly,
 * so adding a `platform_roles` table later does not change any call site.
 */
enum PlatformRole: string
{
    case PLATFORM_SUPER_ADMIN = 'PLATFORM_SUPER_ADMIN';
    case PLATFORM_SUPPORT = 'PLATFORM_SUPPORT';
    case PLATFORM_OPERATIONS = 'PLATFORM_OPERATIONS';
    case PLATFORM_AUDITOR = 'PLATFORM_AUDITOR';

    /**
     * All fixed roles. Mirrors (and must stay in sync with) the B1-02 migration's
     * pinned role set.
     *
     * @return list<self>
     */
    public static function all(): array
    {
        return self::cases();
    }
}
