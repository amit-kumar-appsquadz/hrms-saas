"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePlatformSession, platformRoles } from "@/components/providers/PlatformSessionProvider";
import type { PlatformRole } from "@/lib/platformRoles";
import { platformNav } from "@/lib/platformNavigation";
import { Icon, Avatar } from "@/components/ui";
import { cx } from "@/lib/format";

/**
 * PLATFORM console shell — a visually distinct (dark) chrome so it is never
 * mistaken for a tenant workspace. Nav is filtered by platform permissions.
 */
export function PlatformShell({ children }: { children: ReactNode }) {
  const { identity, loading, canAny, role, setRole, signOut } = usePlatformSession();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading || !identity) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1623]">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-11 w-11 animate-pulse items-center justify-center rounded-md bg-primary text-h2 font-bold text-white">P</span>
          <span className="text-body-sm text-white/70">Loading platform console…</span>
        </div>
      </div>
    );
  }

  const items = platformNav.filter((i) => !i.anyOf || canAny(i.anyOf));

  const SidebarContent = (
    <nav aria-label="Platform navigation" className="flex h-full flex-col gap-1 p-3">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/platform" && pathname.startsWith(item.href));
        const exactHome = item.href === "/platform" && pathname === "/platform";
        const isActive = item.href === "/platform" ? exactHome : active;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            aria-current={isActive ? "page" : undefined}
            className={cx(
              "flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-body-sm font-medium",
              isActive ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/dashboard"
        className="mt-auto flex items-center gap-2.5 rounded-sm border border-white/15 px-2.5 py-2 text-body-sm text-white/80 hover:bg-white/10"
      >
        <Icon name="external" size={16} />
        Tenant workspaces
      </Link>
    </nav>
  );

  return (
    <div className="min-h-screen bg-bg">
      {/* Platform topbar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[#1f2a3d] bg-[#0f1623] px-3 text-white sm:px-4">
        <button onClick={() => setSidebarOpen((o) => !o)} aria-label="Toggle navigation" className="rounded-sm p-2 text-white/70 hover:bg-white/10 lg:hidden">
          <Icon name="menu" />
        </button>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-caption font-bold text-white">P</span>
          <div className="hidden sm:block">
            <div className="text-body-sm font-semibold leading-tight">Platform Console</div>
            <div className="text-caption leading-tight text-white/60">SaaS operator · all tenants</div>
          </div>
        </div>

        <span className="ml-3 hidden rounded-full bg-warning/20 px-2 py-0.5 text-caption font-medium text-warning sm:inline">
          Demo · Platform administration
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* Platform role preview switcher (separate from tenant roles) */}
          <label className="hidden items-center gap-1.5 rounded-sm border border-white/15 bg-white/5 px-2 py-1 text-caption text-white/70 sm:flex">
            <span className="hidden lg:inline">View as</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as PlatformRole)}
              aria-label="Preview as platform role"
              className="bg-transparent text-caption font-medium text-white focus:outline-none [&>option]:text-text"
            >
              {platformRoles.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <Avatar name={identity.name} size="sm" />
            <div className="hidden text-right sm:block">
              <div className="text-caption font-medium leading-tight">{identity.platform_role_label}</div>
              <div className="text-[10px] leading-tight text-white/60">{identity.email}</div>
            </div>
          </div>
          <button onClick={signOut} aria-label="Sign out of platform" className="rounded-sm p-2 text-white/70 hover:bg-white/10">
            <Icon name="logout" />
          </button>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 bg-[#0f1623] lg:block">{SidebarContent}</aside>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} aria-hidden />
            <aside className="absolute left-0 top-0 h-full w-72 bg-[#0f1623]">{SidebarContent}</aside>
          </div>
        )}

        <main id="main-content" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
