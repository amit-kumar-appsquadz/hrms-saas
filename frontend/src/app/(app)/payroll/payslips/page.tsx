"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listPayslips } from "@/services/modules";
import { StatusBadge, Button, type Column } from "@/components/ui";
import { formatINR } from "@/lib/format";
import type { Payslip } from "@/types/domain";

const columns: Column<Payslip>[] = [
  { key: "employee", header: "Employee", render: (r) => <span className="font-medium">{r.employee}</span> },
  { key: "period", header: "Period", render: (r) => r.period },
  { key: "gross", header: "Gross", render: (r) => formatINR(r.gross), align: "right", secondary: true },
  { key: "net", header: "Net", render: (r) => formatINR(r.net), align: "right" },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

export default function PayslipsPage() {
  return (
    <ListPage
      title="Payslips"
      subtitle="Generated and published payslips"
      breadcrumbs={[{ label: "Payroll" }, { label: "Payslips" }]}
      actions={<Button variant="secondary" icon="download">Bulk download</Button>}
      columns={columns}
      fetcher={() => listPayslips(1, 25)}
      rowKey={(r) => r.id}
      rowActions={() => <Button variant="tertiary" size="sm" icon="download" aria-label="Download payslip" />}
      emptyTitle="No payslips"
    />
  );
}
