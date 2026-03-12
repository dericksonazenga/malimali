import { ReactNode, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Settings2,
  Users, Wallet, Package, LogOut, Menu, X, Recycle, ChevronRight, Cog,
  ShieldCheck, Calculator, Banknote, BarChart3, MessageSquare, ClipboardList, FileBarChart, UserCircle, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import EndOfDayButton from "@/components/EndOfDayButton";

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  permission?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/", icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: "Admin", path: "/admin", icon: <ShieldCheck className="w-5 h-5" />, permission: "manage_workers" },
  { label: "Accountant", path: "/accountant", icon: <Calculator className="w-5 h-5" />, permission: "view_reports" },
  { label: "Data Entry", path: "/data-entry", icon: <FileText className="w-5 h-5" /> },
  { label: "Rates", path: "/rates", icon: <Settings2 className="w-5 h-5" />, permission: "update_rates" },
  { label: "Inventory", path: "/inventory", icon: <Package className="w-5 h-5" />, permission: "manage_inventory" },
  { label: "Expenses", path: "/expenses", icon: <Wallet className="w-5 h-5" />, permission: "manage_expenses" },
  { label: "Debts", path: "/debts", icon: <CreditCard className="w-5 h-5" /> },
  { label: "Workers", path: "/workers", icon: <Users className="w-5 h-5" />, permission: "manage_workers" },
  { label: "Salary", path: "/salary", icon: <Banknote className="w-5 h-5" />, permission: "manage_workers" },
  { label: "Financial Report", path: "/financial-report", icon: <BarChart3 className="w-5 h-5" />, permission: "view_reports" },
  { label: "Daily Summaries", path: "/daily-summaries", icon: <FileBarChart className="w-5 h-5" />, permission: "view_reports" },
  { label: "Messages", path: "/messages", icon: <MessageSquare className="w-5 h-5" /> },
  { label: "Attendance", path: "/attendance", icon: <ClipboardList className="w-5 h-5" />, permission: "manage_workers" },
  { label: "My Info", path: "/my-info", icon: <UserCircle className="w-5 h-5" /> },
  { label: "Settings", path: "/settings", icon: <Cog className="w-5 h-5" /> },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNav = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

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
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-3 px-5 h-14 border-b border-sidebar-border shrink-0">
          <Recycle className="w-6 h-6 text-primary shrink-0" />
          <span className="text-base font-bold text-sidebar-foreground">
            Scrap<span className="text-primary">Flow</span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden text-sidebar-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
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
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
                {active && <ChevronRight className="w-4 h-4 ml-auto shrink-0" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
              {user?.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{roleBadge}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8 text-xs"
            onClick={logout}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-card border-b border-border flex items-center px-3 lg:px-6 gap-3 sticky top-0 z-30 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h2 className="text-base font-semibold truncate">
            {filteredNav.find((n) => n.path === location.pathname)?.label || "Dashboard"}
          </h2>
          <div className="ml-auto shrink-0">
            <EndOfDayButton />
          </div>
        </header>
        <main className="flex-1 p-3 lg:p-6 overflow-auto animate-fade-in">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
