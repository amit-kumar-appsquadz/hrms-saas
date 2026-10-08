"use client";

import { useState, type ReactNode } from "react";
import { useAsync } from "@/hooks/useAsync";
import {
  PageHeader,
  DataTable,
  SearchInput,
  Toolbar,
  type Column,
  type Crumb,
} from "@/components/ui";
import type { Paginated } from "@/types/api";

/**
 * Reusable list-page pattern — composes PageHeader + Toolbar + DataTable with
 * the four-states contract. Used by the many CRUD list screens so pages are
 * composed from shared components rather than hand-built each time
 * (COMPONENT_SYSTEM: "Do not create every page independently").
 */
export function ListPage<T>({
  title,
  subtitle,
  breadcrumbs,
  actions,
  columns,
  fetcher,
  rowKey,
  searchable,
  searchKeys,
  emptyTitle,
  emptyDescription,
  rowActions,
  onRowClick,
  extraFilters,
}: {
  title: string;
  subtitle?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  columns: Column<T>[];
  fetcher: () => Promise<T[] | Paginated<T>>;
  rowKey: (row: T) => string | number;
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  emptyTitle?: string;
  emptyDescription?: string;
  rowActions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  extraFilters?: ReactNode;
}) {
  const [q, setQ] = useState("");
  const { data, loading, error, reload } = useAsync(fetcher, []);

  const rows: T[] = Array.isArray(data) ? data : (data?.data ?? []);
  const meta = Array.isArray(data) ? undefined : data?.meta;

  const filtered =
    searchable && q.trim() && searchKeys
      ? rows.filter((r) =>
          searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(q.trim().toLowerCase())),
        )
      : rows;

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} actions={actions} />
      {(searchable || extraFilters) && (
        <Toolbar>
          {searchable && <SearchInput value={q} onChange={setQ} />}
          {extraFilters}
        </Toolbar>
      )}
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={rowKey}
        loading={loading}
        error={error}
        onRetry={reload}
        meta={meta}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        rowActions={rowActions}
        onRowClick={onRowClick}
        caption={title}
      />
    </div>
  );
}
