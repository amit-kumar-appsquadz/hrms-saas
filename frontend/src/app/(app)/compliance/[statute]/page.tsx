"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { PageHeader, Card, CardHeader, CardBody, Button, FormSection, TextField, EmployeeCell } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import { employees } from "@/lib/demo/seed";
import { formatINR } from "@/lib/format";

const META: Record<string, { title: string; config: { label: string; value: string }[]; computedLabel: string; rate: number }> = {
  pf: {
    title: "Provident Fund (PF)",
    config: [
      { label: "Establishment code", value: "KA/BNG/0012345" },
      { label: "Employee contribution", value: "12% of Basic (config)" },
      { label: "Employer contribution", value: "12% of Basic (config)" },
    ],
    computedLabel: "Employee PF",
    rate: 0.12,
  },
  esi: {
    title: "ESI",
    config: [
      { label: "ESI code", value: "31000123450001099" },
      { label: "Wage threshold", value: "₹21,000 / month (config)" },
      { label: "Employee rate", value: "0.75% (config)" },
    ],
    computedLabel: "Employee ESI",
    rate: 0.0075,
  },
  pt: {
    title: "Professional Tax (PT)",
    config: [
      { label: "State", value: "Karnataka (per location)" },
      { label: "Slab", value: "₹200/month above ₹25,000 (config)" },
      { label: "Deduction cycle", value: "Monthly" },
    ],
    computedLabel: "PT",
    rate: 0,
  },
  tds: {
    title: "TDS (Income Tax)",
    config: [
      { label: "TAN", value: "BLRA12345E" },
      { label: "Regimes supported", value: "Old & New (engine)" },
      { label: "Declaration window", value: "Open until 15 Jul" },
    ],
    computedLabel: "Monthly TDS",
    rate: 0.1,
  },
  gratuity: {
    title: "Gratuity",
    config: [
      { label: "Eligibility", value: "5 years continuous service" },
      { label: "Formula", value: "15/26 × last Basic × years (config)" },
    ],
    computedLabel: "Provisioned",
    rate: 0.04,
  },
  bonus: {
    title: "Statutory Bonus",
    config: [
      { label: "Eligibility ceiling", value: "₹21,000 / month (config)" },
      { label: "Payout rate", value: "8.33% – 20% (config)" },
    ],
    computedLabel: "Bonus",
    rate: 0.0833,
  },
};

export default function CompliancePage({ params }: { params: Promise<{ statute: string }> }) {
  const { statute } = use(params);
  const meta = META[statute];
  if (!meta) notFound();

  const rows = employees.slice(0, 12);

  return (
    <div>
      <PageHeader
        title={meta.title}
        subtitle="Configuration and computed figures (expert-verified in production)"
        breadcrumbs={[{ label: "Compliance", href: "/compliance" }, { label: meta.title }]}
        actions={<Can permission="compliance.export"><Button variant="secondary" icon="download">Generate / export</Button></Can>}
      />

      <div className="mb-4 rounded-md border border-warning-subtle bg-warning-subtle/40 px-4 py-2.5 text-body-sm text-warning">
        Rates and slabs shown here are configuration data; they are not legal advice. Expert verification is required
        before use in a live payroll run (steering rule 5).
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Configuration" />
          <CardBody>
            <FormSection title="Statutory settings">
              {meta.config.map((c) => (
                <TextField key={c.label} label={c.label} defaultValue={c.value} full readOnly />
              ))}
            </FormSection>
            <Can permission="compliance.config.manage">
              <Button variant="secondary" size="sm" icon="edit" className="mt-4">Edit configuration</Button>
            </Can>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Computed — July 2024" subtitle="Values from the payroll engine" />
          <CardBody className="p-0">
            <table className="w-full border-collapse text-body-sm">
              <caption className="sr-only">{meta.title} computed values</caption>
              <thead>
                <tr className="border-b border-border bg-surface-muted">
                  <th scope="col" className="px-4 py-2.5 text-left text-caption font-semibold uppercase text-text-muted">Employee</th>
                  <th scope="col" className="px-4 py-2.5 text-right text-caption font-semibold uppercase text-text-muted">{meta.computedLabel}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e, i) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5"><EmployeeCell name={e.full_name} subtitle={e.employee_code} /></td>
                    <td className="px-4 py-2.5 text-right tabular text-text">
                      {statute === "pt" ? formatINR(200) : formatINR(Math.round((40000 + i * 2500) * (meta.rate || 0.1)))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
