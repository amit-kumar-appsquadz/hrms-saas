"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { getLeaveBalances } from "@/services/modules";
import { Button, type Column } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import type { LeaveBalance } from "@/types/domain";

const columns: Column<LeaveBalance>[] = [
  { key: "type", header: "Leave type", render: (r) => <span className="font-medium">{r.type}</span> },
  { key: "code", header: "Code", render: (r) => <span className="font-mono text-body-sm">{r.code}</span> },
  { key: "opening", header: "Opening", render: (r) => r.opening, align: "right" },
  { key: "accrued", header: "Accrued", render: (r) => r.accrued, align: "right" },
  { key: "used", header: "Used", render: (r) => r.used, align: "right" },
  { key: "pending", header: "Pending", render: (r) => r.pending, align: "right", secondary: true },
  { key: "available", header: "Available", render: (r) => <strong className="tabular">{r.available}</strong>, align: "right" },
];

export default function LeaveBalancesPage() {
  return (
    <ListPage
      title="Leave balances"
      subtitle="Opening, accrued, used and available by leave type"
      breadcrumbs={[{ label: "Leave" }, { label: "Balances" }]}
      actions={<Can permission="leave.type.manage"><Button variant="secondary" icon="download">Export</Button></Can>}
      columns={columns}
      fetcher={getLeaveBalances}
      rowKey={(r) => r.code}
      emptyTitle="No balances"
    />
  );
}
