"use client";

import Link from "next/link";
import { useAsync } from "@/hooks/useAsync";
import { getLeaveBalances, listMyPayslips, listAnnouncements } from "@/services/modules";
import { PageHeader, StatCard, Card, CardHeader, CardBody, Button, CardsSkeleton, Icon } from "@/components/ui";
import { formatINR, formatDate } from "@/lib/format";

export default function MyDashboardPage() {
  const balances = useAsync(() => getLeaveBalances());
  const payslips = useAsync(() => listMyPayslips());
  const announcements = useAsync(() => listAnnouncements());

  return (
    <div>
      <PageHeader title="My dashboard" subtitle="Your attendance, leave and payslips at a glance" breadcrumbs={[{ label: "Self-service" }, { label: "My dashboard" }]} />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Attendance (month)" value="96%" icon="attendance" href="/me/attendance" />
        <StatCard label="Leave balance" value={balances.data?.reduce((s, b) => s + b.available, 0) ?? "—"} icon="leave" href="/me/leave" />
        <StatCard label="Pending requests" value={1} icon="workflow" href="/me/requests" />
        <StatCard label="Latest net pay" value={payslips.data ? formatINR(payslips.data[0]!.net) : "—"} icon="payroll" href="/me/payslips" />
      </div>

      {(balances.loading || payslips.loading || announcements.loading) && <CardsSkeleton count={3} />}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Quick actions" />
          <CardBody>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/me/leave/apply" className="flex flex-col items-start gap-2 rounded-md border border-border p-3 hover:bg-surface-muted">
                <Icon name="leave" size={18} /><span className="text-body-sm font-medium">Apply leave</span>
              </Link>
              <Link href="/me/attendance" className="flex flex-col items-start gap-2 rounded-md border border-border p-3 hover:bg-surface-muted">
                <Icon name="clock" size={18} /><span className="text-body-sm font-medium">Punch in/out</span>
              </Link>
              <Link href="/me/payslips" className="flex flex-col items-start gap-2 rounded-md border border-border p-3 hover:bg-surface-muted">
                <Icon name="payroll" size={18} /><span className="text-body-sm font-medium">View payslip</span>
              </Link>
              <Link href="/me/tax" className="flex flex-col items-start gap-2 rounded-md border border-border p-3 hover:bg-surface-muted">
                <Icon name="compliance" size={18} /><span className="text-body-sm font-medium">Tax declaration</span>
              </Link>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Announcements" action={<Link href="/me/announcements" className="text-body-sm text-primary hover:underline">All</Link>} />
          <CardBody className="p-0">
            <ul className="divide-y divide-border">
              {(announcements.data ?? []).slice(0, 3).map((a) => (
                <li key={a.id} className="px-4 py-3">
                  <div className="text-body-sm font-medium text-text">{a.title}</div>
                  <div className="text-caption text-text-muted">{a.body}</div>
                  <div className="mt-1 text-caption text-text-disabled">{a.posted_by} · {formatDate(a.posted_at)}</div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
