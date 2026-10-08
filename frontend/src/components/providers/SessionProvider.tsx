"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/services/auth";
import { clearSession, getPreviewRole, isAuthenticated, setPreviewRole } from "@/lib/session";
import { resolveTenantFromHost } from "@/lib/tenant";
import { config } from "@/lib/config";
import type { CurrentUser } from "@/types/api";

interface SessionContextValue {
  user: CurrentUser | undefined;
  loading: boolean;
  tenant: string;
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  role: string;
  setRole: (slug: string) => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Provides the permission context from GET /auth/me (FRONTEND_ARCHITECTURE §3).
 * `can`/`canAny` gate nav, routes and actions. Least privilege by default:
 * unknown permission → false. A demo role switcher re-fetches `me` for the
 * selected role so the client can preview role-aware navigation.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser>();
  const [loading, setLoading] = useState(true);
  const [role, setRoleState] = useState("tenant-admin");

  const tenant = useMemo(() => {
    if (typeof window !== "undefined") return resolveTenantFromHost(window.location.host);
    return config.defaultTenant;
  }, []);

  const load = useCallback((roleSlug: string) => {
    setLoading(true);
    getCurrentUser(roleSlug)
      .then((u) => setUser(u))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      setLoading(false);
      router.replace("/login");
      return;
    }
    const r = getPreviewRole();
    setRoleState(r);
    load(r);
  }, [load, router]);

  const setRole = useCallback(
    (slug: string) => {
      setPreviewRole(slug);
      setRoleState(slug);
      load(slug);
    },
    [load],
  );

  const can = useCallback(
    (permission: string) => (user ? user.permissions.includes(permission) : false),
    [user],
  );
  const canAny = useCallback(
    (permissions: string[]) => (permissions.length === 0 ? true : permissions.some((p) => can(p))),
    [can],
  );

  const signOut = useCallback(() => {
    clearSession();
    router.replace("/login");
  }, [router]);

  const value = useMemo<SessionContextValue>(
    () => ({ user, loading, tenant, can, canAny, role, setRole, signOut }),
    [user, loading, tenant, can, canAny, role, setRole, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

/** Component-level permission guard (FRONTEND_ARCHITECTURE §3). */
export function Can({
  permission,
  anyOf,
  children,
  fallback = null,
}: {
  permission?: string;
  anyOf?: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can, canAny } = useSession();
  const allowed = permission ? can(permission) : anyOf ? canAny(anyOf) : true;
  return <>{allowed ? children : fallback}</>;
}
