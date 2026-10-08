"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listLocations } from "@/services/modules";
import { StatusBadge, Pill, Button, type Column } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import type { Location } from "@/types/domain";

const columns: Column<Location>[] = [
  { key: "name", header: "Location", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "company", header: "Company", render: (r) => r.company, secondary: true },
  { key: "city", header: "City", render: (r) => r.city },
  { key: "state", header: "State", render: (r) => r.state },
  { key: "type", header: "Type", render: (r) => <Pill tone={r.type === "HO" ? "info" : "neutral"}>{r.type}</Pill> },
  { key: "employees", header: "Employees", render: (r) => r.employee_count, align: "right" },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

export default function LocationsPage() {
  return (
    <ListPage
      title="Locations"
      subtitle="Offices, branches and sites"
      breadcrumbs={[{ label: "Organization" }, { label: "Locations" }]}
      actions={<Can permission="organization.create"><Button variant="primary" icon="plus">Add location</Button></Can>}
      columns={columns}
      fetcher={listLocations}
      rowKey={(r) => r.id}
      searchable
      searchKeys={["name", "city", "state"]}
      emptyTitle="No locations yet"
    />
  );
}
