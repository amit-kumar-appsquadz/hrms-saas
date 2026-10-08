"use client";

import { PageHeader, Card, CardHeader, CardBody, FormSection, TextField, Button, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/providers/ToastProvider";

export default function PersonalSettingsPage() {
  const { toast } = useToast();
  return (
    <div>
      <PageHeader title="Personal settings" subtitle="Password, MFA and preferences" breadcrumbs={[{ label: "Self-service" }, { label: "Personal settings" }]} />
      <div className="space-y-4">
        <Card>
          <CardHeader title="Change password" />
          <CardBody>
            <form onSubmit={(e) => { e.preventDefault(); toast("Password updated (demo)."); }}>
              <FormSection title="Password">
                <TextField label="Current password" type="password" />
                <TextField label="New password" type="password" />
                <TextField label="Confirm new password" type="password" />
              </FormSection>
              <Button variant="primary" icon="check" className="mt-4" type="submit">Update password</Button>
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Two-factor authentication" action={<StatusBadge status="active" />} />
          <CardBody>
            <p className="text-body-sm text-text-muted">Two-factor authentication is enabled on your account.</p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" size="sm">Regenerate recovery codes</Button>
              <Button variant="tertiary" size="sm">Disable MFA</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
