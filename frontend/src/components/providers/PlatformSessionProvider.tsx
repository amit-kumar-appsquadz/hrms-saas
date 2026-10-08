"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getPlatformIdentity, platformRoles, type PlatformIdentity } from "@/services/platformAuth";
import type { PlatformRole } from "@/lib/platformRoles";
import { clearPlatformSession, isPlatformAuthenticated } from "@/lib/session";

interface PlatformSessionValue {
  identity: PlatformIdentity | undefined;
  loading: boolean;
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  role: PlatformRole;
  setRole: (role: PlatformRole) => void;
  signOut: () => void;
}

const PlatformSessionContext = createContext<PlatformSessionValue | null>(null);

const ROLE_KEY = "hrms.demo.platform.role";

/**
 * PLATFORM permission context — fully separate from the tenant SessionProvider.
 * The platform operator is platform-level; this provider never reads tenant
 * permissions. Roles are the FIXED PlatformRole enum (ADR-007 §4 / B1-03).
 */
export function PlatformSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [identity, setIdentity] = useState<PlatformIdentity>();
  const [loading, setLoading] = useState(true);
  const [role, setRoleState] = useState<PlatformRole>("PLATFORM_SUPER_ADMIN");

  const load = useCallback((r: PlatformRole) => {
    setLoading(true);
    getPlatformIdentity(r)
      .then(setIdentity)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isPlatformAuthenticated()) {
      setLoading(false);
      router.replace("/platform/login");
      return;
    }
    const stored = (typeof window !== "undefined" && (localStorage.getItem(ROLE_KEY) as PlatformRole)) || "PLATFORM_SUPER_ADMIN";
    setRoleState(stored);
    load(stored);
  }, [load, router]);

  const setRole = useCallback(
    (r: PlatformRole) => {
      if (typeof window !== "undefined") localStorage.setItem(ROLE_KEY, r);
      setRoleState(r);
      load(r);
    },
    [load],
  );

  const can = useCallback(
    (permission: string) =>
      identity ? (identity.permissions as readonly string[]).includes(permission) : false,
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
