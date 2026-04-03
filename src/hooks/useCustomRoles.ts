import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CustomRole {
  id: string;
  role_key: string;
  display_name: string;
  company_id: string;
}

const BUILT_IN_ROLES = [
  { role_key: "admin", display_name: "Admin" },
  { role_key: "accountant", display_name: "Accountant" },
  { role_key: "data_manager", display_name: "Data Manager" },
  { role_key: "human_resource", display_name: "Human Resource" },
  { role_key: "cashier", display_name: "Cashier" },
  { role_key: "boss", display_name: "Boss" },
];

export const BUILT_IN_ROLE_KEYS = BUILT_IN_ROLES.map(r => r.role_key);

export const useCustomRoles = () => {
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from("custom_roles")
      .select("*")
      .order("created_at", { ascending: true });
    if (!error && data) setCustomRoles(data as CustomRole[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRoles();
    const channelName = `custom-roles-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_roles" }, () => fetchRoles())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRoles]);

  const allRoles = [
    ...BUILT_IN_ROLES,
    ...customRoles.map(r => ({ role_key: r.role_key, display_name: r.display_name })),
  ];

  const getRoleLabel = (roleKey: string) => {
    const found = allRoles.find(r => r.role_key === roleKey);
    return found?.display_name || roleKey;
  };

  return { customRoles, allRoles, loading, fetchRoles, getRoleLabel };
};
