"use client";

import { ReportView } from "@/components/patterns/ReportView";

export default function AttendanceReportsPage() {
  return (
    <ReportView
      title="Attendance reports"
      subtitle="Summaries, exceptions and muster roll"
      breadcrumbs={[{ label: "Attendance" }, { label: "Reports" }]}
      reports={[
        { name: "Daily summary", description: "Present/absent/leave by employee for a selected day." },
        { name: "Monthly summary", description: "Attendance matrix for the month, feeds payroll LOP." },
        { name: "Late / early marks", description: "Employees with late arrivals or early departures." },
        { name: "Overtime", description: "Overtime hours by employee and department." },
        { name: "Absenteeism", description: "Absence rate trends across the organization." },
        { name: "Muster roll", description: "Statutory muster roll export." },
      ]}
    />
  );
}
