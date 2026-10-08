"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listInvitations } from "@/services/modules";
import { StatusBadge, Pill, Button, type Column } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import { formatDateTime } from "@/lib/format";
import type { Invitation } from "@/types/domain";

const columns: Column<Invitation>[] = [
  { key: "email", header: "Email", render: (r) => <span className="font-medium">{r.email}</span> },
  { key: "roles", header: "Roles", render: (r) => <div className="flex gap-1">{r.roles.map((x) => <Pill key={x} tone="info">{x}</Pill>)}</div> },
  { key: "by", header: "Invited by", render: (r) => r.invited_by, secondary: true },
  { key: "at", header: "Invited", render: (r) => formatDateTime(r.invited_at), secondary: true },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

export default function InvitationsPage() {
  return (
    <ListPage
      title="Invitations"
      subtitle="Pending and completed user invitations"
      breadcrumbs={[{ label: "Administration" }, { label: "Invitations" }]}
      actions={<Can permission="admin.user.invite"><Button variant="primary" icon="plus">Invite user</Button></Can>}
      columns={columns}
      fetcher={listInvitations}
      rowKey={(r) => r.id}
      emptyTitle="No invitations"
    />
  );
}
