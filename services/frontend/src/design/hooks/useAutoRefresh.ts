import { useEffect, useRef } from "react";

type Params = {
  enabled: boolean;
  refresh: () => Promise<void> | void;
  intervalMs?: number;
};

export function useAutoRefresh({ enabled, refresh, intervalMs = 15000 }: Params) {
  const runningRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const tick = async () => {
      if (!mountedRef.current || runningRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      runningRef.current = true;
      try {
        await refresh();
      } finally {
        runningRef.current = false;
      }
    };

    const timer = window.setInterval(() => {
      void tick();
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs, refresh]);
}
