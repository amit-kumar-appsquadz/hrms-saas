<?php

namespace App\Tenancy\Audit;

/**
 * Seam for the TENANT-plane audit store (B1-11).
 *
 * Tenant-side callers (B1-10 double-audit, B1-04 tenant wiring, future
 * domain services) depend ONLY on this narrow contract to record an audit event
 * without knowing where it is written. The real append-only MongoDB
 * implementation ({@see MongoAuditLogStore}) writes to the SEPARATE tenant
 * `audit_logs` collection — never the platform `platform_audit_logs` collection
 * (ADR-007 §7, ADR-003 "audit behind an interface").
 *
 * This is the tenant mirror of the platform-side `PlatformAuditLogStore`
 * (B1-09); the two are deliberately parallel so the planes reconcile at merge.
 *
 * TENANT SCOPE + FAIL-CLOSED
 * --------------------------
 *   - `record()` stamps the event with the CURRENTLY resolved tenant_id (from
 *     TenantContext). With no resolved tenant it FAILS CLOSED (throws) rather
 *     than writing a tenant-less event.
 *   - `forTenant()` reads back events for the currently resolved tenant only.
 *     With no resolved tenant it FAILS CLOSED (throws) rather than returning
 *     every tenant's events. A read for tenant A can never surface tenant B's
 *     events (cross-tenant isolation enforced at the store).
 *
 * APPEND-ONLY: this interface exposes `record()` and a read; there is NO
 * update/delete method. Immutability is a security requirement (ADR-007 §7).
 */
interface AuditLogStore
{
    /**
     * Append a single tenant-audit event for the CURRENTLY resolved tenant.
     * Implementations are append-only and stamp `tenant_id` from the resolved
     * tenant context (fail-closed when no tenant is resolved).
     */
    public function record(TenantAuditEvent $event): void;

    /**
     * Read back the tenant-audit documents for the CURRENTLY resolved tenant,
     * newest-first. Implementations MUST filter by the resolved `tenant_id` and
     * MUST fail closed when no tenant is resolved (never return all tenants'
     * events). Foundation-only read path; the full viewer/query API is B5.
     *
     * @return list<array<string,mixed>>
     */
    public function forTenant(): array;
}
