"use client";

import { useEffect, useState } from "react";
import { useAsync } from "@/hooks/useAsync";
import { listApprovals } from "@/services/modules";
import { PageHeader, CardsSkeleton, ErrorState, EmptyState, FilterSelect, Toolbar } from "@/components/ui";
import { ApprovalCard } from "@/components/patterns/ApprovalCard";
import type { ApprovalItem } from "@/types/domain";

export default function ApprovalsPage() {
  const { data, loading, error, reload } = useAsync(() => listApprovals());
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [type, setType] = useState("");

  useEffect(() => {
    if (data) setItems(data);
  }, [data]);

  const types = Array.from(new Set((data ?? []).map((d) => d.type)));
  const filtered = type ? items.filter((i) => i.type === type) : items;

  return (
    <div>
      <PageHeader
        title="Pending approvals"
        subtitle="Your unified approval inbox across all workflow types"
        breadcrumbs={[{ label: "Workflows" }, { label: "Pending approvals" }]}
      />
      <Toolbar>
        <FilterSelect
          label="Type"
          value={type}
          onChange={setType}
          options={[{ value: "", label: "All types" }, ...types.map((t) => ({ value: t, label: t }))]}
        />
      </Toolbar>
      {loading && <CardsSkeleton count={4} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {data && filtered.length === 0 && <EmptyState icon="check" title="Inbox zero" description="You have no approvals waiting." />}
      <div className="space-y-3">
        {filtered.map((a) => (
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
