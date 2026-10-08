"use client";

import { useAsync } from "@/hooks/useAsync";
import { listMyPayslips } from "@/services/modules";
import { PageHeader, Card, CardBody, Button, StatusBadge, StatCard, CardsSkeleton, ErrorState } from "@/components/ui";
import { formatINR } from "@/lib/format";

export default function MyPayslipsPage() {
  const { data, loading, error, reload } = useAsync(() => listMyPayslips());
  const ytdGross = (data ?? []).reduce((s, p) => s + p.gross, 0);
  const ytdNet = (data ?? []).reduce((s, p) => s + p.net, 0);

  return (
    <div>
      <PageHeader title="My payslips" subtitle="Download your payslips and view year-to-date" breadcrumbs={[{ label: "Self-service" }, { label: "My payslips" }]} />

      {loading && <CardsSkeleton count={3} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}

      {data && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard label="YTD gross" value={formatINR(ytdGross)} icon="payroll" />
            <StatCard label="YTD net" value={formatINR(ytdNet)} icon="payroll" />
            <StatCard label="Payslips" value={data.length} icon="documents" />
          </div>
          <Card>
            <CardBody className="p-0">
              <ul className="divide-y divide-border">
                {data.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="text-body-sm font-medium text-text">{p.period}</div>
                      <div className="text-caption text-text-muted">Net {formatINR(p.net)} · Gross {formatINR(p.gross)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={p.status} />
                      <Button variant="secondary" size="sm" icon="download">PDF</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
