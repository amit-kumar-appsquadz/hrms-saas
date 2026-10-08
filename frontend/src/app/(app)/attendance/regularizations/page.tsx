"use client";

import { useEffect, useState } from "react";
import { useAsync } from "@/hooks/useAsync";
import { listRegularizations } from "@/services/modules";
import { PageHeader, CardsSkeleton, ErrorState, EmptyState } from "@/components/ui";
import { ApprovalCard } from "@/components/patterns/ApprovalCard";
import type { Regularization } from "@/types/domain";

export default function RegularizationsPage() {
  const { data, loading, error, reload } = useAsync(() => listRegularizations());
  const [items, setItems] = useState<Regularization[]>([]);

  useEffect(() => {
    if (data) setItems(data.filter((r) => r.status === "pending"));
  }, [data]);

  return (
    <div>
      <PageHeader
        title="Regularizations"
        subtitle="Attendance regularization requests awaiting approval"
        breadcrumbs={[{ label: "Attendance" }, { label: "Regularizations" }]}
      />
      {loading && <CardsSkeleton count={3} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {data && items.length === 0 && <EmptyState icon="check" title="All caught up" description="No regularizations pending your approval." />}
      <div className="space-y-3">
        {items.map((r) => (
          <ApprovalCard
            key={r.id}
            item={{ id: r.id, type: "Regularization", subject: `${r.employee} — ${r.date}`, requester: r.employee, meta: `${r.requested_in}–${r.requested_out} · ${r.reason}`, age_hours: 20 }}
            onResolved={(id) => setItems((prev) => prev.filter((x) => x.id !== id))}
          />
        ))}
      </div>
    </div>
  );
}
