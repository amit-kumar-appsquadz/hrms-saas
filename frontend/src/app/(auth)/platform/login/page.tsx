"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button, TextField, Icon } from "@/components/ui";
import { setPlatformSession } from "@/lib/session";

/**
 * PLATFORM console sign-in (Super Admin). Separate entry from the tenant login
 * — platform operators authenticate outside any tenant subdomain. Demo-backed
 * (platform auth is an API gap).
 */
export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("superadmin@platform.example.com");
  const [password, setPassword] = useState("demo-password");
  const [loading, setLoading] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setPlatformSession("demo-platform-token");
      router.push("/platform");
    }, 400);
  }

  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-caption font-bold text-white">P</span>
          <span className="rounded-full bg-warning-subtle px-2 py-0.5 text-caption font-medium text-warning">Platform console</span>
        </div>
        <h2 className="text-h2 text-text">Platform operator sign in</h2>
        <p className="mt-1 text-body-sm text-text-muted">SaaS operator access — manage all customer tenants.</p>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <TextField label="Operator email" type="email" full required value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Password" type="password" full required value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
            Sign in to platform
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between">
          <Link href="/login" className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline">
            <Icon name="arrow-left" size={14} />
            Tenant sign in
          </Link>
          <span className="text-caption text-text-muted">Demo · any password</span>
        </div>
      </CardBody>
    </Card>
  );
}
