"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardBody, Button, TextField } from "@/components/ui";

function strength(pw: string): { score: number; label: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  return { score: s, label: labels[s] ?? "Weak" };
}

function ResetForm() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const meter = useMemo(() => strength(pw), [pw]);
  const mismatch = confirm.length > 0 && pw !== confirm;

  return (
    <Card>
      <CardBody>
        <h2 className="text-h2 text-text">Set a new password</h2>
        {done ? (
          <p className="mt-3 text-body-sm text-text-muted">
            Your password has been reset. You can now{" "}
            <Link href="/login" className="text-primary hover:underline">
              sign in
            </Link>
            .
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
            }}
            className="mt-4 space-y-4"
          >
            <div>
              <TextField label="New password" type="password" full required value={pw} onChange={(e) => setPw(e.target.value)} />
              {pw && (
                <div className="mt-1.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(meter.score / 4) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-caption text-text-muted">Strength: {meter.label}</p>
                </div>
              )}
            </div>
            <TextField
              label="Confirm password"
              type="password"
              full
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={mismatch ? "Passwords do not match." : undefined}
            />
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={mismatch || meter.score < 2}>
              Reset password
            </Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
