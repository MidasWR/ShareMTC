import { ReactNode, useEffect, useRef } from "react";
import { Button } from "../primitives/Button";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmVariant?: "primary" | "destructive";
  onConfirm?: () => void;
  onClose: () => void;
  children?: ReactNode;
};

export function Modal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  onConfirm,
  onClose,
  children
}: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      triggerRef.current?.focus();
      return;
    }
    triggerRef.current = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    if (!container) return;
    const overlay = container;

    const focusableElements = overlay.querySelectorAll<HTMLElement>(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const nodes = overlay.querySelectorAll<HTMLElement>(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div ref={containerRef} className="w-full max-w-lg rounded-none border border-border bg-surface p-5 shadow-lg">
        <header className="mb-4 space-y-1">
          <h3 className="text-lg font-semibold">{title}</h3>
          {description ? <p className="text-sm text-textSecondary">{description}</p> : null}
        </header>
        {children}
        <footer className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {onConfirm ? (
            <Button variant={confirmVariant} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
