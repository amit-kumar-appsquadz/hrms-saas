"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listDesignations } from "@/services/modules";
import { Button, type Column } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import type { Designation } from "@/types/domain";

const columns: Column<Designation>[] = [
  { key: "title", header: "Designation", render: (r) => <span className="font-medium">{r.title}</span> },
  { key: "company", header: "Company", render: (r) => r.company, secondary: true },
  { key: "grade", header: "Grade", render: (r) => r.grade ?? "—" },
  { key: "employees", header: "Employees", render: (r) => r.employee_count, align: "right" },
];

export default function DesignationsPage() {
  return (
    <ListPage
      title="Designations"
      subtitle="Job titles across the organization"
      breadcrumbs={[{ label: "Organization" }, { label: "Designations" }]}
      actions={<Can permission="organization.create"><Button variant="primary" icon="plus">Add designation</Button></Can>}
      columns={columns}
      fetcher={listDesignations}
      rowKey={(r) => r.id}
      searchable
      searchKeys={["title"]}
      emptyTitle="No designations yet"
    />
  );
}
