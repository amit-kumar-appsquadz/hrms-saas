import Link from "next/link";
import { cx } from "@/lib/format";
import { Icon, type IconName } from "./Icon";

/** KPI stat card (DESIGN_SYSTEM §4): title, value, optional delta + drill-down. */
export function StatCard({
  label,
  value,
  delta,
  deltaTone = "neutral",
  icon,
  href,
  hint,
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: "success" | "danger" | "neutral";
  icon?: IconName;
  href?: string;
  hint?: string;
}) {
  const body = (
    <div className="rounded-md border border-border bg-surface p-4 shadow-sm transition-colors hover:border-border-strong">
      <div className="flex items-center justify-between">
        <span className="text-caption font-medium uppercase tracking-wide text-text-muted">{label}</span>
        {icon && (
          <span className="text-text-muted">
            <Icon name={icon} size={18} />
          </span>
        )}
      </div>
      <div className="mt-2 text-h1 tabular text-text">{value}</div>
      <div className="mt-1 flex items-center gap-2">
        {delta && (
          <span
            className={cx(
              "text-caption font-medium",
              deltaTone === "success" && "text-success",
              deltaTone === "danger" && "text-danger",
              deltaTone === "neutral" && "text-text-muted",
            )}
          >
            {delta}
          </span>
        )}
        {hint && <span className="text-caption text-text-muted">{hint}</span>}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}
