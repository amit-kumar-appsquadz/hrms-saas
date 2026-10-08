"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNav, selfNav, type NavGroup } from "@/lib/navigation";
import { useSession } from "@/components/providers/SessionProvider";
import { Icon } from "@/components/ui";
import { cx } from "@/lib/format";

function groupVisible(group: NavGroup, canAny: (p: string[]) => boolean): boolean {
  if (group.anyOf && !canAny(group.anyOf)) return false;
  // Visible if at least one item is visible.
  return group.items.some((item) => !item.anyOf || canAny(item.anyOf));
}

function NavGroupBlock({
  group,
  pathname,
  approvalCount,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  approvalCount: number;
  onNavigate?: () => void;
}) {
  const { canAny } = useSession();
  const items = group.items.filter((item) => !item.anyOf || canAny(item.anyOf));
  const groupActive = items.some((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
  const [open, setOpen] = useState(groupActive || group.label === "Dashboard");

  if (items.length === 0) return null;

  // Single-item groups render as a direct link.
  if (items.length === 1 && items[0]!.href === group.items[0]!.href && group.items.length === 1) {
    const item = items[0]!;
    const active = pathname === item.href;
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cx(
          "flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-body-sm font-medium",
          active ? "bg-primary-subtle text-primary" : "text-text-muted hover:bg-surface-muted hover:text-text",
        )}
      >
        <Icon name={group.icon} size={18} />
        {group.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cx(
          "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-body-sm font-medium",
          groupActive ? "text-text" : "text-text-muted hover:text-text",
        )}
      >
        <Icon name={group.icon} size={18} />
        <span className="flex-1 text-left">{group.label}</span>
        <Icon name={open ? "chevron-down" : "chevron-right"} size={14} />
      </button>
      {open && (
        <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex items-center justify-between gap-2 rounded-sm px-2.5 py-1.5 text-body-sm",
                    active ? "bg-primary-subtle font-medium text-primary" : "text-text-muted hover:bg-surface-muted hover:text-text",
                  )}
                >
                  {item.label}
                  {item.badge === "approvals" && approvalCount > 0 && (
                    <span className="rounded-full bg-warning-subtle px-1.5 text-caption font-semibold text-warning">
                      {approvalCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function Sidebar({
  approvalCount,
  onNavigate,
}: {
  approvalCount: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { canAny } = useSession();

  const adminGroups = adminNav.filter((g) => groupVisible(g, canAny));
  const selfGroups = selfNav.filter((g) => groupVisible(g, canAny));

  return (
    <nav aria-label="Primary" className="flex h-full flex-col gap-1 overflow-y-auto px-3 py-4 scroll-thin">
      <div className="space-y-1">
        {adminGroups.map((g) => (
          <NavGroupBlock key={g.label} group={g} pathname={pathname} approvalCount={approvalCount} onNavigate={onNavigate} />
        ))}
      </div>
      {selfGroups.length > 0 && (
        <>
          <div className="my-3 px-2.5 text-caption font-semibold uppercase tracking-wide text-text-disabled">
            Personal
          </div>
          <div className="space-y-1">
            {selfGroups.map((g) => (
              <NavGroupBlock key={g.label} group={g} pathname={pathname} approvalCount={approvalCount} onNavigate={onNavigate} />
            ))}
          </div>
        </>
      )}
    </nav>
  );
}
