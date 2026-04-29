import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AgentEntry, VipEntry, SalesEntry } from "@/types";
import { applyRealtimePayload } from "@/utils/applyRealtimePayload";
import { resolveStockCommodity } from "@/constants/specialCommodity";

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
  updateAgentEntry: (id: string, patch: Partial<AgentEntry>) => Promise<void>;
  updateVipEntry: (id: string, patch: Partial<VipEntry>) => Promise<void>;
  updateSalesEntry: (id: string, patch: Partial<SalesEntry>) => Promise<void>;
  clearAll: () => void;
  refresh: () => Promise<void>;
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
  exchangeFee: r.exchange_fee != null ? Number(r.exchange_fee) : undefined,
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

    // Check if EOD was triggered today — only show entries created after the last trigger
    const { data: eodData } = await supabase
      .from("end_of_day_log")
      .select("triggered_at")
      .eq("date", d)
      .order("triggered_at", { ascending: false })
      .limit(1);

    const lastEod = eodData?.[0]?.triggered_at;

    let agentQuery = supabase.from("agent_entries").select("*").eq("date", d).order("created_at", { ascending: false });
    let vipQuery = supabase.from("vip_entries").select("*").eq("date", d).order("created_at", { ascending: false });
    let salesQuery = supabase.from("sales_entries").select("*").eq("date", d).order("created_at", { ascending: false });

    if (lastEod) {
      agentQuery = agentQuery.gt("created_at", lastEod);
      vipQuery = vipQuery.gt("created_at", lastEod);
      salesQuery = salesQuery.gt("created_at", lastEod);
    }

    const [agentRes, vipRes, salesRes] = await Promise.all([agentQuery, vipQuery, salesQuery]);
    if (agentRes.data) setAgentEntries(agentRes.data.map(mapAgent));
    if (vipRes.data) setVipEntries(vipRes.data.map(mapVip));
    if (salesRes.data) setSalesEntries(salesRes.data.map(mapSales));
    setLoading(false);
  }, []);

  // Track current EOD cutoff so realtime inserts can be filtered without refetching.
  const eodCutoffRef = useRef<string | null>(null);
  const todayRef = useRef<string>(today());

  const refreshEodCutoff = useCallback(async () => {
    const d = today();
    todayRef.current = d;
    const { data: eodData } = await supabase
      .from("end_of_day_log")
      .select("triggered_at")
      .eq("date", d)
      .order("triggered_at", { ascending: false })
      .limit(1);
    eodCutoffRef.current = eodData?.[0]?.triggered_at || null;
  }, []);

  const matchesView = useCallback((row: any) => {
    if (!row) return false;
    if (row.date !== todayRef.current) return false;
    const cutoff = eodCutoffRef.current;
    if (cutoff && row.created_at && row.created_at <= cutoff) return false;
    return true;
  }, []);

  useEffect(() => {
    fetchToday();
    fetchPersistentStock();

    const channel = supabase
      .channel(`entries-rt-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_entries" }, (payload) => {
        setAgentEntries((prev) => applyRealtimePayload(prev, payload as any, mapAgent, { filter: matchesView }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "vip_entries" }, (payload) => {
        setVipEntries((prev) => applyRealtimePayload(prev, payload as any, mapVip, { filter: matchesView }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sales_entries" }, (payload) => {
        setSalesEntries((prev) => applyRealtimePayload(prev, payload as any, mapSales, { filter: matchesView }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "persistent_stock" }, (payload) => {
        const row: any = (payload as any).new || (payload as any).old;
        if (!row) return;
        setPersistentStock((prev) => {
          const next = { ...prev };
          if ((payload as any).eventType === "DELETE") {
            delete next[row.commodity];
          } else {
            next[row.commodity] = Number(row.weight) || 0;
          }
          return next;
        });
      })
      // EOD or rate-change triggers server-side row mutations across many entries — full refetch is safest here.
      .on("postgres_changes", { event: "*", schema: "public", table: "end_of_day_log" }, async () => {
        await refreshEodCutoff();
        fetchToday();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "commodities" }, () => fetchToday())
      .subscribe();

    refreshEodCutoff();

    // Re-fetch when auth state changes (e.g. user signs in)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        refreshEodCutoff();
        fetchToday();
        fetchPersistentStock();
      }
    });

    return () => {
      supabase.removeChannel(channel);
      subscription.unsubscribe();
    };
  }, [fetchToday, fetchPersistentStock, refreshEodCutoff, matchesView]);

  const addAgentEntry = useCallback(async (entry: AgentEntry) => {
    const tempId = `temp-${crypto.randomUUID()}`;
    // Optimistic insert — appears instantly; realtime echo will replace by real id.
    setAgentEntries((prev) => [{ ...entry, id: tempId }, ...prev]);
    const company_id = await (await import("@/utils/getCompanyId")).getCompanyId();
    const { data, error } = await supabase.from("agent_entries").insert({
      customer_name: entry.customerName,
      commodity: entry.commodity,
      gross_weight: entry.grossWeight,
      container_weight: entry.containerWeight,
      actual_weight: entry.actualWeight,
      rate: entry.rate,
      amount: entry.amount,
      created_by: (await supabase.auth.getUser()).data.user?.id,
      company_id,
    }).select().single();
    if (error) {
      console.error("Failed to add agent entry:", error);
      setAgentEntries((prev) => prev.filter((e) => e.id !== tempId));
      return;
    }
    if (data) {
      setAgentEntries((prev) => prev.map((e) => (e.id === tempId ? mapAgent(data) : e)));
    }
  }, []);

  const addVipEntry = useCallback(async (entry: VipEntry) => {
    const tempId = `temp-${crypto.randomUUID()}`;
    setVipEntries((prev) => [{ ...entry, id: tempId }, ...prev]);
    const company_id = await (await import("@/utils/getCompanyId")).getCompanyId();
    const { data, error } = await supabase.from("vip_entries").insert({
      customer_name: entry.customerName,
      commodity: entry.commodity,
      gross_weight: entry.grossWeight,
      container_weight: entry.containerWeight,
      actual_weight: entry.actualWeight,
      rate: entry.rate,
      amount: entry.amount,
      created_by: (await supabase.auth.getUser()).data.user?.id,
      company_id,
    }).select().single();
    if (error) {
      console.error("Failed to add vip entry:", error);
      setVipEntries((prev) => prev.filter((e) => e.id !== tempId));
      return;
    }
    if (data) {
      setVipEntries((prev) => prev.map((e) => (e.id === tempId ? mapVip(data) : e)));
    }
  }, []);

  const addSalesEntry = useCallback(async (entry: SalesEntry) => {
    const tempId = `temp-${crypto.randomUUID()}`;
    setSalesEntries((prev) => [{ ...entry, id: tempId }, ...prev]);
    const company_id = await (await import("@/utils/getCompanyId")).getCompanyId();
    const { data, error } = await supabase.from("sales_entries").insert({
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
      exchange_fee: entry.exchangeFee || 0,
      created_by: (await supabase.auth.getUser()).data.user?.id,
      company_id,
    }).select().single();
    if (error) {
      console.error("Failed to add sales entry:", error);
      setSalesEntries((prev) => prev.filter((e) => e.id !== tempId));
      return;
    }
    if (data) {
      setSalesEntries((prev) => prev.map((e) => (e.id === tempId ? mapSales(data) : e)));
    }
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

  const getActorName = async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "Unknown";
    const { data } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
    return data?.display_name || user.email || "Unknown";
  };

  const updateAgentEntry = useCallback(async (id: string, patch: Partial<AgentEntry>) => {
    const existing = agentEntries.find((e) => e.id === id);
    const dbPatch: any = {};
    if (patch.customerName !== undefined) dbPatch.customer_name = patch.customerName;
    if (patch.commodity !== undefined) dbPatch.commodity = patch.commodity;
    if (patch.actualWeight !== undefined) {
      dbPatch.actual_weight = patch.actualWeight;
      dbPatch.gross_weight = patch.actualWeight;
    }
    if (patch.rate !== undefined) dbPatch.rate = patch.rate;
    if (patch.amount !== undefined) dbPatch.amount = patch.amount;
    const { data, error } = await supabase.from("agent_entries").update(dbPatch).eq("id", id).select().single();
    if (error) { console.error("Failed to update agent entry:", error); throw error; }
    if (data) setAgentEntries((prev) => prev.map((e) => (e.id === id ? mapAgent(data) : e)));
    const { logAuditEvent } = await import("@/utils/auditLog");
    await logAuditEvent({ tableName: "agent_entries", recordId: id, action: "update", oldData: existing as any, newData: data as any, changedByName: await getActorName() });
  }, [agentEntries]);

  const updateVipEntry = useCallback(async (id: string, patch: Partial<VipEntry>) => {
    const existing = vipEntries.find((e) => e.id === id);
    const dbPatch: any = {};
    if (patch.customerName !== undefined) dbPatch.customer_name = patch.customerName;
    if (patch.commodity !== undefined) dbPatch.commodity = patch.commodity;
    if (patch.actualWeight !== undefined) {
      dbPatch.actual_weight = patch.actualWeight;
      dbPatch.gross_weight = patch.actualWeight;
    }
    if (patch.rate !== undefined) dbPatch.rate = patch.rate;
    if (patch.amount !== undefined) dbPatch.amount = patch.amount;
    const { data, error } = await supabase.from("vip_entries").update(dbPatch).eq("id", id).select().single();
    if (error) { console.error("Failed to update vip entry:", error); throw error; }
    if (data) setVipEntries((prev) => prev.map((e) => (e.id === id ? mapVip(data) : e)));
    const { logAuditEvent } = await import("@/utils/auditLog");
    await logAuditEvent({ tableName: "vip_entries", recordId: id, action: "update", oldData: existing as any, newData: data as any, changedByName: await getActorName() });
  }, [vipEntries]);

  const updateSalesEntry = useCallback(async (id: string, patch: Partial<SalesEntry>) => {
    const existing = salesEntries.find((e) => e.id === id);
    const dbPatch: any = {};
    if (patch.customerName !== undefined) dbPatch.customer_name = patch.customerName;
    if (patch.commodity !== undefined) dbPatch.commodity = patch.commodity;
    if (patch.weight !== undefined) dbPatch.weight = patch.weight;
    if (patch.rate !== undefined) dbPatch.rate = patch.rate;
    if (patch.amount !== undefined) dbPatch.amount = patch.amount;
    const { data, error } = await supabase.from("sales_entries").update(dbPatch).eq("id", id).select().single();
    if (error) { console.error("Failed to update sales entry:", error); throw error; }
    if (data) setSalesEntries((prev) => prev.map((e) => (e.id === id ? mapSales(data) : e)));
    const { logAuditEvent } = await import("@/utils/auditLog");
    await logAuditEvent({ tableName: "sales_entries", recordId: id, action: "update", oldData: existing as any, newData: data as any, changedByName: await getActorName() });
  }, [salesEntries]);

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
      if (e.commodity && !e.isExchange) {
        // "Special" sales physically deduct from "Heavy" stock.
        const stockCommodity = resolveStockCommodity(e.commodity);
        updates[stockCommodity] = (updates[stockCommodity] || 0) - e.weight;
      }
    });

    // Upsert each commodity delta into persistent_stock
    const company_id = await (await import("@/utils/getCompanyId")).getCompanyId();
    for (const [commodity, delta] of Object.entries(updates)) {
      const currentWeight = persistentStock[commodity] || 0;
      const newWeight = currentWeight + delta;
      await supabase.from("persistent_stock").upsert(
        { commodity, weight: newWeight, updated_at: new Date().toISOString(), company_id },
        { onConflict: "commodity,company_id" }
      );
    }

    // Clear local display of daily entries
    setAgentEntries([]);
    setVipEntries([]);
    setSalesEntries([]);

    // Immediately refresh persistent stock so Current Stock stays accurate
    await fetchPersistentStock();
  }, [agentEntries, vipEntries, salesEntries, persistentStock, fetchPersistentStock]);

  return (
    <InventoryContext.Provider value={{ agentEntries, vipEntries, salesEntries, persistentStock, loading, addAgentEntry, addVipEntry, addSalesEntry, removeAgentEntry, removeVipEntry, removeSalesEntry, clearAll, refresh: fetchToday }}>
      {children}
    </InventoryContext.Provider>
  );
};
