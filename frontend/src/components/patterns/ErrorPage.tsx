import Link from "next/link";
import { Icon, type IconName, Button } from "@/components/ui";

/** Shared system/error page (APPLICATION_SHELL §3). role=alert on the message. */
export function SystemErrorPage({
  code,
  icon,
  title,
  message,
  requestId,
}: {
  code: string;
  icon: IconName;
  title: string;
  message: string;
  requestId?: string;
}) {
  return (
    <main id="main-content" className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-text-muted">
        <Icon name={icon} size={28} />
      </div>
      <p className="mt-4 font-mono text-caption text-text-muted">{code}</p>
      <h1 className="mt-1 text-h1 text-text" role="alert">
        {title}
      </h1>
      <p className="mt-2 max-w-md text-body-sm text-text-muted">{message}</p>
      {requestId && <p className="mt-1 font-mono text-caption text-text-muted">Reference: {requestId}</p>}
      <div className="mt-5 flex gap-2">
        <Link href="/dashboard">
          <Button variant="primary" icon="dashboard">
            Back to dashboard
          </Button>
        </Link>
      </div>
    </main>
  );
}
