"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardBody, Button, TextField } from "@/components/ui";

/** Forgot password — API gap (POST /auth/password/forgot). Neutral success
 * message to avoid user enumeration (APPLICATION_SHELL §1). */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setSent(true);
      setLoading(false);
    }, 500);
  }

  return (
    <Card>
      <CardBody>
        <h2 className="text-h2 text-text">Reset your password</h2>
        {sent ? (
          <p className="mt-3 text-body-sm text-text-muted">
            If an account exists for <strong className="text-text">{email}</strong>, we&apos;ve sent a password
            reset link. Please check your inbox.
          </p>
        ) : (
          <>
            <p className="mt-1 text-body-sm text-text-muted">
              Enter your work email and we&apos;ll send you a reset link.
            </p>
            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <TextField
                label="Work email"
                name="email"
                type="email"
                full
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                Send reset link
              </Button>
            </form>
          </>
        )}
        <div className="mt-4">
          <Link href="/login" className="text-body-sm text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
