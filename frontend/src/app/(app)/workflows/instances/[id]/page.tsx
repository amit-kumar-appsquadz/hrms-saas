"use client";

import { use } from "react";
import { useAsync } from "@/hooks/useAsync";
import { getWorkflowInstance } from "@/services/modules";
import { PageHeader, Card, CardHeader, CardBody, Timeline, Skeleton, ErrorState, Button } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import { formatDateTime } from "@/lib/format";

export default function WorkflowInstanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, reload } = useAsync(() => getWorkflowInstance(Number(id)), [id]);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error || !data) return <ErrorState message={error?.message} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        title={data.subject}
        subtitle={`${data.type} · initiated by ${data.initiator}`}
        status={data.status}
        breadcrumbs={[{ label: "Workflows", href: "/workflows/instances" }, { label: "Instances", href: "/workflows/instances" }, { label: `#${data.id}` }]}
        actions={<Can permission="workflows.definition.manage"><Button variant="danger" size="sm">Cancel instance</Button></Can>}
      />
      <Card>
        <CardHeader title="Approval timeline" subtitle={`Currently at: ${data.current_step}`} />
        <CardBody>
          <Timeline
            events={data.timeline.map((t) => ({
              title: t.step,
              meta: t.timestamp ? formatDateTime(t.timestamp) : "Pending",
              description: `${t.approver}${t.comment ? ` — "${t.comment}"` : ""}`,
              status: t.decision,
            }))}
          />
        </CardBody>
      </Card>
    </div>
  );
}
