"use client";

import { useState } from "react";
import { useAsync } from "@/hooks/useAsync";
import { getEmployeeDetail } from "@/services/employees";
import { PageHeader, Card, CardBody, Avatar, Tabs, Button, Skeleton, type TabItem } from "@/components/ui";
import { useToast } from "@/components/providers/ToastProvider";
import { formatDate } from "@/lib/format";

const TABS: TabItem[] = [
  { key: "personal", label: "Personal" },
  { key: "contact", label: "Contact" },
  { key: "bank", label: "Bank" },
  { key: "tax", label: "Tax" },
];

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption uppercase text-text-muted">{label}</dt>
      <dd className="mt-0.5 text-body text-text">{value || "—"}</dd>
    </div>
  );
}

export default function MyProfilePage() {
  const { toast } = useToast();
  const { data: e, loading } = useAsync(() => getEmployeeDetail(1));
  const [tab, setTab] = useState("personal");

  if (loading || !e) return <Skeleton className="h-64 w-full" />;

  return (
    <div>
      <PageHeader title="My profile" subtitle="View your details and request changes" breadcrumbs={[{ label: "Self-service" }, { label: "My profile" }]} />
      <Card className="mb-4">
        <CardBody>
          <div className="flex items-center gap-4">
            <Avatar name={e.full_name} color={e.avatar_color} size="lg" />
            <div>
              <h2 className="text-h2 text-text">{e.full_name}</h2>
              <p className="text-body-sm text-text-muted">{e.designation} · {e.department}</p>
              <p className="text-caption text-text-muted">{e.employee_code} · Joined {formatDate(e.date_of_joining)}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="mb-4"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>

      <Card>
        <CardBody>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {tab === "personal" && (
              <>
                <Field label="Date of birth" value={formatDate(e.date_of_birth)} />
                <Field label="Gender" value={e.gender} />
                <Field label="Blood group" value={e.blood_group} />
                <Field label="Marital status" value={e.marital_status} />
              </>
            )}
            {tab === "contact" && (
              <>
                <Field label="Work email" value={e.work_email} />
                <Field label="Personal email" value={e.personal_email} />
                <Field label="Phone" value={e.phone} />
                <Field label="Current address" value={e.current_address} />
              </>
            )}
            {tab === "bank" && (
              <>
                <Field label="Bank" value={e.bank_name} />
                <Field label="Account" value={`•••• ${e.bank_account_last4}`} />
                <Field label="IFSC" value={e.bank_ifsc_masked} />
              </>
            )}
            {tab === "tax" && (
              <>
                <Field label="PAN" value={e.pan_masked} />
                <Field label="Tax regime" value={e.tax_regime === "new" ? "New regime" : "Old regime"} />
              </>
            )}
          </dl>
          <div className="mt-5 border-t border-border pt-4">
            <Button variant="secondary" icon="edit" onClick={() => toast("Change request submitted for approval (demo).")}>
              Request a change
            </Button>
            <p className="mt-2 text-caption text-text-muted">
              Changes to sensitive fields (bank, address) are submitted as an approval request rather than applied directly.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
