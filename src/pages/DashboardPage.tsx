import { useState, useEffect } from "react";
import { useCommodities } from "@/contexts/CommodityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Package, Wallet, FileText, Star, ShoppingCart, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useInventory } from "@/contexts/InventoryContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const StatCard = ({ title, value, subtitle, icon, color, onClick }: { title: string; value: string; subtitle?: string; icon: React.ReactNode; color: string; onClick?: () => void }) => (
  <Card className="animate-fade-in cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={onClick}>
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold font-mono mt-1 ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="p-2.5 rounded-lg bg-accent">{icon}</div>
      </div>
    </CardContent>
  </Card>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const { commodities } = useCommodities();
  const { symbol } = useCurrency();
  const { agentEntries, vipEntries, salesEntries, persistentStock } = useInventory();
  const navigate = useNavigate();
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);

  useEffect(() => {
    const fetchExpenses = async () => {
      const today = new Date().toISOString().split("T")[0];

      // Check last EOD trigger for today
      const { data: eodData } = await supabase
        .from("end_of_day_log")
        .select("triggered_at")
        .eq("date", today)
        .order("triggered_at", { ascending: false })
        .limit(1);

      const lastEod = eodData?.[0]?.triggered_at;

      let query = supabase.from("expenses").select("amount").eq("date", today);
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
    const interval = setInterval(fetchExpenses, 10000);
    return () => clearInterval(interval);
  }, []);

  const agentTotal = agentEntries.reduce((s, e) => s + e.amount, 0);
  const vipTotal = vipEntries.reduce((s, e) => s + e.amount, 0);
  const salesTotalAmount = salesEntries.reduce((s, e) => s + (e.amount || 0), 0);

  const stockIn = agentEntries.reduce((s, e) => s + e.actualWeight, 0) + vipEntries.reduce((s, e) => s + e.actualWeight, 0);
  const stockOut = salesEntries.reduce((s, e) => s + e.weight, 0);
  const persistentTotal = Object.values(persistentStock).reduce((s, v) => s + v, 0);
  const currentStock = persistentTotal + stockIn - stockOut;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.name}</h1>
        <p className="text-muted-foreground">Here's your scrap yard overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Agent Purchases" value={`${symbol}${agentTotal.toLocaleString()}`} subtitle={`${agentEntries.length} entries`} icon={<FileText className="w-5 h-5 text-info" />} color="text-info" onClick={() => navigate("/data-entry?tab=agent")} />
        <StatCard title="VIP Purchases" value={`${symbol}${vipTotal.toLocaleString()}`} subtitle={`${vipEntries.length} entries`} icon={<Star className="w-5 h-5 text-primary" />} color="text-primary" onClick={() => navigate("/data-entry?tab=vip")} />
        <StatCard title="Sales" value={`${symbol}${salesTotalAmount.toLocaleString()}`} subtitle={`${salesEntries.length} entries`} icon={<ShoppingCart className="w-5 h-5 text-success" />} color="text-success" onClick={() => navigate("/data-entry?tab=sales")} />
        <StatCard title="Expenses" value={`${symbol}${expenseTotal.toLocaleString()}`} subtitle={`${expenseCount} records`} icon={<Wallet className="w-5 h-5 text-destructive" />} color="text-destructive" onClick={() => navigate("/expenses")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => navigate("/inventory")}>
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

        <Card className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => navigate("/rates")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Current Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {commodities.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="font-medium">{c.name}</span>
                  <div className="flex gap-4 text-sm font-mono">
                    <span className="text-muted-foreground">A: {symbol}{c.agentRate}</span>
                    <span className="text-primary">V: {symbol}{c.vipRate}</span>
                    <span className="text-success">S: {symbol}{c.salesRate}</span>
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
