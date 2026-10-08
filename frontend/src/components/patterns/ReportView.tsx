"use client";

import { PageHeader, Card, CardBody, CardHeader, Button, EmptyState, type Crumb } from "@/components/ui";

/** Generic report runner view (REPORTING_MODULE §2): filter bar → run → table/
 * chart → export. Export is a demo interaction here (queued export API is a gap). */
export function ReportView({
  title,
  subtitle,
  breadcrumbs,
  reports,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  reports: { name: string; description: string; sensitive?: boolean }[];
}) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {reports.map((r) => (
          <Card key={r.name}>
            <CardHeader
              title={r.name}
              subtitle={r.sensitive ? "Sensitive — export requires elevated permission" : undefined}
            />
            <CardBody>
              <p className="text-body-sm text-text-muted">{r.description}</p>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" size="sm" iconRight="arrow-right">Run report</Button>
                <Button variant="tertiary" size="sm" icon="download">Export</Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      {reports.length === 0 && <EmptyState icon="reports" title="No reports available" />}
    </div>
  );
}
