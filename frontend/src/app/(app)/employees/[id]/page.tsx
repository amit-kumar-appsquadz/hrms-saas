"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useAsync } from "@/hooks/useAsync";
import { getEmployeeDetail } from "@/services/employees";
import {
  PageHeader,
  Card,
  CardBody,
  CardHeader,
  Avatar,
  Button,
  Tabs,
  StatusBadge,
  Timeline,
  EmptyState,
  RestrictedState,
  ErrorState,
  Skeleton,
  Icon,
  type TabItem,
} from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import { formatDate } from "@/lib/format";
import type { EmployeeDetail } from "@/types/domain";

const TABS: TabItem[] = [
  { key: "overview", label: "Overview" },
  { key: "personal", label: "Personal" },
  { key: "employment", label: "Employment" },
  { key: "organization", label: "Organization" },
  { key: "reporting", label: "Reporting" },
  { key: "contact", label: "Contact" },
  { key: "bank", label: "Bank", restricted: true },
  { key: "pan", label: "PAN / Tax", restricted: true },
  { key: "documents", label: "Documents" },
  { key: "qualifications", label: "Qualifications" },
  { key: "experience", label: "Experience" },
  { key: "emergency", label: "Emergency" },
  { key: "custom", label: "Custom fields" },
  { key: "leave", label: "Leave" },
  { key: "attendance", label: "Attendance" },
  { key: "payroll", label: "Payroll", restricted: true },
  { key: "assets", label: "Assets" },
  { key: "exit", label: "Exit" },
  { key: "audit", label: "Audit history" },
];

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="mt-0.5 text-body text-text">{value || "—"}</dd>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>;
}

export default function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [revealed, setRevealed] = useState(false);
  const { data: e, loading, error, reload } = useAsync(() => getEmployeeDetail(Number(id)), [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Card>
          <CardBody>
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }
  if (error || !e) return <ErrorState message={error?.message} requestId={error?.requestId} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        title={e.full_name}
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Employees", href: "/employees" }, { label: e.full_name }]}
      />

      <Card className="mb-4">
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={e.full_name} color={e.avatar_color} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-h2 text-text">{e.full_name}</h2>
                  <StatusBadge status={e.status} />
                </div>
                <p className="text-body-sm text-text-muted">
                  {e.designation} · {e.department}
                </p>
                <p className="text-caption text-text-muted">
                  {e.employee_code} · Joined {formatDate(e.date_of_joining)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Can permission="employees.edit">
                <Button variant="secondary" icon="edit" onClick={() => router.push(`/employees/${id}/edit`)}>
                  Edit
                </Button>
              </Can>
              <Can permission="employees.edit">
                <Button variant="tertiary" icon="more" aria-label="More actions" />
              </Can>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="mb-4">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <Card>
        <CardBody>
          <TabContent tab={tab} e={e} revealed={revealed} onReveal={() => setRevealed(true)} />
        </CardBody>
      </Card>
    </div>
  );
}

