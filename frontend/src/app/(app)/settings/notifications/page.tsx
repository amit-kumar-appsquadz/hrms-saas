"use client";

import { PageHeader, Card, CardBody, Button } from "@/components/ui";
import { useToast } from "@/components/providers/ToastProvider";

const CATEGORIES = ["Approvals", "Leave", "Attendance", "Payroll", "Documents", "Compliance", "Announcements"];
const CHANNELS = ["In-app", "Email", "SMS"];

export default function NotificationSettingsPage() {
  const { toast } = useToast();
  return (
    <div>
      <PageHeader title="Notification settings" subtitle="Default channels per category" breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Notifications" }]} />
      <Card>
        <CardBody className="p-0">
          <table className="w-full border-collapse text-body-sm">
            <caption className="sr-only">Notification channel preferences</caption>
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left text-caption uppercase text-text-muted">
                <th className="px-4 py-2.5">Category</th>
                {CHANNELS.map((c) => <th key={c} className="px-4 py-2.5 text-center">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((cat) => (
                <tr key={cat} className="border-b border-border last:border-0">
                  <th scope="row" className="px-4 py-2.5 text-left font-medium text-text">{cat}</th>
                  {CHANNELS.map((ch) => (
                    <td key={ch} className="px-4 py-2.5 text-center">
                      <input
                        type="checkbox"
                        defaultChecked={ch === "In-app" || (ch === "Email" && cat !== "Attendance")}
                        disabled={ch === "SMS"}
                        aria-label={`${cat} via ${ch}`}
                        className="h-4 w-4 rounded-sm border-border-strong text-primary"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
      <p className="mt-2 text-caption text-text-muted">SMS requires TRAI DLT registration; delivery depends on DLT approval.</p>
      <Button variant="primary" icon="check" className="mt-4" onClick={() => toast("Preferences saved (demo).")}>Save preferences</Button>
    </div>
  );
}
