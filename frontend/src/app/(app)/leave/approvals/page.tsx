"use client";

import { useEffect, useState } from "react";
import { useAsync } from "@/hooks/useAsync";
import { listLeaveRequests } from "@/services/modules";
import { PageHeader, CardsSkeleton, ErrorState, EmptyState } from "@/components/ui";
import { ApprovalCard } from "@/components/patterns/ApprovalCard";
import { formatDate } from "@/lib/format";
import type { LeaveRequest } from "@/types/domain";

export default function LeaveApprovalsPage() {
  const { data, loading, error, reload } = useAsync(() => listLeaveRequests());
  const [items, setItems] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    if (data) setItems(data.filter((r) => r.status === "pending" && r.approver === "You"));
  }, [data]);

  return (
    <div>
      <PageHeader title="Leave approvals" subtitle="Requests awaiting your decision" breadcrumbs={[{ label: "Leave" }, { label: "Approvals" }]} />
      {loading && <CardsSkeleton count={3} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {data && items.length === 0 && <EmptyState icon="check" title="All caught up" description="No leave requests pending your approval." />}
      <div className="space-y-3">
        {items.map((r) => (
          <ApprovalCard
            key={r.id}
            item={{
              id: r.id,
              type: "Leave",
              subject: `${r.employee} — ${r.type} (${r.days} day${r.days > 1 ? "s" : ""})`,
              requester: r.employee,
              meta: `${formatDate(r.from)} – ${formatDate(r.to)} · ${r.reason}`,
              age_hours: 24,
            }}
            onResolved={(id) => setItems((prev) => prev.filter((x) => x.id !== id))}
          />
        ))}
      </div>
    </div>
  );
}
