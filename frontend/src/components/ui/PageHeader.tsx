import Link from "next/link";
import { type ReactNode } from "react";
import { Icon } from "./Icon";
import { StatusBadge } from "./StatusBadge";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-1">
      <ol className="flex flex-wrap items-center gap-1 text-caption text-text-muted">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1">
              {item.href && !last ? (
                <Link href={item.href} className="hover:text-text hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "text-text" : undefined}>
                  {item.label}
                </span>
              )}
              {!last && <Icon name="chevron-right" size={12} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Page header — title + subtitle + status + action area (APPLICATION_SHELL §2). */
export function PageHeader({
  title,
  subtitle,
  status,
  breadcrumbs,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  status?: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
}) {
  return (
    <header className="mb-5">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-h1 text-text">{title}</h1>
            {status && <StatusBadge status={status} />}
          </div>
          {subtitle && <p className="mt-1 text-body-sm text-text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
