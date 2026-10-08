import { cx } from "@/lib/format";
import { statusMeta, type StatusTone } from "@/lib/status";

const TONES: Record<StatusTone, string> = {
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
  info: "bg-info-subtle text-info",
  neutral: "bg-neutral-subtle text-neutral",
};

/**
 * Status badge — DESIGN_SYSTEM §4. Pairs color with a text label (plus an
 * optional leading dot); status is never color-only.
 */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const { tone, label } = statusMeta(status);
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-caption font-medium",
        TONES[tone],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: StatusTone;
}) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium", TONES[tone])}>
      {children}
    </span>
  );
}
