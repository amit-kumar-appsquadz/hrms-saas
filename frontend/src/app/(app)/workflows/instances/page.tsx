"use client";

import { useRouter } from "next/navigation";
import { ListPage } from "@/components/patterns/ListPage";
import { listWorkflowInstances } from "@/services/modules";
import { StatusBadge, Icon, Button, type Column } from "@/components/ui";
import { timeAgoHours } from "@/lib/format";
import type { WorkflowInstance } from "@/types/domain";

export default function WorkflowInstancesPage() {
  const router = useRouter();
  const columns: Column<WorkflowInstance>[] = [
    { key: "subject", header: "Subject", render: (r) => <span className="font-medium">{r.subject}</span> },
    { key: "type", header: "Type", render: (r) => r.type, secondary: true },
    { key: "initiator", header: "Initiator", render: (r) => r.initiator, secondary: true },
    { key: "step", header: "Current step", render: (r) => r.current_step },
    { key: "age", header: "Age", render: (r) => timeAgoHours(r.age_hours), secondary: true },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <ListPage
      title="Workflow instances"
      subtitle="Running and completed approval instances"
      breadcrumbs={[{ label: "Workflows" }, { label: "Instances" }]}
      columns={columns}
      fetcher={listWorkflowInstances}
      rowKey={(r) => r.id}
      onRowClick={(r) => router.push(`/workflows/instances/${r.id}`)}
      rowActions={(r) => (
        <Button variant="tertiary" size="sm" aria-label="Open instance" onClick={() => router.push(`/workflows/instances/${r.id}`)}>
          <Icon name="arrow-right" size={16} />
        </Button>
      )}
      emptyTitle="No workflow instances"
    />
  );
}
