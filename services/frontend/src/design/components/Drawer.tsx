import { ReactNode, useEffect, useId, useRef } from "react";
import { Button } from "../primitives/Button";

type DrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function Drawer({ open, title, onClose, children }: DrawerProps) {
  const containerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const idPrefix = useId();
  const titleID = `${idPrefix}-drawer-title`;

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
    <div
      className="fixed inset-0 z-[1200] flex justify-end bg-slate-950/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleID}
      onMouseDown={onClose}
    >
      <aside
        ref={containerRef}
        className="h-full w-full max-w-xl overflow-y-auto border-l border-border bg-surface p-5 shadow-lg"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="mb-5 flex items-center justify-between">
          <h3 id={titleID} className="text-lg font-semibold">{title}</h3>
          <Button variant="ghost" onClick={onClose} aria-label="Close details panel">
            Close
          </Button>
        </header>
        {children}
      </aside>
    </div>
  );
}
