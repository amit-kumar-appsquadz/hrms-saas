"use client";

import { useRouter } from "next/navigation";
import { ListPage } from "@/components/patterns/ListPage";
import { listRoles } from "@/services/modules";
import { Button, Pill, Icon, type Column } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import { formatDate } from "@/lib/format";
import type { Role } from "@/types/api";

const SYSTEM = new Set(["tenant-admin", "employee"]);

export default function RolesPage() {
  const router = useRouter();
  const columns: Column<Role>[] = [
    { key: "name", header: "Role", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "slug", header: "Slug", render: (r) => <span className="font-mono text-body-sm">{r.slug}</span>, secondary: true },
    { key: "perms", header: "Permissions", render: (r) => r.permissions.length, align: "right" },
    { key: "type", header: "Type", render: (r) => <Pill tone={SYSTEM.has(r.slug) ? "neutral" : "info"}>{SYSTEM.has(r.slug) ? "System" : "Custom"}</Pill> },
    { key: "created", header: "Created", render: (r) => formatDate(r.created_at), secondary: true },
  ];

  return (
    <ListPage
      title="Roles & permissions"
      subtitle="Tenant-owned roles and their permission grants"
      breadcrumbs={[{ label: "Administration" }, { label: "Roles" }]}
      actions={<Can permission="admin.role.edit"><Button variant="primary" icon="plus" onClick={() => router.push("/admin/roles/0/edit")}>Create role</Button></Can>}
      columns={columns}
      fetcher={listRoles}
      rowKey={(r) => r.id}
      onRowClick={(r) => router.push(`/admin/roles/${r.id}/edit`)}
      rowActions={(r) => (
        <Button variant="tertiary" size="sm" aria-label={`Edit ${r.name}`} onClick={() => router.push(`/admin/roles/${r.id}/edit`)}>
          <Icon name="edit" size={16} />
        </Button>
      )}
      emptyTitle="No roles yet"
    />
  );
}
