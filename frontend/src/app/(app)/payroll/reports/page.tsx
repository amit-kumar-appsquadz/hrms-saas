"use client";

import { ReportView } from "@/components/patterns/ReportView";

export default function PayrollReportsPage() {
  return (
    <ReportView
      title="Payroll reports"
      subtitle="Registers, bank advice and variance — sensitive exports are permission-gated"
      breadcrumbs={[{ label: "Payroll" }, { label: "Reports" }]}
      reports={[
        { name: "Salary register", description: "Per-employee gross, deductions and net for a run.", sensitive: true },
        { name: "Bank advice", description: "Bank transfer file for a payroll run.", sensitive: true },
        { name: "Variance report", description: "Month-over-month variance by employee.", sensitive: true },
        { name: "Cost to company", description: "Full CTC breakup across the organization.", sensitive: true },
        { name: "Reimbursements", description: "Reimbursement claims and payouts.", sensitive: false },
        { name: "Deductions summary", description: "Statutory and voluntary deductions.", sensitive: true },
      ]}
    />
  );
}
