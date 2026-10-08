"use client";

import { PageHeader, Card, CardBody, Button, type Column, DataTable } from "@/components/ui";
import { useToast } from "@/components/providers/ToastProvider";

interface Retention {
  category: string;
  retention: string;
  erasure: string;
}

const DATA: Retention[] = [
  { category: "Employee master", retention: "7 years after exit", erasure: "On request, subject to statutory hold" },
  { category: "Payroll records", retention: "8 years (statutory)", erasure: "Not erasable during statutory period" },
  { category: "Identity documents", retention: "Duration of employment", erasure: "On request after exit" },
  { category: "Audit logs", retention: "5 years", erasure: "Append-only, not erasable" },
];

const columns: Column<Retention>[] = [
  { key: "category", header: "Data category", render: (r) => <span className="font-medium">{r.category}</span> },
  { key: "retention", header: "Retention period", render: (r) => r.retention },
  { key: "erasure", header: "Erasure policy", render: (r) => r.erasure, secondary: true },
];

export default function RetentionSettingsPage() {
  const { toast } = useToast();
  return (
    <div>
      <PageHeader title="Data retention (DPDP)" subtitle="Retention and erasure per data category" breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Data retention" }]} />
      <div className="mb-4 rounded-md border border-warning-subtle bg-warning-subtle/40 px-4 py-2.5 text-body-sm text-warning">
        Retention and erasure settings carry legal implications under the DPDP Act. Changes may require legal / expert review (ADR-006).
      </div>
      <Card>
        <CardBody>
          <DataTable columns={columns} rows={DATA} rowKey={(r) => r.category} caption="Data retention policy" />
        </CardBody>
      </Card>
      <Button variant="primary" icon="check" className="mt-4" onClick={() => toast("Retention policy saved (demo).")}>Save policy</Button>
    </div>
  );
}
