"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listLeaveTypes } from "@/services/modules";
import { Pill, Button, type Column } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import type { LeaveType } from "@/types/domain";

const columns: Column<LeaveType>[] = [
  {
    key: "name",
    header: "Leave type",
    render: (r) => (
      <span className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: r.color }} aria-hidden />
        <span className="font-medium">{r.name}</span>
      </span>
    ),
  },
  { key: "code", header: "Code", render: (r) => <span className="font-mono text-body-sm">{r.code}</span> },
  { key: "paid", header: "Paid", render: (r) => <Pill tone={r.paid ? "success" : "neutral"}>{r.paid ? "Paid" : "Unpaid"}</Pill> },
  { key: "accrual", header: "Accrual", render: (r) => (r.accrual_based ? "Accrual" : "Fixed"), secondary: true },
  { key: "unit", header: "Unit", render: (r) => r.unit, secondary: true },
  { key: "attach", header: "Attachment", render: (r) => (r.requires_attachment ? "Required" : "—"), secondary: true },
  { key: "encash", header: "Encashable", render: (r) => (r.encashable ? "Yes" : "No") },
];

export default function LeaveTypesPage() {
  return (
    <ListPage
      title="Leave types"
      subtitle="Configure the leave types available to employees"
      breadcrumbs={[{ label: "Leave" }, { label: "Leave types" }]}
      actions={<Can permission="leave.type.manage"><Button variant="primary" icon="plus">Add leave type</Button></Can>}
      columns={columns}
      fetcher={listLeaveTypes}
      rowKey={(r) => r.id}
      emptyTitle="No leave types"
    />
  );
}
