"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAsync } from "@/hooks/useAsync";
import { listEmployees, departmentOptions, type EmployeeListParams } from "@/services/employees";
import {
  PageHeader,
  DataTable,
  SearchInput,
  FilterSelect,
  Toolbar,
  Button,
  StatusBadge,
  EmployeeCell,
  Icon,
  type Column,
} from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import type { EmployeeSummary } from "@/types/api";

export default function EmployeesPage() {
  const router = useRouter();
  const [params, setParams] = useState<EmployeeListParams>({ page: 1, per_page: 25 });
  const { data, loading, error, reload } = useAsync(
    () => listEmployees(params),
    [params.page, params.q, params.department, params.status],
  );

  const columns: Column<EmployeeSummary>[] = [
    {
      key: "name",
      header: "Employee",
      render: (r) => <EmployeeCell name={r.full_name} subtitle={r.employee_code} />,
    },
    { key: "email", header: "Work email", render: (r) => r.work_email, secondary: true },
    { key: "department", header: "Department", render: (r) => r.department ?? "—" },
    { key: "designation", header: "Designation", render: (r) => r.designation ?? "—", secondary: true },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={data ? `${data.meta.total} people` : "Manage your workforce"}
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Employees" }]}
        actions={
          <>
            <Can permission="employees.export">
              <Button variant="secondary" icon="download">
                Export
              </Button>
            </Can>
            <Can permission="employees.create">
              <Button variant="primary" icon="plus" onClick={() => router.push("/employees/new")}>
                Add employee
              </Button>
            </Can>
          </>
        }
      />

      <Toolbar>
        <SearchInput
          value={params.q ?? ""}
          onChange={(q) => setParams((p) => ({ ...p, q, page: 1 }))}
          placeholder="Search name, code or email"
        />
        <FilterSelect
          label="Status"
          value={params.status ?? ""}
          onChange={(v) => setParams((p) => ({ ...p, status: (v || undefined) as EmployeeListParams["status"], page: 1 }))}
          options={[
            { value: "", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "on_notice", label: "On notice" },
            { value: "inactive", label: "Inactive" },
            { value: "exited", label: "Exited" },
          ]}
        />
        <FilterSelect
          label="Department"
          value={params.department ?? ""}
          onChange={(v) => setParams((p) => ({ ...p, department: v || undefined, page: 1 }))}
          options={[{ value: "", label: "All departments" }, ...departmentOptions().map((d) => ({ value: d, label: d }))]}
        />
      </Toolbar>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={reload}
        caption="Employee directory"
        meta={data?.meta}
        onPageChange={(page) => setParams((p) => ({ ...p, page }))}
        onRowClick={(r) => router.push(`/employees/${r.id}`)}
        emptyTitle="No employees found"
        emptyDescription="Try adjusting your filters, or add your first employee."
        rowActions={(r) => (
          <Button variant="tertiary" size="sm" aria-label={`View ${r.full_name}`} onClick={() => router.push(`/employees/${r.id}`)}>
            <Icon name="arrow-right" size={16} />
          </Button>
        )}
      />
    </div>
  );
}
