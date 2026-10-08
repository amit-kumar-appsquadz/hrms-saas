"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  PageHeader,
  Card,
  CardBody,
  Button,
  Stepper,
  FormSection,
  TextField,
  SelectField,
} from "@/components/ui";
import { useToast } from "@/components/providers/ToastProvider";
import { departmentOptions } from "@/services/employees";

const STEPS = [
  { key: "basic", label: "Basic" },
  { key: "employment", label: "Employment" },
  { key: "organization", label: "Organization" },
  { key: "contact", label: "Contact" },
  { key: "statutory", label: "Statutory" },
  { key: "review", label: "Review" },
];

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export default function NewEmployeePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Record<string, string>>({
    full_name: "",
    work_email: "",
    employee_code: "",
    date_of_joining: "",
    employment_type: "Permanent",
    company: "Acme Technologies Pvt Ltd",
    department: "Engineering",
    designation: "Software Engineer",
    phone: "",
    pan: "",
    bank_account: "",
    bank_ifsc: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validateStep(): boolean {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.full_name) e.full_name = "Full name is required.";
      if (!form.work_email) e.work_email = "Work email is required.";
      else if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.work_email)) e.work_email = "Enter a valid email.";
    }
    if (step === 1 && !form.date_of_joining) e.date_of_joining = "Date of joining is required.";
    if (step === 4 && form.pan && !PAN_RE.test(form.pan)) e.pan = "PAN must look like ABCDE1234F.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (validateStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function submit() {
    toast(`${form.full_name} created successfully (demo).`);
    router.push("/employees");
  }

  return (
    <div>
      <PageHeader
        title="Add employee"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Employees", href: "/employees" }, { label: "Add" }]}
      />

      <Card>
        <CardBody>
          <div className="mb-6 overflow-x-auto scroll-thin">
            <Stepper steps={STEPS} current={step} />
          </div>

          {step === 0 && (
            <FormSection title="Basic details" description="Who is joining?">
              <TextField label="Full name" required value={form.full_name} onChange={(e) => set("full_name", e.target.value)} error={errors.full_name} />
              <TextField label="Work email" type="email" required value={form.work_email} onChange={(e) => set("work_email", e.target.value)} error={errors.work_email} />
              <TextField label="Employee code" hint="Leave blank to auto-generate" value={form.employee_code} onChange={(e) => set("employee_code", e.target.value)} />
            </FormSection>
          )}

          {step === 1 && (
            <FormSection title="Employment">
              <TextField label="Date of joining" type="date" required value={form.date_of_joining} onChange={(e) => set("date_of_joining", e.target.value)} error={errors.date_of_joining} />
              <SelectField
                label="Employment type"
                value={form.employment_type}
                onChange={(e) => set("employment_type", e.target.value)}
                options={[
                  { value: "Permanent", label: "Permanent" },
                  { value: "Contract", label: "Contract" },
                  { value: "Intern", label: "Intern" },
                ]}
              />
            </FormSection>
          )}

          {step === 2 && (
            <FormSection title="Organization">
              <SelectField
                label="Company"
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                options={[
                  { value: "Acme Technologies Pvt Ltd", label: "Acme Technologies Pvt Ltd" },
                  { value: "Acme Services LLP", label: "Acme Services LLP" },
                ]}
              />
              <SelectField label="Department" value={form.department} onChange={(e) => set("department", e.target.value)} options={departmentOptions().map((d) => ({ value: d, label: d }))} />
              <TextField label="Designation" value={form.designation} onChange={(e) => set("designation", e.target.value)} />
            </FormSection>
          )}

          {step === 3 && (
            <FormSection title="Contact">
              <TextField label="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              <TextField label="Personal email" type="email" />
            </FormSection>
          )}

          {step === 4 && (
            <FormSection title="Statutory" description="PAN and bank are write-only, field-encrypted (ADR-006). Aadhaar is intentionally not collected.">
              <TextField label="PAN" placeholder="ABCDE1234F" value={form.pan} onChange={(e) => set("pan", e.target.value.toUpperCase())} error={errors.pan} />
              <TextField label="Bank account number" value={form.bank_account} onChange={(e) => set("bank_account", e.target.value)} />
              <TextField label="IFSC" value={form.bank_ifsc} onChange={(e) => set("bank_ifsc", e.target.value.toUpperCase())} />
            </FormSection>
          )}

          {step === 5 && (
            <div>
              <h3 className="mb-3 text-h3 text-text">Review</h3>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                {[
                  ["Full name", form.full_name],
                  ["Work email", form.work_email],
                  ["Employee code", form.employee_code || "Auto-generated"],
                  ["Date of joining", form.date_of_joining],
                  ["Employment type", form.employment_type],
                  ["Company", form.company],
                  ["Department", form.department],
                  ["Designation", form.designation],
                  ["PAN", form.pan ? `${form.pan.slice(0, 5)}•••••` : "—"],
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
            <Button variant="tertiary" onClick={() => (step === 0 ? router.push("/employees") : setStep((s) => s - 1))}>
              {step === 0 ? "Cancel" : "Back"}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button variant="primary" iconRight="arrow-right" onClick={next}>
                Continue
              </Button>
            ) : (
              <Button variant="primary" icon="check" onClick={submit}>
                Create employee
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
