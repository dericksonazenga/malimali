import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CategoryLabels {
  agent: string;
  vip: string;
  sales: string;
}

interface CategoryLabelsContextType {
  labels: CategoryLabels;
  loading: boolean;
  updateLabels: (labels: Partial<CategoryLabels>) => Promise<void>;
}

const defaults: CategoryLabels = { agent: "Agent", vip: "VIP", sales: "Sales" };

const CategoryLabelsContext = createContext<CategoryLabelsContextType>({
  labels: defaults,
  loading: true,
  updateLabels: async () => {},
});

export const useCategoryLabels = () => useContext(CategoryLabelsContext);

export const CategoryLabelsProvider = ({ children }: { children: ReactNode }) => {
  const { user, companyId } = useAuth();
  const [labels, setLabels] = useState<CategoryLabels>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["label_agent", "label_vip", "label_sales"]);

      if (data && data.length > 0) {
        const map: Record<string, string> = {};
        data.forEach((r) => { map[r.key] = r.value; });
        setLabels({
          agent: map["label_agent"] || defaults.agent,
          vip: map["label_vip"] || defaults.vip,
          sales: map["label_sales"] || defaults.sales,
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user, companyId]);

  const updateLabels = async (updates: Partial<CategoryLabels>) => {
    const cid = companyId || (await (await import("@/utils/getCompanyId")).getCompanyId());
    const entries = Object.entries(updates) as [keyof CategoryLabels, string][];
    const keyMap: Record<keyof CategoryLabels, string> = {
      agent: "label_agent",
      vip: "label_vip",
      sales: "label_sales",
    };

    for (const [field, value] of entries) {
      const dbKey = keyMap[field];
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", dbKey)
        .single();

      if (existing) {
        await supabase.from("app_settings").update({ value }).eq("id", existing.id);
      } else {
        await supabase.from("app_settings").insert({ key: dbKey, value, company_id: cid });
      }
    }

    setLabels((prev) => ({ ...prev, ...updates }));
  };

  return (
    <CategoryLabelsContext.Provider value={{ labels, loading, updateLabels }}>
      {children}
    </CategoryLabelsContext.Provider>
  );
};
