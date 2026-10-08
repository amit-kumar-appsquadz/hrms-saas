"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { cx } from "@/lib/format";

/** File dropzone (DESIGN_SYSTEM §4) — drag+drop + browse, type/size shown.
 * Presigned-upload flow is an API gap; this demonstrates the UX only. */
export function Dropzone({ onFiles }: { onFiles?: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function handle(list: FileList | null) {
    if (!list) return;
    const names = Array.from(list).map((f) => f.name);
    setFiles((prev) => [...prev, ...names]);
    onFiles?.(Array.from(list));
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); }}
        className={cx(
          "flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-primary bg-primary-subtle" : "border-border bg-surface hover:border-border-strong",
        )}
      >
        <Icon name="upload" size={28} />
        <p className="mt-2 text-body-sm font-medium text-text">Drag & drop files here, or click to browse</p>
        <p className="text-caption text-text-muted">PDF, JPG, PNG · up to 10 MB each</p>
        <input ref={inputRef} type="file" multiple className="sr-only" onChange={(e) => handle(e.target.files)} aria-label="Upload files" />
      </div>
      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((name, i) => (
            <li key={i} className="flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 text-body-sm">
              <Icon name="documents" size={16} />
              <span className="flex-1 truncate text-text">{name}</span>
              <span className="text-caption text-success">Uploaded (demo)</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
