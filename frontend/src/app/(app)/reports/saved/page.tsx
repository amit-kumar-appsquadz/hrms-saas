"use client";

import { PageHeader, Card, CardBody, EmptyState, Button } from "@/components/ui";

const SAVED = [
  { name: "On notice this month", base: "Employee directory", owner: "You", shared: "HR team" },
  { name: "Q1 attrition by dept", base: "Attrition report", owner: "You", shared: "Private" },
  { name: "PF liability", base: "Salary register", owner: "Payroll Admin", shared: "Payroll" },
];

export default function SavedReportsPage() {
  return (
    <div>
      <PageHeader title="Saved reports" subtitle="Named report presets with saved filters and columns" breadcrumbs={[{ label: "Reports" }, { label: "Saved" }]} />
      {SAVED.length === 0 ? (
        <EmptyState icon="reports" title="No saved reports" description="Run a report and save its filters to reuse later." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {SAVED.map((s) => (
            <Card key={s.name}>
              <CardBody>
                <h3 className="text-h3 text-text">{s.name}</h3>
                <p className="mt-1 text-caption text-text-muted">Based on {s.base}</p>
                <p className="text-caption text-text-muted">Owner: {s.owner} · Shared with: {s.shared}</p>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" size="sm" iconRight="arrow-right">Run</Button>
                  <Button variant="tertiary" size="sm" icon="edit" aria-label="Edit" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