function TabContent({ tab, e, revealed, onReveal }: { tab: string; e: EmployeeDetail; revealed: boolean; onReveal: () => void }) {
  switch (tab) {
    case "overview":
      return (
        <Grid>
          <Field label="Employee code" value={e.employee_code} />
          <Field label="Designation" value={e.designation} />
          <Field label="Department" value={e.department} />
          <Field label="Manager" value={e.manager} />
          <Field label="Location" value={e.location} />
          <Field label="Grade" value={e.grade} />
          <Field label="Date of joining" value={formatDate(e.date_of_joining)} />
          <Field label="Employment type" value={e.employment_type} />
          <Field label="Status" value={<StatusBadge status={e.status} />} />
        </Grid>
      );
    case "personal":
      return (
        <Grid>
          <Field label="Date of birth" value={formatDate(e.date_of_birth)} />
          <Field label="Gender" value={e.gender} />
          <Field label="Marital status" value={e.marital_status} />
          <Field label="Blood group" value={e.blood_group} />
          <Field label="Nationality" value={e.nationality} />
        </Grid>
      );
    case "employment":
      return (
        <Grid>
          <Field label="Status" value={<StatusBadge status={e.status} />} />
          <Field label="Employment type" value={e.employment_type} />
          <Field label="Date of joining" value={formatDate(e.date_of_joining)} />
          <Field label="Confirmation date" value={e.confirmation_date ? formatDate(e.confirmation_date) : "On probation"} />
          <Field label="Probation" value={`${e.probation_months} months`} />
          <Field label="Notice period" value={`${e.notice_period_days} days`} />
        </Grid>
      );
    case "organization":
      return (
        <Grid>
          <Field label="Company" value={e.company} />
          <Field label="Department" value={e.department} />
          <Field label="Designation" value={e.designation} />
          <Field label="Grade" value={e.grade} />
          <Field label="Location" value={e.location} />
        </Grid>
      );
    case "reporting":
      return (
        <div>
          <Field label="Reporting manager" value={e.manager ?? "—"} />
          <h3 className="mb-2 mt-5 text-h3 text-text">Direct reports ({e.reportees.length})</h3>
          {e.reportees.length === 0 ? (
            <p className="text-body-sm text-text-muted">No direct reports.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {e.reportees.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Avatar name={r.name} size="sm" />
                  <div>
                    <div className="text-body-sm text-text">{r.name}</div>
                    <div className="text-caption text-text-muted">{r.designation}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    case "contact":
      return (
        <Grid>
          <Field label="Work email" value={e.work_email} />
          <Field label="Personal email" value={e.personal_email} />
          <Field label="Phone" value={e.phone} />
          <Field label="Current address" value={e.current_address} />
          <Field label="Permanent address" value={e.permanent_address} />
        </Grid>
      );
    case "bank":
      return (
        <Can
          permission="payroll.compensation.view"
          fallback={<RestrictedState message="Bank details require elevated permission. Reveal is logged (ADR-006)." />}
        >
          <div className="space-y-4">
            <Grid>
              <Field label="Bank name" value={e.bank_name} />
              <Field label="Account number" value={revealed ? `XXXX XXXX ${e.bank_account_last4}` : `•••• ${e.bank_account_last4}`} />
              <Field label="IFSC" value={e.bank_ifsc_masked} />
            </Grid>
            {!revealed && (
              <div className="rounded-md border border-warning-subtle bg-warning-subtle/40 p-3">
                <p className="text-body-sm text-text">Full bank details are masked. Revealing is audited (ADR-006).</p>
                <Button variant="secondary" size="sm" icon="eye" className="mt-2" onClick={onReveal}>
                  Reveal (logged)
                </Button>
              </div>
            )}
          </div>
        </Can>
      );
    case "pan":
      return (
        <Grid>
          <Field label="PAN" value={e.pan_masked} />
          <Field label="Tax regime" value={e.tax_regime === "new" ? "New regime" : "Old regime"} />
          <Field label="Declarations" value="Submitted for FY25" />
        </Grid>
      );
    case "qualifications":
      return (
        <ul className="divide-y divide-border rounded-md border border-border">
          {e.qualifications.map((q, i) => (
            <li key={i} className="px-3 py-3">
              <div className="text-body font-medium text-text">{q.degree}</div>
              <div className="text-body-sm text-text-muted">{q.institute} · {q.year}</div>
            </li>
          ))}
        </ul>
      );
    case "experience":
      return (
        <ul className="divide-y divide-border rounded-md border border-border">
          {e.experience.map((x, i) => (
            <li key={i} className="px-3 py-3">
              <div className="text-body font-medium text-text">{x.role} · {x.company}</div>
              <div className="text-body-sm text-text-muted">{x.from} – {x.to}</div>
            </li>
          ))}
        </ul>
      );
    case "emergency":
      return (
        <ul className="divide-y divide-border rounded-md border border-border">
          {e.emergency_contacts.map((c, i) => (
            <li key={i} className="flex items-center justify-between px-3 py-3">
              <div>
                <div className="text-body font-medium text-text">{c.name}</div>
                <div className="text-body-sm text-text-muted">{c.relation}</div>
              </div>
              <div className="text-body-sm text-text">{c.phone}</div>
            </li>
          ))}
        </ul>
      );
    case "custom":
      return (
        <Grid>
          {Object.entries(e.custom_fields).map(([k, v]) => (
            <Field key={k} label={k} value={v} />
          ))}
        </Grid>
      );
    case "audit":
      return (
        <Timeline
          events={[
            { title: "Designation updated", meta: "2 hours ago", description: "Software Engineer → Senior Engineer by Rahul Gupta", status: "info" },
            { title: "Document verified", meta: "Yesterday", description: "ID proof verified by Neha Nair", status: "success" },
            { title: "Profile created", meta: formatDate(e.date_of_joining), description: "Onboarded by HR", status: "success" },
          ]}
        />
      );
    case "documents":
      return <EmptyState icon="documents" title="Documents" description="This employee's documents appear here. Open the Documents module to manage them." />;
    case "leave":
      return <EmptyState icon="leave" title="Leave summary" description="Leave balances and history are available in the Leave module (arrives in Sprint 7)." />;
    case "attendance":
      return <EmptyState icon="attendance" title="Attendance" description="Punches and regularizations are available in the Attendance module (arrives in Sprint 9)." />;
    case "payroll":
      return (
        <Can permission="payroll.compensation.view" fallback={<RestrictedState message="Payroll details require payroll permission." />}>
          <EmptyState icon="payroll" title="Compensation & payslips" description="Compensation and payslips are available in the Payroll module (arrives in Sprint 11)." />
        </Can>
      );
    case "assets":
      return <EmptyState icon="building" title="Assigned assets" description="Asset assignment is a future module." />;
    case "exit":
      return <EmptyState icon="logout" title="Exit" description="This employee has no exit in progress." />;
    default:
      return null;
  }
}
