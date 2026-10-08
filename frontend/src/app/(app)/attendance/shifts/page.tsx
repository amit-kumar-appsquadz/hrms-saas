"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listShifts } from "@/services/modules";
import { Pill, Button, type Column } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import type { Shift } from "@/types/domain";

const columns: Column<Shift>[] = [
  { key: "name", header: "Shift", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "time", header: "Timing", render: (r) => `${r.start} – ${r.end}` },
  { key: "break", header: "Break", render: (r) => `${r.break_mins} min`, secondary: true },
  { key: "grace", header: "Grace", render: (r) => `${r.grace_mins} min`, secondary: true },
  { key: "night", header: "Type", render: (r) => <Pill tone={r.night ? "info" : "neutral"}>{r.night ? "Night" : "Day"}</Pill> },
];

export default function ShiftsPage() {
  return (
    <ListPage
      title="Shifts"
      subtitle="Shift definitions for attendance and rosters"
      breadcrumbs={[{ label: "Attendance" }, { label: "Shifts" }]}
      actions={<Can permission="attendance.policy.manage"><Button variant="primary" icon="plus">Add shift</Button></Can>}
      columns={columns}
      fetcher={listShifts}
      rowKey={(r) => r.id}
      emptyTitle="No shifts defined"
    />
  );
}
