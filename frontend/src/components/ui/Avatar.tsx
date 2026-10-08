import { cx } from "@/lib/format";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const SIZES = { sm: "h-7 w-7 text-caption", md: "h-9 w-9 text-body-sm", lg: "h-14 w-14 text-h2" };

export function Avatar({
  name,
  color = "#1C4E80",
  size = "md",
  className,
}: {
  name: string;
  color?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={cx("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", SIZES[size], className)}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function EmployeeCell({ name, subtitle, color }: { name: string; subtitle?: string; color?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={name} color={color} size="sm" />
      <div className="min-w-0">
        <div className="truncate font-medium text-text">{name}</div>
        {subtitle && <div className="truncate text-caption text-text-muted">{subtitle}</div>}
      </div>
    </div>
  );
}
