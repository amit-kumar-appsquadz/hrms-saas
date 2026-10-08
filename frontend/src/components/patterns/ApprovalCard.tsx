"use client";

import { useState } from "react";
import { Card, CardBody, Button, Pill, TextareaField } from "@/components/ui";
import { useToast } from "@/components/providers/ToastProvider";
import { timeAgoHours } from "@/lib/format";

export interface ApprovalCardData {
  id: number;
  type: string;
  subject: string;
  requester: string;
  meta?: string;
  age_hours: number;
  priority?: "normal" | "high";
}

/** Shared approval UX (WORKFLOW_MODULE §6): approve / reject / request-changes
 * with comment capture — reused by leave, regularization, workflow inboxes. */
export function ApprovalCard({ item, onResolved }: { item: ApprovalCardData; onResolved: (id: number) => void }) {
  const { toast } = useToast();
  const [showReject, setShowReject] = useState(false);
  const [comment, setComment] = useState("");

  function act(decision: string) {
    if ((decision === "rejected" || decision === "changes") && !comment.trim()) {
      setShowReject(true);
      return;
    }
    toast(`${item.subject} — ${decision} (demo).`, decision === "rejected" ? "danger" : "success");
    onResolved(item.id);
  }

  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Pill tone="info">{item.type}</Pill>
              {item.priority === "high" && <Pill tone="danger">High</Pill>}
            </div>
            <h3 className="mt-1.5 text-body font-medium text-text">{item.subject}</h3>
            <p className="text-caption text-text-muted">
              Requested by {item.requester} · {timeAgoHours(item.age_hours)}
              {item.meta ? ` · ${item.meta}` : ""}
            </p>
          </div>
        </div>

        {showReject && (
          <div className="mt-3">
            <TextareaField
              label="Comment (required for reject / request changes)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              full
            />
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="primary" size="sm" icon="check" onClick={() => act("approved")}>
            Approve
          </Button>
          <Button variant="secondary" size="sm" onClick={() => (showReject ? act("changes") : setShowReject(true))}>
            Request changes
          </Button>
          <Button variant="danger" size="sm" icon="x" onClick={() => (showReject ? act("rejected") : setShowReject(true))}>
            Reject
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
