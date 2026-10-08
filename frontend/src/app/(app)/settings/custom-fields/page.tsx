"use client";

import { PageHeader, Card, CardBody, Button, Pill, type Column, DataTable } from "@/components/ui";

interface CustomField {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

const FIELDS: CustomField[] = [
  { key: "shirt_size", label: "Shirt size", type: "Select", required: false },
  { key: "employee_type", label: "Employee type", type: "Select", required: true },
  { key: "cost_center", label: "Cost center", type: "Text", required: true },
  { key: "wfh_eligible", label: "WFH eligible", type: "Boolean", required: false },
];

const columns: Column<CustomField>[] = [
  { key: "label", header: "Field", render: (r) => <span className="font-medium">{r.label}</span> },
  { key: "key", header: "Key", render: (r) => <span className="font-mono text-body-sm">{r.key}</span>, secondary: true },
  { key: "type", header: "Type", render: (r) => r.type },
  { key: "required", header: "Required", render: (r) => (r.required ? <Pill tone="info">Required</Pill> : "—") },
];

export default function CustomFieldsPage() {
  return (
    <div>
      <PageHeader
        title="Custom fields"
        subtitle="Define additional employee fields (EAV)"
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Custom fields" }]}
        actions={<Button variant="primary" icon="plus">Add field</Button>}
      />
      <Card>
        <CardBody>
          <DataTable columns={columns} rows={FIELDS} rowKey={(r) => r.key} caption="Custom fields" rowActions={() => <Button variant="tertiary" size="sm" icon="edit" aria-label="Edit" />} />
        </CardBody>
      </Card>
    </div>
  );
}
