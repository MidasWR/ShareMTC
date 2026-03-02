import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { cx } from "../utils/cx";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: string; kind: ToastKind; message: string; context?: string; createdAt: Date };

type ToastContextValue = {
  push: (kind: ToastKind, message: string, context?: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastKind, message: string, context?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setItems((prev) => [...prev, { id, kind, message, context, createdAt: new Date() }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[1400] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            role={item.kind === "error" ? "alert" : "status"}
            aria-live={item.kind === "error" ? "assertive" : "polite"}
            className={cx(
              "pointer-events-auto rounded-md border px-3 py-2 text-sm shadow-md",
              item.kind === "success" && "border-success/40 bg-success/15 text-success",
              item.kind === "error" && "border-danger/40 bg-danger/15 text-danger",
              item.kind === "info" && "border-info/40 bg-info/15 text-info"
            )}
          >
            <p>{item.message}</p>
            <p className="mt-0.5 text-[11px] opacity-85">
              {item.context ? `${item.context} · ` : ""}
              {item.createdAt.toLocaleTimeString()}
            </p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
