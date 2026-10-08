"use client";

import { PageHeader, Card, CardHeader, CardBody, FormSection, TextField, Button } from "@/components/ui";
import { useToast } from "@/components/providers/ToastProvider";
import { Can } from "@/components/providers/SessionProvider";

export default function SettingsPage() {
  const { toast } = useToast();
  return (
    <div>
      <PageHeader title="Tenant & company settings" subtitle="Workspace identity and company details" breadcrumbs={[{ label: "Settings" }]} />
      <div className="space-y-4">
        <Card>
          <CardHeader title="Tenant" subtitle="Subdomain changes are a platform operation" />
          <CardBody>
            <form onSubmit={(e) => { e.preventDefault(); toast("Settings saved (demo)."); }}>
              <FormSection title="Workspace">
                <TextField label="Tenant name" defaultValue="Acme Technologies" />
                <TextField label="Subdomain" defaultValue="acme.app.example.com" readOnly />
              </FormSection>
              <Can permission="settings.manage">
                <Button variant="primary" icon="check" className="mt-4" type="submit">Save changes</Button>
              </Can>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Company & branding" />
          <CardBody>
            <FormSection title="Primary company">
              <TextField label="Legal name" defaultValue="Acme Technologies Pvt Ltd" />
              <TextField label="PAN" defaultValue="XXXXX1000A" readOnly />
              <TextField label="GSTIN" defaultValue="29ABCDE1234F1Z0" full />
            </FormSection>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
