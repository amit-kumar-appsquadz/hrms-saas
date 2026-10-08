"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listCalendars } from "@/services/modules";
import { Button, type Column } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import type { WorkCalendar } from "@/types/domain";

const columns: Column<WorkCalendar>[] = [
  { key: "name", header: "Calendar", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "scope", header: "Scope", render: (r) => r.scope },
  { key: "working_days", header: "Working days", render: (r) => r.working_days },
  { key: "week_off", header: "Week off", render: (r) => r.week_off, secondary: true },
  { key: "holiday_list", header: "Holiday list", render: (r) => r.holiday_list, secondary: true },
];

export default function CalendarsPage() {
  return (
    <ListPage
      title="Work calendars"
      subtitle="Working-day patterns driving attendance and payroll day counts"
      breadcrumbs={[{ label: "Organization" }, { label: "Work calendars" }]}
      actions={<Can permission="organization.create"><Button variant="primary" icon="plus">Add calendar</Button></Can>}
      columns={columns}
      fetcher={listCalendars}
      rowKey={(r) => r.id}
      emptyTitle="No work calendars"
    />
  );
}
