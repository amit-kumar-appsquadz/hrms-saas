"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listAttendance } from "@/services/modules";
import { StatusBadge, EmployeeCell, type Column } from "@/components/ui";
import type { AttendanceDay } from "@/types/domain";

const columns: Column<AttendanceDay>[] = [
  { key: "employee", header: "Member", render: (r) => <EmployeeCell name={r.employee} subtitle={r.employee_code} /> },
  { key: "in", header: "First in", render: (r) => r.first_in ?? "—", align: "right" },
  { key: "out", header: "Last out", render: (r) => r.last_out ?? "—", align: "right" },
  { key: "hours", header: "Worked", render: (r) => r.worked_hours, align: "right", secondary: true },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

export default function TeamAttendancePage() {
  return (
    <ListPage
      title="Team attendance"
      subtitle="Today's attendance for your reports"
      breadcrumbs={[{ label: "Team" }, { label: "Attendance" }]}
      columns={columns}
      fetcher={async () => (await listAttendance(1, 8)).data}
      rowKey={(r) => r.id}
      emptyTitle="No attendance records"
    />
  );
}
