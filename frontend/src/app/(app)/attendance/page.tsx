"use client";

import { PageHeader, StatCard, Card, CardHeader, CardBody, StackedTrend } from "@/components/ui";
import { dashboardSummary } from "@/lib/demo/seed";

export default function AttendanceOverviewPage() {
  const s = dashboardSummary;
  return (
    <div>
      <PageHeader
        title="Attendance overview"
        subtitle="Today's attendance across the organization"
        breadcrumbs={[{ label: "Attendance" }, { label: "Overview" }]}
      />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Present today" value={`${s.present_pct}%`} icon="attendance" deltaTone="success" delta="228 present" />
        <StatCard label="On leave" value={s.on_leave_today} icon="leave" />
        <StatCard label="Absent" value={8} icon="user" deltaTone="danger" />
        <StatCard label="Pending regularizations" value={2} icon="clock" href="/attendance/regularizations" />
      </div>
      <Card>
        <CardHeader title="Attendance trend" subtitle="This week" />
        <CardBody>
          <StackedTrend data={s.attendance_trend} />
        </CardBody>
      </Card>
    </div>
  );
}
