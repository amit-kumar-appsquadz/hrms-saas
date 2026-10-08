"use client";

import { useEffect, useState } from "react";
import { useAsync } from "@/hooks/useAsync";
import { listApprovals } from "@/services/modules";
import { PageHeader, CardsSkeleton, ErrorState, EmptyState } from "@/components/ui";
import { ApprovalCard } from "@/components/patterns/ApprovalCard";
import type { ApprovalItem } from "@/types/domain";

export default function TeamApprovalsPage() {
  const { data, loading, error, reload } = useAsync(() => listApprovals());
  const [items, setItems] = useState<ApprovalItem[]>([]);

  useEffect(() => {
    if (data) setItems(data.filter((a) => a.type === "Leave" || a.type === "Regularization"));
  }, [data]);

  return (
    <div>
      <PageHeader title="Team approvals" subtitle="Leave and regularization requests from your team" breadcrumbs={[{ label: "Team" }, { label: "Approvals" }]} />
      {loading && <CardsSkeleton count={3} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {data && items.length === 0 && <EmptyState icon="check" title="Inbox zero" description="No team approvals waiting." />}
      <div className="space-y-3">
        {items.map((a) => (
          <ApprovalCard
            key={a.id}
            item={{ id: a.id, type: a.type, subject: a.subject, requester: a.requester, meta: a.current_step, age_hours: a.age_hours, priority: a.priority }}
            onResolved={(id) => setItems((prev) => prev.filter((x) => x.id !== id))}
          />
        ))}
      </div>
    </div>
  );
}
