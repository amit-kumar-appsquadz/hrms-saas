"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listLeaveRequests } from "@/services/modules";
import { StatusBadge, type Column } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { LeaveRequest } from "@/types/domain";

const columns: Column<LeaveRequest>[] = [
  { key: "type", header: "Request", render: (r) => <span className="font-medium">{r.type}</span> },
  { key: "dates", header: "Dates", render: (r) => `${formatDate(r.from)} – ${formatDate(r.to)}` },
  { key: "applied", header: "Applied on", render: (r) => formatDate(r.applied_on), secondary: true },
  { key: "approver", header: "Approver", render: (r) => r.approver ?? "—", secondary: true },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

export default function MyRequestsPage() {
  return (
    <ListPage
      title="My requests"
      subtitle="All your submitted requests and their status"
      breadcrumbs={[{ label: "Self-service" }, { label: "My requests" }]}
      columns={columns}
      fetcher={async () => (await listLeaveRequests()).filter((r) => r.employee === "You")}
      rowKey={(r) => r.id}
      emptyTitle="No requests yet"
    />
  );
}
