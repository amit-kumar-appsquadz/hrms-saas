"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationPanel } from "./NotificationPanel";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { useSession } from "@/components/providers/SessionProvider";
import { Icon } from "@/components/ui";
import { cx } from "@/lib/format";
import { listNotifications } from "@/services/modules";
import type { NotificationItem } from "@/types/domain";

/** Authenticated admin/HR shell — persistent sidebar + topbar (APPLICATION_SHELL §2).
 * Boots after GET /auth/me resolves; shows a branded skeleton until then. */
export function AppShell({ children }: { children: ReactNode }) {
  const { loading, user } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    listNotifications().then(setNotifications);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;
  const approvalCount = notifications.filter((n) => n.category === "approvals" && !n.read).length;

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-11 w-11 animate-pulse items-center justify-center rounded-md bg-primary text-h2 font-bold text-white">A</span>
          <span className="text-body-sm text-text-muted">Loading your workspace…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <ImpersonationBanner />
      <Topbar
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenNotifications={() => setNotifOpen(true)}
        unreadCount={unread}
      />

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 border-r border-border bg-surface lg:block">
          <Sidebar approvalCount={approvalCount} />
        </aside>

        {/* Mobile off-canvas sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} aria-hidden />
            <aside className="absolute left-0 top-0 h-full w-72 bg-surface shadow-lg">
              <div className="flex items-center justify-between border-b border-border px-3 py-3">
                <span className="text-body-sm font-semibold text-text">Menu</span>
                <button onClick={() => setSidebarOpen(false)} aria-label="Close menu" className="rounded-sm p-1 text-text-muted hover:bg-surface-muted">
                  <Icon name="close" />
                </button>
              </div>
              <Sidebar approvalCount={approvalCount} onNavigate={() => setSidebarOpen(false)} />
            </aside>
          </div>
        )}

        <main id="main-content" className={cx("min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8")}>
          <div className="mx-auto max-w-content">{children}</div>
        </main>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} items={notifications} onChange={setNotifications} />
    </div>
  );
}
