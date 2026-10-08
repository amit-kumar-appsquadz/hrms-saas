"use client";

import { useRouter } from "next/navigation";
import { ListPage } from "@/components/patterns/ListPage";
import { listEmployees } from "@/services/employees";
import { StatusBadge, EmployeeCell, Icon, Button, type Column } from "@/components/ui";
import type { EmployeeSummary } from "@/types/api";

const columns: Column<EmployeeSummary>[] = [
  { key: "name", header: "Member", render: (r) => <EmployeeCell name={r.full_name} subtitle={r.employee_code} /> },
  { key: "designation", header: "Designation", render: (r) => r.designation ?? "—" },
  { key: "dept", header: "Department", render: (r) => r.department ?? "—", secondary: true },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

export default function TeamMembersPage() {
  const router = useRouter();
  return (
    <ListPage
      title="Team members"
      subtitle="Your direct and indirect reports"
      breadcrumbs={[{ label: "Team" }, { label: "Members" }]}
      columns={columns}
      fetcher={async () => (await listEmployees({ per_page: 8 })).data}
      rowKey={(r) => r.id}
      onRowClick={(r) => router.push(`/employees/${r.id}`)}
      rowActions={(r) => (
        <Button variant="tertiary" size="sm" aria-label={`View ${r.full_name}`} onClick={() => router.push(`/employees/${r.id}`)}>
          <Icon name="arrow-right" size={16} />
        </Button>
      )}
      emptyTitle="No team members"
    />
  );
}
