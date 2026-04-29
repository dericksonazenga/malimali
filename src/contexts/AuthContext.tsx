import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { User, UserRole, Permission } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  companyId: string | null;
  isSystemAdmin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, displayName: string, role?: UserRole) => Promise<string | null>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ALL_PERMISSIONS: Permission[] = [
  "view_dashboard", "view_data_entry", "data_entry", "view_debts", "view_messages", "view_my_info", "view_settings",
  "update_rates", "delete_entries", "view_reports", "view_financial_report",
  "manage_workers", "manage_expenses", "manage_inventory", "adjust_stock",
  "delete_agent_vip_entries", "delete_sales_entries", "delete_expenses", "delete_debts",
  "delete_rates", "manage_debts", "edit_records", "view_savings", "manage_savings",
  "edit_savings", "withdraw_savings", "delete_savings", "pay_debts", "edit_debts", "delete_history",
  "end_of_day",
];

const USER_ROLES: string[] = ["admin", "accountant", "data_manager", "human_resource", "cashier", "boss"];

const SESSION_CACHE_KEY = "malimali_user_cache";
const MANUAL_LOGOUT_KEY = "malimali_manual_logout";

// Persistent cache: lives in localStorage so it survives tab close, browser
// restart, and background suspension. Only cleared on MANUAL logout.
const cacheUser = (user: User | null, companyId: string | null) => {
  if (user) {
    try {
      localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ user, companyId, ts: Date.now() }));
    } catch {}
  } else {
    localStorage.removeItem(SESSION_CACHE_KEY);
    sessionStorage.removeItem(SESSION_CACHE_KEY);
  }
};

const getCachedUser = (): { user: User; companyId: string | null } | null => {
  try {
    // Prefer long-lived localStorage; fall back to legacy sessionStorage entries.
    const raw = localStorage.getItem(SESSION_CACHE_KEY) || sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { user: parsed.user, companyId: parsed.companyId };
  } catch {
    return null;
  }
};

const clearCachedUser = () => {
  try {
    localStorage.removeItem(SESSION_CACHE_KEY);
    sessionStorage.removeItem(SESSION_CACHE_KEY);
  } catch {}
};

const fetchRolePermissions = async (role: UserRole, companyId: string | null): Promise<Permission[]> => {
  if (role === "admin") return ALL_PERMISSIONS;
  let q = supabase.from("role_permissions").select("permission").eq("role", role);
  if (companyId) q = q.eq("company_id", companyId);
  const { data, error } = await q;
  if (error || !data || data.length === 0) return [];
  return data.map((r: any) => r.permission as Permission);
};

