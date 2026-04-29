import { useState, useEffect } from "react";
import { useCommodities } from "@/contexts/CommodityContext";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Package, Wallet, FileText, Star, ShoppingCart, Settings, CreditCard, ArrowDownCircle, ArrowUpCircle, Users, Receipt } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useInventory } from "@/contexts/InventoryContext";
import { useCategoryLabels } from "@/contexts/CategoryLabelsContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyStatus } from "@/hooks/useCompanyStatus";
import DeactivationBanner from "@/components/DeactivationBanner";

const StatCard = ({ title, value, subtitle, icon, color, onClick }: { title: string; value: string; subtitle?: string; icon: React.ReactNode; color: string; onClick?: () => void }) => (
  <Card className={cn("animate-fade-in transition-all active:scale-[0.98]", onClick && "cursor-pointer hover:ring-2 hover:ring-primary/30")} onClick={onClick}>
    <CardContent className="p-3 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] sm:text-sm text-muted-foreground leading-tight truncate">{title}</p>
          <p className={`text-[11px] sm:text-sm font-bold font-mono mt-0.5 sm:mt-1 whitespace-nowrap overflow-x-auto scrollbar-none ${color}`}>{value}</p>
          {subtitle && <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="p-2 sm:p-2.5 rounded-lg bg-accent shrink-0">{icon}</div>
      </div>
    </CardContent>
  </Card>
);

const DashboardPage = () => {
  const { user, hasPermission, companyId } = useAuth();
  const { commodities } = useCommodities();
  const { symbol } = useCurrency();
  const { agentEntries, vipEntries, salesEntries, persistentStock } = useInventory();
  const { labels } = useCategoryLabels();
  const navigate = useNavigate();
  const { isActive: companyActive } = useCompanyStatus();
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  // Debt summary state
  const [debtSummary, setDebtSummary] = useState({ totalOutstanding: 0, advance: 0, debt: 0, creditors: 0 });

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
      .channel(`company-branding-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "companies", filter: `id=eq.${companyId}` }, (payload: any) => {
        if (payload.new?.name) setCompanyName(payload.new.name);
        setCompanyLogo(payload.new?.logo_url ?? null);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [companyId]);

  useEffect(() => {
    const fetchExpenses = async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const { data: eodData } = await supabase
        .from("end_of_day_log")
        .select("triggered_at")
        .eq("date", todayStr)
        .order("triggered_at", { ascending: false })
        .limit(1);
      const lastEod = eodData?.[0]?.triggered_at;
      let query = supabase.from("expenses").select("amount").eq("date", todayStr);
      if (lastEod) query = query.gt("created_at", lastEod);
      const { data } = await query;
      if (data) {
        setExpenseTotal(data.reduce((s: number, e: any) => s + Number(e.amount), 0));
        setExpenseCount(data.length);
      }
    };

    const fetchDebtSummary = async () => {
      const [{ data: debts }, { data: creds }] = await Promise.all([
        supabase.from("debts").select("balance, status"),
        supabase.from("creditors").select("balance, status"),
      ]);
      const advance = (debts || []).filter((d: any) => d.status === "unpaid").reduce((s: number, d: any) => s + Number(d.balance), 0);
      const debt = (debts || []).filter((d: any) => d.status === "money_out").reduce((s: number, d: any) => s + Number(d.balance), 0);
      const creditorTotal = (creds || []).filter((c: any) => c.status !== "paid").reduce((s: number, c: any) => s + Number(c.balance), 0);
      setDebtSummary({ totalOutstanding: advance + debt, advance, debt, creditors: creditorTotal });
    };

    fetchExpenses();
    fetchDebtSummary();

    const channel = supabase
      .channel(`dashboard-rt-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => fetchExpenses())
      .on("postgres_changes", { event: "*", schema: "public", table: "end_of_day_log" }, () => fetchExpenses())
      .on("postgres_changes", { event: "*", schema: "public", table: "debts" }, () => fetchDebtSummary())
      .on("postgres_changes", { event: "*", schema: "public", table: "creditors" }, () => fetchDebtSummary())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const agentTotal = agentEntries.reduce((s, e) => s + e.amount, 0);
  const vipTotal = vipEntries.reduce((s, e) => s + e.amount, 0);
  const salesTotalAmount = salesEntries.reduce((s, e) => s + (e.amount || 0), 0);

  const stockIn = agentEntries.reduce((s, e) => s + e.actualWeight, 0) + vipEntries.reduce((s, e) => s + e.actualWeight, 0);
  const stockOut = salesEntries.reduce((s, e) => s + e.weight, 0);
  const persistentTotal = Object.values(persistentStock).reduce((s, v) => s + v, 0);
  const currentStock = persistentTotal + stockIn - stockOut;

  const canViewDebts = hasPermission("view_debts") || user?.role === "admin";

  const totalPurchaseTickets = agentEntries.length + vipEntries.length;

  if (!companyActive) {
    return (
      <div className="space-y-3 sm:space-y-4 lg:space-y-6 max-w-6xl">
        <div className="flex items-center gap-3">
          {companyLogo && (
            <img src={companyLogo} alt={companyName} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-contain bg-accent border border-border p-1 shrink-0" />
          )}
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">Welcome to {companyName || "Dashboard"}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Limited view — account deactivated</p>
          </div>
        </div>

        <DeactivationBanner />

        <Card className="max-w-md">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Receipt className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Purchase Tickets</p>
              <p className="text-3xl font-bold font-mono">{totalPurchaseTickets.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Detailed breakdown hidden while deactivated.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        {companyLogo && (
          <img src={companyLogo} alt={companyName} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-contain bg-accent border border-border p-1 shrink-0" />
        )}
        <div>
          <h1 className="text-lg sm:text-2xl font-bold">Welcome to {companyName || "Dashboard"}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Here's your business overview</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
        <StatCard title={`${labels.agent} Purchases`} value={`${symbol}${agentTotal.toLocaleString()}`} subtitle={`${agentEntries.length} entries`} icon={<FileText className="w-5 h-5 text-info" />} color="text-info" onClick={hasPermission("view_data_entry") ? () => navigate("/data-entry?tab=agent") : undefined} />
        <StatCard title={`${labels.vip} Purchases`} value={`${symbol}${vipTotal.toLocaleString()}`} subtitle={`${vipEntries.length} entries`} icon={<Star className="w-5 h-5 text-primary" />} color="text-primary" onClick={hasPermission("view_data_entry") ? () => navigate("/data-entry?tab=vip") : undefined} />
        <StatCard title="Total Purchases" value={`${symbol}${(agentTotal + vipTotal).toLocaleString()}`} subtitle={`${agentEntries.length + vipEntries.length} entries`} icon={<TrendingDown className="w-5 h-5 text-orange-500" />} color="text-foreground" />
        <StatCard title={labels.sales} value={`${symbol}${salesTotalAmount.toLocaleString()}`} subtitle={`${salesEntries.length} entries`} icon={<ShoppingCart className="w-5 h-5 text-success" />} color="text-success" onClick={hasPermission("view_data_entry") ? () => navigate("/data-entry?tab=sales") : undefined} />
        <StatCard title="Expenses" value={`${symbol}${expenseTotal.toLocaleString()}`} subtitle={`${expenseCount} records`} icon={<Wallet className="w-5 h-5 text-destructive" />} color="text-destructive" onClick={hasPermission("manage_expenses") ? () => navigate("/expenses") : undefined} />
      </div>

      {/* Debt Summary Tickets */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-lg"><CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Debt Overview</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div
              className={cn("p-2.5 sm:p-3 rounded-lg bg-red-500/10 border border-red-500/20 transition-all active:scale-[0.98] min-w-0", canViewDebts && "cursor-pointer hover:ring-2 hover:ring-red-500/30")}
              onClick={canViewDebts ? () => navigate("/debts") : undefined}
            >
              <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1"><ArrowDownCircle className="w-3 h-3 shrink-0" /> Advance</p>
              <p className="text-xs sm:text-base font-bold font-mono whitespace-nowrap overflow-x-auto scrollbar-none">{symbol}{debtSummary.advance.toLocaleString()}</p>
            </div>
            <div
              className={cn("p-2.5 sm:p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 transition-all active:scale-[0.98] min-w-0", canViewDebts && "cursor-pointer hover:ring-2 hover:ring-orange-500/30")}
              onClick={canViewDebts ? () => navigate("/debts") : undefined}
            >
              <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1"><ArrowUpCircle className="w-3 h-3 shrink-0" /> Debtors</p>
              <p className="text-xs sm:text-base font-bold font-mono whitespace-nowrap overflow-x-auto scrollbar-none">{symbol}{debtSummary.debt.toLocaleString()}</p>
            </div>
            <div
              className={cn("p-2.5 sm:p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 transition-all active:scale-[0.98] min-w-0", canViewDebts && "cursor-pointer hover:ring-2 hover:ring-purple-500/30")}
              onClick={canViewDebts ? () => navigate("/debts") : undefined}
            >
              <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3 shrink-0" /> Creditors</p>
              <p className="text-xs sm:text-base font-bold font-mono whitespace-nowrap overflow-x-auto scrollbar-none">{symbol}{debtSummary.creditors.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <Card className={cn("transition-all active:scale-[0.99]", hasPermission("manage_inventory") && "cursor-pointer hover:ring-2 hover:ring-primary/30")} onClick={hasPermission("manage_inventory") ? () => navigate("/inventory") : undefined}>
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base"><Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Inventory Overview</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="text-center p-2.5 sm:p-4 rounded-lg bg-accent">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mx-auto text-success mb-0.5 sm:mb-1" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Stock In</p>
                <p className="text-sm sm:text-lg font-bold font-mono">{stockIn.toLocaleString()} kg</p>
              </div>
              <div className="text-center p-2.5 sm:p-4 rounded-lg bg-accent">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 mx-auto text-destructive mb-0.5 sm:mb-1" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Stock Out</p>
                <p className="text-sm sm:text-lg font-bold font-mono">{stockOut.toLocaleString()} kg</p>
              </div>
              <div className="text-center p-2.5 sm:p-4 rounded-lg bg-primary/10">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 mx-auto text-primary mb-0.5 sm:mb-1" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Current</p>
                <p className="text-sm sm:text-lg font-bold font-mono text-primary">{currentStock.toLocaleString()} kg</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("transition-all active:scale-[0.99]", hasPermission("update_rates") && "cursor-pointer hover:ring-2 hover:ring-primary/30")} onClick={hasPermission("update_rates") ? () => navigate("/rates") : undefined}>
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base"><Settings className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Current Rates</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="touch-scroll-y max-h-[260px] sm:max-h-[320px] overflow-y-auto pr-1 -mr-1 space-y-2 sm:space-y-3 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {commodities.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-1.5 sm:py-2 border-b border-border last:border-0">
                  <span className="font-medium text-xs sm:text-sm">{c.name}</span>
                   <div className="flex flex-wrap gap-x-2 sm:gap-x-3 gap-y-0.5 text-[10px] sm:text-sm font-mono justify-end">
                     <span className="text-muted-foreground whitespace-nowrap">{labels.agent[0]}: {symbol}{c.agentRate}</span>
                     <span className="text-primary whitespace-nowrap">{labels.vip[0]}: {symbol}{c.vipRate}</span>
                     <span className="text-success whitespace-nowrap">{labels.sales[0]}: {symbol}{c.salesRate}</span>
                  </div>
                </div>
              ))}
              {commodities.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No commodities yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
