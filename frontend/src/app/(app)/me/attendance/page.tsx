"use client";

import { useState } from "react";
import { PageHeader, Card, CardHeader, CardBody, Button, StatCard, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/providers/ToastProvider";
import { MonthCalendar, type CalendarMark } from "@/components/patterns/MonthCalendar";
import { formatDateTime } from "@/lib/format";

const marks: CalendarMark[] = [
  { day: 4, label: "Leave", tone: "info" },
  { day: 15, label: "Holiday", tone: "neutral" },
  { day: 9, label: "Late", tone: "warning" },
];

export default function MyAttendancePage() {
  const { toast } = useToast();
  const [punchedIn, setPunchedIn] = useState(false);
  const [lastPunch, setLastPunch] = useState<string>();

  function punch() {
    setPunchedIn((v) => !v);
    const now = new Date().toISOString();
    setLastPunch(now);
    toast(punchedIn ? "Punched out (demo)." : "Punched in (demo).");
  }

  return (
    <div>
      <PageHeader title="My attendance" subtitle="Your punches and monthly summary" breadcrumbs={[{ label: "Self-service" }, { label: "My attendance" }]} />

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Punch" />
          <CardBody>
            <div className="flex flex-col items-center gap-3 py-4">
              <StatusBadge status={punchedIn ? "present" : "week_off"} />
              <Button variant={punchedIn ? "danger" : "primary"} size="lg" icon="clock" onClick={punch}>
                {punchedIn ? "Punch out" : "Punch in"}
              </Button>
              {lastPunch && <p className="text-caption text-text-muted">Last punch: {formatDateTime(lastPunch)} · web</p>}
            </div>
          </CardBody>
        </Card>
        <StatCard label="Present days" value="20" hint="of 22 working days" icon="attendance" />
        <StatCard label="Late marks" value="1" icon="clock" />
      </div>

      <Card>
        <CardHeader title="July 2024" subtitle="Your attendance calendar" action={<Button variant="secondary" size="sm">Raise regularization</Button>} />
        <CardBody>
          <MonthCalendar title="July 2024" marks={marks} />
        </CardBody>
      </Card>
    </div>
  );
}
