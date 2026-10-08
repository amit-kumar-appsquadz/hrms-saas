"use client";

import { cx } from "@/lib/format";

export interface CalendarMark {
  day: number;
  label: string;
  tone: "info" | "success" | "warning" | "danger" | "neutral";
}

/** Simple month calendar grid for leave/holiday calendars. */
export function MonthCalendar({ title, marks }: { title: string; marks: CalendarMark[] }) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const firstDow = 1; // demo: month starts on Monday
  const toneCls: Record<CalendarMark["tone"], string> = {
    info: "bg-info-subtle text-info",
    success: "bg-success-subtle text-success",
    warning: "bg-warning-subtle text-warning",
    danger: "bg-danger-subtle text-danger",
    neutral: "bg-neutral-subtle text-neutral",
  };

  return (
    <div>
      <h3 className="mb-3 text-h3 text-text">{title}</h3>
      <div className="grid grid-cols-7 gap-1 text-caption">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="pb-1 text-center font-semibold text-text-muted">{d}</div>
        ))}
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((d) => {
          const mark = marks.find((m) => m.day === d);
          return (
            <div
              key={d}
              className={cx(
                "flex min-h-14 flex-col rounded-sm border border-border p-1",
                (d + firstDow) % 7 === 0 || (d + firstDow) % 7 === 6 ? "bg-surface-muted" : "bg-surface",
              )}
            >
              <span className="text-right text-text-muted">{d}</span>
              {mark && (
                <span className={cx("mt-auto truncate rounded-sm px-1 py-0.5 text-[10px] font-medium", toneCls[mark.tone])} title={mark.label}>
                  {mark.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
