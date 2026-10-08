"use client";

import { useState } from "react";
import { Icon } from "@/components/ui";
import { cx } from "@/lib/format";
import type { OrgNode } from "@/types/domain";

function Node({ node, depth }: { node: OrgNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <li>
      <div
        className={cx(
          "flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 shadow-sm",
          depth === 0 && "border-primary",
        )}
      >
        {hasChildren ? (
          <button onClick={() => setOpen((o) => !o)} aria-label={open ? "Collapse" : "Expand"} className="text-text-muted hover:text-text">
            <Icon name={open ? "chevron-down" : "chevron-right"} size={16} />
          </button>
        ) : (
          <span className="w-4" />
        )}
        <div>
          <div className="text-body-sm font-medium text-text">{node.name}</div>
          <div className="text-caption text-text-muted">{node.subtitle}</div>
        </div>
      </div>
      {hasChildren && open && (
        <ul className="ml-6 mt-2 space-y-2 border-l border-border pl-4">
          {node.children!.map((child) => (
            <Node key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OrgChart({ root }: { root: OrgNode }) {
  return (
    <ul className="space-y-2">
      <Node node={root} depth={0} />
    </ul>
  );
}
