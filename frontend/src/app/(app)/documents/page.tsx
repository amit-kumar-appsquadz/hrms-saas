"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listDocuments } from "@/services/modules";
import { StatusBadge, Pill, Button, Icon, type Column } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import { formatDate } from "@/lib/format";
import type { DocumentRecord } from "@/types/domain";

const columns: Column<DocumentRecord>[] = [
  {
    key: "name",
    header: "Document",
    render: (r) => (
      <span className="flex items-center gap-2">
        <Icon name="documents" size={16} />
        <span className="font-medium">{r.name}</span>
        {r.sensitive && <Pill tone="warning">Sensitive</Pill>}
      </span>
    ),
  },
  { key: "category", header: "Category", render: (r) => r.category },
  { key: "employee", header: "Employee", render: (r) => r.employee, secondary: true },
  { key: "uploaded", header: "Uploaded", render: (r) => formatDate(r.uploaded_at), secondary: true },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

export default function DocumentsPage() {
  return (
    <ListPage
      title="Documents"
      subtitle="Employee documents across the organization"
      breadcrumbs={[{ label: "Documents" }, { label: "All documents" }]}
      actions={<Can permission="documents.upload"><Button variant="primary" icon="upload">Upload</Button></Can>}
      columns={columns}
      fetcher={() => listDocuments(1, 25)}
      rowKey={(r) => r.id}
      searchable
      searchKeys={["name", "employee", "category"]}
      rowActions={(r) => (
        <div className="flex gap-1">
          <Button variant="tertiary" size="sm" icon="eye" aria-label={`Preview ${r.name}`} />
          <Button variant="tertiary" size="sm" icon="download" aria-label={`Download ${r.name}`} />
        </div>
      )}
      emptyTitle="No documents"
    />
  );
}
