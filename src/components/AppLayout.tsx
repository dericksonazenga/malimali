import { ReactNode, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Settings2,
  Users, Wallet, Package, LogOut, Menu, X, Recycle, ChevronRight, Cog,
  ShieldCheck, Calculator, Banknote, BarChart3, MessageSquare, Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  { label: "Inventory", path: "/inventory", icon: <Package className="w-5 h-5" /> },
  { label: "Expenses", path: "/expenses", icon: <Wallet className="w-5 h-5" /> },
  { label: "Workers", path: "/workers", icon: <Users className="w-5 h-5" /> },
  { label: "Salary", path: "/salary", icon: <Banknote className="w-5 h-5" /> },
  { label: "Financial Report", path: "/financial-report", icon: <BarChart3 className="w-5 h-5" />, permission: "view_reports" },
  { label: "Messages", path: "/messages", icon: <MessageSquare className="w-5 h-5" /> },
  { label: "Attendance", path: "/attendance", icon: <Fingerprint className="w-5 h-5" /> },
  { label: "Settings", path: "/settings", icon: <Cog className="w-5 h-5" /> },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNav = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  const roleBadge = user?.role === "admin" ? "Admin" : user?.role === "accountant" ? "Accountant" : user?.role === "data_manager" ? "Data Manager" : "Worker";

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
        <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border">
          <Recycle className="w-7 h-7 text-primary shrink-0" />
          <span className="text-lg font-bold text-sidebar-foreground">
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

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const active = location.pathname === item.path || (item.path === "/data-entry" && location.pathname.startsWith("/data-entry"));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                {item.icon}
                {item.label}
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {user?.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{roleBadge}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={logout}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-card border-b border-border flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold truncate">
            {filteredNav.find((n) => n.path === location.pathname)?.label || "Dashboard"}
          </h2>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto animate-fade-in">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
