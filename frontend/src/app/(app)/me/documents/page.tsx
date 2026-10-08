"use client";

import { PageHeader, Card, CardHeader, CardBody, StatusBadge, Button, Icon } from "@/components/ui";
import { Dropzone } from "@/components/patterns/Dropzone";

const MY_DOCS = [
  { id: 1, name: "PAN Card.pdf", category: "ID Proof", status: "verified" },
  { id: 2, name: "Offer Letter.pdf", category: "Employment", status: "verified" },
  { id: 3, name: "Address Proof.pdf", category: "Address Proof", status: "pending" },
];

export default function MyDocumentsPage() {
  return (
    <div>
      <PageHeader title="My documents" subtitle="View and upload your documents" breadcrumbs={[{ label: "Self-service" }, { label: "My documents" }]} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Documents" />
          <CardBody className="p-0">
            <ul className="divide-y divide-border">
              {MY_DOCS.map((d) => (
                <li key={d.id} className="flex items-center justify-between px-4 py-3">
                  <span className="flex items-center gap-2">
                    <Icon name="documents" size={16} />
                    <span>
                      <span className="block text-body-sm font-medium text-text">{d.name}</span>
                      <span className="block text-caption text-text-muted">{d.category}</span>
                    </span>
                  </span>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={d.status} />
                    <Button variant="tertiary" size="sm" icon="download" aria-label={`Download ${d.name}`} />
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Upload a document" />
          <CardBody>
            <Dropzone />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
