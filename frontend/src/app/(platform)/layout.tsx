import type { ReactNode } from "react";
import { PlatformSessionProvider } from "@/components/providers/PlatformSessionProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { PlatformShell } from "@/components/shell/PlatformShell";

/**
 * PLATFORM console route group — the SaaS operator (Super Admin) experience.
 * Entirely separate from the tenant `(app)` group: its own session provider,
 * shell, navigation and permission namespace (platform.*). This group is for
 * platform-level roles only and never mixes with tenant roles.
 */
export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <PlatformSessionProvider>
      <ToastProvider>
        <PlatformShell>{children}</PlatformShell>
      </ToastProvider>
    </PlatformSessionProvider>
  );
}
