import type { ReactNode } from "react";
import { config } from "@/lib/config";

/** Unauthenticated shell: single-column centered card, tenant branding, no app
 * chrome (APPLICATION_SHELL §1). */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-h2 font-bold text-white">
            A
          </div>
          <h1 className="mt-3 text-h2 text-text">Acme HRMS</h1>
          <p className="text-caption text-text-muted">
            {config.defaultTenant}.app.example.com
          </p>
        </div>
        {children}
        <p className="mt-6 text-center text-caption text-text-muted">
          Demo environment · data is simulated
        </p>
      </div>
    </main>
  );
}
