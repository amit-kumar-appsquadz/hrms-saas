"use client";

import { cx } from "@/lib/format";

export interface TabItem {
  key: string;
  label: string;
  disabled?: boolean;
  restricted?: boolean;
}

/**
 * Tabs — role=tablist (DESIGN_SYSTEM §4). Supports many tabs (e.g. the 19-tab
 * employee profile) via horizontal scroll. Deep-linkable by the caller.
 */
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div role="tablist" aria-label="Sections" className="flex gap-1 overflow-x-auto border-b border-border scroll-thin">
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={selected}
            aria-disabled={tab.disabled || undefined}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.key)}
            className={cx(
              "whitespace-nowrap border-b-2 px-3 py-2 text-body-sm font-medium transition-colors",
              selected
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text",
              tab.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {tab.label}
            {tab.restricted && <span className="ml-1 text-caption text-text-disabled">🔒</span>}
          </button>
        );
      })}
    </div>
  );
}
