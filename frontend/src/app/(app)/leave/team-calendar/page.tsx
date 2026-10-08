"use client";

import { PageHeader, Card, CardBody } from "@/components/ui";
import { MonthCalendar, type CalendarMark } from "@/components/patterns/MonthCalendar";

const marks: CalendarMark[] = [
  { day: 4, label: "Sneha — CL", tone: "info" },
  { day: 11, label: "3 out", tone: "warning" },
  { day: 15, label: "Holiday", tone: "neutral" },
  { day: 22, label: "Nikhil — EL", tone: "info" },
  { day: 23, label: "Nikhil — EL", tone: "info" },
];

export default function TeamCalendarPage() {
  return (
    <div>
      <PageHeader title="Team leave calendar" subtitle="July 2024 — who's out and when" breadcrumbs={[{ label: "Leave" }, { label: "Team calendar" }]} />
      <Card>
        <CardBody>
          <MonthCalendar title="July 2024" marks={marks} />
        </CardBody>
      </Card>
    </div>
  );
}
