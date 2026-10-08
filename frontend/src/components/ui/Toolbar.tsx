"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import { cx } from "@/lib/format";

/** Debounced search input (lists are debounced per the frontend brief). */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  debounceMs = 300,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  debounceMs?: number;
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (local !== value) onChange(local);
    }, debounceMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <div className="relative w-full max-w-xs">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
        <Icon name="search" size={16} />
      </span>
      <input
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-sm border border-border bg-surface pl-8 pr-3 text-body-sm text-text placeholder:text-text-muted focus:border-border-strong"
      />
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="inline-flex items-center gap-2 text-body-sm">
      <span className="text-text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-sm border border-border bg-surface px-2 pr-7 text-body-sm text-text focus:border-border-strong"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("mb-3 flex flex-wrap items-center gap-3", className)}>{children}</div>
  );
}

/** Removable active-filter tag (DESIGN_SYSTEM §5). */
export function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-subtle px-2 py-0.5 text-caption text-primary">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label} filter`} className="hover:opacity-70">
        <Icon name="x" size={12} />
      </button>
    </span>
  );
}
