import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface EndOfDayContextType {
  resetSignal: number;
  triggerEndOfDay: () => void;
  canTrigger: boolean;
}

const EndOfDayContext = createContext<EndOfDayContextType | null>(null);

export const useEndOfDay = () => {
  const ctx = useContext(EndOfDayContext);
  if (!ctx) throw new Error("useEndOfDay must be used within EndOfDayProvider");
  return ctx;
};

export const EndOfDayProvider = ({ children }: { children: ReactNode }) => {
  const [resetSignal, setResetSignal] = useState(0);

  const triggerEndOfDay = useCallback(() => {
    setResetSignal((s) => s + 1);
  }, []);

  return (
    <EndOfDayContext.Provider value={{ resetSignal, triggerEndOfDay, canTrigger: true }}>
      {children}
    </EndOfDayContext.Provider>
  );
};
