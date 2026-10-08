"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listDepartments } from "@/services/modules";
import { StatusBadge, Button, type Column } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import type { Department } from "@/types/domain";

const columns: Column<Department>[] = [
  { key: "name", header: "Department", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "company", header: "Company", render: (r) => r.company, secondary: true },
  { key: "parent", header: "Parent", render: (r) => r.parent ?? "—", secondary: true },
  { key: "head", header: "Head", render: (r) => r.head ?? "—" },
  { key: "employees", header: "Employees", render: (r) => r.employee_count, align: "right" },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

export default function DepartmentsPage() {
  return (
    <ListPage
      title="Departments"
      subtitle="Organizational departments and teams"
      breadcrumbs={[{ label: "Organization" }, { label: "Departments" }]}
      actions={<Can permission="organization.create"><Button variant="primary" icon="plus">Add department</Button></Can>}
      columns={columns}
      fetcher={listDepartments}
      rowKey={(r) => r.id}
      searchable
      searchKeys={["name", "head"]}
      emptyTitle="No departments yet"
    />
  );
}
