"use client";

import { useState } from "react";
import { ListPage } from "@/components/patterns/ListPage";
import { getPayrollRegister } from "@/services/modules";
import { Button, EmployeeCell, type Column } from "@/components/ui";
import { formatINR } from "@/lib/format";
import type { PayrollRegisterRow } from "@/types/domain";

export default function CompensationPage() {
  const [revealed, setRevealed] = useState(false);

  const columns: Column<PayrollRegisterRow>[] = [
    { key: "employee", header: "Employee", render: (r) => <EmployeeCell name={r.employee} subtitle={r.employee_code} /> },
    { key: "ctc", header: "Annual CTC", render: (r) => (revealed ? formatINR(r.gross * 12) : "••••••"), align: "right" },
    { key: "gross", header: "Monthly gross", render: (r) => (revealed ? formatINR(r.gross) : "••••••"), align: "right" },
    { key: "structure", header: "Structure", render: () => "Standard — L3/L4", secondary: true },
  ];

  return (
    <div>
      <ListPage
        title="Employee compensation"
        subtitle="Compensation amounts are masked and audited (ADR-006)"
        breadcrumbs={[{ label: "Payroll" }, { label: "Compensation" }]}
        actions={
          <Button variant="secondary" icon={revealed ? "eye-off" : "eye"} onClick={() => setRevealed((v) => !v)}>
            {revealed ? "Hide amounts" : "Reveal amounts (logged)"}
          </Button>
        }
        columns={columns}
        fetcher={() => getPayrollRegister(1, 25)}
        rowKey={(r) => r.employee_code}
        emptyTitle="No compensation data"
      />
    </div>
  );
}
