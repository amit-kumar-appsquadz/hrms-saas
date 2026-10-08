"use client";

import { useAsync } from "@/hooks/useAsync";
import { listOnboarding } from "@/services/employees";
import { PageHeader, Card, CardBody, CardHeader, Button, StatusBadge, Avatar, CardsSkeleton, ErrorState, StatCard } from "@/components/ui";
import { formatDate } from "@/lib/format";

const STAGES = ["invited", "details", "documents", "verification", "account", "completed"];

export default function OnboardingPage() {
  const { data, loading, error, reload } = useAsync(() => listOnboarding());

  return (
    <div>
      <PageHeader
        title="Onboarding"
        subtitle="Candidates in the onboarding pipeline"
        breadcrumbs={[{ label: "Employees", href: "/employees" }, { label: "Onboarding" }]}
        actions={<Button variant="primary" icon="plus">Start onboarding</Button>}
      />

      {loading && <CardsSkeleton count={4} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}

      {data && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="In pipeline" value={data.length} icon="employees" />
            <StatCard label="Pending docs" value={data.filter((c) => c.stage === "documents").length} icon="documents" />
            <StatCard label="Awaiting verification" value={data.filter((c) => c.stage === "verification").length} icon="compliance" />
            <StatCard label="Ready to activate" value={data.filter((c) => c.stage === "account").length} icon="user" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {data.map((c) => (
              <Card key={c.id}>
                <CardHeader
                  title={
                    <span className="flex items-center gap-2.5">
                      <Avatar name={c.name} size="sm" />
                      {c.name}
                    </span>
                  }
                  subtitle={`${c.designation} · ${c.department}`}
                  action={<StatusBadge status={c.stage === "completed" ? "completed" : "pending"} />}
                />
                <CardBody>
                  <div className="mb-2 flex items-center justify-between text-caption text-text-muted">
                    <span>Progress</span>
                    <span className="tabular text-text">{c.progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${c.progress}%` }} />
                  </div>
                  <ol className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-caption">
                    {STAGES.map((s, i) => {
                      const idx = STAGES.indexOf(c.stage);
                      return (
                        <li key={s} className={i <= idx ? "font-medium text-primary" : "text-text-muted"}>
                          {i < idx ? "✓ " : ""}
                          {s}
                        </li>
                      );
                    })}
                  </ol>
                  <div className="mt-4 flex items-center justify-between text-caption text-text-muted">
                    <span>Owner: {c.owner}</span>
                    <span>Starts {formatDate(c.start_date)}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" size="sm" iconRight="arrow-right">Open checklist</Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
