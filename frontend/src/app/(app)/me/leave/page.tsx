"use client";

import Link from "next/link";
import { useAsync } from "@/hooks/useAsync";
import { getLeaveBalances, listLeaveRequests } from "@/services/modules";
import { PageHeader, Card, CardHeader, CardBody, Button, StatusBadge, CardsSkeleton, ErrorState } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default function MyLeavePage() {
  const balances = useAsync(() => getLeaveBalances());
  const requests = useAsync(() => listLeaveRequests());

  return (
    <div>
      <PageHeader
        title="My leave"
        subtitle="Your balances and leave history"
        breadcrumbs={[{ label: "Self-service" }, { label: "My leave" }]}
        actions={<Link href="/me/leave/apply"><Button variant="primary" icon="plus">Apply leave</Button></Link>}
      />

      {(balances.loading || requests.loading) && <CardsSkeleton count={4} />}
      {(balances.error || requests.error) && <ErrorState message="Unable to load leave" onRetry={() => { balances.reload(); requests.reload(); }} />}

      {balances.data && (
        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {balances.data.map((b) => (
            <Card key={b.code}>
              <CardBody>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: b.color }} aria-hidden />
                  <span className="text-caption font-medium uppercase text-text-muted">{b.type}</span>
                </div>
                <div className="mt-2 text-h1 tabular text-text">{b.available}</div>
                <div className="text-caption text-text-muted">{b.used} used · {b.pending} pending</div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {requests.data && (
        <Card>
          <CardHeader title="My requests" />
          <CardBody className="p-0">
            <ul className="divide-y divide-border">
              {requests.data.filter((r) => r.employee === "You").map((r) => (
                <li key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-body-sm font-medium text-text">{r.type} · {r.days} day(s)</div>
                    <div className="text-caption text-text-muted">{formatDate(r.from)} – {formatDate(r.to)} · {r.reason}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
