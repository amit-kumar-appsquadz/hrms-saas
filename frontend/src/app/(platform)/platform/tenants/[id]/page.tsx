"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useAsync } from "@/hooks/useAsync";
import { getTenant } from "@/services/platform";
import { enterTenant } from "@/lib/impersonation";
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Button,
  Tabs,
  StatusBadge,
  Pill,
  StatCard,
  Timeline,
  ConfirmDialog,
  Skeleton,
  ErrorState,
  type TabItem,
} from "@/components/ui";
import { CanPlatform } from "@/components/providers/PlatformSessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { formatINR, formatDate, formatNumber } from "@/lib/format";
import type { PlatformTenant } from "@/types/platform";

const TABS: TabItem[] = [
  { key: "overview", label: "Overview" },
  { key: "admin", label: "Tenant admin" },
  { key: "subscription", label: "Subscription" },
  { key: "usage", label: "Usage" },
  { key: "activity", label: "Activity" },
  { key: "audit", label: "Audit" },
];

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="mt-0.5 text-body text-text">{value || "—"}</dd>
    </div>
  );
}

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { data: t, loading, error, reload } = useAsync(() => getTenant(Number(id)), [id]);
  const [tab, setTab] = useState("overview");
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error || !t) return <ErrorState message={error?.message} onRetry={reload} />;

  function view(tenant: PlatformTenant) {
    enterTenant({ tenantId: tenant.id, tenantName: tenant.name, subdomain: tenant.subdomain });
    toast(`Entering ${tenant.name} workspace (demo impersonation).`, "info");
    router.push("/dashboard");
  }

  return (
    <div>
      <PageHeader
        title={t.name}
        subtitle={t.subdomain}
        status={t.status === "provisioning" ? "in_progress" : t.status}
        breadcrumbs={[{ label: "Tenants", href: "/platform/tenants" }, { label: t.name }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <CanPlatform permission="platform.tenant.impersonate">
              <Button variant="secondary" icon="external" onClick={() => view(t)}>View tenant</Button>
            </CanPlatform>
            {t.status === "suspended" || t.status === "trial" ? (
              <CanPlatform permission="platform.tenant.activate">
                <Button variant="primary" icon="check" onClick={() => toast(`${t.name} activated (demo).`)}>Activate</Button>
              </CanPlatform>
            ) : (
              <CanPlatform permission="platform.tenant.suspend">
                <Button variant="danger" onClick={() => setConfirmSuspend(true)}>Suspend</Button>
              </CanPlatform>
            )}
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Employees" value={formatNumber(t.employees)} icon="employees" />
        <StatCard label="Companies" value={t.companies} icon="building" />
        <StatCard label="MRR" value={formatINR(t.mrr)} icon="payroll" />
        <StatCard label="Health" value={t.health} icon="compliance" deltaTone={t.health === "healthy" ? "success" : "danger"} />
      </div>

      <div className="mb-4"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>

      <Card>
        <CardBody>
          {tab === "overview" && (
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Tenant name" value={t.name} />
              <Field label="Subdomain" value={<span className="font-mono">{t.subdomain}</span>} />
              <Field label="Status" value={<StatusBadge status={t.status === "provisioning" ? "in_progress" : t.status} />} />
              <Field label="Plan" value={<Pill tone="info">{t.plan}</Pill>} />
              <Field label="Region" value={t.region} />
              <Field label="Created" value={formatDate(t.created_at)} />
              <Field label="Trial ends" value={t.trial_ends_at ? formatDate(t.trial_ends_at) : "—"} />
              <Field label="Primary contact" value={`${t.primary_contact} · ${t.contact_email}`} />
            </dl>
          )}
          {tab === "admin" && (
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <Field label="Tenant admin" value={t.admin_name} />
              <Field label="Admin email" value={t.admin_email} />
              <Field label="MFA" value={<Pill tone="success">Enabled</Pill>} />
              <Field label="Last admin login" value="2 hours ago" />
            </dl>
          )}
          {tab === "subscription" && (
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Plan" value={<Pill tone="info">{t.plan}</Pill>} />
              <Field label="Billing status" value={t.status === "suspended" ? "Past due" : "Current"} />
              <Field label="MRR" value={formatINR(t.mrr)} />
              <Field label="Seats (employees)" value={formatNumber(t.employees)} />
              <Field label="Renewal" value="Annual" />
            </dl>
          )}
          {tab === "usage" && (
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Storage used" value={`${t.storage_gb} GB`} />
              <Field label="API calls (30d)" value={formatNumber(t.api_calls_30d)} />
              <Field label="Active employees" value={formatNumber(t.employees)} />
              <Field label="Companies" value={t.companies} />
            </dl>
          )}
          {tab === "activity" && (
            <Timeline
              events={[
                { title: "Payroll run completed", meta: "Yesterday", description: "July 2024 run published", status: "success" },
                { title: "New admin added", meta: "3 days ago", description: `${t.admin_name} granted Tenant Admin`, status: "info" },
                { title: "Plan upgraded", meta: "Last month", description: `Moved to ${t.plan}`, status: "info" },
              ]}
            />
          )}
          {tab === "audit" && (
            <Timeline
              events={[
                { title: "tenant.activated", meta: formatDate(t.created_at), description: "Provisioned by Ops — Deepa R", status: "success" },
                { title: "plan.updated", meta: "Last month", description: `Plan set to ${t.plan}`, status: "info" },
                ...(t.status === "suspended" ? [{ title: "tenant.suspended", meta: "Today", description: "Suspended for non-payment", status: "danger" as const }] : []),
              ]}
            />
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmSuspend}
        onClose={() => setConfirmSuspend(false)}
        onConfirm={() => { setConfirmSuspend(false); toast(`${t.name} suspended (demo).`, "danger"); }}
        title={`Suspend ${t.name}?`}
        message="Suspending blocks all tenant users from signing in until reactivated. This is a demo — no data changes."
        confirmLabel="Suspend tenant"
        destructive
      />
    </div>
  );
}
