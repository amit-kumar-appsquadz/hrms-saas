"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardBody, Button } from "@/components/ui";
import { verifyMfa, DEMO_MFA_CHALLENGE, DEMO_MFA_CODE } from "@/services/auth";
import { setSession } from "@/lib/session";

function MfaForm() {
  const router = useRouter();
  const params = useSearchParams();
  const challenge = params.get("challenge") ?? DEMO_MFA_CHALLENGE;
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      const res = await verifyMfa({ challenge_id: challenge, code });
      setSession(res.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardBody>
        <h2 className="text-h2 text-text">Two-factor verification</h2>
        <p className="mt-1 text-body-sm text-text-muted">
          Enter the 6-digit code from your authenticator app.
        </p>

        {error && (
          <div role="alert" className="mt-4 rounded-sm border border-danger-subtle bg-danger-subtle/50 px-3 py-2 text-body-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <label htmlFor="otp" className="block text-body-sm font-medium text-text">
            Authentication code
          </label>
          <input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="h-12 w-full rounded-sm border border-border bg-surface text-center font-mono text-h1 tracking-[0.5em] text-text focus:border-border-strong"
            aria-describedby="otp-hint"
          />
          <p id="otp-hint" className="text-caption text-text-muted">
            Demo code: <code className="font-mono">{DEMO_MFA_CODE}</code>
          </p>
          <Button type="submit" variant="primary" size="lg" loading={loading} disabled={code.length !== 6} className="w-full">
            Verify
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-between text-body-sm">
          <button type="button" className="text-primary hover:underline">
            Use a recovery code
          </button>
          <Link href="/login" className="text-text-muted hover:underline">
            Back to sign in
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}

export default function MfaPage() {
  return (
    <Suspense fallback={null}>
      <MfaForm />
    </Suspense>
  );
}
