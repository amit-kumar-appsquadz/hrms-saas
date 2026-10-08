"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { getPayrollExceptions } from "@/services/modules";
import { Pill, Button, type Column } from "@/components/ui";
import { formatINR } from "@/lib/format";
import type { PayrollRegisterRow } from "@/types/domain";

const columns: Column<PayrollRegisterRow>[] = [
  { key: "employee", header: "Employee", render: (r) => <span className="font-medium">{r.employee}</span> },
  { key: "exception", header: "Exception", render: (r) => <Pill tone="warning">{r.exception}</Pill> },
  { key: "net", header: "Net", render: (r) => formatINR(r.net), align: "right", secondary: true },
];

export default function PayrollExceptionsPage() {
  return (
    <ListPage
      title="Payroll exceptions"
      subtitle="Issues to resolve before finalizing the run"
      breadcrumbs={[{ label: "Payroll" }, { label: "Exceptions" }]}
      columns={columns}
      fetcher={getPayrollExceptions}
      rowKey={(r) => r.employee_code}
      rowActions={() => <Button variant="secondary" size="sm">Resolve</Button>}
      emptyTitle="No exceptions"
      emptyDescription="Every employee in the run passed validation."
    />
  );
}
