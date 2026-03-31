import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useNavigate } from "react-router-dom";
import { FileText, Star, ShoppingCart, Wallet, TrendingUp, Package } from "lucide-react";
import { useCategoryLabels } from "@/contexts/CategoryLabelsContext";
import { supabase } from "@/integrations/supabase/client";
import { useEndOfDay } from "@/contexts/EndOfDayContext";

const AccountantPage = () => {
  const { symbol } = useCurrency();
  const navigate = useNavigate();
  const { resetSignal } = useEndOfDay();
  const { labels } = useCategoryLabels();
  const [agentTotal, setAgentTotal] = useState(0);
  const [vipTotal, setVipTotal] = useState(0);
  const [salesTotal, setSalesTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date().toISOString().split("T")[0];

      const { data: eodData } = await supabase
        .from("end_of_day_log")
        .select("triggered_at")
        .eq("date", today)
        .order("triggered_at", { ascending: false })
        .limit(1);
      const lastEod = eodData?.[0]?.triggered_at;

      let agentQ = supabase.from("agent_entries").select("amount").eq("date", today);
      let vipQ = supabase.from("vip_entries").select("amount").eq("date", today);
      let salesQ = supabase.from("sales_entries").select("amount").eq("date", today);
      let expenseQ = supabase.from("expenses").select("amount").eq("date", today);

      if (lastEod) {
        agentQ = agentQ.gt("created_at", lastEod);
        vipQ = vipQ.gt("created_at", lastEod);
        salesQ = salesQ.gt("created_at", lastEod);
        expenseQ = expenseQ.gt("created_at", lastEod);
      }

      const [agents, vips, sales, expenses] = await Promise.all([
        agentQ, vipQ, salesQ, expenseQ,
      ]);
      setAgentTotal((agents.data || []).reduce((s, e) => s + Number(e.amount), 0));
      setVipTotal((vips.data || []).reduce((s, e) => s + Number(e.amount), 0));
      setSalesTotal((sales.data || []).reduce((s, e) => s + Number(e.amount || 0), 0));
      setExpenseTotal((expenses.data || []).reduce((s, e) => s + Number(e.amount), 0));
    };
    fetchData();
  }, [resetSignal]);

  const totalPurchases = agentTotal + vipTotal;
  const grossProfit = salesTotal - totalPurchases;

  const cards = [
    { title: "Agent Purchases", value: agentTotal, icon: <FileText className="w-5 h-5 text-info" />, color: "text-info", path: "/data-entry?tab=agent", clickable: true },
    { title: "VIP Purchases", value: vipTotal, icon: <Star className="w-5 h-5 text-primary" />, color: "text-primary", path: "/data-entry?tab=vip", clickable: true },
    { title: "Total Purchases", value: totalPurchases, icon: <Package className="w-5 h-5 text-orange-500" />, color: "text-foreground", path: "", clickable: false },
    { title: "Sales Revenue", value: salesTotal, icon: <ShoppingCart className="w-5 h-5 text-success" />, color: "text-success", path: "/data-entry?tab=sales", clickable: true },
    { title: "Expenses", value: expenseTotal, icon: <Wallet className="w-5 h-5 text-destructive" />, color: "text-destructive", path: "/expenses", clickable: true },
    { title: "Gross Profit", value: grossProfit, icon: <TrendingUp className={`w-5 h-5 ${grossProfit >= 0 ? "text-success" : "text-destructive"}`} />, color: grossProfit >= 0 ? "text-success" : "text-destructive", path: "/financial-report", clickable: true },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-xl font-bold">Accountant Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card
            key={c.title}
            className={`transition-all ${c.clickable ? "cursor-pointer hover:ring-2 hover:ring-primary/30" : ""}`}
            onClick={c.clickable ? () => navigate(c.path) : undefined}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{c.title}</p>
                  <p className={`text-2xl font-bold font-mono mt-1 ${c.color}`}>
                    {symbol}{c.value.toLocaleString()}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-accent">{c.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AccountantPage;
