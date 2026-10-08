"use client";

import { useAsync } from "@/hooks/useAsync";
import { listAttendance } from "@/services/modules";
import { PageHeader, Card, CardBody, TableSkeleton, ErrorState, Button } from "@/components/ui";

const GLYPH: Record<string, { letter: string; cls: string }> = {
  present: { letter: "P", cls: "bg-success-subtle text-success" },
  absent: { letter: "A", cls: "bg-danger-subtle text-danger" },
  half_day: { letter: "H", cls: "bg-warning-subtle text-warning" },
  leave: { letter: "L", cls: "bg-info-subtle text-info" },
  holiday: { letter: "O", cls: "bg-neutral-subtle text-neutral" },
  week_off: { letter: "W", cls: "bg-surface-muted text-text-muted" },
};

export default function MonthlyAttendancePage() {
  const { data, loading, error, reload } = useAsync(() => listAttendance(1, 15));
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const statuses = ["present", "present", "leave", "present", "week_off", "present", "half_day", "absent", "present", "holiday"];

  return (
    <div>
      <PageHeader
        title="Monthly attendance"
        subtitle="July 2024 attendance matrix"
        breadcrumbs={[{ label: "Attendance" }, { label: "Monthly" }]}
        actions={<Button variant="secondary" icon="download">Export to Excel</Button>}
      />
      <Card>
        <CardBody className="p-0">
          {loading && <div className="p-4"><TableSkeleton /></div>}
          {error && <div className="p-4"><ErrorState message={error.message} onRetry={reload} /></div>}
          {data && (
            <div className="overflow-x-auto scroll-thin">
              <table className="border-collapse text-caption">
                <caption className="sr-only">Monthly attendance matrix</caption>
                <thead>
                  <tr className="bg-surface-muted">
                    <th scope="col" className="sticky left-0 z-10 bg-surface-muted px-3 py-2 text-left font-semibold text-text-muted">Employee</th>
                    {days.map((d) => (
                      <th key={d} scope="col" className="w-8 px-1 py-2 text-center font-medium text-text-muted">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((row, ri) => (
                    <tr key={row.id} className="border-b border-border">
                      <th scope="row" className="sticky left-0 z-10 bg-surface px-3 py-1.5 text-left font-medium text-text">{row.employee}</th>
                      {days.map((d) => {
                        const st = statuses[(ri + d) % statuses.length]!;
                        const g = GLYPH[st]!;
                        return (
                          <td key={d} className="px-1 py-1 text-center">
                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-sm font-semibold ${g.cls}`} title={st}>
                              {g.letter}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
      <div className="mt-3 flex flex-wrap gap-3 text-caption text-text-muted">
        {Object.entries(GLYPH).map(([k, g]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-sm font-semibold ${g.cls}`}>{g.letter}</span>
            {k.replace("_", " ")}
          </span>
        ))}
      </div>
    </div>
  );
}
