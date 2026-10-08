"use client";

import { useState } from "react";
import { PageHeader, Card, CardHeader, CardBody, Button, SelectField, TextField, FormSection } from "@/components/ui";
import { Dropzone } from "@/components/patterns/Dropzone";
import { useToast } from "@/components/providers/ToastProvider";

export default function MyTaxPage() {
  const { toast } = useToast();
  const [regime, setRegime] = useState("new");

  return (
    <div>
      <PageHeader title="My tax declaration" subtitle="Declare your regime and investments for FY25" breadcrumbs={[{ label: "Self-service" }, { label: "My tax declaration" }]} />

      <div className="mb-4 rounded-md border border-info-subtle bg-info-subtle/40 px-4 py-2.5 text-body-sm text-info">
        Projected tax is computed by the payroll engine for both regimes. This UI collects your declaration — it does
        not compute statutory tax (steering rule 5).
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Declaration" />
          <CardBody>
            <form onSubmit={(e) => { e.preventDefault(); toast("Tax declaration submitted (demo)."); }}>
              <FormSection title="Regime & investments">
                <SelectField
                  label="Tax regime"
                  value={regime}
                  onChange={(e) => setRegime(e.target.value)}
                  options={[{ value: "new", label: "New regime" }, { value: "old", label: "Old regime" }]}
                />
                <TextField label="Section 80C (₹)" type="number" placeholder="150000" disabled={regime === "new"} />
                <TextField label="Section 80D — health (₹)" type="number" placeholder="25000" disabled={regime === "new"} />
                <TextField label="HRA exemption (₹)" type="number" placeholder="0" disabled={regime === "new"} />
              </FormSection>
              {regime === "new" && <p className="mt-2 text-caption text-text-muted">Most deductions are not applicable under the new regime.</p>}
              <Button variant="primary" icon="check" className="mt-4" type="submit">Submit declaration</Button>
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Investment proofs" />
          <CardBody>
            <Dropzone />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
