"use client";

import Link from "next/link";
import { PageHeader, StatCard, Card, CardHeader, CardBody, Icon } from "@/components/ui";

export default function TeamDashboardPage() {
  return (
    <div>
      <PageHeader title="Team dashboard" subtitle="Your direct reports at a glance" breadcrumbs={[{ label: "Team" }, { label: "Dashboard" }]} />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Team size" value={6} icon="team" href="/team/members" />
        <StatCard label="Present today" value={5} icon="attendance" href="/team/attendance" />
        <StatCard label="On leave today" value={1} icon="leave" />
        <StatCard label="Pending approvals" value={2} icon="workflow" href="/team/approvals" delta="Action needed" deltaTone="danger" />
      </div>
      <Card>
        <CardHeader title="Quick links" />
        <CardBody>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[
              { label: "Team members", href: "/team/members", icon: "team" as const },
              { label: "Approvals", href: "/team/approvals", icon: "workflow" as const },
              { label: "Team attendance", href: "/team/attendance", icon: "attendance" as const },
              { label: "Team reports", href: "/team/reports", icon: "reports" as const },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="flex flex-col items-start gap-2 rounded-md border border-border p-3 hover:bg-surface-muted">
                <Icon name={l.icon} size={18} />
                <span className="text-body-sm font-medium text-text">{l.label}</span>
              </Link>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
