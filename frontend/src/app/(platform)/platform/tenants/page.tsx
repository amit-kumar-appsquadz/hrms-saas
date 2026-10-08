"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAsync } from "@/hooks/useAsync";
import { listTenants } from "@/services/platform";
import { enterTenant } from "@/lib/impersonation";
import {
  PageHeader,
  DataTable,
  SearchInput,
  FilterSelect,
  Toolbar,
  Button,
  StatusBadge,
  Pill,
  Icon,
  type Column,
} from "@/components/ui";
import { CanPlatform } from "@/components/providers/PlatformSessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { formatINR, formatDate } from "@/lib/format";
import type { PlatformTenant } from "@/types/platform";

const planTone = { starter: "neutral", growth: "info", enterprise: "success" } as const;

export default function TenantsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const { data, loading, error, reload } = useAsync(() => listTenants(page, 25), [page]);

  function view(t: PlatformTenant) {
    enterTenant({ tenantId: t.id, tenantName: t.name, subdomain: t.subdomain });
    toast(`Entering ${t.name} workspace (demo impersonation).`, "info");
    router.push("/dashboard");
  }

  const rows = (data?.data ?? []).filter((t) => {
    if (q && !(`${t.name} ${t.subdomain}`.toLowerCase().includes(q.toLowerCase()))) return false;
    if (status && t.status !== status) return false;
    if (plan && t.plan !== plan) return false;
    return true;
  });

  const columns: Column<PlatformTenant>[] = [
    {
      key: "name",
      header: "Tenant",
      render: (t) => (
        <div>
          <div className="font-medium text-text">{t.name}</div>
          <div className="font-mono text-caption text-text-muted">{t.subdomain}</div>
        </div>
      ),
    },
    { key: "plan", header: "Plan", render: (t) => <Pill tone={planTone[t.plan]}>{t.plan}</Pill> },
    { key: "employees", header: "Employees", render: (t) => t.employees.toLocaleString("en-IN"), align: "right" },
    { key: "mrr", header: "MRR", render: (t) => formatINR(t.mrr), align: "right", secondary: true },
    { key: "region", header: "Region", render: (t) => t.region, secondary: true },
    { key: "created", header: "Created", render: (t) => formatDate(t.created_at), secondary: true },
    { key: "status", header: "Status", render: (t) => <StatusBadge status={t.status === "provisioning" ? "in_progress" : t.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Tenants"
        subtitle={data ? `${data.meta.total} customer tenants` : "All customer tenants"}
        actions={
          <CanPlatform permission="platform.tenant.create">
            <Button variant="primary" icon="plus" onClick={() => router.push("/platform/onboarding")}>
              Onboard tenant
            </Button>
          </CanPlatform>
        }
      />

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search name or subdomain" />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "trial", label: "Trial" },
            { value: "suspended", label: "Suspended" },
            { value: "provisioning", label: "Provisioning" },
          ]}
        />
        <FilterSelect
          label="Plan"
          value={plan}
          onChange={setPlan}
          options={[
            { value: "", label: "All plans" },
            { value: "starter", label: "Starter" },
            { value: "growth", label: "Growth" },
            { value: "enterprise", label: "Enterprise" },
          ]}
        />
      </Toolbar>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(t) => t.id}
        loading={loading}
        error={error}
        onRetry={reload}
        meta={data?.meta}
        onPageChange={setPage}
        onRowClick={(t) => router.push(`/platform/tenants/${t.id}`)}
        caption="Customer tenants"
        emptyTitle="No tenants match these filters"
        rowActions={(t) => (
          <div className="flex justify-end gap-1">
            <CanPlatform permission="platform.tenant.impersonate">
              <Button variant="secondary" size="sm" icon="external" onClick={() => view(t)}>
                View tenant
              </Button>
            </CanPlatform>
            <Button variant="tertiary" size="sm" aria-label={`Open ${t.name}`} onClick={() => router.push(`/platform/tenants/${t.id}`)}>
              <Icon name="arrow-right" size={16} />
            </Button>
          </div>
        )}
      />
    </div>
  );
}
