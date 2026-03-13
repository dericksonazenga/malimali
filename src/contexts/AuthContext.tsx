import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, UserRole, Permission } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// Fallback used only if DB has no entries for a role
const ROLE_PERMISSIONS_FALLBACK: Record<UserRole, Permission[]> = {
  admin: ["update_rates", "delete_entries", "view_reports", "manage_workers", "manage_expenses", "manage_inventory", "adjust_stock", "delete_agent_vip_entries", "delete_sales_entries", "delete_expenses", "delete_rates", "manage_debts", "edit_records"],
  accountant: ["view_reports", "manage_expenses", "manage_workers"],
  data_manager: ["update_rates", "delete_entries", "manage_inventory"],
  human_resource: ["manage_workers"],
  cashier: ["manage_expenses", "view_reports"],
  boss: [],
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, displayName: string, role?: UserRole) => Promise<string | null>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const fetchRolePermissions = async (role: UserRole): Promise<Permission[]> => {
  const { data, error } = await supabase
    .from("role_permissions")
    .select("permission")
    .eq("role", role);
  if (error || !data || data.length === 0) return ROLE_PERMISSIONS_FALLBACK[role] || [];
  return data.map((r: any) => r.permission as Permission);
};

const buildUser = async (profile: { user_id: string; display_name: string; role: string }): Promise<User> => {
  const role = (profile.role || "boss") as UserRole;
  const permissions = await fetchRolePermissions(role);
  return {
    id: profile.user_id,
    name: profile.display_name || "User",
    email: "",
    role,
    permissions,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (supabaseUser: SupabaseUser) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, role")
      .eq("user_id", supabaseUser.id)
      .single();

    if (error || !data) {
      console.error("Profile fetch error:", error);
      setUser(null);
    } else {
      const u = await buildUser(data);
      u.email = supabaseUser.email || "";
      setUser(u);
    }
  };

  useEffect(() => {
    let currentUserId: string | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        currentUserId = session.user.id;
        setTimeout(() => fetchProfile(session.user), 0);
      } else {
        currentUserId = null;
        setUser(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        currentUserId = session.user.id;
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Realtime listener for profile changes (e.g. role updated by admin)
    const channel = supabase
      .channel("auth-profile-sync")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, async (payload) => {
        if (currentUserId && payload.new && (payload.new as any).user_id === currentUserId) {
          const session = (await supabase.auth.getSession()).data.session;
          if (session?.user) {
            fetchProfile(session.user);
          }
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("Login error:", error.message);
      return false;
    }
    return true;
  };

  const signup = async (email: string, password: string, displayName: string, role: UserRole = "boss"): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName, role },
      },
    });
    if (error) return error.message;
    return null;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    return user.permissions.includes(permission as Permission);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be within AuthProvider");
  return ctx;
};
