"use client";

import Link from "next/link";
import { useAsync } from "@/hooks/useAsync";
import { getPlatformSummary, listSecurityAlerts } from "@/services/platform";
import {
  PageHeader,
  StatCard,
  Card,
  CardHeader,
  CardBody,
  LineChart,
  DonutChart,
  Pill,
  Icon,
  CardsSkeleton,
  ErrorState,
} from "@/components/ui";
import { formatINR } from "@/lib/format";

export default function PlatformDashboardPage() {
  const summary = useAsync(() => getPlatformSummary());
  const alerts = useAsync(() => listSecurityAlerts());

  return (
    <div>
      <PageHeader
        title="Platform dashboard"
        subtitle="SaaS operator overview across all customer tenants"
      />

      {(summary.loading || alerts.loading) && <CardsSkeleton count={4} />}
      {summary.error && <ErrorState message={summary.error.message} onRetry={summary.reload} />}

      {summary.data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total tenants" value={summary.data.total_tenants} icon="building" href="/platform/tenants" />
            <StatCard label="Active" value={summary.data.active_tenants} icon="check" deltaTone="success" delta="paying" />
            <StatCard label="Trial" value={summary.data.trial_tenants} icon="clock" deltaTone="neutral" delta="in trial" />
            <StatCard label="Suspended" value={summary.data.suspended_tenants} icon="alert" deltaTone="danger" delta="attention" />
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total employees" value={summary.data.total_employees.toLocaleString("en-IN")} icon="employees" hint="across tenants" />
            <StatCard label="Monthly recurring" value={formatINR(summary.data.mrr)} icon="payroll" />
            <StatCard label="Onboarding" value={3} icon="organization" href="/platform/onboarding" />
            <StatCard label="Security alerts" value={alerts.data?.length ?? 0} icon="compliance" href="#alerts" deltaTone="danger" delta="review" />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Tenant growth" subtitle="Tenants onboarded over time" />
              <CardBody>
                <LineChart data={summary.data.tenant_growth} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Tenants by plan" />
              <CardBody>
                <DonutChart data={summary.data.usage_by_plan} />
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader title="Tenant status" />
              <CardBody>
                <DonutChart data={summary.data.tenant_status_split} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="System health" />
              <CardBody className="p-0">
                <ul className="divide-y divide-border">
                  {summary.data.system_health.map((s) => (
                    <li key={s.service} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-body-sm text-text">{s.service}</span>
                      <span className="flex items-center gap-2">
                        <span className="tabular text-caption text-text-muted">{s.uptime}</span>
                        <Pill tone={s.status === "operational" ? "success" : s.status === "degraded" ? "warning" : "danger"}>
                          {s.status}
                        </Pill>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Recent platform activity" action={<Link href="/platform/audit" className="text-body-sm text-primary hover:underline">Audit</Link>} />
              <CardBody className="p-0">
                <ul className="divide-y divide-border">
                  {summary.data.recent_activity.map((a, i) => (
                    <li key={i} className="px-4 py-2.5">
                      <div className="text-body-sm text-text">
                        <span className="font-medium">{a.actor}</span> {a.action}
                      </div>
                      <div className="text-caption text-text-muted">{a.time}</div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>

          {alerts.data && (
            <Card>
              <CardHeader title="Security alerts" />
              <CardBody className="p-0">
                <ul id="alerts" className="divide-y divide-border">
                  {alerts.data.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                      <span className={a.severity === "danger" ? "text-danger" : a.severity === "warning" ? "text-warning" : "text-info"}>
                        <Icon name={a.severity === "info" ? "info" : "alert"} size={18} />
                      </span>
                      <div className="flex-1">
                        <div className="text-body-sm text-text">{a.message}</div>
                        {a.tenant && <div className="text-caption text-text-muted">{a.tenant}</div>}
                      </div>
                      <Pill tone={a.severity === "danger" ? "danger" : a.severity === "warning" ? "warning" : "info"}>{a.severity}</Pill>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
