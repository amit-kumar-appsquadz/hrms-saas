/**
 * Status → semantic color mapping (DESIGN_SYSTEM §1).
 * Status is never conveyed by color alone — the StatusBadge always pairs the
 * color with a label (and callers may add an icon).
 */

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const MAP: Record<string, { tone: StatusTone; label: string }> = {
  // Employee
  active: { tone: "success", label: "Active" },
  on_notice: { tone: "warning", label: "On notice" },
  inactive: { tone: "neutral", label: "Inactive" },
  exited: { tone: "danger", label: "Exited" },
  // Generic process
  draft: { tone: "info", label: "Draft" },
  calculated: { tone: "info", label: "Calculated" },
  review: { tone: "warning", label: "In review" },
  approved: { tone: "success", label: "Approved" },
  locked: { tone: "success", label: "Locked" },
  completed: { tone: "success", label: "Completed" },
  in_progress: { tone: "info", label: "In progress" },
  failed: { tone: "danger", label: "Failed" },
  // Approvals
  pending: { tone: "warning", label: "Pending" },
  rejected: { tone: "danger", label: "Rejected" },
  changes_requested: { tone: "info", label: "Changes requested" },
  cancelled: { tone: "neutral", label: "Cancelled" },
  escalated: { tone: "warning", label: "Escalated" },
  // Docs
  verified: { tone: "success", label: "Verified" },
  expired: { tone: "danger", label: "Expired" },
  // Users
  invited: { tone: "info", label: "Invited" },
  disabled: { tone: "neutral", label: "Disabled" },
  // Tenant lifecycle (ADR-008): provisioning→trial→active→suspended→inactive.
  // `active` and `inactive` are defined above (Employee section) with the same
  // intended tone/label and are reused here. `inactive` = terminal/churned.
  trial: { tone: "info", label: "Trial" },
  suspended: { tone: "danger", label: "Suspended" },
  provisioning: { tone: "warning", label: "Provisioning" },
  // Compliance
  compliant: { tone: "success", label: "Compliant" },
  action_required: { tone: "danger", label: "Action required" },
  // Attendance
  present: { tone: "success", label: "Present" },
  absent: { tone: "danger", label: "Absent" },
  half_day: { tone: "warning", label: "Half day" },
  leave: { tone: "info", label: "Leave" },
  holiday: { tone: "neutral", label: "Holiday" },
  week_off: { tone: "neutral", label: "Week off" },
  // Misc
  archived: { tone: "neutral", label: "Archived" },
  accepted: { tone: "success", label: "Accepted" },
  generated: { tone: "info", label: "Generated" },
  published: { tone: "success", label: "Published" },
  scheduled: { tone: "info", label: "Scheduled" },
  ended: { tone: "neutral", label: "Ended" },
};

export function statusMeta(status: string): { tone: StatusTone; label: string } {
  return MAP[status] ?? { tone: "neutral", label: status.replace(/_/g, " ") };
}
