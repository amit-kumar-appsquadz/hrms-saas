import { cx } from "@/lib/format";
import { Icon } from "./Icon";

export interface Step {
  key: string;
  label: string;
}

/** Stepper (DESIGN_SYSTEM §4) — multi-step wizards; shows completed/current/
 * upcoming. */
export function Stepper({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Progress">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.key} className="flex items-center gap-2">
            <span
              className={cx(
                "flex h-7 w-7 items-center justify-center rounded-full text-caption font-semibold",
                done && "bg-success text-white",
                active && "bg-primary text-white",
                !done && !active && "bg-surface-muted text-text-muted",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Icon name="check" size={14} /> : i + 1}
            </span>
            <span className={cx("text-body-sm", active ? "font-medium text-text" : "text-text-muted")}>{step.label}</span>
            {i < steps.length - 1 && <span className="mx-1 hidden h-px w-6 bg-border sm:block" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
