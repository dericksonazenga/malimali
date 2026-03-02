import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockAgentEntries, mockVipEntries, mockSalesEntries, mockExpenses, mockWorkers } from "@/data/mockData";
import { useCurrency } from "@/contexts/CurrencyContext";
import { FileDown, TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const FinancialReportPage = () => {
  const { symbol, currency } = useCurrency();

  const agentTotal = mockAgentEntries.reduce((s, e) => s + e.amount, 0);
  const vipTotal = mockVipEntries.reduce((s, e) => s + e.amount, 0);
  const salesTotal = mockSalesEntries.reduce((s, e) => s + (e.amount || 0), 0);
  const expenseTotal = mockExpenses.reduce((s, e) => s + e.amount, 0);
  const salaryTotal = mockWorkers.reduce((s, w) => s + w.salary, 0);
  const salaryPaid = mockWorkers.reduce((s, w) => s + w.paid, 0);
  const salaryBalance = mockWorkers.reduce((s, w) => s + w.balance, 0);

  const totalPurchases = agentTotal + vipTotal;
  const grossProfit = salesTotal - totalPurchases;
  const netProfit = grossProfit - expenseTotal - salaryPaid;

  const generateCSV = () => {
    const rows = [
      ["SCRAPFLOW FINANCIAL REPORT"],
      [`Currency: ${currency}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ["REVENUE"],
      ["Category", "Amount"],
      ["Sales Revenue", salesTotal.toString()],
      [],
      ["PURCHASES"],
      ["Agent Purchases", agentTotal.toString()],
      ["VIP Purchases", vipTotal.toString()],
      ["Total Purchases", totalPurchases.toString()],
      [],
      ["EXPENSES"],
      ...mockExpenses.map((e) => [e.category + " - " + e.notes, e.amount.toString()]),
      ["Total Expenses", expenseTotal.toString()],
      [],
      ["PAYROLL"],
      ["Total Salary", salaryTotal.toString()],
      ["Total Paid", salaryPaid.toString()],
      ["Balance Owed", salaryBalance.toString()],
      [],
      ["SUMMARY"],
      ["Gross Profit (Sales - Purchases)", grossProfit.toString()],
      ["Net Profit (Gross - Expenses - Salary Paid)", netProfit.toString()],
    ];

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ScrapFlow_Report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded!");
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Financial Report</h1>
        <Button onClick={generateCSV} className="h-12 gap-2">
          <FileDown className="w-4 h-4" /> Download Report (CSV)
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sales Revenue</p>
                <p className="text-2xl font-bold font-mono text-success">{symbol}{salesTotal.toLocaleString()}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-accent"><TrendingUp className="w-5 h-5 text-success" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Purchases</p>
                <p className="text-2xl font-bold font-mono text-info">{symbol}{totalPurchases.toLocaleString()}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-accent"><TrendingDown className="w-5 h-5 text-info" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold font-mono text-destructive">{symbol}{expenseTotal.toLocaleString()}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-accent"><DollarSign className="w-5 h-5 text-destructive" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className={`text-2xl font-bold font-mono ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>
                  {symbol}{netProfit.toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-accent"><BarChart3 className="w-5 h-5 text-primary" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Revenue Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b border-border">
              <span>Sales Revenue</span>
              <span className="font-mono font-bold text-success">{symbol}{salesTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span>Agent Purchases</span>
              <span className="font-mono text-muted-foreground">-{symbol}{agentTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span>VIP Purchases</span>
              <span className="font-mono text-muted-foreground">-{symbol}{vipTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 font-bold">
              <span>Gross Profit</span>
              <span className={`font-mono ${grossProfit >= 0 ? "text-success" : "text-destructive"}`}>
                {symbol}{grossProfit.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Expense & Payroll</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {mockExpenses.map((e) => (
              <div key={e.id} className="flex justify-between py-2 border-b border-border">
                <span>{e.category} <span className="text-xs text-muted-foreground">({e.notes})</span></span>
                <span className="font-mono text-destructive">-{symbol}{e.amount.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 border-b border-border">
              <span>Salary Paid</span>
              <span className="font-mono text-destructive">-{symbol}{salaryPaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border text-muted-foreground">
              <span>Salary Balance Owed</span>
              <span className="font-mono">{symbol}{salaryBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 font-bold">
              <span>Net Profit</span>
              <span className={`font-mono ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>
                {symbol}{netProfit.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialReportPage;
