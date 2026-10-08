"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listSalaryStructures } from "@/services/modules";
import { Button, type Column } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import { formatINR, formatDate } from "@/lib/format";
import type { SalaryStructure } from "@/types/domain";

const columns: Column<SalaryStructure>[] = [
  { key: "name", header: "Structure", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "ctc", header: "CTC", render: (r) => formatINR(r.ctc), align: "right" },
  { key: "components", header: "Components", render: (r) => r.components, align: "right", secondary: true },
  { key: "assigned", header: "Assigned to", render: (r) => r.assigned_to },
  { key: "effective", header: "Effective from", render: (r) => formatDate(r.effective_from), secondary: true },
];

export default function SalaryStructuresPage() {
  return (
    <ListPage
      title="Salary structures"
      subtitle="CTC templates composed from salary components"
      breadcrumbs={[{ label: "Payroll" }, { label: "Salary structures" }]}
      actions={<Can permission="payroll.structure.manage"><Button variant="primary" icon="plus">Add structure</Button></Can>}
      columns={columns}
      fetcher={listSalaryStructures}
      rowKey={(r) => r.id}
      emptyTitle="No structures defined"
    />
  );
}
