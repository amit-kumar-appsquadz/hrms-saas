"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listLeaveRequests } from "@/services/modules";
import { StatusBadge, type Column } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { LeaveRequest } from "@/types/domain";

const columns: Column<LeaveRequest>[] = [
  { key: "employee", header: "Member", render: (r) => <span className="font-medium">{r.employee}</span> },
  { key: "type", header: "Request", render: (r) => r.type },
  { key: "dates", header: "Dates", render: (r) => `${formatDate(r.from)} – ${formatDate(r.to)}`, secondary: true },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

export default function TeamRequestsPage() {
  return (
    <ListPage
      title="Team requests"
      subtitle="Requests from your team awaiting action"
      breadcrumbs={[{ label: "Team" }, { label: "Requests" }]}
      columns={columns}
      fetcher={async () => (await listLeaveRequests()).filter((r) => r.employee !== "You")}
      rowKey={(r) => r.id}
      emptyTitle="No team requests"
    />
  );
}
