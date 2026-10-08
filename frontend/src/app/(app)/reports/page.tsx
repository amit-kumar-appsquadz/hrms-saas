"use client";

import { useAsync } from "@/hooks/useAsync";
import { listReports } from "@/services/modules";
import { PageHeader, Card, CardHeader, CardBody, Button, Pill, CardsSkeleton, ErrorState } from "@/components/ui";

export default function ReportsPage() {
  const { data, loading, error, reload } = useAsync(() => listReports());

  const grouped = (data ?? []).reduce<Record<string, typeof data>>((acc, r) => {
    (acc[r.group] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Reports" subtitle="Standard reports grouped by domain" breadcrumbs={[{ label: "Reports" }, { label: "Standard reports" }]} />
      {loading && <CardsSkeleton count={6} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {data && (
        <div className="space-y-5">
          {Object.entries(grouped).map(([group, reports]) => (
            <Card key={group}>
              <CardHeader title={group} />
              <CardBody className="p-0">
                <ul className="divide-y divide-border">
                  {reports!.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-body-sm font-medium text-text">{r.name}</span>
                          {r.sensitive && <Pill tone="warning">Sensitive</Pill>}
                        </div>
                        <div className="text-caption text-text-muted">{r.description}</div>
                      </div>
                      <Button variant="secondary" size="sm" iconRight="arrow-right">Run</Button>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
