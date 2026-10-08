"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAsync } from "@/hooks/useAsync";
import { listTenantOnboarding } from "@/services/platform";
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Button,
  Stepper,
  FormSection,
  TextField,
  SelectField,
  Pill,
  CardsSkeleton,
} from "@/components/ui";
import { useToast } from "@/components/providers/ToastProvider";
import { formatDate } from "@/lib/format";

const STEPS = [
  { key: "customer", label: "Customer" },
  { key: "subdomain", label: "Subdomain" },
  { key: "plan", label: "Plan" },
  { key: "admin", label: "Tenant admin" },
  { key: "review", label: "Review" },
];

export default function TenantOnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const inflight = useAsync(() => listTenantOnboarding());
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Record<string, string>>({
    name: "",
    subdomain: "",
    contact: "",
    contact_email: "",
    plan: "growth",
    admin_name: "",
    admin_email: "",
  });

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div>
      <PageHeader
        title="Tenant onboarding"
        subtitle="Provision a new customer tenant"
        breadcrumbs={[{ label: "Tenants", href: "/platform/tenants" }, { label: "Onboarding" }]}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="New tenant" />
          <CardBody>
            <div className="mb-6 overflow-x-auto scroll-thin">
              <Stepper steps={STEPS} current={step} />
            </div>

            {step === 0 && (
              <FormSection title="Customer information">
                <TextField label="Company / customer name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
                <TextField label="Primary contact" required value={form.contact} onChange={(e) => set("contact", e.target.value)} />
                <TextField label="Contact email" type="email" full required value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
              </FormSection>
            )}
            {step === 1 && (
              <FormSection title="Subdomain" description="The tenant is accessed at <subdomain>.app.example.com (ADR-001).">
                <TextField
                  label="Subdomain"
                  required
                  value={form.subdomain}
                  onChange={(e) => set("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  hint={form.subdomain ? `${form.subdomain}.app.example.com` : "e.g. acme"}
                />
              </FormSection>
            )}
            {step === 2 && (
              <FormSection title="Subscription plan">
                <SelectField
                  label="Plan"
                  value={form.plan}
                  onChange={(e) => set("plan", e.target.value)}
                  options={[
                    { value: "starter", label: "Starter" },
                    { value: "growth", label: "Growth" },
                    { value: "enterprise", label: "Enterprise" },
                  ]}
                />
              </FormSection>
            )}
            {step === 3 && (
              <FormSection title="Initial tenant admin" description="This person receives an activation invite to set up the tenant.">
                <TextField label="Admin name" required value={form.admin_name} onChange={(e) => set("admin_name", e.target.value)} />
                <TextField label="Admin email" type="email" required value={form.admin_email} onChange={(e) => set("admin_email", e.target.value)} />
              </FormSection>
            )}
            {step === 4 && (
              <div>
                <h3 className="mb-3 text-h3 text-text">Review</h3>
                <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                  {[
                    ["Customer", form.name],
                    ["Subdomain", form.subdomain ? `${form.subdomain}.app.example.com` : "—"],
                    ["Primary contact", `${form.contact} · ${form.contact_email}`],
                    ["Plan", form.plan],
                    ["Tenant admin", `${form.admin_name} · ${form.admin_email}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-b border-border py-1.5">
                      <dt className="text-body-sm text-text-muted">{k}</dt>
                      <dd className="text-body-sm text-text">{v || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
              <Button variant="tertiary" onClick={() => (step === 0 ? router.push("/platform/tenants") : setStep((s) => s - 1))}>
                {step === 0 ? "Cancel" : "Back"}
              </Button>
              {step < STEPS.length - 1 ? (
                <Button variant="primary" iconRight="arrow-right" onClick={() => setStep((s) => s + 1)}>
                  Continue
                </Button>
              ) : (
                <Button
                  variant="primary"
                  icon="check"
                  onClick={() => {
                    toast(`${form.name || "Tenant"} provisioning started (demo).`);
                    router.push("/platform/tenants");
                  }}
                >
                  Provision tenant
                </Button>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="In-flight onboarding" />
          <CardBody className="p-0">
            {inflight.loading && <div className="p-4"><CardsSkeleton count={2} /></div>}
            <ul className="divide-y divide-border">
              {(inflight.data ?? []).map((o) => (
                <li key={o.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-body-sm font-medium text-text">{o.name}</span>
                    <Pill tone="info">{o.plan}</Pill>
                  </div>
                  <div className="font-mono text-caption text-text-muted">{o.subdomain}.app.example.com</div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${o.progress}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-caption text-text-muted">
                    <span>{o.stage.replace(/_/g, " ")}</span>
                    <span>started {formatDate(o.started_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
