"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listGrades } from "@/services/modules";
import { Button, type Column } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import type { Grade } from "@/types/domain";

const columns: Column<Grade>[] = [
  { key: "name", header: "Grade", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "level", header: "Level", render: (r) => r.level, align: "right" },
  { key: "band", header: "Salary band", render: (r) => r.salary_band ?? "—", secondary: true },
  { key: "employees", header: "Employees", render: (r) => r.employee_count, align: "right" },
];

export default function GradesPage() {
  return (
    <ListPage
      title="Grades"
      subtitle="Grades and bands used for compensation"
      breadcrumbs={[{ label: "Organization" }, { label: "Grades" }]}
      actions={<Can permission="organization.create"><Button variant="primary" icon="plus">Add grade</Button></Can>}
      columns={columns}
      fetcher={listGrades}
      rowKey={(r) => r.id}
      emptyTitle="No grades yet"
    />
  );
}
