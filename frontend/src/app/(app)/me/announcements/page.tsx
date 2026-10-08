"use client";

import { useAsync } from "@/hooks/useAsync";
import { listAnnouncements } from "@/services/modules";
import { PageHeader, Card, CardBody, CardsSkeleton, ErrorState, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export default function AnnouncementsPage() {
  const { data, loading, error, reload } = useAsync(() => listAnnouncements());
  return (
    <div>
      <PageHeader title="Announcements" subtitle="Organization-wide updates" breadcrumbs={[{ label: "Self-service" }, { label: "Announcements" }]} />
      {loading && <CardsSkeleton count={3} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState icon="notifications" title="No announcements" />}
      <div className="space-y-3">
        {(data ?? []).map((a) => (
          <Card key={a.id}>
            <CardBody>
              <h3 className="text-h3 text-text">{a.title}</h3>
              <p className="mt-1 text-body-sm text-text-muted">{a.body}</p>
              <p className="mt-2 text-caption text-text-disabled">{a.posted_by} · {formatDateTime(a.posted_at)}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
