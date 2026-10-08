"use client";

import { use } from "react";
import { useAsync } from "@/hooks/useAsync";
import { getPayrollRun, getPayrollRegister } from "@/services/modules";
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Stepper,
  Button,
  DataTable,
  Pill,
  Skeleton,
  ErrorState,
  type Column,
} from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { formatINR } from "@/lib/format";
import type { PayrollRegisterRow } from "@/types/domain";

const STAGES = [
  { key: "draft", label: "Draft" },
  { key: "validate", label: "Validate" },
  { key: "calculate", label: "Calculate" },
  { key: "review", label: "Review" },
  { key: "approve", label: "Approve" },
  { key: "lock", label: "Lock" },
  { key: "payslips", label: "Payslips" },
  { key: "publish", label: "Publish" },
];

export default function PayrollRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const run = useAsync(() => getPayrollRun(Number(id)), [id]);
  const register = useAsync(() => getPayrollRegister(1, 25), [id]);

  if (run.loading) return <Skeleton className="h-96 w-full" />;
  if (run.error || !run.data) return <ErrorState message={run.error?.message} onRetry={run.reload} />;

  const data = run.data;
  const currentStage = STAGES.findIndex((s) => s.key === data.stage);

  const columns: Column<PayrollRegisterRow>[] = [
    { key: "employee", header: "Employee", render: (r) => <span className="font-medium">{r.employee}</span> },
    { key: "gross", header: "Gross", render: (r) => formatINR(r.gross), align: "right" },
    { key: "deductions", header: "Deductions", render: (r) => formatINR(r.deductions), align: "right", secondary: true },
    { key: "statutory", header: "Statutory", render: (r) => formatINR(r.statutory), align: "right", secondary: true },
    { key: "lop", header: "LOP", render: (r) => (r.lop ? formatINR(r.lop) : "—"), align: "right", secondary: true },
    { key: "net", header: "Net", render: (r) => <strong className="tabular">{formatINR(r.net)}</strong>, align: "right" },
    { key: "exception", header: "", render: (r) => (r.exception ? <Pill tone="warning">!</Pill> : null) },
  ];

  return (
    <div>
      <PageHeader
        title={`Payroll run — ${data.period}`}
        subtitle={`${data.employees} employees · ${data.scope}`}
        status={data.stage}
        breadcrumbs={[{ label: "Payroll", href: "/payroll" }, { label: "Runs", href: "/payroll/runs" }, { label: data.period }]}
      />

      <div className="mb-4 rounded-md border border-info-subtle bg-info-subtle/40 px-4 py-2.5 text-body-sm text-info">
        Calculation, approval, lock and payment are distinct permissioned stages, each audited (steering rule 5).
        Figures shown are demo data from an expert-verified engine in production.
      </div>

      <Card className="mb-4">
        <CardBody>
          <div className="overflow-x-auto scroll-thin pb-2">
            <Stepper steps={STAGES} current={currentStage < 0 ? 0 : currentStage} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            <Button variant="secondary" size="sm" onClick={() => toast("Validation run queued (demo).")}>Re-validate</Button>
            <Button variant="secondary" size="sm" onClick={() => toast("Calculation started (demo).")}>Recalculate</Button>
            <Can permission="payroll.approve">
              <Button variant="primary" size="sm" icon="check" onClick={() => toast("Run approved (demo).")}>Approve</Button>
            </Can>
            <Can permission="payroll.lock">
              <Button variant="danger" size="sm" onClick={() => toast("Run locked (demo).")}>Lock run</Button>
            </Can>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Payroll register" subtitle="Per-employee breakdown" />
        <CardBody>
          <DataTable
            columns={columns}
            rows={register.data?.data ?? []}
            rowKey={(r) => r.employee_code}
            loading={register.loading}
            error={register.error}
            onRetry={register.reload}
            caption="Payroll register"
          />
        </CardBody>
      </Card>
    </div>
  );
}
