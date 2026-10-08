"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";
import { search } from "@/services/modules";
import type { SearchResult } from "@/types/domain";

/** Command palette (Cmd/Ctrl+K) across permitted entities (SELF_SERVICE §F).
 * API gap (GET /search) — demo-backed, grouped by type. */
export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim()) search(q).then(setResults);
      else setResults([]);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  function go(href: string) {
    router.push(href);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Global search">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-xl overflow-hidden rounded-md bg-surface shadow-lg">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search employees, departments, pages…"
            aria-label="Search"
            className="h-12 w-full bg-transparent text-body text-text placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="hidden rounded-sm border border-border px-1.5 py-0.5 text-caption text-text-muted sm:inline">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2 scroll-thin">
          {q.trim() === "" && <p className="px-2 py-6 text-center text-body-sm text-text-muted">Type to search across the workspace.</p>}
          {q.trim() !== "" && results.length === 0 && (
            <p className="px-2 py-6 text-center text-body-sm text-text-muted">No results for “{q}”.</p>
          )}
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="mb-2">
              <div className="px-2 py-1 text-caption font-semibold uppercase tracking-wide text-text-disabled">{type}</div>
              {items.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => go(r.href)}
                  className="flex w-full items-center justify-between gap-3 rounded-sm px-2 py-2 text-left hover:bg-surface-muted"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-body-sm text-text">{r.title}</span>
                    <span className="block truncate text-caption text-text-muted">{r.subtitle}</span>
                  </span>
                  <Icon name="arrow-right" size={16} />
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
