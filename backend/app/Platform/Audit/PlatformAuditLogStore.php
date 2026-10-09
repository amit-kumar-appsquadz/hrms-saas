<?php

namespace App\Platform\Audit;

use App\Providers\TenancyServiceProvider;

/**
 * Seam for the platform-plane audit store (B1-09).
 *
 * The tenant lifecycle service (B1-04) depends ONLY on this narrow contract so
 * it can record an audit event per transition without knowing where it is
 * written. The real append-only MongoDB implementation
 * (`MongoPlatformAuditLogStore`, writing to the separate `platform_audit_logs`
 * collection — ADR-007 §7) arrives in B1-09.
 *
 * Until B1-09 lands, a null/in-memory implementation is bound (see
 * {@see TenancyServiceProvider}) so lifecycle transitions still
 * emit — and tests can assert — an audit event.
 *
 * B1-09 INTEGRATION POINT: replace the temporary binding with the Mongo store;
 * this interface must stay append-only (record only — no update/delete).
 */
interface PlatformAuditLogStore
{
    /**
     * Append a single platform-audit event. Implementations are append-only.
     */
    public function record(PlatformAuditEvent $event): void;
}
