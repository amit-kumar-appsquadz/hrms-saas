"use client";

import { PageHeader, Card, CardBody, Pill, Button, type Column, DataTable } from "@/components/ui";

interface Schedule {
  id: number;
  report: string;
  frequency: string;
  next_run: string;
  recipients: string;
  status: "active" | "paused";
}

const SCHEDULES: Schedule[] = [
  { id: 1, report: "Headcount report", frequency: "Monthly · 1st, 09:00", next_run: "01 Aug 2024", recipients: "HR team", status: "active" },
  { id: 2, report: "Attrition report", frequency: "Quarterly", next_run: "01 Oct 2024", recipients: "Leadership", status: "active" },
  { id: 3, report: "Salary register", frequency: "Monthly · 26th", next_run: "26 Jul 2024", recipients: "Payroll", status: "paused" },
];

const columns: Column<Schedule>[] = [
  { key: "report", header: "Report", render: (r) => <span className="font-medium">{r.report}</span> },
  { key: "freq", header: "Frequency", render: (r) => r.frequency },
  { key: "next", header: "Next run", render: (r) => r.next_run, secondary: true },
  { key: "recipients", header: "Recipients", render: (r) => r.recipients, secondary: true },
  { key: "status", header: "Status", render: (r) => <Pill tone={r.status === "active" ? "success" : "neutral"}>{r.status}</Pill> },
];

export default function ScheduledReportsPage() {
  return (
    <div>
      <PageHeader
        title="Scheduled reports"
        subtitle="Reports delivered automatically on a schedule"
        breadcrumbs={[{ label: "Reports" }, { label: "Scheduled" }]}
        actions={<Button variant="primary" icon="plus">Schedule report</Button>}
      />
      <Card>
        <CardBody>
          <DataTable columns={columns} rows={SCHEDULES} rowKey={(r) => r.id} caption="Scheduled reports" rowActions={(r) => <Button variant="tertiary" size="sm">{r.status === "active" ? "Pause" : "Resume"}</Button>} />
        </CardBody>
      </Card>
    </div>
  );
}
