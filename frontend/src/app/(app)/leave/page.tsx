"use client";

import { useAsync } from "@/hooks/useAsync";
import { getLeaveBalances, listLeaveRequests } from "@/services/modules";
import { PageHeader, Card, CardHeader, CardBody, StatCard, DonutChart, StatusBadge, CardsSkeleton, ErrorState } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default function LeaveOverviewPage() {
  const balances = useAsync(() => getLeaveBalances());
  const requests = useAsync(() => listLeaveRequests());

  const loading = balances.loading || requests.loading;
  const error = balances.error || requests.error;

  return (
    <div>
      <PageHeader title="Leave overview" subtitle="Balances, requests and who's out" breadcrumbs={[{ label: "Leave" }, { label: "Overview" }]} />

      {loading && <CardsSkeleton count={4} />}
      {error && <ErrorState message={error.message} onRetry={() => { balances.reload(); requests.reload(); }} />}

      {balances.data && requests.data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {balances.data.map((b) => (
              <StatCard key={b.code} label={b.type} value={b.available} hint={`${b.used} used`} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader title="Balance split" />
              <CardBody>
                <DonutChart data={balances.data.map((b) => ({ label: b.code, value: b.available, color: b.color }))} />
              </CardBody>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader title="Recent requests" />
              <CardBody className="p-0">
                <ul className="divide-y divide-border">
                  {requests.data.map((r) => (
                    <li key={r.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <div className="text-body-sm font-medium text-text">{r.employee} · {r.type}</div>
                        <div className="text-caption text-text-muted">
                          {formatDate(r.from)} – {formatDate(r.to)} · {r.days} day(s)
                        </div>
                      </div>
                      <StatusBadge status={r.status} />
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
