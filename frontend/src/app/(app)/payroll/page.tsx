"use client";

import Link from "next/link";
import { useAsync } from "@/hooks/useAsync";
import { listPayrollRuns } from "@/services/modules";
import { PageHeader, StatCard, Card, CardHeader, CardBody, StatusBadge, CardsSkeleton, ErrorState } from "@/components/ui";
import { formatINR, formatDate } from "@/lib/format";

export default function PayrollDashboardPage() {
  const { data, loading, error, reload } = useAsync(() => listPayrollRuns());
  const current = data?.[0];

  return (
    <div>
      <PageHeader
        title="Payroll dashboard"
        subtitle="Current period status and recent runs"
        breadcrumbs={[{ label: "Payroll" }, { label: "Dashboard" }]}
        status={current ? current.stage : undefined}
      />

      <div className="mb-4 rounded-md border border-info-subtle bg-info-subtle/40 px-4 py-2.5 text-body-sm text-info">
        Payroll figures are illustrative demo data. Actual calculations and statutory outputs come from the
        expert-verified backend engine (steering rule 5).
      </div>

      {loading && <CardsSkeleton count={4} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}

      {data && current && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Current period" value={current.period} icon="calendar" />
            <StatCard label="Employees in run" value={current.employees} icon="employees" />
            <StatCard label="Gross total" value={formatINR(current.gross_total)} icon="payroll" />
            <StatCard label="Net payable" value={formatINR(current.net_total)} icon="payroll" />
          </div>

          <Card>
            <CardHeader title="Recent runs" action={<Link href="/payroll/runs" className="text-body-sm text-primary hover:underline">View all</Link>} />
            <CardBody className="p-0">
              <ul className="divide-y divide-border">
                {data.map((r) => (
                  <li key={r.id}>
                    <Link href={`/payroll/runs/${r.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-surface-muted">
                      <div>
                        <div className="text-body-sm font-medium text-text">{r.period}</div>
                        <div className="text-caption text-text-muted">{r.scope} · created {formatDate(r.created_on)}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="hidden tabular text-body-sm text-text sm:inline">{formatINR(r.net_total)}</span>
                        <StatusBadge status={r.stage} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
