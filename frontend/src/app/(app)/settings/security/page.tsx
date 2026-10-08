"use client";

import { PageHeader, Card, CardHeader, CardBody, FormSection, TextField, SelectField, Button } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";

export default function SecuritySettingsPage() {
  const { toast } = useToast();
  return (
    <div>
      <PageHeader title="Security & MFA policy" subtitle="Password, session and MFA enforcement" breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Security & MFA" }]} />
      <div className="space-y-4">
        <Card>
          <CardHeader title="Password policy" />
          <CardBody>
            <FormSection title="Rules">
              <TextField label="Minimum length" type="number" defaultValue="10" />
              <SelectField label="Complexity" defaultValue="high" options={[{ value: "medium", label: "Medium" }, { value: "high", label: "High" }]} />
              <TextField label="Lockout after N failures" type="number" defaultValue="5" />
            </FormSection>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Session & MFA" />
          <CardBody>
            <FormSection title="Enforcement">
              <TextField label="Session timeout (minutes)" type="number" defaultValue="30" />
              <TextField label="Timeout warning lead (minutes)" type="number" defaultValue="2" />
              <SelectField label="MFA requirement" defaultValue="all" options={[{ value: "optional", label: "Optional" }, { value: "admins", label: "Admins only" }, { value: "all", label: "All users" }]} />
            </FormSection>
            <Can permission="settings.security.manage">
              <Button variant="primary" icon="check" className="mt-4" onClick={() => toast("Security policy saved (demo).")}>Save policy</Button>
            </Can>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
