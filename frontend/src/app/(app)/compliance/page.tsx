"use client";

import Link from "next/link";
import { useAsync } from "@/hooks/useAsync";
import { listComplianceStatutes, listComplianceAlerts } from "@/services/modules";
import { PageHeader, Card, CardHeader, CardBody, StatusBadge, Pill, Icon, CardsSkeleton, ErrorState } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default function ComplianceDashboardPage() {
  const statutes = useAsync(() => listComplianceStatutes());
  const alerts = useAsync(() => listComplianceAlerts());

  return (
    <div>
      <PageHeader title="Compliance dashboard" subtitle="Statutory status and upcoming filings" breadcrumbs={[{ label: "Compliance" }, { label: "Dashboard" }]} />

      <div className="mb-4 rounded-md border border-warning-subtle bg-warning-subtle/40 px-4 py-2.5 text-body-sm text-warning">
        Statutory rates, slabs and formulas are backend config, expert-verified (steering rule 5). This UI displays
        and configures — it never encodes legal rules. Generated forms are drafts until expert sign-off.
      </div>

      {(statutes.loading || alerts.loading) && <CardsSkeleton count={6} />}
      {(statutes.error || alerts.error) && <ErrorState message="Unable to load compliance data" onRetry={() => { statutes.reload(); alerts.reload(); }} />}

      {statutes.data && (
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statutes.data.map((s) => (
            <Link key={s.key} href={`/compliance/${s.key}`}>
              <Card className="transition-colors hover:border-border-strong">
                <CardBody>
                  <div className="flex items-center justify-between">
                    <h3 className="text-h3 text-text">{s.name}</h3>
                    <StatusBadge status={s.status} />
                  </div>
                  <dl className="mt-3 space-y-1.5 text-body-sm">
                    <div className="flex justify-between"><dt className="text-text-muted">Due date</dt><dd className="text-text">{s.due_date === "—" ? "—" : formatDate(s.due_date)}</dd></div>
                    <div className="flex justify-between"><dt className="text-text-muted">Last filing</dt><dd className="text-text">{s.last_filing === "—" ? "—" : formatDate(s.last_filing)}</dd></div>
                  </dl>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {alerts.data && (
        <Card>
          <CardHeader title="Compliance alerts" />
          <CardBody className="p-0">
            <ul className="divide-y divide-border">
              {alerts.data.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={a.severity === "danger" ? "text-danger" : a.severity === "warning" ? "text-warning" : "text-info"}>
                    <Icon name={a.severity === "info" ? "info" : "alert"} size={18} />
                  </span>
                  <div className="flex-1">
                    <div className="text-body-sm text-text">{a.message}</div>
                    <div className="text-caption text-text-muted">{a.statute} · due {a.due === "—" ? "—" : formatDate(a.due)}</div>
                  </div>
                  <Pill tone={a.severity === "danger" ? "danger" : a.severity === "warning" ? "warning" : "info"}>{a.severity}</Pill>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
