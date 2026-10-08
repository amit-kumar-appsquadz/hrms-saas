"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button, TextField, Icon } from "@/components/ui";
import { login, DEMO_MFA_CODE } from "@/services/auth";
import { setSession } from "@/lib/session";

/** Login — POST /auth/login. On mfa_required → MFA step (APPLICATION_SHELL §1). */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo.admin@acme.co.in");
  const [password, setPassword] = useState("demo-password");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      const res = await login({ email, password });
      if ("mfa_required" in res) {
        router.push(`/login/mfa?challenge=${res.challenge_id}`);
      } else {
        setSession(res.token);
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials.");
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardBody>
        <h2 className="text-h2 text-text">Sign in</h2>
        <p className="mt-1 text-body-sm text-text-muted">Welcome back. Please sign in to continue.</p>

        {error && (
          <div role="alert" className="mt-4 rounded-sm border border-danger-subtle bg-danger-subtle/50 px-3 py-2 text-body-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <TextField
            label="Work email"
            name="email"
            type="email"
            full
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="relative">
            <TextField
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              full
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-[30px] text-text-muted hover:text-text"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <Icon name={showPassword ? "eye-off" : "eye"} size={18} />
            </button>
          </div>
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-body-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>

        <div className="mt-5 rounded-sm border border-border bg-surface-muted px-3 py-2.5 text-caption text-text-muted">
          <strong className="text-text">Demo tips:</strong> any password works. Use an email containing{" "}
          <code className="font-mono">mfa</code> to see the MFA step (code{" "}
          <code className="font-mono">{DEMO_MFA_CODE}</code>).
        </div>

        <div className="mt-4 border-t border-border pt-4 text-center">
          <Link href="/platform/login" className="inline-flex items-center gap-1.5 text-body-sm font-medium text-primary hover:underline">
            <Icon name="building" size={16} />
            Platform operator sign in
          </Link>
          <p className="mt-1 text-caption text-text-muted">SaaS operators / Super Admins manage all tenants here.</p>
        </div>
      </CardBody>
    </Card>
  );
}
