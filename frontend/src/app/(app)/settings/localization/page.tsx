"use client";

import { PageHeader, Card, CardBody, FormSection, SelectField, Button } from "@/components/ui";
import { useToast } from "@/components/providers/ToastProvider";

export default function LocalizationSettingsPage() {
  const { toast } = useToast();
  return (
    <div>
      <PageHeader title="Localization" subtitle="Timezone, currency and working days" breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Localization" }]} />
      <Card>
        <CardBody>
          <form onSubmit={(e) => { e.preventDefault(); toast("Localization saved (demo)."); }}>
            <FormSection title="Regional settings">
              <SelectField label="Timezone" defaultValue="Asia/Kolkata" options={[{ value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" }]} />
              <SelectField label="Currency" defaultValue="INR" options={[{ value: "INR", label: "Indian Rupee (₹)" }]} />
              <SelectField label="Date format" defaultValue="DD MMM YYYY" options={[{ value: "DD MMM YYYY", label: "DD MMM YYYY" }, { value: "DD/MM/YYYY", label: "DD/MM/YYYY" }]} />
              <SelectField label="Working days" defaultValue="5" options={[{ value: "5", label: "Monday – Friday" }, { value: "6", label: "Monday – Saturday" }]} />
            </FormSection>
            <Button variant="primary" icon="check" className="mt-4" type="submit">Save changes</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
