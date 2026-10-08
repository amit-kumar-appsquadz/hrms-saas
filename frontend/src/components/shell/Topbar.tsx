"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Avatar } from "@/components/ui";
import { useSession } from "@/components/providers/SessionProvider";
import { demoRoles } from "@/services/auth";

export function Topbar({
  onToggleSidebar,
  onOpenSearch,
  onOpenNotifications,
  unreadCount,
}: {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
}) {
  const { user, tenant, role, setRole, signOut } = useSession();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface px-3 sm:px-4">
      <button
        onClick={onToggleSidebar}
        aria-label="Toggle navigation"
        className="rounded-sm p-2 text-text-muted hover:bg-surface-muted lg:hidden"
      >
        <Icon name="menu" />
      </button>

      {/* Tenant context */}
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-caption font-bold text-white">A</span>
        <div className="hidden sm:block">
          <div className="text-body-sm font-semibold leading-tight text-text">Acme HRMS</div>
          <div className="text-caption leading-tight text-text-muted">{tenant}.app.example.com</div>
        </div>
      </div>

      {/* Global search trigger */}
      <button
        onClick={onOpenSearch}
        className="ml-2 hidden h-9 flex-1 max-w-sm items-center gap-2 rounded-sm border border-border bg-bg px-3 text-body-sm text-text-muted hover:border-border-strong md:flex"
      >
        <Icon name="search" size={16} />
        <span>Search…</span>
        <kbd className="ml-auto rounded-sm border border-border px-1.5 text-caption">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        {/* Demo role switcher — lets the client preview role-aware navigation */}
        <label className="hidden items-center gap-1.5 rounded-sm border border-border bg-bg px-2 py-1 text-caption text-text-muted sm:flex">
          <span className="hidden lg:inline">View as</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            aria-label="Preview as role"
            className="bg-transparent text-caption font-medium text-text focus:outline-none"
          >
            {demoRoles.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <button onClick={onOpenSearch} aria-label="Search" className="rounded-sm p-2 text-text-muted hover:bg-surface-muted md:hidden">
          <Icon name="search" />
        </button>

        <button
          onClick={onOpenNotifications}
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
          className="relative rounded-sm p-2 text-text-muted hover:bg-surface-muted"
        >
          <Icon name="bell" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </button>

        <button aria-label="Help" className="hidden rounded-sm p-2 text-text-muted hover:bg-surface-muted sm:block">
          <Icon name="help" />
        </button>

        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-sm p-1 hover:bg-surface-muted"
          >
            <Avatar name={user?.email ?? "User"} size="sm" />
            <Icon name="chevron-down" size={14} />
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 mt-1 w-56 overflow-hidden rounded-md border border-border bg-surface shadow-md">
              <div className="border-b border-border px-3 py-2.5">
                <div className="truncate text-body-sm font-medium text-text">{user?.email}</div>
                <div className="truncate text-caption text-text-muted">{user?.roles.join(", ")}</div>
              </div>
              <nav className="py-1 text-body-sm">
                <MenuLink label="My profile" onClick={() => { router.push("/me/profile"); setMenuOpen(false); }} icon="user" />
                <MenuLink label="Personal settings" onClick={() => { router.push("/me/settings"); setMenuOpen(false); }} icon="settings" />
                <MenuLink label="My dashboard" onClick={() => { router.push("/me"); setMenuOpen(false); }} icon="self" />
                <div className="my-1 border-t border-border" />
                <MenuLink label="Sign out" onClick={signOut} icon="logout" />
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuLink({ label, onClick, icon }: { label: string; onClick: () => void; icon: "user" | "settings" | "self" | "logout" }) {
  return (
    <button role="menuitem" onClick={onClick} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-text hover:bg-surface-muted">
      <Icon name={icon} size={16} />
      {label}
    </button>
  );
}
