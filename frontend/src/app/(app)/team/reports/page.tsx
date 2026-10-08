"use client";

import { ReportView } from "@/components/patterns/ReportView";

export default function TeamReportsPage() {
  return (
    <ReportView
      title="Team reports"
      subtitle="Reports scoped to your reporting line"
      breadcrumbs={[{ label: "Team" }, { label: "Reports" }]}
      reports={[
        { name: "Team attendance summary", description: "Attendance for your reports this month." },
        { name: "Team leave balance", description: "Leave balances across your team." },
        { name: "Team utilization", description: "Working-day utilization for your reports." },
      ]}
    />
  );
}
