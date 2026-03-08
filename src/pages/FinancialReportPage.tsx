import { useState } from "react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet, TrendingUp, TrendingDown, DollarSign,
  BarChart3, Package, Users, Receipt, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAnalyticsData, DateRangeValue } from "@/hooks/useAnalyticsData";
import { downloadCSV } from "@/utils/downloadCSV";
import DateRangeSelector from "@/components/analytics/DateRangeSelector";
import AnalyticsSection from "@/components/analytics/AnalyticsSection";
import AnalyticsCharts from "@/components/analytics/AnalyticsCharts";

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const FinancialReportPage = () => {
  const { symbol, currency } = useCurrency();
  const [range, setRange] = useState<DateRangeValue>({ preset: "today" });
  const { data, loading } = useAnalyticsData(range);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const {
    agentEntries, vipEntries, salesEntries, expenses, workers, stockData,
    agentTotal, vipTotal, salesTotal, expenseTotal,
    salaryTotal, salaryPaid, salaryBalance,
    totalPurchases, grossProfit, netProfit, commodityBreakdown, dailyProfitTrend,
    commodityProfitBreakdown,
  } = data;

  const rangeLabel = range.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const filePrefix = `RachelScrap_${rangeLabel.replace(/ /g, "")}_${new Date().toISOString().split("T")[0]}`;

  // Full report CSV
  const downloadFullReport = () => {
    const rows: string[][] = [
      ["RACHEL SCRAP LTD - FULL ANALYTICS REPORT"],
      [`Period: ${rangeLabel}`, `Currency: ${currency}`, `Generated: ${new Date().toLocaleString()}`],
      [],
      ["=== SUMMARY ==="],
      ["Metric", "Amount"],
      ["Sales Revenue", fmt(salesTotal)],
      ["Agent Purchases", fmt(agentTotal)],
      ["VIP Purchases", fmt(vipTotal)],
      ["Total Purchases", fmt(totalPurchases)],
      ["Gross Profit", fmt(grossProfit)],
      ["Total Expenses", fmt(expenseTotal)],
      ["Salary Paid", fmt(salaryPaid)],
      ["Net Profit", fmt(netProfit)],
      [],
      ["=== AGENT ENTRIES ==="],
      ["Customer", "Commodity", "Weight (kg)", "Rate", "Amount"],
      ...agentEntries.map((e: any) => [e.customer_name, e.commodity, e.actual_weight, e.rate, e.amount]),
      [],
      ["=== VIP ENTRIES ==="],
      ["Customer", "Commodity", "Weight (kg)", "Rate", "Amount"],
      ...vipEntries.map((e: any) => [e.customer_name, e.commodity, e.actual_weight, e.rate, e.amount]),
      [],
      ["=== SALES ENTRIES ==="],
      ["Customer", "Commodity", "Weight (kg)", "Rate", "Amount", "Exchange"],
      ...salesEntries.map((e: any) => [e.customer_name || "", e.commodity || "", e.weight, e.rate || "", e.amount || "", e.is_exchange ? "Yes" : "No"]),
      [],
      ["=== EXPENSES ==="],
      ["Category", "Amount", "Notes"],
      ...expenses.map((e: any) => [e.category, e.amount, e.notes || ""]),
      [],
      ["=== INVENTORY ==="],
      ["Commodity", "Bought (kg)", "Sold (kg)", "Net Change (kg)"],
      ...Object.entries(commodityBreakdown).map(([c, v]) => [c, fmt(v.bought), fmt(v.sold), fmt(v.net)]),
      [],
      ["=== CURRENT STOCK ==="],
      ["Commodity", "Weight (kg)"],
      ...stockData.map((s: any) => [s.commodity, s.weight]),
      [],
      ["=== PAYROLL ==="],
      ["Worker", "Role", "Salary", "Paid", "Balance"],
      ...workers.map((w: any) => [w.name, w.role, w.salary, w.paid, w.balance]),
    ];
    downloadCSV(rows, `${filePrefix}_FullReport.csv`);
    toast.success("Full report downloaded!");
  };

  // Section-specific CSV builders
  const agentCSV = () => [
    ["Customer", "Commodity", "Weight", "Rate", "Amount", "Date"],
    ...agentEntries.map((e: any) => [e.customer_name, e.commodity, e.actual_weight, e.rate, e.amount, e.date]),
  ];
  const vipCSV = () => [
    ["Customer", "Commodity", "Weight", "Rate", "Amount", "Date"],
    ...vipEntries.map((e: any) => [e.customer_name, e.commodity, e.actual_weight, e.rate, e.amount, e.date]),
  ];
  const salesCSV = () => [
    ["Customer", "Commodity", "Weight", "Rate", "Amount", "Exchange", "Date"],
    ...salesEntries.map((e: any) => [e.customer_name || "", e.commodity || "", e.weight, e.rate || "", e.amount || "", e.is_exchange ? "Yes" : "No", e.date]),
  ];
  const expenseCSV = () => [
    ["Category", "Amount", "Notes", "Date"],
    ...expenses.map((e: any) => [e.category, e.amount, e.notes || "", e.date]),
  ];
  const inventoryCSV = () => [
    ["Commodity", "Bought (kg)", "Sold (kg)", "Net Change (kg)"],
    ...Object.entries(commodityBreakdown).map(([c, v]) => [c, String(v.bought), String(v.sold), String(v.net)]),
  ];
  const stockCSV = () => [
    ["Commodity", "Current Weight (kg)"],
    ...stockData.map((s: any) => [s.commodity, String(s.weight)]),
  ];
  const payrollCSV = () => [
    ["Worker", "Role", "Salary", "Paid", "Balance"],
    ...workers.map((w: any) => [w.name, w.role, String(w.salary), String(w.paid), String(w.balance)]),
  ];
  const revenueCSV = () => [
    ["Category", "Amount"],
    ["Sales Revenue", String(salesTotal)],
    ["Agent Purchases", String(-agentTotal)],
    ["VIP Purchases", String(-vipTotal)],
    ["Total Expenses", String(-expenseTotal)],
    ["Salary Paid", String(-salaryPaid)],
    ["Gross Profit", String(grossProfit)],
    ["Net Profit", String(netProfit)],
  ];

  const StatRow = ({ label, value, negative, bold }: { label: string; value: number; negative?: boolean; bold?: boolean }) => (
    <div className={`flex justify-between py-1.5 ${bold ? "font-bold border-t border-border pt-2" : ""}`}>
      <span className="text-sm">{label}</span>
      <span className={`font-mono text-sm ${negative ? "text-destructive" : value >= 0 ? "text-success" : "text-destructive"}`}>
        {negative ? "-" : ""}{symbol}{fmt(Math.abs(value))}
      </span>
    </div>
  );

  return (
    <div className="space-y-5 max-w-6xl pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Analytics & Reports</h1>
        <Button onClick={downloadFullReport} className="h-10 gap-2">
          <FileSpreadsheet className="w-4 h-4" /> Download Full Report
        </Button>
      </div>

      {/* Date Range */}
      <DateRangeSelector value={range} onChange={setRange} />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Sales Revenue", value: salesTotal, icon: <TrendingUp className="w-4 h-4 text-success" />, color: "text-success" },
          { label: "Total Purchases", value: totalPurchases, icon: <TrendingDown className="w-4 h-4 text-info" />, color: "text-info" },
          { label: "Total Expenses", value: expenseTotal, icon: <DollarSign className="w-4 h-4 text-destructive" />, color: "text-destructive" },
          { label: "Net Profit", value: netProfit, icon: <BarChart3 className="w-4 h-4 text-primary" />, color: netProfit >= 0 ? "text-success" : "text-destructive" },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 mb-1">{kpi.icon}<span className="text-xs text-muted-foreground">{kpi.label}</span></div>
            <p className={`text-xl font-bold font-mono ${kpi.color}`}>{symbol}{fmt(kpi.value)}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <AnalyticsCharts
        symbol={symbol}
        salesTotal={salesTotal}
        agentTotal={agentTotal}
        vipTotal={vipTotal}
        expenseTotal={expenseTotal}
        salaryPaid={salaryPaid}
        grossProfit={grossProfit}
        netProfit={netProfit}
        commodityBreakdown={commodityBreakdown}
        stockData={stockData}
        expenses={expenses}
        dailyProfitTrend={dailyProfitTrend}
      />

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Breakdown */}
        <AnalyticsSection
          title="Revenue Breakdown"
          icon={<TrendingUp className="w-4 h-4 text-success" />}
          csvRows={revenueCSV()}
          csvFilename={`${filePrefix}_Revenue.csv`}
        >
          <div className="space-y-0.5">
            <StatRow label="Sales Revenue" value={salesTotal} />
            <StatRow label="Agent Purchases" value={agentTotal} negative />
            <StatRow label="VIP Purchases" value={vipTotal} negative />
            <StatRow label="Expenses" value={expenseTotal} negative />
            <StatRow label="Salary Paid" value={salaryPaid} negative />
            <StatRow label="Gross Profit" value={grossProfit} bold />
            <StatRow label="Net Profit" value={netProfit} bold />
          </div>
        </AnalyticsSection>

        {/* Agent Entries */}
        <AnalyticsSection
          title={`Agent Entries (${agentEntries.length})`}
          icon={<Users className="w-4 h-4 text-info" />}
          csvRows={agentCSV()}
          csvFilename={`${filePrefix}_Agents.csv`}
        >
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {agentEntries.length === 0 && <p className="text-sm text-muted-foreground">No entries</p>}
            {agentEntries.slice(0, 50).map((e: any) => (
              <div key={e.id} className="flex justify-between text-sm py-1 border-b border-border/50">
                <span className="truncate mr-2">{e.customer_name} · {e.commodity} · {e.actual_weight}kg</span>
                <span className="font-mono text-info whitespace-nowrap">{symbol}{fmt(Number(e.amount))}</span>
              </div>
            ))}
            {agentEntries.length > 50 && <p className="text-xs text-muted-foreground">+{agentEntries.length - 50} more (download for full list)</p>}
          </div>
          <div className="mt-2 pt-2 border-t border-border flex justify-between font-bold text-sm">
            <span>Total</span><span className="font-mono">{symbol}{fmt(agentTotal)}</span>
          </div>
        </AnalyticsSection>

        {/* VIP Entries */}
        <AnalyticsSection
          title={`VIP Entries (${vipEntries.length})`}
          icon={<Users className="w-4 h-4 text-primary" />}
          csvRows={vipCSV()}
          csvFilename={`${filePrefix}_VIP.csv`}
        >
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {vipEntries.length === 0 && <p className="text-sm text-muted-foreground">No entries</p>}
            {vipEntries.slice(0, 50).map((e: any) => (
              <div key={e.id} className="flex justify-between text-sm py-1 border-b border-border/50">
                <span className="truncate mr-2">{e.customer_name} · {e.commodity} · {e.actual_weight}kg</span>
                <span className="font-mono text-primary whitespace-nowrap">{symbol}{fmt(Number(e.amount))}</span>
              </div>
            ))}
            {vipEntries.length > 50 && <p className="text-xs text-muted-foreground">+{vipEntries.length - 50} more</p>}
          </div>
          <div className="mt-2 pt-2 border-t border-border flex justify-between font-bold text-sm">
            <span>Total</span><span className="font-mono">{symbol}{fmt(vipTotal)}</span>
          </div>
        </AnalyticsSection>

        {/* Sales Entries */}
        <AnalyticsSection
          title={`Sales Entries (${salesEntries.length})`}
          icon={<TrendingUp className="w-4 h-4 text-success" />}
          csvRows={salesCSV()}
          csvFilename={`${filePrefix}_Sales.csv`}
        >
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {salesEntries.length === 0 && <p className="text-sm text-muted-foreground">No entries</p>}
            {salesEntries.slice(0, 50).map((e: any) => (
              <div key={e.id} className="flex justify-between text-sm py-1 border-b border-border/50">
                <span className="truncate mr-2">{e.customer_name || "—"} · {e.commodity || "Exchange"} · {e.weight}kg</span>
                <span className="font-mono text-success whitespace-nowrap">{e.amount ? `${symbol}${fmt(Number(e.amount))}` : "Exchange"}</span>
              </div>
            ))}
            {salesEntries.length > 50 && <p className="text-xs text-muted-foreground">+{salesEntries.length - 50} more</p>}
          </div>
          <div className="mt-2 pt-2 border-t border-border flex justify-between font-bold text-sm">
            <span>Total</span><span className="font-mono">{symbol}{fmt(salesTotal)}</span>
          </div>
        </AnalyticsSection>

        {/* Expenses */}
        <AnalyticsSection
          title={`Expenses (${expenses.length})`}
          icon={<Receipt className="w-4 h-4 text-destructive" />}
          csvRows={expenseCSV()}
          csvFilename={`${filePrefix}_Expenses.csv`}
        >
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {expenses.length === 0 && <p className="text-sm text-muted-foreground">No expenses</p>}
            {expenses.map((e: any) => (
              <div key={e.id} className="flex justify-between text-sm py-1 border-b border-border/50">
                <span className="truncate mr-2">{e.category} {e.notes ? `(${e.notes})` : ""}</span>
                <span className="font-mono text-destructive whitespace-nowrap">-{symbol}{fmt(Number(e.amount))}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-border flex justify-between font-bold text-sm">
            <span>Total</span><span className="font-mono text-destructive">-{symbol}{fmt(expenseTotal)}</span>
          </div>
        </AnalyticsSection>

        {/* Inventory / Commodity Flow */}
        <AnalyticsSection
          title="Commodity Flow"
          icon={<Package className="w-4 h-4 text-accent-foreground" />}
          csvRows={inventoryCSV()}
          csvFilename={`${filePrefix}_CommodityFlow.csv`}
        >
          <div className="space-y-1">
            {Object.keys(commodityBreakdown).length === 0 && <p className="text-sm text-muted-foreground">No data</p>}
            <div className="grid grid-cols-4 text-xs text-muted-foreground font-medium pb-1 border-b border-border">
              <span>Commodity</span><span className="text-right">In</span><span className="text-right">Out</span><span className="text-right">Net</span>
            </div>
            {Object.entries(commodityBreakdown).map(([c, v]) => (
              <div key={c} className="grid grid-cols-4 text-sm py-1 border-b border-border/50">
                <span className="truncate">{c}</span>
                <span className="text-right font-mono text-info">{fmt(v.bought)}kg</span>
                <span className="text-right font-mono text-destructive">{fmt(v.sold)}kg</span>
                <span className={`text-right font-mono ${v.net >= 0 ? "text-success" : "text-destructive"}`}>{fmt(v.net)}kg</span>
              </div>
            ))}
          </div>
        </AnalyticsSection>

        {/* Current Stock */}
        <AnalyticsSection
          title="Current Stock"
          icon={<Package className="w-4 h-4 text-success" />}
          csvRows={stockCSV()}
          csvFilename={`${filePrefix}_Stock.csv`}
        >
          <div className="space-y-1">
            {stockData.length === 0 && <p className="text-sm text-muted-foreground">No stock data</p>}
            {stockData.map((s: any) => (
              <div key={s.id} className="flex justify-between text-sm py-1 border-b border-border/50">
                <span>{s.commodity}</span>
                <span className="font-mono font-bold">{fmt(Number(s.weight))}kg</span>
              </div>
            ))}
          </div>
        </AnalyticsSection>

        {/* Per-Commodity Profit Breakdown */}
        <AnalyticsSection
          title="Commodity Profit Breakdown"
          icon={<BarChart3 className="w-4 h-4 text-primary" />}
          csvRows={[
            ["Commodity", "Avg Buy Rate", "Avg Sell Rate", "Margin/kg", "Weight Sold (kg)", "Total Profit"],
            ...commodityProfitBreakdown.map((c) => [
              c.commodity, fmt(c.avgBuyRate), fmt(c.avgSellRate), fmt(c.marginPerKg),
              fmt(c.totalWeightSold), fmt(c.totalProfit),
            ]),
          ]}
          csvFilename={`${filePrefix}_CommodityProfit.csv`}
        >
          <div className="space-y-1">
            {commodityProfitBreakdown.length === 0 && <p className="text-sm text-muted-foreground">No data</p>}
            <div className="grid grid-cols-6 text-xs text-muted-foreground font-medium pb-1 border-b border-border">
              <span>Commodity</span>
              <span className="text-right">Buy/kg</span>
              <span className="text-right">Sell/kg</span>
              <span className="text-right">Margin/kg</span>
              <span className="text-right">Sold (kg)</span>
              <span className="text-right">Profit</span>
            </div>
            {commodityProfitBreakdown.map((c) => (
              <div key={c.commodity} className="grid grid-cols-6 text-sm py-1.5 border-b border-border/50">
                <span className="truncate font-medium">{c.commodity}</span>
                <span className="text-right font-mono text-info">{symbol}{fmt(c.avgBuyRate)}</span>
                <span className="text-right font-mono text-success">{symbol}{fmt(c.avgSellRate)}</span>
                <span className={`text-right font-mono font-semibold ${c.marginPerKg >= 0 ? "text-success" : "text-destructive"}`}>
                  {symbol}{fmt(c.marginPerKg)}
                </span>
                <span className="text-right font-mono">{fmt(c.totalWeightSold)}</span>
                <span className={`text-right font-mono font-bold ${c.totalProfit >= 0 ? "text-success" : "text-destructive"}`}>
                  {symbol}{fmt(c.totalProfit)}
                </span>
              </div>
            ))}
          </div>
          {commodityProfitBreakdown.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border grid grid-cols-6 font-bold text-sm">
              <span>Total</span>
              <span /><span /><span /><span />
              <span className={`text-right font-mono ${commodityProfitBreakdown.reduce((s, c) => s + c.totalProfit, 0) >= 0 ? "text-success" : "text-destructive"}`}>
                {symbol}{fmt(commodityProfitBreakdown.reduce((s, c) => s + c.totalProfit, 0))}
              </span>
            </div>
          )}
        </AnalyticsSection>

        {/* Payroll */}
        <AnalyticsSection
          title={`Payroll (${workers.length} workers)`}
          icon={<Users className="w-4 h-4 text-muted-foreground" />}
          csvRows={payrollCSV()}
          csvFilename={`${filePrefix}_Payroll.csv`}
        >
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {workers.length === 0 && <p className="text-sm text-muted-foreground">No workers</p>}
            {workers.map((w: any) => (
              <div key={w.id} className="grid grid-cols-4 text-sm py-1 border-b border-border/50">
                <span className="truncate">{w.name}</span>
                <span className="font-mono text-right">{symbol}{fmt(Number(w.salary))}</span>
                <span className="font-mono text-right text-success">{symbol}{fmt(Number(w.paid))}</span>
                <span className="font-mono text-right text-destructive">{symbol}{fmt(Number(w.balance))}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-border grid grid-cols-4 font-bold text-sm">
            <span>Total</span>
            <span className="font-mono text-right">{symbol}{fmt(salaryTotal)}</span>
            <span className="font-mono text-right text-success">{symbol}{fmt(salaryPaid)}</span>
            <span className="font-mono text-right text-destructive">{symbol}{fmt(salaryBalance)}</span>
          </div>
        </AnalyticsSection>
      </div>
    </div>
  );
};

export default FinancialReportPage;
