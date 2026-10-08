"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getPlatformIdentity, platformRoles, type PlatformIdentity, type PlatformRoleSlug } from "@/services/platformAuth";
import { clearPlatformSession, isPlatformAuthenticated } from "@/lib/session";

interface PlatformSessionValue {
  identity: PlatformIdentity | undefined;
  loading: boolean;
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  role: PlatformRoleSlug;
  setRole: (slug: PlatformRoleSlug) => void;
  signOut: () => void;
}

const PlatformSessionContext = createContext<PlatformSessionValue | null>(null);

const ROLE_KEY = "hrms.demo.platform.role";

/**
 * PLATFORM permission context — fully separate from the tenant SessionProvider.
 * Super Admin is platform-level; this provider never reads tenant permissions.
 */
export function PlatformSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [identity, setIdentity] = useState<PlatformIdentity>();
  const [loading, setLoading] = useState(true);
  const [role, setRoleState] = useState<PlatformRoleSlug>("super-admin");

  const load = useCallback((slug: PlatformRoleSlug) => {
    setLoading(true);
    getPlatformIdentity(slug)
      .then(setIdentity)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isPlatformAuthenticated()) {
      setLoading(false);
      router.replace("/platform/login");
      return;
    }
    const stored = (typeof window !== "undefined" && (localStorage.getItem(ROLE_KEY) as PlatformRoleSlug)) || "super-admin";
    setRoleState(stored);
    load(stored);
  }, [load, router]);

  const setRole = useCallback(
    (slug: PlatformRoleSlug) => {
      if (typeof window !== "undefined") localStorage.setItem(ROLE_KEY, slug);
      setRoleState(slug);
      load(slug);
    },
    [load],
  );

  const can = useCallback(
    (permission: string) => (identity ? identity.permissions.includes(permission) : false),
    [identity],
  );
  const canAny = useCallback(
    (permissions: string[]) => (permissions.length === 0 ? true : permissions.some((p) => can(p))),
    [can],
  );

  const signOut = useCallback(() => {
    clearPlatformSession();
    router.replace("/platform/login");
  }, [router]);

  const value = useMemo<PlatformSessionValue>(
    () => ({ identity, loading, can, canAny, role, setRole, signOut }),
    [identity, loading, can, canAny, role, setRole, signOut],
  );

  return <PlatformSessionContext.Provider value={value}>{children}</PlatformSessionContext.Provider>;
}

export function usePlatformSession(): PlatformSessionValue {
  const ctx = useContext(PlatformSessionContext);
  if (!ctx) throw new Error("usePlatformSession must be used within PlatformSessionProvider");
  return ctx;
}

export { platformRoles };

/** Platform component-level permission guard. */
export function CanPlatform({
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
  const { can, canAny } = usePlatformSession();
  const allowed = permission ? can(permission) : anyOf ? canAny(anyOf) : true;
  return <>{allowed ? children : fallback}</>;
}
