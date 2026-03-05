import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { mockAgentEntries, mockVipEntries, mockSalesEntries } from "@/data/mockData";
import { AgentEntry, VipEntry, SalesEntry } from "@/types";

interface InventoryContextType {
  agentEntries: AgentEntry[];
  vipEntries: VipEntry[];
  salesEntries: SalesEntry[];
  addAgentEntry: (entry: AgentEntry) => void;
  addVipEntry: (entry: VipEntry) => void;
  addSalesEntry: (entry: SalesEntry) => void;
  removeAgentEntry: (id: string) => void;
  removeVipEntry: (id: string) => void;
  removeSalesEntry: (id: string) => void;
  clearAll: () => void;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export const useInventory = () => {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
};

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [agentEntries, setAgentEntries] = useState<AgentEntry[]>(mockAgentEntries);
  const [vipEntries, setVipEntries] = useState<VipEntry[]>(mockVipEntries);
  const [salesEntries, setSalesEntries] = useState<SalesEntry[]>(mockSalesEntries);

  const addAgentEntry = useCallback((entry: AgentEntry) => setAgentEntries(p => [entry, ...p]), []);
  const addVipEntry = useCallback((entry: VipEntry) => setVipEntries(p => [entry, ...p]), []);
  const addSalesEntry = useCallback((entry: SalesEntry) => setSalesEntries(p => [entry, ...p]), []);
  const removeAgentEntry = useCallback((id: string) => setAgentEntries(p => p.filter(e => e.id !== id)), []);
  const removeVipEntry = useCallback((id: string) => setVipEntries(p => p.filter(e => e.id !== id)), []);
  const removeSalesEntry = useCallback((id: string) => setSalesEntries(p => p.filter(e => e.id !== id)), []);
  const clearAll = useCallback(() => { setAgentEntries([]); setVipEntries([]); setSalesEntries([]); }, []);

  return (
    <InventoryContext.Provider value={{ agentEntries, vipEntries, salesEntries, addAgentEntry, addVipEntry, addSalesEntry, removeAgentEntry, removeVipEntry, removeSalesEntry, clearAll }}>
      {children}
    </InventoryContext.Provider>
  );
};
