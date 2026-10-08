import { cx } from "@/lib/format";
import { Icon, type IconName } from "./Icon";
import { Button } from "./Button";

/** Skeleton block (DESIGN_SYSTEM §4) — matches final layout shape. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} aria-hidden />;
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cx("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** Table loading skeleton with matching column shape. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="flex gap-4 border-b border-border bg-surface-muted px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-border px-4 py-3.5 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3.5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-md border border-border bg-surface p-4 shadow-sm">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-16" />
          <Skeleton className="mt-3 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Empty state — DESIGN_SYSTEM §4: icon + heading + explanation + CTA. */
export function EmptyState({
  icon = "info",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-surface px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-text-muted">
        <Icon name={icon} size={24} />
      </div>
      <h3 className="mt-4 text-h3 text-text">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-body-sm text-text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Error state — shows message + request_id for support + retry (PRODUCT_UI_SPEC). */
export function ErrorState({
  message = "Something went wrong while loading this view.",
  requestId,
  onRetry,
}: {
  message?: string;
  requestId?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-md border border-danger-subtle bg-danger-subtle/40 px-6 py-12 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-subtle text-danger">
        <Icon name="alert" size={24} />
      </div>
      <h3 className="mt-4 text-h3 text-text">Unable to load</h3>
      <p className="mt-1 max-w-sm text-body-sm text-text-muted">{message}</p>
      {requestId && (
        <p className="mt-1 font-mono text-caption text-text-muted">Reference: {requestId}</p>
      )}
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" icon="arrow-right" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

/** Inline restricted state for permission-limited views (PRODUCT_UI_SPEC). */
export function RestrictedState({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface-muted px-4 py-3 text-body-sm text-text-muted">
      <Icon name="compliance" size={18} />
      {message ?? "You don't have permission to view this section."}
    </div>
  );
}
