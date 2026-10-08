"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listCompanies } from "@/services/modules";
import { StatusBadge, Button, type Column } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import type { Company } from "@/types/domain";

const columns: Column<Company>[] = [
  { key: "name", header: "Legal name", render: (r) => <span className="font-medium">{r.legal_name}</span> },
  { key: "code", header: "Code", render: (r) => <span className="font-mono text-body-sm">{r.short_code}</span> },
  { key: "pan", header: "PAN", render: (r) => <span className="font-mono text-body-sm">{r.pan_masked}</span>, secondary: true },
  { key: "gstin", header: "GSTIN", render: (r) => <span className="font-mono text-body-sm">{r.gstin}</span>, secondary: true },
  { key: "locations", header: "Locations", render: (r) => r.locations_count, align: "right" },
  { key: "employees", header: "Employees", render: (r) => r.employee_count, align: "right" },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

export default function CompaniesPage() {
  return (
    <ListPage
      title="Companies"
      subtitle="Legal entities under this tenant"
      breadcrumbs={[{ label: "Organization" }, { label: "Companies" }]}
      actions={
        <Can permission="organization.create">
          <Button variant="primary" icon="plus">Add company</Button>
        </Can>
      }
      columns={columns}
      fetcher={listCompanies}
      rowKey={(r) => r.id}
      searchable
      searchKeys={["legal_name", "short_code"]}
      emptyTitle="No companies yet"
      emptyDescription="Create your first legal entity to get started."
    />
  );
}
