"use client";

import { useState } from "react";
import Link from "next/link";
import { useAsync } from "@/hooks/useAsync";
import { listNotifications } from "@/services/modules";
import { PageHeader, Card, CardBody, Pill, Button, CardsSkeleton, ErrorState } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { NotificationItem } from "@/types/domain";

export default function MyNotificationsPage() {
  const { data, loading, error, reload } = useAsync(() => listNotifications());
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const list = items ?? data ?? [];

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Your notification center"
        breadcrumbs={[{ label: "Self-service" }, { label: "Notifications" }]}
        actions={<Button variant="secondary" onClick={() => setItems(list.map((n) => ({ ...n, read: true })))}>Mark all read</Button>}
      />
      {loading && <CardsSkeleton count={4} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}
      <Card>
        <CardBody className="p-0">
          <ul className="divide-y divide-border">
            {list.map((n) => (
              <li key={n.id}>
                <Link href={n.link} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-muted">
                  {!n.read ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" /> : <span className="mt-1.5 h-2 w-2 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-body-sm font-medium text-text">{n.title}</span>
                      <Pill tone="neutral">{n.category}</Pill>
                    </div>
                    <div className="text-caption text-text-muted">{n.body}</div>
                    <div className="mt-0.5 text-caption text-text-disabled">{formatDateTime(n.timestamp)}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
