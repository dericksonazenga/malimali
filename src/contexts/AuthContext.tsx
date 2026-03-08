import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, UserRole, Permission } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ["update_rates", "delete_entries", "view_reports", "manage_workers", "manage_expenses", "manage_inventory"],
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
  signup: (email: string, password: string, displayName: string) => Promise<string | null>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const buildUser = (profile: { user_id: string; display_name: string; role: string }): User => {
  const role = (profile.role || "worker") as UserRole;
  return {
    id: profile.user_id,
    name: profile.display_name || "User",
    email: "",
    role,
    permissions: ROLE_PERMISSIONS[role] || [],
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
      const u = buildUser(data);
      u.email = supabaseUser.email || "";
      setUser(u);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Use setTimeout to avoid potential deadlock with Supabase client
        setTimeout(() => fetchProfile(session.user), 0);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("Login error:", error.message);
      return false;
    }
    return true;
  };

  const signup = async (email: string, password: string, displayName: string): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName },
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
    if (user.role === "admin") return true;
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
