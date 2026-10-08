"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listSalaryComponents } from "@/services/modules";
import { Pill, Button, type Column } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import type { SalaryComponent } from "@/types/domain";

const toneByType: Record<SalaryComponent["type"], "success" | "danger" | "info" | "warning"> = {
  earning: "success",
  deduction: "danger",
  reimbursement: "info",
  statutory: "warning",
};

const columns: Column<SalaryComponent>[] = [
  { key: "name", header: "Component", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "code", header: "Code", render: (r) => <span className="font-mono text-body-sm">{r.code}</span> },
  { key: "type", header: "Type", render: (r) => <Pill tone={toneByType[r.type]}>{r.type}</Pill> },
  { key: "basis", header: "Basis", render: (r) => r.basis, secondary: true },
  { key: "taxable", header: "Taxable", render: (r) => (r.taxable ? "Yes" : "No"), secondary: true },
  { key: "payslip", header: "On payslip", render: (r) => (r.show_on_payslip ? "Yes" : "No") },
];

export default function SalaryComponentsPage() {
  return (
    <ListPage
      title="Salary components"
      subtitle="Earnings, deductions, reimbursements and statutory components"
      breadcrumbs={[{ label: "Payroll" }, { label: "Salary components" }]}
      actions={<Can permission="payroll.component.manage"><Button variant="primary" icon="plus">Add component</Button></Can>}
      columns={columns}
      fetcher={listSalaryComponents}
      rowKey={(r) => r.id}
      emptyTitle="No components defined"
    />
  );
}
