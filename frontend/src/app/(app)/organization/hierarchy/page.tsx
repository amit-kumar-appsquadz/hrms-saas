"use client";

import { useAsync } from "@/hooks/useAsync";
import { getOrgHierarchy } from "@/services/modules";
import { PageHeader, Card, CardBody, Button, Skeleton, ErrorState } from "@/components/ui";
import { OrgChart } from "@/components/patterns/OrgChart";

export default function HierarchyPage() {
  const { data, loading, error, reload } = useAsync(() => getOrgHierarchy());
  return (
    <div>
      <PageHeader
        title="Organization hierarchy"
        subtitle="Company and department structure"
        breadcrumbs={[{ label: "Organization" }, { label: "Hierarchy" }]}
        actions={<Button variant="secondary" icon="download">Export</Button>}
      />
      <Card>
        <CardBody>
          {loading && <Skeleton className="h-64 w-full" />}
          {error && <ErrorState message={error.message} onRetry={reload} />}
          {data && <OrgChart root={data} />}
        </CardBody>
      </Card>
    </div>
  );
}
