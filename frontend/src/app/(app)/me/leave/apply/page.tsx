"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAsync } from "@/hooks/useAsync";
import { getLeaveBalances, listLeaveTypes } from "@/services/modules";
import { PageHeader, Card, CardBody, Button, SelectField, TextField, TextareaField, Skeleton } from "@/components/ui";
import { useToast } from "@/components/providers/ToastProvider";

export default function ApplyLeavePage() {
  const router = useRouter();
  const { toast } = useToast();
  const types = useAsync(() => listLeaveTypes());
  const balances = useAsync(() => getLeaveBalances());
  const [type, setType] = useState("CL");

  if (types.loading || balances.loading) return <Skeleton className="h-80 w-full" />;

  const balance = balances.data?.find((b) => b.code === type);

  return (
    <div>
      <PageHeader title="Apply for leave" breadcrumbs={[{ label: "My leave", href: "/me/leave" }, { label: "Apply" }]} />
      <Card>
        <CardBody>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              toast("Leave request submitted for approval (demo).");
              router.push("/me/leave");
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="Leave type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                options={(types.data ?? []).map((t) => ({ value: t.code, label: `${t.name} (${t.code})` }))}
              />
              <div className="flex items-end">
                <p className="text-body-sm text-text-muted">
                  Available: <strong className="tabular text-text">{balance?.available ?? 0}</strong> days
                </p>
              </div>
              <TextField label="From" type="date" required />
              <TextField label="To" type="date" required />
            </div>
            <TextareaField label="Reason" required full />
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="tertiary" type="button" onClick={() => router.push("/me/leave")}>Cancel</Button>
              <Button variant="primary" type="submit" icon="check">Submit request</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
