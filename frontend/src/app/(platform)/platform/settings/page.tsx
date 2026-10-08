"use client";

import { useAsync } from "@/hooks/useAsync";
import { listPlatformPlans } from "@/services/platform";
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Button,
  Pill,
  FormSection,
  TextField,
  SelectField,
  Icon,
  CardsSkeleton,
} from "@/components/ui";
import { CanPlatform } from "@/components/providers/PlatformSessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { formatINR } from "@/lib/format";

export default function PlatformSettingsPage() {
  const { toast } = useToast();
  const plans = useAsync(() => listPlatformPlans());

  return (
    <div>
      <PageHeader title="Plans & settings" subtitle="SaaS configuration, subscription plans and system defaults" />

      <div className="space-y-5">
        <Card>
          <CardHeader title="Subscription plans" subtitle="Pricing tiers offered to customers" action={<CanPlatform permission="platform.billing.manage"><Button variant="secondary" size="sm" icon="plus">Add plan</Button></CanPlatform>} />
          <CardBody>
            {plans.loading && <CardsSkeleton count={3} />}
            {plans.data && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {plans.data.map((p) => (
                  <div key={p.tier} className="rounded-md border border-border p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-h3 text-text">{p.name}</h3>
                      <Pill tone="neutral">{p.tenants} tenants</Pill>
                    </div>
                    <div className="mt-1 text-h2 tabular text-text">{formatINR(p.price_per_employee)}<span className="text-caption font-normal text-text-muted"> /employee/mo</span></div>
                    <p className="mt-1 text-caption text-text-muted">
                      Min {p.min_commit} · Max {p.max_employees ?? "Unlimited"}
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-body-sm text-text">
                          <Icon name="check" size={14} /> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Onboarding configuration" />
            <CardBody>
              <FormSection title="Defaults for new tenants">
                <SelectField label="Default plan" defaultValue="growth" options={[{ value: "starter", label: "Starter" }, { value: "growth", label: "Growth" }, { value: "enterprise", label: "Enterprise" }]} />
                <TextField label="Default trial length (days)" type="number" defaultValue="14" />
                <SelectField label="Default region" defaultValue="ap-south-1" options={[{ value: "ap-south-1", label: "ap-south-1 (Mumbai)" }, { value: "ap-south-2", label: "ap-south-2 (Hyderabad)" }]} />
              </FormSection>
              <CanPlatform permission="platform.settings.manage">
                <Button variant="primary" icon="check" className="mt-4" onClick={() => toast("Onboarding config saved (demo).")}>Save</Button>
              </CanPlatform>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="System settings" />
            <CardBody>
              <FormSection title="Platform defaults">
                <TextField label="Default session timeout (min)" type="number" defaultValue="30" />
                <SelectField label="MFA enforcement" defaultValue="all" options={[{ value: "all", label: "All platform users" }, { value: "admins", label: "Super Admins only" }]} />
                <TextField label="Support email" type="email" defaultValue="support@platform.example.com" full />
              </FormSection>
              <CanPlatform permission="platform.settings.manage">
                <Button variant="primary" icon="check" className="mt-4" onClick={() => toast("System settings saved (demo).")}>Save</Button>
              </CanPlatform>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
