"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button, TextField } from "@/components/ui";
import { setSession } from "@/lib/session";

/** Invited-user activation — API gap (POST /auth/activate). First-time password
 * set + optional MFA enrolment (APPLICATION_SHELL §1). */
function ActivateForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [pw, setPw] = useState("");

  return (
    <Card>
      <CardBody>
        <h2 className="text-h2 text-text">Activate your account</h2>
        <p className="mt-1 text-body-sm text-text-muted">
          {step === 1 ? "Set a password to get started." : "Secure your account with two-factor authentication."}
        </p>

        {step === 1 ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(2);
            }}
            className="mt-4 space-y-4"
          >
            <TextField label="Create password" type="password" full required value={pw} onChange={(e) => setPw(e.target.value)} />
            <TextField label="Confirm password" type="password" full required />
            <Button type="submit" variant="primary" size="lg" className="w-full">
              Continue
            </Button>
          </form>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-col items-center rounded-md border border-border bg-surface-muted p-4">
              <div className="grid grid-cols-6 gap-0.5" aria-hidden>
                {Array.from({ length: 36 }).map((_, i) => (
                  <span key={i} className={i % 3 === 0 || i % 5 === 0 ? "h-3 w-3 bg-text" : "h-3 w-3 bg-transparent"} />
                ))}
              </div>
              <p className="mt-3 text-caption text-text-muted">Scan with your authenticator app</p>
              <code className="mt-1 font-mono text-caption text-text">JBSWY3DPEHPK3PXP</code>
            </div>
            <TextField label="Enter 6-digit code" inputMode="numeric" maxLength={6} full />
            <Button variant="primary" size="lg" className="w-full" onClick={() => { setSession("demo-token"); router.push("/dashboard"); }}>
              Finish setup
            </Button>
            <Button variant="tertiary" size="sm" className="w-full" onClick={() => { setSession("demo-token"); router.push("/dashboard"); }}>
              Skip for now
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={null}>
      <ActivateForm />
    </Suspense>
  );
}
