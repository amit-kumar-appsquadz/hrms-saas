"use client";

import { PageHeader, Card, CardHeader, CardBody, Button } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";

const POLICIES = [
  { name: "Standard Leave Policy", scope: "All employees", accrual: "Monthly, 1.5 days", carry: "Up to 30 days", approval: "Manager → HR" },
  { name: "Management Policy", scope: "Grades M1, M2", accrual: "Monthly, 2 days", carry: "Up to 45 days", approval: "Skip-level" },
  { name: "Contract Policy", scope: "Contract staff", accrual: "No accrual", carry: "Not allowed", approval: "Manager" },
];

export default function LeavePoliciesPage() {
  return (
    <div>
      <PageHeader
        title="Leave policies"
        subtitle="Accrual, carry-forward, encashment and approval rules"
        breadcrumbs={[{ label: "Leave" }, { label: "Leave policies" }]}
        actions={<Can permission="leave.policy.manage"><Button variant="primary" icon="plus">Add policy</Button></Can>}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {POLICIES.map((p) => (
          <Card key={p.name}>
            <CardHeader title={p.name} subtitle={p.scope} action={<Button variant="tertiary" size="sm" icon="edit" aria-label="Edit policy" />} />
            <CardBody>
              <dl className="space-y-2 text-body-sm">
                <div className="flex justify-between"><dt className="text-text-muted">Accrual</dt><dd className="text-text">{p.accrual}</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted">Carry-forward</dt><dd className="text-text">{p.carry}</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted">Approval chain</dt><dd className="text-text">{p.approval}</dd></div>
              </dl>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
