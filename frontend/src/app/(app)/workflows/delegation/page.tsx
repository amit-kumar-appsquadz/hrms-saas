"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listDelegations } from "@/services/modules";
import { StatusBadge, Button, type Column } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { Delegation } from "@/types/domain";

const columns: Column<Delegation>[] = [
  { key: "delegate", header: "Delegate", render: (r) => <span className="font-medium">{r.delegate}</span> },
  { key: "types", header: "Workflow types", render: (r) => r.types },
  { key: "from", header: "From", render: (r) => formatDate(r.from) },
  { key: "to", header: "To", render: (r) => formatDate(r.to) },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

export default function DelegationPage() {
  return (
    <ListPage
      title="Delegation"
      subtitle="Route your approvals to a delegate during absence"
      breadcrumbs={[{ label: "Workflows" }, { label: "Delegation" }]}
      actions={<Button variant="primary" icon="plus">Add delegation</Button>}
      columns={columns}
      fetcher={listDelegations}
      rowKey={(r) => r.id}
      emptyTitle="No delegations set up"
    />
  );
}
