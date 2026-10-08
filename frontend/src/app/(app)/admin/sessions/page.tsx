"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listSessions } from "@/services/modules";
import { Pill, Button, type Column } from "@/components/ui";
import type { SessionRecord } from "@/types/domain";

const columns: Column<SessionRecord>[] = [
  { key: "device", header: "Device", render: (r) => <span className="font-medium">{r.device}</span> },
  { key: "ip", header: "IP", render: (r) => <span className="font-mono text-body-sm">{r.ip}</span> },
  { key: "active", header: "Last active", render: (r) => r.last_active },
  { key: "current", header: "", render: (r) => (r.current ? <Pill tone="success">This device</Pill> : null) },
];

export default function SessionsPage() {
  return (
    <ListPage
      title="Sessions & security"
      subtitle="Active sessions across devices"
      breadcrumbs={[{ label: "Administration" }, { label: "Sessions & security" }]}
      columns={columns}
      fetcher={listSessions}
      rowKey={(r) => r.id}
      rowActions={(r) => (!r.current ? <Button variant="tertiary" size="sm" icon="logout">Revoke</Button> : null)}
      emptyTitle="No active sessions"
    />
  );
}
