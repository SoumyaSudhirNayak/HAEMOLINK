import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type AutoRefreshContextValue = {
  refreshTick: number;
};

const AutoRefreshContext = createContext<AutoRefreshContextValue | null>(null);

export function AutoRefreshProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [refreshTick, setRefreshTick] = useState(0);
  const savedScrollYRef = useRef<number | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      savedScrollYRef.current = typeof window !== "undefined" ? window.scrollY : null;
      setRefreshTick((t) => t + 1);
    }, 8000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const y = savedScrollYRef.current;
    if (y == null || typeof window === "undefined") return;

    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        window.scrollTo({ top: y, left: 0 });
      });
    });

    return () => {
      if (raf1) window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
    };
  }, [refreshTick]);

  const value = useMemo(() => ({ refreshTick }), [refreshTick]);

  return (
    <AutoRefreshContext.Provider value={value}>
      {children}
    </AutoRefreshContext.Provider>
  );
}

export function useAutoRefresh() {
  const context = useContext(AutoRefreshContext);
  if (!context) {
    throw new Error("useAutoRefresh must be used within AutoRefreshProvider");
  }
  return context;
}
