"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listLifecycleChanges } from "@/services/employees";
import { StatusBadge, type Column } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { LifecycleChange } from "@/types/domain";

const columns: Column<LifecycleChange>[] = [
  { key: "employee", header: "Employee", render: (r) => <span className="font-medium">{r.employee}</span> },
  { key: "type", header: "Type", render: (r) => r.type },
  { key: "details", header: "Details", render: (r) => r.details, secondary: true },
  { key: "effective", header: "Effective", render: (r) => formatDate(r.effective_date) },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

export default function TransfersPage() {
  return (
    <ListPage
      title="Transfers & changes"
      subtitle="Organizational changes and their approval status"
      breadcrumbs={[{ label: "Employees", href: "/employees" }, { label: "Transfers & changes" }]}
      columns={columns}
      fetcher={listLifecycleChanges}
      rowKey={(r) => r.id}
      emptyTitle="No changes in progress"
    />
  );
}
