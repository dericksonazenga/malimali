import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AgentEntry, VipEntry, SalesEntry } from "@/types";

interface InventoryContextType {
  agentEntries: AgentEntry[];
  vipEntries: VipEntry[];
  salesEntries: SalesEntry[];
  persistentStock: Record<string, number>;
  loading: boolean;
  addAgentEntry: (entry: AgentEntry) => Promise<void>;
  addVipEntry: (entry: VipEntry) => Promise<void>;
  addSalesEntry: (entry: SalesEntry) => Promise<void>;
  removeAgentEntry: (id: string) => Promise<void>;
  removeVipEntry: (id: string) => Promise<void>;
  removeSalesEntry: (id: string) => Promise<void>;
  clearAll: () => void;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export const useInventory = () => {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
};

const today = () => new Date().toISOString().split("T")[0];

const mapAgent = (r: any): AgentEntry => ({
  id: r.id,
  customerName: r.customer_name,
  commodity: r.commodity,
  grossWeight: Number(r.gross_weight),
  containerWeight: Number(r.container_weight),
  actualWeight: Number(r.actual_weight),
  rate: Number(r.rate),
  amount: Number(r.amount),
  weightImage: r.weight_image,
  itemImage: r.item_image,
  createdBy: r.created_by || "",
  createdAt: r.date || r.created_at?.split("T")[0] || "",
});

const mapVip = (r: any): VipEntry => ({
  id: r.id,
  customerName: r.customer_name,
  commodity: r.commodity,
  grossWeight: Number(r.gross_weight),
  containerWeight: Number(r.container_weight),
  actualWeight: Number(r.actual_weight),
  rate: Number(r.rate),
  amount: Number(r.amount),
  weightImage: r.weight_image,
  itemImage: r.item_image,
  createdBy: r.created_by || "",
  createdAt: r.date || r.created_at?.split("T")[0] || "",
});

const mapSales = (r: any): SalesEntry => ({
  id: r.id,
  customerName: r.customer_name,
  commodity: r.commodity,
  grossWeight: Number(r.gross_weight || 0),
  containerWeight: Number(r.container_weight || 0),
  weight: Number(r.weight),
  rate: r.rate != null ? Number(r.rate) : undefined,
  amount: r.amount != null ? Number(r.amount) : undefined,
  isExchange: r.is_exchange || false,
  exchangeCommodity: r.exchange_commodity,
  exchangeWeight: r.exchange_weight != null ? Number(r.exchange_weight) : undefined,
  weightImage: r.weight_image,
  itemImage: r.item_image,
  createdBy: r.created_by || "",
  createdAt: r.date || r.created_at?.split("T")[0] || "",
});

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [agentEntries, setAgentEntries] = useState<AgentEntry[]>([]);
  const [vipEntries, setVipEntries] = useState<VipEntry[]>([]);
  const [salesEntries, setSalesEntries] = useState<SalesEntry[]>([]);
  const [persistentStock, setPersistentStock] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchPersistentStock = useCallback(async () => {
    const { data } = await supabase.from("persistent_stock").select("*");
    if (data) {
      const stock: Record<string, number> = {};
      data.forEach((row: any) => { stock[row.commodity] = Number(row.weight); });
      setPersistentStock(stock);
    }
  }, []);

