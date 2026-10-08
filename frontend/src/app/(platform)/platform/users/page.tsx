"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listPlatformUsers } from "@/services/platform";
import { StatusBadge, Pill, Button, EmployeeCell, type Column } from "@/components/ui";
import { CanPlatform } from "@/components/providers/PlatformSessionProvider";
import { formatDateTime } from "@/lib/format";
import type { PlatformUser } from "@/types/platform";

const columns: Column<PlatformUser>[] = [
  { key: "name", header: "User", render: (u) => <EmployeeCell name={u.name} subtitle={u.email} /> },
  { key: "role", header: "Platform role", render: (u) => <Pill tone="info">{u.platform_role}</Pill> },
  { key: "mfa", header: "MFA", render: (u) => <Pill tone={u.mfa ? "success" : "danger"}>{u.mfa ? "Enabled" : "Off"}</Pill> },
  { key: "last", header: "Last login", render: (u) => (u.last_login ? formatDateTime(u.last_login) : "Never"), secondary: true },
  { key: "status", header: "Status", render: (u) => <StatusBadge status={u.status} /> },
];

export default function PlatformUsersPage() {
  return (
    <ListPage
      title="Platform users"
      subtitle="SaaS operator accounts with platform-level access — distinct from tenant users"
      columns={columns}
      fetcher={listPlatformUsers}
      rowKey={(u) => u.id}
      searchable
      searchKeys={["name", "email"]}
      actions={
        <CanPlatform permission="platform.user.manage">
          <Button variant="primary" icon="plus">Invite platform user</Button>
        </CanPlatform>
      }
      emptyTitle="No platform users"
    />
  );
}
