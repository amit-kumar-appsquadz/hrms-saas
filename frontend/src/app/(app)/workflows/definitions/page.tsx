"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listWorkflowDefinitions } from "@/services/modules";
import { Pill, Button, Icon, type Column } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import type { WorkflowDefinition } from "@/types/domain";

const columns: Column<WorkflowDefinition>[] = [
  { key: "name", header: "Workflow", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "trigger", header: "Trigger", render: (r) => r.trigger },
  { key: "instances", header: "Instances", render: (r) => r.instances, align: "right", secondary: true },
  { key: "version", header: "Version", render: (r) => `v${r.version}`, secondary: true },
  { key: "active", header: "Status", render: (r) => <Pill tone={r.active ? "success" : "neutral"}>{r.active ? "Active" : "Inactive"}</Pill> },
];

export default function WorkflowDefinitionsPage() {
  return (
    <ListPage
      title="Workflow definitions"
      subtitle="Approval workflows reused across the product"
      breadcrumbs={[{ label: "Workflows" }, { label: "Definitions" }]}
      actions={<Can permission="workflows.definition.manage"><Button variant="primary" icon="plus">New workflow</Button></Can>}
      columns={columns}
      fetcher={listWorkflowDefinitions}
      rowKey={(r) => r.id}
      rowActions={() => <Button variant="tertiary" size="sm" aria-label="Open builder"><Icon name="edit" size={16} /></Button>}
      emptyTitle="No workflows defined"
    />
  );
}
