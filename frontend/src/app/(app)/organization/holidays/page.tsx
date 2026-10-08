"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listHolidays } from "@/services/modules";
import { Pill, Button, type Column } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import { formatDate } from "@/lib/format";
import type { Holiday } from "@/types/domain";

const columns: Column<Holiday>[] = [
  { key: "date", header: "Date", render: (r) => formatDate(r.date) },
  { key: "name", header: "Holiday", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "type", header: "Type", render: (r) => <Pill tone={r.type === "Public" ? "info" : "neutral"}>{r.type}</Pill> },
  { key: "location", header: "Location", render: (r) => r.location, secondary: true },
  { key: "recurring", header: "Recurring", render: (r) => (r.recurring ? "Yes" : "No"), secondary: true },
];

export default function HolidaysPage() {
  return (
    <ListPage
      title="Holidays"
      subtitle="Holiday calendar for the year"
      breadcrumbs={[{ label: "Organization" }, { label: "Holidays" }]}
      actions={
        <Can permission="organization.create">
          <div className="flex gap-2">
            <Button variant="secondary" icon="upload">Import</Button>
            <Button variant="primary" icon="plus">Add holiday</Button>
          </div>
        </Can>
      }
      columns={columns}
      fetcher={listHolidays}
      rowKey={(r) => r.id}
      searchable
      searchKeys={["name"]}
      emptyTitle="No holidays configured"
    />
  );
}
