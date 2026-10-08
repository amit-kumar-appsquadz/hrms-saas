"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "@/lib/format";
import { Icon } from "./Icon";
import { Button } from "./Button";

function useEscape(onClose: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, active]);
}

/** Drawer (side panel) — focus-trapped-ish, Esc closes (DESIGN_SYSTEM §7). */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEscape(onClose, open);
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        tabIndex={-1}
        className={cx(
          "absolute right-0 top-0 flex h-full w-full flex-col bg-surface shadow-lg outline-none",
          width,
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-h2 text-text">{title}</h2>
          <button onClick={onClose} aria-label="Close panel" className="rounded-sm p-1 text-text-muted hover:bg-surface-muted">
            <Icon name="close" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 scroll-thin">{children}</div>
        {footer && <div className="border-t border-border px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/** Modal / Dialog — focus-trapped, aria-modal, labelled by title. */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEscape(onClose, open);
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <div ref={ref} tabIndex={-1} className={cx("relative w-full rounded-md bg-surface shadow-lg outline-none", size)}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-h2 text-text">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-sm p-1 text-text-muted hover:bg-surface-muted">
            <Icon name="close" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4 scroll-thin">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/** Confirmation dialog, with optional destructive typed-confirmation. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  destructive,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="max-w-md"
      footer={
        <>
          <Button variant="tertiary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-body text-text-muted">{message}</p>
    </Modal>
  );
}
