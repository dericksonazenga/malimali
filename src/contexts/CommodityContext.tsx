import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Commodity } from "@/types";
import { toast } from "sonner";

interface CommodityContextType {
  commodities: Commodity[];
  loading: boolean;
  addCommodity: (c: Commodity) => Promise<void>;
  updateCommodity: (id: string, updates: Partial<Commodity>) => Promise<void>;
  deleteCommodity: (id: string) => Promise<void>;
}

const CommodityContext = createContext<CommodityContextType | null>(null);

export const useCommodities = () => {
  const ctx = useContext(CommodityContext);
  if (!ctx) throw new Error("useCommodities must be used within CommodityProvider");
  return ctx;
};

const mapRow = (row: any): Commodity => ({
  id: row.id,
  name: row.name,
  agentRate: Number(row.agent_rate),
  vipRate: Number(row.vip_rate),
  salesRate: Number(row.sales_rate),
});

export const CommodityProvider = ({ children }: { children: ReactNode }) => {
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCommodities = useCallback(async () => {
    const { data, error } = await supabase
      .from("commodities")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Failed to fetch commodities:", error);
      return;
    }
    setCommodities((data || []).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCommodities();

    const channel = supabase
      .channel(`commodities-rt-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "commodities" }, () => {
        fetchCommodities();
      })
      .subscribe();

    // Re-fetch when auth state changes (e.g. user signs in)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        fetchCommodities();
      }
    });

    return () => {
      supabase.removeChannel(channel);
      subscription.unsubscribe();
    };
  }, [fetchCommodities]);

  const addCommodity = useCallback(async (c: Commodity) => {
    const company_id = await (await import("@/utils/getCompanyId")).getCompanyId();
    const { error } = await supabase.from("commodities").insert({
      name: c.name,
      agent_rate: c.agentRate,
      vip_rate: c.vipRate,
      sales_rate: c.salesRate,
      company_id,
    });
    if (error) {
      toast.error("Failed to add commodity");
      console.error(error);
      return;
    }
    await fetchCommodities();
  }, [fetchCommodities]);

  const updateCommodity = useCallback(async (id: string, updates: Partial<Commodity>) => {
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.agentRate !== undefined) dbUpdates.agent_rate = updates.agentRate;
    if (updates.vipRate !== undefined) dbUpdates.vip_rate = updates.vipRate;
    if (updates.salesRate !== undefined) dbUpdates.sales_rate = updates.salesRate;

    const { error } = await supabase.from("commodities").update(dbUpdates).eq("id", id);
    if (error) {
      toast.error("Failed to update commodity");
      console.error(error);
      return;
    }
    await fetchCommodities();
  }, [fetchCommodities]);

  const deleteCommodity = useCallback(async (id: string) => {
    const { error } = await supabase.from("commodities").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete commodity");
      console.error(error);
      return;
    }
    await fetchCommodities();
  }, [fetchCommodities]);

  return (
    <CommodityContext.Provider value={{ commodities, loading, addCommodity, updateCommodity, deleteCommodity }}>
      {children}
    </CommodityContext.Provider>
  );
};
