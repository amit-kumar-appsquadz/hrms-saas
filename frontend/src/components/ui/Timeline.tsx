import { cx } from "@/lib/format";
import { statusMeta } from "@/lib/status";

export interface TimelineEvent {
  title: string;
  meta?: string;
  description?: string;
  status?: string;
}

/** Timeline — audit history, workflow progress, lifecycle (DESIGN_SYSTEM §4). */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative space-y-5 border-l border-border pl-5">
      {events.map((e, i) => {
        const tone = e.status ? statusMeta(e.status).tone : "info";
        return (
          <li key={i} className="relative">
            <span
              className={cx(
                "absolute -left-[27px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ring-surface",
                tone === "success" && "bg-success",
                tone === "warning" && "bg-warning",
                tone === "danger" && "bg-danger",
                tone === "info" && "bg-info",
                tone === "neutral" && "bg-neutral",
              )}
              aria-hidden
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-text">{e.title}</span>
              {e.meta && <span className="text-caption text-text-muted">{e.meta}</span>}
            </div>
            {e.description && <p className="mt-0.5 text-body-sm text-text-muted">{e.description}</p>}
          </li>
        );
      })}
    </ol>
  );
}
