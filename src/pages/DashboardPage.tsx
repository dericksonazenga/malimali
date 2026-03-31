import { useState, useEffect } from "react";
import { useCommodities } from "@/contexts/CommodityContext";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Package, Wallet, FileText, Star, ShoppingCart, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useInventory } from "@/contexts/InventoryContext";
import { useCategoryLabels } from "@/contexts/CategoryLabelsContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const StatCard = ({ title, value, subtitle, icon, color, onClick }: { title: string; value: string; subtitle?: string; icon: React.ReactNode; color: string; onClick?: () => void }) => (
  <Card className={cn("animate-fade-in transition-all", onClick && "cursor-pointer hover:ring-2 hover:ring-primary/30")} onClick={onClick}>
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground">{title}</p>
          <p className={`text-lg sm:text-2xl font-bold font-mono mt-1 ${color}`}>{value}</p>
          {subtitle && <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="p-2.5 rounded-lg bg-accent">{icon}</div>
      </div>
    </CardContent>
  </Card>
);

const DashboardPage = () => {
  const { user, hasPermission } = useAuth();
  const { commodities } = useCommodities();
  const { symbol } = useCurrency();
  const { agentEntries, vipEntries, salesEntries, persistentStock } = useInventory();
  const navigate = useNavigate();
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);

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
      if (lastEod) {
        query = query.gt("created_at", lastEod);
      }

      const { data } = await query;
      if (data) {
        setExpenseTotal(data.reduce((s: number, e: any) => s + Number(e.amount), 0));
        setExpenseCount(data.length);
      }
    };
    fetchExpenses();

    const channel = supabase
      .channel("dashboard-expenses-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => fetchExpenses())
      .on("postgres_changes", { event: "*", schema: "public", table: "end_of_day_log" }, () => fetchExpenses())
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

  return (
    <div className="space-y-4 lg:space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Welcome to MaliMali Dashboard</h1>
        <p className="text-muted-foreground">Here's your business overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        <StatCard title={`${labels.agent} Purchases`} value={`${symbol}${agentTotal.toLocaleString()}`} subtitle={`${agentEntries.length} entries`} icon={<FileText className="w-5 h-5 text-info" />} color="text-info" onClick={hasPermission("view_data_entry") ? () => navigate("/data-entry?tab=agent") : undefined} />
        <StatCard title={`${labels.vip} Purchases`} value={`${symbol}${vipTotal.toLocaleString()}`} subtitle={`${vipEntries.length} entries`} icon={<Star className="w-5 h-5 text-primary" />} color="text-primary" onClick={hasPermission("view_data_entry") ? () => navigate("/data-entry?tab=vip") : undefined} />
        <StatCard title="Total Purchases" value={`${symbol}${(agentTotal + vipTotal).toLocaleString()}`} subtitle={`${agentEntries.length + vipEntries.length} entries`} icon={<TrendingDown className="w-5 h-5 text-orange-500" />} color="text-foreground" />
        <StatCard title={labels.sales} value={`${symbol}${salesTotalAmount.toLocaleString()}`} subtitle={`${salesEntries.length} entries`} icon={<ShoppingCart className="w-5 h-5 text-success" />} color="text-success" onClick={hasPermission("view_data_entry") ? () => navigate("/data-entry?tab=sales") : undefined} />
        <StatCard title="Expenses" value={`${symbol}${expenseTotal.toLocaleString()}`} subtitle={`${expenseCount} records`} icon={<Wallet className="w-5 h-5 text-destructive" />} color="text-destructive" onClick={hasPermission("manage_expenses") ? () => navigate("/expenses") : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className={cn("transition-all", hasPermission("manage_inventory") && "cursor-pointer hover:ring-2 hover:ring-primary/30")} onClick={hasPermission("manage_inventory") ? () => navigate("/inventory") : undefined}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> Inventory Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 rounded-lg bg-accent">
                <TrendingUp className="w-5 h-5 mx-auto text-success mb-1" />
                <p className="text-xs text-muted-foreground">Stock In</p>
                <p className="text-lg font-bold font-mono">{stockIn.toLocaleString()} kg</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-accent">
                <TrendingDown className="w-5 h-5 mx-auto text-destructive mb-1" />
                <p className="text-xs text-muted-foreground">Stock Out</p>
                <p className="text-lg font-bold font-mono">{stockOut.toLocaleString()} kg</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-primary/10">
                <Package className="w-5 h-5 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="text-lg font-bold font-mono text-primary">{currentStock.toLocaleString()} kg</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("transition-all", hasPermission("update_rates") && "cursor-pointer hover:ring-2 hover:ring-primary/30")} onClick={hasPermission("update_rates") ? () => navigate("/rates") : undefined}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Current Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {commodities.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="font-medium">{c.name}</span>
                   <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs sm:text-sm font-mono justify-end">
                     <span className="text-muted-foreground whitespace-nowrap">{labels.agent[0]}: {symbol}{c.agentRate}</span>
                     <span className="text-primary whitespace-nowrap">{labels.vip[0]}: {symbol}{c.vipRate}</span>
                     <span className="text-success whitespace-nowrap">{labels.sales[0]}: {symbol}{c.salesRate}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