const buildUser = async (profile: { user_id: string; display_name: string; role: string; company_id?: string | null }): Promise<User> => {
  const role = (profile.role || "boss") as UserRole;
  const permissions = await fetchRolePermissions(role, profile.company_id ?? null);
  return {
    id: profile.user_id,
    name: profile.display_name || "User",
    email: "",
    role,
    permissions,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const cached = getCachedUser();
  const [user, setUser] = useState<User | null>(cached?.user ?? null);
  const [loading, setLoading] = useState(!cached);
  const [companyId, setCompanyId] = useState<string | null>(cached?.companyId ?? null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const currentUserIdRef = useRef<string | null>(cached?.user?.id ?? null);

  const fetchProfile = async (supabaseUser: SupabaseUser) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, role, company_id")
      .eq("user_id", supabaseUser.id)
      .single();

    const { data: sysAdmin } = await supabase.rpc("is_system_admin", { _user_id: supabaseUser.id });
    setIsSystemAdmin(!!sysAdmin);

    if (error || !data) {
      console.error("Profile fetch error:", error);
      const metadataRole = supabaseUser.user_metadata?.role as string | undefined;
      const fallbackRole = USER_ROLES.includes(metadataRole as UserRole)
        ? (metadataRole as UserRole)
        : "boss";

      const fallbackUser: User = {
        id: supabaseUser.id,
        name:
          (supabaseUser.user_metadata?.display_name as string | undefined) ||
          supabaseUser.email?.split("@")[0] ||
          "User",
        email: supabaseUser.email || "",
        role: fallbackRole,
        permissions: fallbackRole === "admin" ? ALL_PERMISSIONS : [],
      };
      setUser(fallbackUser);
      cacheUser(fallbackUser, null);
      return;
    }

    setCompanyId(data.company_id);
    const u = await buildUser(data);
    u.email = supabaseUser.email || "";
    setUser(u);
    cacheUser(u, data.company_id);
  };

  useEffect(() => {
    let isMounted = true;

    const hydrateFromSession = async (sessionUser: SupabaseUser | null) => {
      if (!isMounted) return;

      if (!sessionUser) {
        // No active session at boot. Only fully sign out if the user manually
        // logged out previously. Otherwise keep the cached user visible so the
        // app remains usable while Supabase silently restores the session.
        const manualLogout = localStorage.getItem(MANUAL_LOGOUT_KEY) === "1";
        if (manualLogout) {
          currentUserIdRef.current = null;
          setUser(null);
          setLoading(false);
          cacheUser(null, null);
        } else {
          setLoading(false);
        }
        return;
      }

      currentUserIdRef.current = sessionUser.id;
      await fetchProfile(sessionUser);
      if (isMounted) setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      // Only honour SIGNED_OUT when the user explicitly logged out. Background
      // tab suspension, network blips, or expired-token retries can also fire
      // SIGNED_OUT — we ignore those to keep the session stable until manual
      // logout.
      if (event === "SIGNED_OUT") {
        const manualLogout = localStorage.getItem(MANUAL_LOGOUT_KEY) === "1";
        if (!manualLogout) return;
        currentUserIdRef.current = null;
        setUser(null);
        setLoading(false);
        cacheUser(null, null);
        void import("@/utils/getCompanyId").then((m) => m.clearCompanyIdCache());
        return;
      }

      if (!session?.user) return;

      // TOKEN_REFRESHED is the most common event in long-lived sessions and
      // should NOT trigger a profile re-fetch — the user/permissions haven't
      // changed. This avoids unnecessary network work in background tabs.
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        currentUserIdRef.current = session.user.id;
        return;
      }

      // If the signed-in user changed, clear the company cache so the new user
      // doesn't inherit the previous user's company_id.
      if (currentUserIdRef.current && currentUserIdRef.current !== session.user.id) {
        void import("@/utils/getCompanyId").then((m) => m.clearCompanyIdCache());
      }
      currentUserIdRef.current = session.user.id;
      setTimeout(() => {
        void fetchProfile(session.user);
      }, 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      void hydrateFromSession(session?.user ?? null);
    });

    // Realtime listener for profile and permission changes
    const channelName = `auth-profile-sync-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, async (payload) => {
        if (currentUserIdRef.current && payload.new && (payload.new as any).user_id === currentUserIdRef.current) {
          clearCachedUser();
          const session = (await supabase.auth.getSession()).data.session;
          if (session?.user) {
            fetchProfile(session.user);
          }
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "role_permissions" }, async () => {
        if (currentUserIdRef.current) {
          clearCachedUser();
          const session = (await supabase.auth.getSession()).data.session;
          if (session?.user) {
            fetchProfile(session.user);
          }
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_roles" }, async () => {
        if (currentUserIdRef.current) {
          clearCachedUser();
          const session = (await supabase.auth.getSession()).data.session;
          if (session?.user) {
            fetchProfile(session.user);
          }
        }
      })
      .subscribe();

    // No visibility-based re-fetch. Background tabs should NOT trigger work —
    // this keeps the app stable when running in the background and prevents
    // the "auto sign-out" feeling on return.

    return () => {
      isMounted = false;
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
    // Clear the manual-logout flag so the session is treated as active.
    localStorage.removeItem(MANUAL_LOGOUT_KEY);
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
    localStorage.removeItem(MANUAL_LOGOUT_KEY);
    return null;
  };

  const logout = async () => {
    // Mark BEFORE calling signOut so the auth listener knows this is intentional.
    localStorage.setItem(MANUAL_LOGOUT_KEY, "1");
    await supabase.auth.signOut();
    setUser(null);
    setCompanyId(null);
    setIsSystemAdmin(false);
    cacheUser(null, null);
    (await import("@/utils/getCompanyId")).clearCompanyIdCache();
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (permission === "__admin_only__") return user.role === "admin";
    return user.permissions.includes(permission as Permission);
  };

  return (
    <AuthContext.Provider value={{ user, loading, companyId, isSystemAdmin, login, signup, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be within AuthProvider");
  return ctx;
};
