import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useNavigate } from "react-router-dom";
import { FileText, Star, ShoppingCart, Wallet, Banknote, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AccountantPage = () => {
  const { symbol } = useCurrency();
  const navigate = useNavigate();
  const [agentTotal, setAgentTotal] = useState(0);
  const [vipTotal, setVipTotal] = useState(0);
  const [salesTotal, setSalesTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [salaryBalance, setSalaryBalance] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date().toISOString().split("T")[0];
      const [agents, vips, sales, expenses, workers] = await Promise.all([
        supabase.from("agent_entries").select("amount").eq("date", today),
        supabase.from("vip_entries").select("amount").eq("date", today),
        supabase.from("sales_entries").select("amount").eq("date", today),
        supabase.from("expenses").select("amount").eq("date", today),
        supabase.from("workers").select("balance"),
      ]);
      setAgentTotal((agents.data || []).reduce((s, e) => s + Number(e.amount), 0));
      setVipTotal((vips.data || []).reduce((s, e) => s + Number(e.amount), 0));
      setSalesTotal((sales.data || []).reduce((s, e) => s + Number(e.amount || 0), 0));
      setExpenseTotal((expenses.data || []).reduce((s, e) => s + Number(e.amount), 0));
      setSalaryBalance((workers.data || []).reduce((s, w) => s + Number(w.balance), 0));
    };
    fetchData();
  }, []);

  const netProfit = salesTotal - agentTotal - vipTotal - expenseTotal;

  const cards = [
    { title: "Agent Purchases", value: agentTotal, icon: <FileText className="w-5 h-5 text-info" />, color: "text-info", path: "/data-entry?tab=agent" },
    { title: "VIP Purchases", value: vipTotal, icon: <Star className="w-5 h-5 text-primary" />, color: "text-primary", path: "/data-entry?tab=vip" },
    { title: "Sales Revenue", value: salesTotal, icon: <ShoppingCart className="w-5 h-5 text-success" />, color: "text-success", path: "/data-entry?tab=sales" },
    { title: "Expenses", value: expenseTotal, icon: <Wallet className="w-5 h-5 text-destructive" />, color: "text-destructive", path: "/expenses" },
    { title: "Salary Owed", value: salaryBalance, icon: <Banknote className="w-5 h-5 text-warning" />, color: "text-warning", path: "/salary" },
    { title: "Net Profit", value: netProfit, icon: <BarChart3 className="w-5 h-5 text-primary" />, color: netProfit >= 0 ? "text-success" : "text-destructive", path: "/financial-report" },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-xl font-bold">Accountant Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card
            key={c.title}
            className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
            onClick={() => navigate(c.path)}
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
