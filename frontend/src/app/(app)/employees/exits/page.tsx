"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listExits } from "@/services/employees";
import { Pill, type Column } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { EmployeeExit } from "@/types/domain";

const columns: Column<EmployeeExit>[] = [
  { key: "employee", header: "Employee", render: (r) => <span className="font-medium">{r.employee}</span> },
  { key: "type", header: "Exit type", render: (r) => r.exit_type },
  { key: "lwd", header: "Last working day", render: (r) => formatDate(r.last_working_day) },
  { key: "reason", header: "Reason", render: (r) => r.reason, secondary: true },
  {
    key: "stage",
    header: "Stage",
    render: (r) => (
      <Pill tone={r.stage === "Settled" ? "success" : r.stage === "Notice" ? "warning" : "info"}>{r.stage}</Pill>
    ),
  },
];

export default function ExitsPage() {
  return (
    <ListPage
      title="Exits"
      subtitle="Employees exiting the organization, by stage"
      breadcrumbs={[{ label: "Employees", href: "/employees" }, { label: "Exits" }]}
      columns={columns}
      fetcher={listExits}
      rowKey={(r) => r.id}
      emptyTitle="No exits in progress"
    />
  );
}
