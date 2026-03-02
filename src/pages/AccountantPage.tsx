import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockAgentEntries, mockVipEntries, mockSalesEntries, mockExpenses, mockWorkers } from "@/data/mockData";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useNavigate } from "react-router-dom";
import { FileText, Star, ShoppingCart, Wallet, Banknote, BarChart3 } from "lucide-react";

const AccountantPage = () => {
  const { symbol } = useCurrency();
  const navigate = useNavigate();

  const agentTotal = mockAgentEntries.reduce((s, e) => s + e.amount, 0);
  const vipTotal = mockVipEntries.reduce((s, e) => s + e.amount, 0);
  const salesTotal = mockSalesEntries.reduce((s, e) => s + (e.amount || 0), 0);
  const expenseTotal = mockExpenses.reduce((s, e) => s + e.amount, 0);
  const salaryBalance = mockWorkers.reduce((s, w) => s + w.balance, 0);
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
