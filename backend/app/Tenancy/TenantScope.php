<?php

namespace App\Tenancy;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * TenantScope (B1-06) — the global scope that enforces tenant isolation.
 * ----------------------------------------------------------------------
 * Adds `WHERE {qualified tenant_id} = {current tenant}` to every query on a
 * model using {@see BelongsToTenant}.
 *
 * FAIL-CLOSED: the current tenant is read via
 * {@see TenantContext::requireTenantId()}, which throws when none is resolved.
 * We deliberately do NOT short-circuit to "no filter" when the context is empty
 * — that would return every tenant's rows (a cross-tenant leak). Absence of a
 * tenant is an error, surfaced to the caller, not a silent widening. "No tenant
 * = all rows" is forbidden (steering rule 2, ADR-001).
 *
 * The ONLY way to remove this scope is the explicit, documented, tested
 * {@see BelongsToTenant::withoutTenantScope()} helper.
 */
class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        /** @var TenantContext $context */
        $context = app(TenantContext::class);

        // FAIL-CLOSED: no resolved tenant -> throw, never "all tenants".
        $tenantId = $context->requireTenantId();

        $column = method_exists($model, 'tenantIdColumn')
            ? $model::tenantIdColumn()
            : 'tenant_id';

        $builder->where($model->qualifyColumn($column), $tenantId);
    }
}
