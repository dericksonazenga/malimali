import { supabase } from "@/integrations/supabase/client";

let cachedCompanyId: string | null = null;

export const clearCompanyIdCache = () => {
  cachedCompanyId = null;
};

/** Inject the company ID from AuthContext so pages don't need a DB round-trip. */
export const setCompanyIdCache = (id: string | null) => {
  if (id) cachedCompanyId = id;
};

export const getCompanyId = async (): Promise<string> => {
  if (cachedCompanyId) return cachedCompanyId;

  // Retry up to 3 times with short delays — session may still be hydrating
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", session.user.id)
        .single();

      if (data?.company_id) {
        cachedCompanyId = data.company_id;
        return cachedCompanyId;
      }
    }
    // Wait briefly before retry
    if (attempt < 2) await new Promise(r => setTimeout(r, 300));
  }

  throw new Error("Not authenticated");
};
