"use client";

import Link from "next/link";
import { useAsync } from "@/hooks/useAsync";
import { getDashboard } from "@/services/modules";
import {
  PageHeader,
  StatCard,
  Card,
  CardHeader,
  CardBody,
  CardsSkeleton,
  ErrorState,
  LineChart,
  BarChart,
  DonutChart,
  StackedTrend,
  Icon,
} from "@/components/ui";
import { useSession } from "@/components/providers/SessionProvider";
import { formatDate } from "@/lib/format";

export default function DashboardPage() {
  const { user } = useSession();
  const { data, loading, error, reload } = useAsync(() => getDashboard());

  return (
    <div>
      <PageHeader
        title={`Welcome back${user ? `, ${user.email.split(".")[0]}` : ""}`}
        subtitle="Here's what's happening across your organization today."
      />

      {loading && <CardsSkeleton count={4} />}
      {error && <ErrorState message={error.message} requestId={error.requestId} onRetry={reload} />}

      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total employees" value={data.total_employees} icon="employees" href="/employees" delta="+12 this quarter" deltaTone="success" />
            <StatCard label="Active" value={data.active_employees} icon="user" hint={`${data.on_leave_today} on leave today`} />
            <StatCard label="Pending approvals" value={data.pending_approvals} icon="workflow" href="/approvals" deltaTone="neutral" />
            <StatCard label="Compliance alerts" value={data.compliance_alerts} icon="compliance" href="/compliance" delta="Action needed" deltaTone="danger" />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Headcount trend" subtitle="Last 6 months" />
              <CardBody>
                <LineChart data={data.headcount_trend} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Employee status" />
              <CardBody>
                <DonutChart data={data.status_distribution} />
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Attendance this week" subtitle="Present / leave / absent" />
              <CardBody>
                <StackedTrend data={data.attendance_trend} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Department distribution" />
              <CardBody>
                <BarChart data={data.department_distribution.slice(0, 5)} height={180} />
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader title="Upcoming events" />
              <CardBody className="p-0">
                <ul className="divide-y divide-border">
                  {data.upcoming_events.map((e, i) => (
                    <li key={i} className="flex items-center gap-3 px-4 py-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-subtle text-primary">
                        <Icon name={e.type === "holiday" ? "leave" : e.type === "birthday" ? "user" : "calendar"} size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-body-sm text-text">{e.label}</div>
                        <div className="text-caption text-text-muted">{formatDate(e.date)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Recent activity" />
              <CardBody className="p-0">
                <ul className="divide-y divide-border">
                  {data.recent_activity.map((a, i) => (
                    <li key={i} className="px-4 py-3">
                      <div className="text-body-sm text-text">
                        <span className="font-medium">{a.actor}</span> {a.action}
                      </div>
                      <div className="text-caption text-text-muted">{a.time}</div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Quick links" />
              <CardBody>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Add employee", href: "/employees/new", icon: "plus" as const },
                    { label: "Approvals", href: "/approvals", icon: "workflow" as const },
                    { label: "Run payroll", href: "/payroll/runs", icon: "payroll" as const },
                    { label: "Reports", href: "/reports", icon: "reports" as const },
                  ].map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="flex flex-col items-start gap-2 rounded-md border border-border p-3 hover:border-border-strong hover:bg-surface-muted"
                    >
                      <Icon name={l.icon} size={18} />
                      <span className="text-body-sm font-medium text-text">{l.label}</span>
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
