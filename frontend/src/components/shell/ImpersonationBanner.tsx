"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";
import { exitTenant, getImpersonation, type ImpersonationContext } from "@/lib/impersonation";

/**
 * Shown inside the tenant app when a platform Super Admin has entered a tenant
 * via "View tenant". Makes the impersonation context explicit and offers a way
 * back to the platform console. Clearly labelled as a demo capability.
 */
export function ImpersonationBanner() {
  const router = useRouter();
  const [ctx, setCtx] = useState<ImpersonationContext | null>(null);

  useEffect(() => {
    setCtx(getImpersonation());
  }, []);

  if (!ctx) return null;

  function exit() {
    exitTenant();
    router.push("/platform/tenants");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 bg-warning px-3 py-1.5 text-caption font-medium text-white" role="status">
      <Icon name="eye" size={14} />
      <span>
        Platform view · you are viewing <strong>{ctx.tenantName}</strong> ({ctx.subdomain}) as a tenant workspace — demo impersonation
      </span>
      <button onClick={exit} className="ml-auto inline-flex items-center gap-1 rounded-sm bg-white/20 px-2 py-0.5 hover:bg-white/30">
        <Icon name="arrow-left" size={12} />
        Exit to platform
      </button>
    </div>
  );
}
