import { mockAgentEntries, mockVipEntries, mockSalesEntries, mockExpenses, mockCommodities } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Package, Wallet, FileText, Star, ShoppingCart, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const StatCard = ({ title, value, subtitle, icon, color }: { title: string; value: string; subtitle?: string; icon: React.ReactNode; color: string }) => (
  <Card className="animate-fade-in">
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

  const agentTotal = mockAgentEntries.reduce((s, e) => s + e.amount, 0);
  const vipTotal = mockVipEntries.reduce((s, e) => s + e.amount, 0);
  const salesTotalAmount = mockSalesEntries.reduce((s, e) => s + (e.amount || 0), 0);
  const expenseTotal = mockExpenses.reduce((s, e) => s + e.amount, 0);

  const stockIn = mockAgentEntries.reduce((s, e) => s + e.actualWeight, 0) + mockVipEntries.reduce((s, e) => s + e.actualWeight, 0);
  const stockOut = mockSalesEntries.reduce((s, e) => s + e.weight, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.name}</h1>
        <p className="text-muted-foreground">Here's your scrap yard overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Agent Purchases" value={`₹${agentTotal.toLocaleString()}`} subtitle={`${mockAgentEntries.length} entries`} icon={<FileText className="w-5 h-5 text-info" />} color="text-info" />
        <StatCard title="VIP Purchases" value={`₹${vipTotal.toLocaleString()}`} subtitle={`${mockVipEntries.length} entries`} icon={<Star className="w-5 h-5 text-primary" />} color="text-primary" />
        <StatCard title="Sales" value={`₹${salesTotalAmount.toLocaleString()}`} subtitle={`${mockSalesEntries.length} entries`} icon={<ShoppingCart className="w-5 h-5 text-success" />} color="text-success" />
        <StatCard title="Expenses" value={`₹${expenseTotal.toLocaleString()}`} subtitle={`${mockExpenses.length} records`} icon={<Wallet className="w-5 h-5 text-destructive" />} color="text-destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
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
                <p className="text-lg font-bold font-mono text-primary">{(stockIn - stockOut).toLocaleString()} kg</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockCommodities.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="font-medium">{c.name}</span>
                  <div className="flex gap-4 text-sm font-mono">
                    <span className="text-muted-foreground">A: ₹{c.agentRate}</span>
                    <span className="text-primary">V: ₹{c.vipRate}</span>
                    <span className="text-success">S: ₹{c.salesRate}</span>
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
