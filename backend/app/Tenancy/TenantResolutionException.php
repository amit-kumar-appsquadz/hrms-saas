<?php

namespace App\Tenancy;

use RuntimeException;

/**
 * TenantResolutionException (B1-05)
 * ---------------------------------
 * Thrown when tenant-scoped code requires a tenant but none is resolved
 * (fail-closed). This is an INTERNAL guard signal — it indicates a tenant-scoped
 * consumer ran without a tenant context, which should never happen on a
 * correctly routed request. It is distinct from the HTTP-facing responses the
 * middleware returns for base/reserved/unknown/non-serveable hosts.
 *
 * See TenantContext::requireTenantId().
 */
class TenantResolutionException extends RuntimeException {}
