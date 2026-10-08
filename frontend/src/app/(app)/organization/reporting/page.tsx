"use client";

import { useAsync } from "@/hooks/useAsync";
import { getReportingTree } from "@/services/modules";
import { PageHeader, Card, CardBody, Skeleton, ErrorState } from "@/components/ui";
import { OrgChart } from "@/components/patterns/OrgChart";

export default function ReportingPage() {
  const { data, loading, error, reload } = useAsync(() => getReportingTree());
  return (
    <div>
      <PageHeader
        title="Reporting tree"
        subtitle="Reporting lines derived from manager assignments"
        breadcrumbs={[{ label: "Organization" }, { label: "Reporting tree" }]}
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
