"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cx } from "@/lib/format";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { TableSkeleton, EmptyState, ErrorState } from "./States";
import type { PaginationMeta } from "@/types/api";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Mobile card label (defaults to header). */
  cardLabel?: string;
  /** Hide on tablet to prioritize columns (DESIGN_SYSTEM §5). */
  secondary?: boolean;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  error?: { message: string; requestId?: string };
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  caption?: string;
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  /** Primary mobile card title (first column by default). */
  mobileTitle?: (row: T) => ReactNode;
  rowActions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  emptyTitle = "No records found",
  emptyDescription,
  emptyAction,
  caption,
  meta,
  onPageChange,
  mobileTitle,
  rowActions,
  onRowClick,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = String(col.render(a) ?? "");
      const bv = String(col.render(b) ?? "");
      return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return copy;
  }, [rows, sort, columns]);

  if (loading) return <TableSkeleton cols={columns.length} />;
  if (error) return <ErrorState message={error.message} requestId={error.requestId} onRetry={onRetry} />;
  if (rows.length === 0)
    return <EmptyState icon="employees" title={emptyTitle} description={emptyDescription} action={emptyAction} />;

  function toggleSort(key: string) {
    setSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  return (
    <div>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto rounded-md border border-border bg-surface shadow-sm md:block scroll-thin">
        <table className="w-full border-collapse text-left text-body-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-border bg-surface-muted">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={sort?.key === col.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                  className={cx(
                    "px-4 py-2.5 text-caption font-semibold uppercase tracking-wide text-text-muted",
                    col.secondary && "hidden lg:table-cell",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-text"
                    >
                      {col.header}
                      <Icon name="sort" size={14} />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
              {rowActions && <th scope="col" className="w-12 px-4 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr
                key={rowKey(row)}
                className={cx(
                  "border-b border-border last:border-0 hover:bg-primary-subtle/40",
                  onRowClick && "cursor-pointer",
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cx(
                      "px-4 py-3 align-middle text-text",
                      col.secondary && "hidden lg:table-cell",
                      col.align === "right" && "text-right tabular",
                      col.align === "center" && "text-center",
                      col.className,
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {rowActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards (DESIGN_SYSTEM §5) */}
      <ul className="space-y-3 md:hidden">
        {sortedRows.map((row) => (
          <li key={rowKey(row)}>
            <div
              className="rounded-md border border-border bg-surface p-4 shadow-sm"
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="font-medium text-text">
                  {mobileTitle ? mobileTitle(row) : columns[0]?.render(row)}
                </div>
                {rowActions && <div onClick={(e) => e.stopPropagation()}>{rowActions(row)}</div>}
              </div>
              <dl className="space-y-1.5">
                {columns.slice(mobileTitle ? 0 : 1).map((col) => (
                  <div key={col.key} className="flex items-start justify-between gap-3 text-body-sm">
                    <dt className="text-text-muted">{col.cardLabel ?? col.header}</dt>
                    <dd className="text-right text-text">{col.render(row)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </li>
        ))}
      </ul>

      {meta && meta.total_pages > 1 && <Pagination meta={meta} onPageChange={onPageChange} />}
    </div>
  );
}

export function Pagination({
  meta,
  onPageChange,
}: {
  meta: PaginationMeta;
  onPageChange?: (page: number) => void;
}) {
  const from = (meta.page - 1) * meta.per_page + 1;
  const to = Math.min(meta.page * meta.per_page, meta.total);
  return (
    <div className="mt-3 flex items-center justify-between gap-4 text-body-sm text-text-muted">
      <span>
        Showing <span className="tabular text-text">{from}</span>–<span className="tabular text-text">{to}</span> of{" "}
        <span className="tabular text-text">{meta.total}</span>
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          icon="chevron-left"
          disabled={meta.page <= 1}
          onClick={() => onPageChange?.(meta.page - 1)}
          aria-label="Previous page"
        >
          Prev
        </Button>
        <span className="tabular">
          Page {meta.page} / {meta.total_pages}
        </span>
        <Button
          size="sm"
          variant="secondary"
          iconRight="chevron-right"
          disabled={meta.page >= meta.total_pages}
          onClick={() => onPageChange?.(meta.page + 1)}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
