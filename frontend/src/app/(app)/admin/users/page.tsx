"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listUsers } from "@/services/modules";
import { StatusBadge, Pill, Button, EmployeeCell, type Column } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import { formatDateTime } from "@/lib/format";
import type { UserRecord } from "@/types/domain";

const columns: Column<UserRecord>[] = [
  { key: "user", header: "User", render: (r) => <EmployeeCell name={r.employee ?? r.email} subtitle={r.email} /> },
  { key: "roles", header: "Roles", render: (r) => <div className="flex flex-wrap gap-1">{r.roles.map((role) => <Pill key={role} tone="info">{role}</Pill>)}</div> },
  { key: "mfa", header: "MFA", render: (r) => <Pill tone={r.mfa ? "success" : "neutral"}>{r.mfa ? "Enabled" : "Off"}</Pill>, secondary: true },
  { key: "last_login", header: "Last login", render: (r) => (r.last_login ? formatDateTime(r.last_login) : "Never"), secondary: true },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

export default function UsersPage() {
  return (
    <ListPage
      title="Users"
      subtitle="Platform users and their access"
      breadcrumbs={[{ label: "Administration" }, { label: "Users" }]}
      actions={<Can permission="admin.user.invite"><Button variant="primary" icon="plus">Invite user</Button></Can>}
      columns={columns}
      fetcher={listUsers}
      rowKey={(r) => r.id}
      searchable
      searchKeys={["email", "employee"]}
      emptyTitle="No users yet"
    />
  );
}
