import { ReactNode, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, Settings2,
  Users, Wallet, Package, LogOut, Menu, X, Recycle, ChevronRight, Cog,
  ShieldCheck, Calculator, Banknote, BarChart3, MessageSquare, ClipboardList, FileBarChart, UserCircle, CreditCard, ArrowLeft, PanelLeftClose, PanelLeft, PiggyBank, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import EndOfDayButton from "@/components/EndOfDayButton";
import ThemeToggle from "@/components/ThemeToggle";

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  permission?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/", icon: <LayoutDashboard className="w-5 h-5" />, permission: "view_dashboard" },
  { label: "Admin", path: "/admin", icon: <ShieldCheck className="w-5 h-5" />, permission: "__admin_only__" },
  { label: "Accountant", path: "/accountant", icon: <Calculator className="w-5 h-5" />, permission: "view_accountant" },
  { label: "Data Entry", path: "/data-entry", icon: <FileText className="w-5 h-5" />, permission: "view_data_entry" },
  { label: "Rates", path: "/rates", icon: <Settings2 className="w-5 h-5" />, permission: "update_rates" },
  { label: "Inventory", path: "/inventory", icon: <Package className="w-5 h-5" />, permission: "manage_inventory" },
  { label: "Expenses", path: "/expenses", icon: <Wallet className="w-5 h-5" />, permission: "manage_expenses" },
  { label: "Debts", path: "/debts", icon: <CreditCard className="w-5 h-5" />, permission: "view_debts" },
  { label: "Savings", path: "/savings", icon: <PiggyBank className="w-5 h-5" />, permission: "view_savings" },
  { label: "Workers", path: "/workers", icon: <Users className="w-5 h-5" />, permission: "manage_workers" },
  { label: "Salary", path: "/salary", icon: <Banknote className="w-5 h-5" />, permission: "manage_workers" },
  { label: "Financial Report", path: "/financial-report", icon: <BarChart3 className="w-5 h-5" />, permission: "view_financial_report" },
  { label: "Daily Summaries", path: "/daily-summaries", icon: <FileBarChart className="w-5 h-5" />, permission: "view_daily_summaries" },
  { label: "Messages", path: "/messages", icon: <MessageSquare className="w-5 h-5" />, permission: "view_messages" },
  { label: "Attendance", path: "/attendance", icon: <ClipboardList className="w-5 h-5" />, permission: "manage_workers" },
  { label: "My Info", path: "/my-info", icon: <UserCircle className="w-5 h-5" />, permission: "view_my_info" },
  { label: "Settings", path: "/settings", icon: <Cog className="w-5 h-5" />, permission: "view_settings" },
  { label: "System Admin", path: "/system-admin", icon: <Building2 className="w-5 h-5" />, permission: "__system_admin__" },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout, hasPermission, isSystemAdmin, companyId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  // Fetch user avatar
  useEffect(() => {
    if (!user) return;
    const fetchAvatar = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("user_id", user.id)
        .single();
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
    };
    fetchAvatar();

    const channel = supabase
      .channel("sidebar-avatar")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` }, (payload: any) => {
        if (payload.new?.avatar_url) setAvatarUrl(payload.new.avatar_url);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Fetch company branding
  useEffect(() => {
    if (!companyId) return;
    const fetchBranding = async () => {
      const { data } = await supabase
        .from("companies")
        .select("name, logo_url")
        .eq("id", companyId)
        .single();
      if (data) {
        setCompanyName(data.name);
        setCompanyLogo(data.logo_url);
      }
    };
    fetchBranding();

    const ch = supabase
      .channel(`sidebar-branding-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "companies", filter: `id=eq.${companyId}` }, (payload: any) => {
        if (payload.new?.name) setCompanyName(payload.new.name);
        setCompanyLogo(payload.new?.logo_url ?? null);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [companyId]);

  const filteredNav = navItems.filter(
    (item) => {
      if (item.permission === "__admin_only__") return user?.role === "admin";
      if (item.permission === "__system_admin__") return isSystemAdmin;
      return !item.permission || hasPermission(item.permission);
    }
  );

  const isHome = location.pathname === "/";

  const roleBadge = user?.role === "admin" ? "Admin" : user?.role === "accountant" ? "Accountant" : user?.role === "data_manager" ? "Data Manager" : user?.role === "human_resource" ? "Human Resource" : user?.role === "cashier" ? "Cashier" : "Boss";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-sidebar flex flex-col transition-all duration-300 lg:translate-x-0 lg:static",
          sidebarCollapsed ? "lg:w-16 w-64" : "w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className={cn("flex items-center h-14 border-b border-sidebar-border shrink-0", sidebarCollapsed ? "px-2 justify-center" : "px-4 gap-2.5")}>
          {companyLogo ? (
            <img src={companyLogo} alt="" className="w-7 h-7 rounded-md object-contain shrink-0" />
          ) : (
            <Recycle className="w-6 h-6 text-primary shrink-0" />
          )}
          {!sidebarCollapsed && (
            <span className="text-sm font-bold text-sidebar-foreground truncate">
              {companyName || "ScrapFlow"}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden text-sidebar-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("hidden lg:flex text-sidebar-foreground/60 hover:text-sidebar-foreground", sidebarCollapsed ? "ml-0" : "ml-auto")}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </Button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {filteredNav.map((item) => {
            const active = location.pathname === item.path || (item.path === "/data-entry" && location.pathname.startsWith("/data-entry"));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all group",
                  sidebarCollapsed ? "px-2 py-2 justify-center" : "px-3 py-2",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                {item.icon}
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                {active && !sidebarCollapsed && <ChevronRight className="w-4 h-4 ml-auto shrink-0" />}
              </Link>
            );
          })}
        </nav>

        <div className={cn("border-t border-sidebar-border shrink-0", sidebarCollapsed ? "p-2" : "p-3")}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  user?.name?.charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{roleBadge}</span>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="flex justify-center mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  user?.name?.charAt(0)
                )}
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            className={cn(
              "w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8 text-xs",
              sidebarCollapsed ? "justify-center px-0" : "justify-start gap-2"
            )}
            onClick={logout}
            title={sidebarCollapsed ? "Sign Out" : undefined}
          >
            <LogOut className="w-3.5 h-3.5" />
            {!sidebarCollapsed && "Sign Out"}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 sm:h-14 bg-card border-b border-border flex items-center px-2 sm:px-3 lg:px-6 gap-1.5 sm:gap-2 sticky top-0 z-30 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0 h-8 w-8"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          {!isHome && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <h2 className="text-sm sm:text-base font-semibold truncate">
            {filteredNav.find((n) => n.path === location.pathname)?.label || "Dashboard"}
          </h2>
          <div className="ml-auto shrink-0 flex items-center gap-1">
            <ThemeToggle />
            <EndOfDayButton />
          </div>
        </header>
        <main className="flex-1 p-2 sm:p-3 lg:p-6 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
