"use client";

import { useState } from "react";
import { useAsync } from "@/hooks/useAsync";
import { listPlatformAudit } from "@/services/platform";
import {
  PageHeader,
  DataTable,
  FilterSelect,
  Toolbar,
  Button,
  Pill,
  type Column,
} from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { PlatformAuditEntry } from "@/types/platform";

const catTone = {
  tenant_lifecycle: "info",
  platform_config: "neutral",
  security: "danger",
  billing: "warning",
  access: "info",
} as const;

export default function PlatformAuditPage() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const { data, loading, error, reload } = useAsync(() => listPlatformAudit(page, 25), [page]);

  const rows = (data?.data ?? []).filter((e) => !category || e.category === category);

  const columns: Column<PlatformAuditEntry>[] = [
    { key: "ts", header: "Timestamp", render: (e) => formatDateTime(e.timestamp) },
    { key: "actor", header: "Actor", render: (e) => e.actor },
    { key: "action", header: "Action", render: (e) => <span className="font-mono text-body-sm">{e.action}</span> },
    { key: "target", header: "Target", render: (e) => e.target, secondary: true },
    { key: "category", header: "Category", render: (e) => <Pill tone={catTone[e.category]}>{e.category.replace(/_/g, " ")}</Pill> },
    { key: "ip", header: "IP / device", render: (e) => `${e.ip} · ${e.device}`, secondary: true },
  ];

  return (
    <div>
      <PageHeader
        title="Platform audit"
        subtitle="Tenant lifecycle, platform configuration and administrative actions"
        actions={<Button variant="secondary" icon="download">Export</Button>}
      />
      <Toolbar>
        <FilterSelect
          label="Category"
          value={category}
          onChange={setCategory}
          options={[
            { value: "", label: "All categories" },
            { value: "tenant_lifecycle", label: "Tenant lifecycle" },
            { value: "platform_config", label: "Platform config" },
            { value: "billing", label: "Billing" },
            { value: "access", label: "Access" },
            { value: "security", label: "Security" },
          ]}
        />
      </Toolbar>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        loading={loading}
        error={error}
        onRetry={reload}
        meta={data?.meta}
        onPageChange={setPage}
        caption="Platform audit log"
        emptyTitle="No audit entries"
      />
    </div>
  );
}
