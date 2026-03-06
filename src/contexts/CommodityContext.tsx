import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { mockCommodities } from "@/data/mockData";
import { Commodity } from "@/types";

interface CommodityContextType {
  commodities: Commodity[];
  addCommodity: (c: Commodity) => void;
  updateCommodity: (id: string, updates: Partial<Commodity>) => void;
}

const CommodityContext = createContext<CommodityContextType | null>(null);

export const useCommodities = () => {
  const ctx = useContext(CommodityContext);
  if (!ctx) throw new Error("useCommodities must be used within CommodityProvider");
  return ctx;
};

export const CommodityProvider = ({ children }: { children: ReactNode }) => {
  const [commodities, setCommodities] = useState<Commodity[]>(mockCommodities);

  const addCommodity = useCallback((c: Commodity) => setCommodities(p => [...p, c]), []);
  const updateCommodity = useCallback((id: string, updates: Partial<Commodity>) =>
    setCommodities(p => p.map(c => c.id === id ? { ...c, ...updates } : c)), []);

  return (
    <CommodityContext.Provider value={{ commodities, addCommodity, updateCommodity }}>
      {children}
    </CommodityContext.Provider>
  );
};
