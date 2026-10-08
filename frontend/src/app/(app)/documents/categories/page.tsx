"use client";

import { ListPage } from "@/components/patterns/ListPage";
import { listDocumentCategories } from "@/services/modules";
import { Pill, Button, type Column } from "@/components/ui";
import { Can } from "@/components/providers/SessionProvider";
import type { DocumentCategory } from "@/types/domain";

const columns: Column<DocumentCategory>[] = [
  { key: "name", header: "Category", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "onboarding", header: "Onboarding", render: (r) => (r.required_for_onboarding ? <Pill tone="info">Required</Pill> : "—") },
  { key: "sensitive", header: "Sensitive", render: (r) => (r.sensitive ? <Pill tone="warning">Yes</Pill> : "No") },
  { key: "types", header: "Allowed types", render: (r) => r.allowed_types, secondary: true },
  { key: "expiry", header: "Expiry tracking", render: (r) => (r.expiry_tracking ? "Yes" : "No"), secondary: true },
];

export default function DocumentCategoriesPage() {
  return (
    <ListPage
      title="Document categories"
      subtitle="Define the categories employees can upload against"
      breadcrumbs={[{ label: "Documents" }, { label: "Categories" }]}
      actions={<Can permission="documents.upload"><Button variant="primary" icon="plus">Add category</Button></Can>}
      columns={columns}
      fetcher={listDocumentCategories}
      rowKey={(r) => r.id}
      emptyTitle="No categories"
    />
  );
}
