"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useAsync } from "@/hooks/useAsync";
import { getEmployeeDetail } from "@/services/employees";
import { PageHeader, Card, CardBody, Button, FormSection, TextField, SelectField, Skeleton, ErrorState } from "@/components/ui";
import { useToast } from "@/components/providers/ToastProvider";

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { data: e, loading, error, reload } = useAsync(() => getEmployeeDetail(Number(id)), [id]);
  const [dirty, setDirty] = useState(false);

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error || !e) return <ErrorState message={error?.message} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        title={`Edit ${e.full_name}`}
        breadcrumbs={[{ label: "Employees", href: "/employees" }, { label: e.full_name, href: `/employees/${id}` }, { label: "Edit" }]}
      />
      <Card>
        <CardBody>
          <form
            onChange={() => setDirty(true)}
            onSubmit={(ev) => {
              ev.preventDefault();
              toast("Changes saved (demo).");
              router.push(`/employees/${id}`);
            }}
            className="space-y-8"
          >
            <FormSection title="Basic details">
              <TextField label="Full name" defaultValue={e.full_name} required />
              <TextField label="Work email" type="email" defaultValue={e.work_email} required />
              <TextField label="Phone" defaultValue={e.phone} />
            </FormSection>
            <FormSection title="Organization">
              <TextField label="Department" defaultValue={e.department} />
              <TextField label="Designation" defaultValue={e.designation} />
              <SelectField
                label="Status"
                defaultValue={e.status}
                options={[
                  { value: "active", label: "Active" },
                  { value: "on_notice", label: "On notice" },
                  { value: "inactive", label: "Inactive" },
                  { value: "exited", label: "Exited" },
                ]}
              />
            </FormSection>
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="tertiary" type="button" onClick={() => router.push(`/employees/${id}`)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" icon="check" disabled={!dirty}>
                Save changes
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
