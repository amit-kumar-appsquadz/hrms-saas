"use client";

import { useState } from "react";
import Link from "next/link";
import { Drawer, Button } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { NotificationItem } from "@/types/domain";

/** Notification center panel (SELF_SERVICE §C). Optimistic mark-read. */
export function NotificationPanel({
  open,
  onClose,
  items,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  items: NotificationItem[];
  onChange: (items: NotificationItem[]) => void;
}) {
  const [local, setLocal] = useState(items);

  function markRead(id: number) {
    const next = local.map((n) => (n.id === id ? { ...n, read: true } : n));
    setLocal(next);
    onChange(next);
  }
  function markAll() {
    const next = local.map((n) => ({ ...n, read: true }));
    setLocal(next);
    onChange(next);
  }

  const sorted = [...local].sort((a, b) => Number(a.read) - Number(b.read));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Notifications"
      footer={
        <div className="flex justify-between">
          <Button variant="tertiary" size="sm" onClick={markAll}>
            Mark all as read
          </Button>
          <Link href="/me/notifications" onClick={onClose} className="text-body-sm text-primary hover:underline">
            View all
          </Link>
        </div>
      }
    >
      <ul className="space-y-2">
        {sorted.map((n) => (
          <li key={n.id}>
            <Link
              href={n.link}
              onClick={() => {
                markRead(n.id);
                onClose();
              }}
              className="flex gap-3 rounded-md border border-border p-3 hover:bg-surface-muted"
            >
              {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
              {n.read && <span className="mt-1.5 h-2 w-2 shrink-0" />}
              <span className="min-w-0">
                <span className="block text-body-sm font-medium text-text">{n.title}</span>
                <span className="mt-0.5 block text-caption text-text-muted">{n.body}</span>
                <span className="mt-1 block text-caption text-text-disabled">{formatDateTime(n.timestamp)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Drawer>
  );
}
