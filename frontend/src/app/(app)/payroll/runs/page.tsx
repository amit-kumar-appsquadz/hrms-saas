"use client";

import { useRouter } from "next/navigation";
import { ListPage } from "@/components/patterns/ListPage";
import { listPayrollRuns } from "@/services/modules";
import { StatusBadge, Button, Icon, type Column } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import { formatINR, formatDate } from "@/lib/format";
import type { PayrollRun } from "@/types/domain";

export default function PayrollRunsPage() {
  const router = useRouter();
  const columns: Column<PayrollRun>[] = [
    { key: "period", header: "Period", render: (r) => <span className="font-medium">{r.period}</span> },
    { key: "scope", header: "Scope", render: (r) => r.scope, secondary: true },
    { key: "employees", header: "Employees", render: (r) => r.employees, align: "right" },
    { key: "net", header: "Net total", render: (r) => formatINR(r.net_total), align: "right", secondary: true },
    { key: "created", header: "Created", render: (r) => formatDate(r.created_on), secondary: true },
    { key: "stage", header: "Stage", render: (r) => <StatusBadge status={r.stage} /> },
  ];

  return (
    <ListPage
      title="Payroll runs"
      subtitle="Monthly payroll processing runs"
      breadcrumbs={[{ label: "Payroll" }, { label: "Runs" }]}
      actions={<Can permission="payroll.view"><Button variant="primary" icon="plus">New run</Button></Can>}
      columns={columns}
      fetcher={listPayrollRuns}
      rowKey={(r) => r.id}
      onRowClick={(r) => router.push(`/payroll/runs/${r.id}`)}
      rowActions={(r) => (
        <Button variant="tertiary" size="sm" aria-label={`Open ${r.period}`} onClick={() => router.push(`/payroll/runs/${r.id}`)}>
          <Icon name="arrow-right" size={16} />
        </Button>
      )}
      emptyTitle="No payroll runs"
    />
  );
}
