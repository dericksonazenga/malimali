import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { mockAgentEntries, mockVipEntries, mockSalesEntries } from "@/data/mockData";
import { AgentEntry, VipEntry, SalesEntry } from "@/types";

const PERSISTENT_STOCK_KEY = "inventory_persistent_stock";

interface InventoryContextType {
  agentEntries: AgentEntry[];
  vipEntries: VipEntry[];
  salesEntries: SalesEntry[];
  persistentStock: Record<string, number>; // commodity -> cumulative kg
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

const loadPersistentStock = (): Record<string, number> => {
  try {
    const stored = localStorage.getItem(PERSISTENT_STOCK_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
};

const savePersistentStock = (stock: Record<string, number>) => {
  localStorage.setItem(PERSISTENT_STOCK_KEY, JSON.stringify(stock));
};

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [agentEntries, setAgentEntries] = useState<AgentEntry[]>(mockAgentEntries);
  const [vipEntries, setVipEntries] = useState<VipEntry[]>(mockVipEntries);
  const [salesEntries, setSalesEntries] = useState<SalesEntry[]>(mockSalesEntries);
  const [persistentStock, setPersistentStock] = useState<Record<string, number>>(loadPersistentStock);

  useEffect(() => { savePersistentStock(persistentStock); }, [persistentStock]);

  const addAgentEntry = useCallback((entry: AgentEntry) => setAgentEntries(p => [entry, ...p]), []);
  const addVipEntry = useCallback((entry: VipEntry) => setVipEntries(p => [entry, ...p]), []);
  const addSalesEntry = useCallback((entry: SalesEntry) => setSalesEntries(p => [entry, ...p]), []);
  const removeAgentEntry = useCallback((id: string) => setAgentEntries(p => p.filter(e => e.id !== id)), []);
  const removeVipEntry = useCallback((id: string) => setVipEntries(p => p.filter(e => e.id !== id)), []);
  const removeSalesEntry = useCallback((id: string) => setSalesEntries(p => p.filter(e => e.id !== id)), []);

  // On End of Day: fold daily stock into persistent totals, then clear
  const clearAll = useCallback(() => {
    setPersistentStock(prev => {
      const updated = { ...prev };
      // Add daily stock in (agent + vip)
      agentEntries.forEach(e => {
        updated[e.commodity] = (updated[e.commodity] || 0) + e.actualWeight;
      });
      vipEntries.forEach(e => {
        updated[e.commodity] = (updated[e.commodity] || 0) + e.actualWeight;
      });
      // Subtract daily stock out (sales)
      salesEntries.forEach(e => {
        if (e.commodity) {
          updated[e.commodity] = (updated[e.commodity] || 0) - e.weight;
        }
      });
      return updated;
    });
    setAgentEntries([]);
    setVipEntries([]);
    setSalesEntries([]);
  }, [agentEntries, vipEntries, salesEntries]);

  return (
    <InventoryContext.Provider value={{ agentEntries, vipEntries, salesEntries, persistentStock, addAgentEntry, addVipEntry, addSalesEntry, removeAgentEntry, removeVipEntry, removeSalesEntry, clearAll }}>
      {children}
    </InventoryContext.Provider>
  );
};
