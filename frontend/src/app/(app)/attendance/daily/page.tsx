"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listAttendance } from "@/services/modules";
import { StatusBadge, Pill, EmployeeCell, type Column } from "@/components/ui";
import type { AttendanceDay } from "@/types/domain";

const columns: Column<AttendanceDay>[] = [
  { key: "employee", header: "Employee", render: (r) => <EmployeeCell name={r.employee} subtitle={r.employee_code} /> },
  { key: "shift", header: "Shift", render: (r) => r.shift, secondary: true },
  { key: "in", header: "First in", render: (r) => r.first_in ?? "—", align: "right" },
  { key: "out", header: "Last out", render: (r) => r.last_out ?? "—", align: "right" },
  { key: "hours", header: "Worked", render: (r) => r.worked_hours, align: "right" },
  {
    key: "flags",
    header: "Flags",
    render: (r) => (
      <div className="flex gap-1">
        {r.late && <Pill tone="warning">Late</Pill>}
        {r.early && <Pill tone="info">Early out</Pill>}
      </div>
    ),
    secondary: true,
  },
  { key: "source", header: "Source", render: (r) => <Pill tone="neutral">{r.source}</Pill>, secondary: true },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

export default function DailyAttendancePage() {
  return (
    <ListPage
      title="Daily attendance"
      subtitle="Attendance for today"
      breadcrumbs={[{ label: "Attendance" }, { label: "Daily" }]}
      columns={columns}
      fetcher={listAttendance}
      rowKey={(r) => r.id}
      searchable
      searchKeys={["employee", "employee_code"]}
      emptyTitle="No attendance records"
    />
  );
}
