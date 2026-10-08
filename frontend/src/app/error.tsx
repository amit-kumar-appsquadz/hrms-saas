"use client";

import { SystemErrorPage } from "@/components/patterns/ErrorPage";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <SystemErrorPage
      code="500"
      icon="alert"
      title="Something went wrong"
      message="An unexpected error occurred. Please retry, or contact support if the problem persists."
      requestId={error.digest}
    />
  );
}