  const fetchToday = useCallback(async () => {
    const d = today();
    const [agentRes, vipRes, salesRes] = await Promise.all([
      supabase.from("agent_entries").select("*").eq("date", d).order("created_at", { ascending: false }),
      supabase.from("vip_entries").select("*").eq("date", d).order("created_at", { ascending: false }),
      supabase.from("sales_entries").select("*").eq("date", d).order("created_at", { ascending: false }),
    ]);
    if (agentRes.data) setAgentEntries(agentRes.data.map(mapAgent));
    if (vipRes.data) setVipEntries(vipRes.data.map(mapVip));
    if (salesRes.data) setSalesEntries(salesRes.data.map(mapSales));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchToday();
    fetchPersistentStock();

    const channel = supabase
      .channel("entries-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_entries" }, () => fetchToday())
      .on("postgres_changes", { event: "*", schema: "public", table: "vip_entries" }, () => fetchToday())
      .on("postgres_changes", { event: "*", schema: "public", table: "sales_entries" }, () => fetchToday())
      .on("postgres_changes", { event: "*", schema: "public", table: "persistent_stock" }, () => fetchPersistentStock())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchToday, fetchPersistentStock]);

  const addAgentEntry = useCallback(async (entry: AgentEntry) => {
    const { error } = await supabase.from("agent_entries").insert({
      customer_name: entry.customerName,
      commodity: entry.commodity,
      gross_weight: entry.grossWeight,
      container_weight: entry.containerWeight,
      actual_weight: entry.actualWeight,
      rate: entry.rate,
      amount: entry.amount,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error) console.error("Failed to add agent entry:", error);
  }, []);

  const addVipEntry = useCallback(async (entry: VipEntry) => {
    const { error } = await supabase.from("vip_entries").insert({
      customer_name: entry.customerName,
      commodity: entry.commodity,
      gross_weight: entry.grossWeight,
      container_weight: entry.containerWeight,
      actual_weight: entry.actualWeight,
      rate: entry.rate,
      amount: entry.amount,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error) console.error("Failed to add vip entry:", error);
  }, []);

  const addSalesEntry = useCallback(async (entry: SalesEntry) => {
    const { error } = await supabase.from("sales_entries").insert({
      customer_name: entry.customerName,
      commodity: entry.commodity,
      gross_weight: entry.grossWeight,
      container_weight: entry.containerWeight,
      weight: entry.weight,
      rate: entry.rate,
      amount: entry.amount,
      is_exchange: entry.isExchange,
      exchange_commodity: entry.exchangeCommodity || null,
      exchange_weight: entry.exchangeWeight || null,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error) console.error("Failed to add sales entry:", error);
  }, []);

  const removeAgentEntry = useCallback(async (id: string) => {
    const { error } = await supabase.from("agent_entries").delete().eq("id", id);
    if (error) console.error("Failed to remove agent entry:", error);
  }, []);

  const removeVipEntry = useCallback(async (id: string) => {
    const { error } = await supabase.from("vip_entries").delete().eq("id", id);
    if (error) console.error("Failed to remove vip entry:", error);
  }, []);

  const removeSalesEntry = useCallback(async (id: string) => {
    const { error } = await supabase.from("sales_entries").delete().eq("id", id);
    if (error) console.error("Failed to remove sales entry:", error);
  }, []);

  const clearAll = useCallback(async () => {
    // Accumulate today's entries into persistent stock in the DB
    const updates: Record<string, number> = {};
    agentEntries.forEach(e => {
      updates[e.commodity] = (updates[e.commodity] || 0) + e.actualWeight;
    });
    vipEntries.forEach(e => {
      updates[e.commodity] = (updates[e.commodity] || 0) + e.actualWeight;
    });
    salesEntries.forEach(e => {
      if (e.commodity) {
        updates[e.commodity] = (updates[e.commodity] || 0) - e.weight;
      }
    });

    // Upsert each commodity delta into persistent_stock
    for (const [commodity, delta] of Object.entries(updates)) {
      const currentWeight = persistentStock[commodity] || 0;
      const newWeight = currentWeight + delta;
      await supabase.from("persistent_stock").upsert(
        { commodity, weight: newWeight, updated_at: new Date().toISOString() },
        { onConflict: "commodity" }
      );
    }

    // Clear local display
    setAgentEntries([]);
    setVipEntries([]);
    setSalesEntries([]);
  }, [agentEntries, vipEntries, salesEntries, persistentStock]);

  return (
    <InventoryContext.Provider value={{ agentEntries, vipEntries, salesEntries, persistentStock, loading, addAgentEntry, addVipEntry, addSalesEntry, removeAgentEntry, removeVipEntry, removeSalesEntry, clearAll }}>
      {children}
    </InventoryContext.Provider>
  );
};
