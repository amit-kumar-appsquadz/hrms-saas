"use client";

import { useState } from "react";
import { useAsync } from "@/hooks/useAsync";
import { listAudit } from "@/services/modules";
import {
  PageHeader,
  DataTable,
  Button,
  Drawer,
  Pill,
  type Column,
} from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { AuditEntry } from "@/types/domain";

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => listAudit(page, 25), [page]);
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const columns: Column<AuditEntry>[] = [
    { key: "ts", header: "Timestamp", render: (r) => formatDateTime(r.timestamp) },
    { key: "actor", header: "Actor", render: (r) => r.actor },
    { key: "action", header: "Action", render: (r) => <span className="font-mono text-body-sm">{r.action}</span> },
    { key: "entity", header: "Entity", render: (r) => `${r.entity_type} #${r.entity_id}`, secondary: true },
    { key: "ip", header: "IP", render: (r) => <span className="font-mono text-body-sm">{r.ip}</span>, secondary: true },
  ];

  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle="Append-only change history (MongoDB Atlas via facade — ADR-003)"
        breadcrumbs={[{ label: "Audit" }]}
        actions={<Button variant="secondary" icon="download">Export</Button>}
      />
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={reload}
        meta={data?.meta}
        onPageChange={setPage}
        onRowClick={(r) => setSelected(r)}
        caption="Audit log"
        emptyTitle="No audit entries"
      />

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Audit entry" width="max-w-lg">
        {selected && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-body-sm">
              <div><dt className="text-text-muted">Timestamp</dt><dd className="text-text">{formatDateTime(selected.timestamp)}</dd></div>
              <div><dt className="text-text-muted">Actor</dt><dd className="text-text">{selected.actor}</dd></div>
              <div><dt className="text-text-muted">Action</dt><dd className="font-mono text-text">{selected.action}</dd></div>
              <div><dt className="text-text-muted">Entity</dt><dd className="text-text">{selected.entity_type} #{selected.entity_id}</dd></div>
              <div><dt className="text-text-muted">IP</dt><dd className="font-mono text-text">{selected.ip}</dd></div>
              <div><dt className="text-text-muted">Request ID</dt><dd className="font-mono text-text">{selected.request_id}</dd></div>
            </dl>
            <div>
              <h3 className="mb-2 text-h3 text-text">Changes</h3>
              {selected.changes.length === 0 ? (
                <p className="text-body-sm text-text-muted">No field-level changes recorded.</p>
              ) : (
                <table className="w-full border-collapse text-body-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-caption uppercase text-text-muted">
                      <th className="py-1.5">Field</th>
                      <th className="py-1.5">Before</th>
                      <th className="py-1.5">After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.changes.map((c, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="py-1.5 text-text">{c.field}</td>
                        <td className="py-1.5"><Pill tone="danger">{c.before}</Pill></td>
                        <td className="py-1.5"><Pill tone="success">{c.after}</Pill></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
