import { supabase } from "@/integrations/supabase/client";

let cachedCompanyId: string | null = null;

export const clearCompanyIdCache = () => {
  cachedCompanyId = null;
};

export const getCompanyId = async (): Promise<string> => {
  if (cachedCompanyId) return cachedCompanyId;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("user_id", user.id)
    .single();

  if (error || !data) throw new Error("Could not resolve company");
  cachedCompanyId = data.company_id;
  return cachedCompanyId;
};
