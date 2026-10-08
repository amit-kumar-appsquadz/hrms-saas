"use client";

import { PageHeader, Card, CardHeader, CardBody } from "@/components/ui";
import { Dropzone } from "@/components/patterns/Dropzone";

export default function BulkUploadPage() {
  return (
    <div>
      <PageHeader
        title="Bulk document upload"
        subtitle="Upload many files mapped to employees and categories (runs as a queued job)"
        breadcrumbs={[{ label: "Documents" }, { label: "Bulk upload" }]}
      />
      <Card>
        <CardHeader title="Upload files" subtitle="Files are matched to employees by filename convention or a CSV manifest." />
        <CardBody>
          <Dropzone />
          <p className="mt-4 text-caption text-text-muted">
            Large uploads run on a queue (steering rule 3). You&apos;ll be notified when processing completes, with a
            row-level result report of matched / unmatched files.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
