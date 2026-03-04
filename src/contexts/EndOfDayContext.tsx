import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";

interface EndOfDayContextType {
  resetSignal: number; // increments on each End of Day
  triggerEndOfDay: () => void;
  canTrigger: boolean;
  nextAvailableAt: number | null; // timestamp
  remainingTime: string;
}

const COOLDOWN_MS = 3 * 60 * 60 * 1000; // 3 hours
const STORAGE_KEY = "end_of_day_last_triggered";

const EndOfDayContext = createContext<EndOfDayContextType | null>(null);

export const useEndOfDay = () => {
  const ctx = useContext(EndOfDayContext);
  if (!ctx) throw new Error("useEndOfDay must be used within EndOfDayProvider");
  return ctx;
};

export const EndOfDayProvider = ({ children }: { children: ReactNode }) => {
  const [resetSignal, setResetSignal] = useState(0);
  const [lastTriggered, setLastTriggered] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  });
  const [now, setNow] = useState(Date.now());

  // Update "now" every second for countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const nextAvailableAt = lastTriggered ? lastTriggered + COOLDOWN_MS : null;
  const canTrigger = !nextAvailableAt || now >= nextAvailableAt;

  const remainingTime = (() => {
    if (canTrigger || !nextAvailableAt) return "";
    const diff = nextAvailableAt - now;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  })();

  const triggerEndOfDay = useCallback(() => {
    if (!canTrigger) return;
    const timestamp = Date.now();
    localStorage.setItem(STORAGE_KEY, timestamp.toString());
    setLastTriggered(timestamp);
    setResetSignal((s) => s + 1);
  }, [canTrigger]);

  return (
    <EndOfDayContext.Provider value={{ resetSignal, triggerEndOfDay, canTrigger, nextAvailableAt, remainingTime }}>
      {children}
    </EndOfDayContext.Provider>
  );
};
