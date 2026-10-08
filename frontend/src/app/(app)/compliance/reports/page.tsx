"use client";

import { ReportView } from "@/components/patterns/ReportView";

export default function ComplianceReportsPage() {
  return (
    <ReportView
      title="Statutory reports & challans"
      subtitle="All generated statutory documents are drafts until expert sign-off"
      breadcrumbs={[{ label: "Compliance" }, { label: "Statutory reports" }]}
      reports={[
        { name: "PF ECR", description: "Electronic Challan-cum-Return for Provident Fund.", sensitive: true },
        { name: "ESI return", description: "Monthly ESI contribution return.", sensitive: true },
        { name: "PT challan", description: "State-wise Professional Tax challan.", sensitive: true },
        { name: "Form 24Q", description: "Quarterly TDS statement (draft — expert verification required).", sensitive: true },
        { name: "Form 16", description: "Annual TDS certificate for employees (draft).", sensitive: true },
      ]}
    />
  );
}
