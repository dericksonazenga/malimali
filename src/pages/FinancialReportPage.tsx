import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet, TrendingUp, TrendingDown, DollarSign,
  BarChart3, Package, Users, Receipt, Loader2, PiggyBank, CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { useAnalyticsData, DateRangeValue } from "@/hooks/useAnalyticsData";
import { downloadCSV } from "@/utils/downloadCSV";
import { groupEntriesByCustomer } from "@/utils/groupEntries";
import { useCategoryLabels } from "@/contexts/CategoryLabelsContext";
import * as XLSX from "xlsx";
import DateRangeSelector from "@/components/analytics/DateRangeSelector";
import AnalyticsSection from "@/components/analytics/AnalyticsSection";
import AnalyticsCharts from "@/components/analytics/AnalyticsCharts";
import ReportSheetView from "@/components/analytics/ReportSheetView";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const FinancialReportPage = () => {
  const { symbol, currency } = useCurrency();
  const { labels } = useCategoryLabels();
  const [range, setRange] = useState<DateRangeValue>({ preset: "today" });
  const { data, loading } = useAnalyticsData(range);

  // Savings data with realtime
  const [savingsAccounts, setSavingsAccounts] = useState<any[]>([]);
  const [savingsTransactions, setSavingsTransactions] = useState<any[]>([]);

  const fetchSavings = useCallback(async () => {
    const [{ data: accounts }, { data: txns }] = await Promise.all([
      supabase.from("savings_accounts").select("*").order("customer_name"),
      supabase.from("savings_transactions").select("*").order("created_at", { ascending: false }),
    ]);
    if (accounts) setSavingsAccounts(accounts as any[]);
    if (txns) setSavingsTransactions(txns as any[]);
  }, []);

  useEffect(() => { fetchSavings(); }, [fetchSavings]);

  // Realtime for savings
  useEffect(() => {
    const channel = supabase
      .channel("report-savings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "savings_accounts" }, () => fetchSavings())
      .on("postgres_changes", { event: "*", schema: "public", table: "savings_transactions" }, () => fetchSavings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchSavings]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const {
    agentEntries, vipEntries, salesEntries, expenses, workers, stockData,
    debts, debtPayments,
    agentTotal, vipTotal, salesTotal, expenseTotal,
    salaryTotal, salaryPaid, salaryBalance,
    debtTotal, debtPaid, debtBalance,
    totalPurchases, grossProfit, netProfit, commodityBreakdown, dailyProfitTrend,
    commodityProfitBreakdown,
  } = data;

  const totalDeposits = savingsTransactions.filter(t => t.type === "deposit").reduce((s, t) => s + Number(t.amount), 0);
  const totalWithdrawals = savingsTransactions.filter(t => t.type === "withdrawal").reduce((s, t) => s + Number(t.amount), 0);
  const netSavingsHeld = savingsAccounts.reduce((s, a) => s + Number(a.balance), 0);

  const rangeLabel = range.preset === "custom" 
    ? "Custom" 
    : range.preset.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const filePrefix = `Report_${rangeLabel.replace(/ /g, "")}_${new Date().toISOString().split("T")[0]}`;

  const autoFitColumns = (ws: XLSX.WorkSheet, data: any[][]) => {
    if (!data.length || !data[0].length) return ws;
    const colWidths = data[0].map((_, colIdx) => {
      const maxLen = data.reduce((max, row) => {
        const cellValue = String(row[colIdx] ?? "");
        return Math.max(max, cellValue.length);
      }, 0);
      return { wch: Math.min(Math.max(maxLen + 2, 8), 30) };
    });
    ws["!cols"] = colWidths;
    return ws;
  };

  const styleSheet = (ws: XLSX.WorkSheet, headerRows: number = 1, totalRowIdx?: number, totalCols?: number) => {
    ws["!freeze"] = { xSplit: 0, ySplit: headerRows };
    for (let r = 0; r < headerRows; r++) {
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (ws[addr]) {
          if (!ws[addr].s) ws[addr].s = {};
          ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: "4CAF50" } } };
        }
      }
    }
    if (totalRowIdx !== undefined && totalCols) {
      for (let c = 0; c < totalCols; c++) {
        const addr = XLSX.utils.encode_cell({ r: totalRowIdx, c });
        if (ws[addr]) {
          if (!ws[addr].s) ws[addr].s = {};
          ws[addr].s = { font: { bold: true } };
        }
      }
    }
    return ws;
  };

  const downloadFullReport = () => {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ["Metric", "Amount"],
      [`${labels.sales} Revenue`, salesTotal],
      [`${labels.agent} Purchases`, agentTotal],
      [`${labels.vip} Purchases`, vipTotal],
      ["Total Purchases", totalPurchases],
      ["Gross Profit", grossProfit],
      ["Total Expenses", expenseTotal],
      ["Salary Paid", salaryPaid],
      ["Net Profit", netProfit],
      [""],
      ["Total Debt Outstanding", debtTotal],
      ["Debt Paid", debtPaid],
      ["Debt Balance", debtBalance],
    ];
    XLSX.utils.book_append_sheet(wb, autoFitColumns(XLSX.utils.aoa_to_sheet(summaryData), summaryData), "Summary");

    // Helper to build grouped-by-customer sheet
    const buildGroupedSheet = (entries: any[], sheetName: string) => {
      const groups = groupEntriesByCustomer(entries);
      const aoa: any[][] = [["Customer", "Commodity", "Weight (kg)", "Rate", "Amount", "Date"]];
      groups.forEach(g => {
        g.entries.forEach((e: any) => { aoa.push([e.customer_name, e.commodity, Number(e.actual_weight), Number(e.rate), Number(e.amount), e.date]); });
        aoa.push([`${g.customerName} TOTAL (${g.count} entries)`, g.commodities.join(", "), g.totalWeight, "", g.totalAmount, ""]);
        aoa.push([]);
      });
      const grandWeight = entries.reduce((s: number, e: any) => s + Number(e.actual_weight), 0);
      const grandAmount = entries.reduce((s: number, e: any) => s + Number(e.amount), 0);
      aoa.push(["GRAND TOTAL", "", grandWeight, "", grandAmount, ""]);
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      autoFitColumns(ws, aoa);
      styleSheet(ws, 1, aoa.length - 1, 6);
      let rowIdx = 1;
      groups.forEach(g => {
        rowIdx += g.entries.length;
        for (let c = 0; c < 6; c++) { const addr = XLSX.utils.encode_cell({ r: rowIdx, c }); if (ws[addr]) ws[addr].s = { font: { bold: true } }; }
        rowIdx += 2;
      });
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    buildGroupedSheet(agentEntries, "Agent Entries");
    buildGroupedSheet(vipEntries, "VIP Entries");

    // Sales Entries sheet
    {
      const salesGroups = groupEntriesByCustomer(salesEntries, "weight");
      const aoa: any[][] = [["Customer", "Commodity", "Weight (kg)", "Rate", "Amount", "Exchange", "Date"]];
      salesGroups.forEach(g => {
        g.entries.forEach((e: any) => { aoa.push([e.customer_name || "", e.commodity || "", Number(e.weight), e.rate ? Number(e.rate) : "", Number(e.amount || 0), e.is_exchange ? "Yes" : "No", e.date]); });
        aoa.push([`${g.customerName || "No Name"} TOTAL (${g.count} entries)`, g.commodities.join(", "), g.totalWeight, "", g.totalAmount, "", ""]);
        aoa.push([]);
      });
      const grandWeight = salesEntries.reduce((s: number, e: any) => s + Number(e.weight || 0), 0);
      const grandAmount = salesEntries.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      aoa.push(["GRAND TOTAL", "", grandWeight, "", grandAmount, "", ""]);
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      autoFitColumns(ws, aoa);
      styleSheet(ws, 1, aoa.length - 1, 7);
      let rowIdx = 1;
      salesGroups.forEach(g => { rowIdx += g.entries.length; for (let c = 0; c < 7; c++) { const addr = XLSX.utils.encode_cell({ r: rowIdx, c }); if (ws[addr]) ws[addr].s = { font: { bold: true } }; } rowIdx += 2; });
      XLSX.utils.book_append_sheet(wb, ws, "Sales Entries");
    }

    // Expenses sheet
    const expRows2 = expenses.map((e: any) => [e.category, e.amount, e.notes || "", e.date]);
    const expData = [["Category", "Amount", "Notes", "Date"], ...expRows2, [], ["TOTAL", expRows2.reduce((s, r) => s + Number(r[1]), 0), "", ""]];
    const expWs = XLSX.utils.aoa_to_sheet(expData);
    autoFitColumns(expWs, expData);
    styleSheet(expWs, 1, expData.length - 1, 4);
    XLSX.utils.book_append_sheet(wb, expWs, "Expenses");

    // Commodity Flow sheet
    const flowRows = Object.entries(commodityBreakdown).map(([c, v]) => [c, v.bought, v.sold, v.net]);
    const flowData = [["Commodity", "Bought (kg)", "Sold (kg)", "Net Change (kg)"], ...flowRows, [], ["TOTAL", flowRows.reduce((s, r) => s + Number(r[1]), 0), flowRows.reduce((s, r) => s + Number(r[2]), 0), flowRows.reduce((s, r) => s + Number(r[3]), 0)]];
    const flowWs = XLSX.utils.aoa_to_sheet(flowData);
    autoFitColumns(flowWs, flowData);
    styleSheet(flowWs, 1, flowData.length - 1, 4);
    XLSX.utils.book_append_sheet(wb, flowWs, "Commodity Flow");

    // Current Stock sheet
    const stockRows2 = stockData.map((s: any) => [s.commodity, s.weight]);
    const stockSheetData = [["Commodity", "Weight (kg)"], ...stockRows2, [], ["TOTAL", stockRows2.reduce((s, r) => s + Number(r[1]), 0)]];
    const stockWs = XLSX.utils.aoa_to_sheet(stockSheetData);
    autoFitColumns(stockWs, stockSheetData);
    styleSheet(stockWs, 1, stockSheetData.length - 1, 2);
    XLSX.utils.book_append_sheet(wb, stockWs, "Current Stock");

    // Payroll sheet
    const payrollRows2 = workers.map((w: any) => [w.name, w.role, w.salary, w.paid, w.balance]);
    const payrollData = [["Worker", "Role", "Salary", "Paid", "Balance"], ...payrollRows2, [], ["TOTAL", "", payrollRows2.reduce((s, r) => s + Number(r[2]), 0), payrollRows2.reduce((s, r) => s + Number(r[3]), 0), payrollRows2.reduce((s, r) => s + Number(r[4]), 0)]];
    const payrollWs = XLSX.utils.aoa_to_sheet(payrollData);
    autoFitColumns(payrollWs, payrollData);
    styleSheet(payrollWs, 1, payrollData.length - 1, 5);
    XLSX.utils.book_append_sheet(wb, payrollWs, "Payroll");

    // Commodity Profit sheet
    const profitRows2 = commodityProfitBreakdown.map((c) => [c.commodity, c.avgBuyRate, c.avgSellRate, c.marginPerKg, c.totalWeightSold, c.totalProfit]);
    const profitData = [["Commodity", "Avg Buy Rate", "Avg Sell Rate", "Margin/kg", "Weight Sold (kg)", "Total Profit"], ...profitRows2, [], ["TOTAL", "", "", "", profitRows2.reduce((s, r) => s + Number(r[4]), 0), profitRows2.reduce((s, r) => s + Number(r[5]), 0)]];
    const profitWs = XLSX.utils.aoa_to_sheet(profitData);
    autoFitColumns(profitWs, profitData);
    styleSheet(profitWs, 1, profitData.length - 1, 6);
    XLSX.utils.book_append_sheet(wb, profitWs, "Commodity Profit");

    // Debts sheet
    const debtSheetRows = debts.map((d: any) => [d.customer_name, d.description, d.total_amount, d.paid_amount, d.balance, d.status]);
    const debtSheetData = [["Customer", "Description", "Total", "Paid", "Balance", "Status"], ...debtSheetRows, [], ["TOTAL", "", debtTotal, debtPaid, debtBalance, ""]];
    const debtWs = XLSX.utils.aoa_to_sheet(debtSheetData);
    autoFitColumns(debtWs, debtSheetData);
    styleSheet(debtWs, 1, debtSheetData.length - 1, 6);
    XLSX.utils.book_append_sheet(wb, debtWs, "Debts");

    // Savings sheet
    const savingsRows = savingsAccounts.map(a => [a.customer_name, a.balance]);
    const savingsData = [["Customer", "Balance"], ...savingsRows, [], ["Total Deposits", totalDeposits], ["Total Withdrawals", totalWithdrawals], ["Net Savings Held", netSavingsHeld]];
    const savingsWs = XLSX.utils.aoa_to_sheet(savingsData);
    autoFitColumns(savingsWs, savingsData);
    styleSheet(savingsWs, 1);
    XLSX.utils.book_append_sheet(wb, savingsWs, "Savings");

    // Style summary sheet
    const summaryWs = wb.Sheets["Summary"];
    if (summaryWs) styleSheet(summaryWs, 1, 8, 2);

    XLSX.writeFile(wb, `${filePrefix}_FullReport.xlsx`);
    toast.success("Full report downloaded!");
  };

  // CSV builders
  const agentCSV = () => [["Customer", "Commodity", "Weight", "Rate", "Amount", "Date"], ...agentEntries.map((e: any) => [e.customer_name, e.commodity, e.actual_weight, e.rate, e.amount, e.date])];
  const vipCSV = () => [["Customer", "Commodity", "Weight", "Rate", "Amount", "Date"], ...vipEntries.map((e: any) => [e.customer_name, e.commodity, e.actual_weight, e.rate, e.amount, e.date])];
  const salesCSV = () => [["Customer", "Commodity", "Weight", "Rate", "Amount", "Exchange", "Date"], ...salesEntries.map((e: any) => [e.customer_name || "", e.commodity || "", e.weight, e.rate || "", e.amount || "", e.is_exchange ? "Yes" : "No", e.date])];
  const expenseCSV = () => [["Category", "Amount", "Notes", "Date"], ...expenses.map((e: any) => [e.category, e.amount, e.notes || "", e.date])];
  const inventoryCSV = () => [["Commodity", "Bought (kg)", "Sold (kg)", "Net Change (kg)"], ...Object.entries(commodityBreakdown).map(([c, v]) => [c, String(v.bought), String(v.sold), String(v.net)])];
  const stockCSV = () => [["Commodity", "Current Weight (kg)"], ...stockData.map((s: any) => [s.commodity, String(s.weight)])];
  const payrollCSV = () => [["Worker", "Role", "Salary", "Paid", "Balance"], ...workers.map((w: any) => [w.name, w.role, String(w.salary), String(w.paid), String(w.balance)])];
  const debtCSV = () => [["Customer", "Description", "Total", "Paid", "Balance", "Status"], ...debts.map((d: any) => [d.customer_name, d.description, String(d.total_amount), String(d.paid_amount), String(d.balance), d.status])];
  const savingsCSV = () => [["Customer", "Balance"], ...savingsAccounts.map(a => [a.customer_name, String(a.balance)]), [], ["Total Deposits", String(totalDeposits)], ["Total Withdrawals", String(totalWithdrawals)], ["Net Savings Held", String(netSavingsHeld)]];
  const revenueCSV = () => [["Category", "Amount"], ["Sales Revenue", String(salesTotal)], ["Agent Purchases", String(-agentTotal)], ["VIP Purchases", String(-vipTotal)], ["Total Expenses", String(-expenseTotal)], ["Salary Paid", String(-salaryPaid)], ["Gross Profit", String(grossProfit)], ["Net Profit", String(netProfit)]];

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
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-bold">Analytics & Reports</h1>
        <div className="flex flex-wrap gap-2">
          <ReportSheetView
            symbol={symbol}
            fmt={fmt}
            rangeLabel={rangeLabel}
            currency={currency}
            salesTotal={salesTotal}
            agentTotal={agentTotal}
            vipTotal={vipTotal}
            totalPurchases={totalPurchases}
            grossProfit={grossProfit}
            expenseTotal={expenseTotal}
            salaryPaid={salaryPaid}
            salaryTotal={salaryTotal}
            salaryBalance={salaryBalance}
            netProfit={netProfit}
            agentEntries={agentEntries}
            vipEntries={vipEntries}
            salesEntries={salesEntries}
            expenses={expenses}
            workers={workers}
            stockData={stockData}
            commodityBreakdown={commodityBreakdown}
            commodityProfitBreakdown={commodityProfitBreakdown}
            debts={debts}
            debtTotal={debtTotal}
            debtPaid={debtPaid}
            debtBalance={debtBalance}
          />
          <Button onClick={downloadFullReport} className="h-10 gap-2 text-xs sm:text-sm">
            <FileSpreadsheet className="w-4 h-4" /> <span className="hidden sm:inline">Download</span> Full Report
          </Button>
        </div>
      </div>

      {/* Date Range */}
      <DateRangeSelector value={range} onChange={setRange} />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Sales Revenue", value: salesTotal, icon: <TrendingUp className="w-4 h-4 text-success" />, color: "text-success" },
          { label: "Total Purchases", value: totalPurchases, icon: <TrendingDown className="w-4 h-4 text-info" />, color: "text-info" },
          { label: "Total Expenses", value: expenseTotal, icon: <DollarSign className="w-4 h-4 text-destructive" />, color: "text-destructive" },
          { label: "Debt Balance", value: debtBalance, icon: <CreditCard className="w-4 h-4 text-orange-500" />, color: debtBalance > 0 ? "text-orange-500" : "text-success" },
          { label: "Net Profit", value: netProfit, icon: <BarChart3 className="w-4 h-4 text-primary" />, color: netProfit >= 0 ? "text-success" : "text-destructive" },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 mb-1">{kpi.icon}<span className="text-xs text-muted-foreground">{kpi.label}</span></div>
            <p className={`text-lg sm:text-xl font-bold font-mono ${kpi.color} break-all`}>{symbol}{fmt(kpi.value)}</p>
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
            <StatRow label="Gross Profit (Sales Margin)" value={grossProfit} bold />
            <StatRow label="Net Profit (Gross - Expenses)" value={netProfit} bold />
          </div>
        </AnalyticsSection>

        {/* Debt Summary */}
        <AnalyticsSection
          title={`Debts (${debts.length})`}
          icon={<CreditCard className="w-4 h-4 text-orange-500" />}
          csvRows={debtCSV()}
          csvFilename={`${filePrefix}_Debts.csv`}
        >
          <div className="space-y-0.5">
            <StatRow label="Total Debt" value={debtTotal} />
            <StatRow label="Paid" value={debtPaid} />
            <StatRow label="Outstanding Balance" value={debtBalance} bold />
          </div>
          <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
            {debts.length === 0 && <p className="text-sm text-muted-foreground">No debts</p>}
            {debts.map((d: any) => (
              <div key={d.id} className="flex justify-between text-sm py-1 border-b border-border/50">
                <span className="truncate mr-2">{d.customer_name} {d.description ? `(${d.description})` : ""}</span>
                <div className="flex gap-2 font-mono text-xs shrink-0">
                  <span className="text-orange-500">{symbol}{fmt(Number(d.balance))}</span>
                  <Badge variant={d.status === "paid" ? "default" : "secondary"} className="text-[10px] h-4">{d.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </AnalyticsSection>

        {/* Agent Entries */}
        <AnalyticsSection
          title={`Agent Entries (${agentEntries.length})`}
          icon={<Users className="w-4 h-4 text-info" />}
          csvRows={agentCSV()}
          csvFilename={`${filePrefix}_Agents.csv`}
        >
          <div className="max-h-64 overflow-y-auto">
            {agentEntries.length === 0 && <p className="text-sm text-muted-foreground">No entries</p>}
            <Accordion type="multiple" className="w-full">
              {groupEntriesByCustomer(agentEntries).map((g) => (
                <AccordionItem key={g.customerName} value={g.customerName}>
                  <AccordionTrigger className="py-2 text-sm hover:no-underline">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{g.customerName}</span>
                        <Badge variant="secondary" className="text-[10px] h-5 shrink-0">{g.count}</Badge>
                      </div>
                      <span className="ml-auto font-mono text-info whitespace-nowrap text-xs">{fmt(g.totalWeight)}kg · {symbol}{fmt(g.totalAmount)}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {g.entries.map((e: any) => (
                      <div key={e.id} className="flex justify-between text-xs py-1 border-b border-border/30 pl-2">
                        <span className="truncate mr-2">{e.commodity} · {e.actual_weight}kg @ {symbol}{fmt(Number(e.rate))}</span>
                        <span className="font-mono text-info whitespace-nowrap">{symbol}{fmt(Number(e.amount))}</span>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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
          <div className="max-h-64 overflow-y-auto">
            {vipEntries.length === 0 && <p className="text-sm text-muted-foreground">No entries</p>}
            <Accordion type="multiple" className="w-full">
              {groupEntriesByCustomer(vipEntries).map((g) => (
                <AccordionItem key={g.customerName} value={g.customerName}>
                  <AccordionTrigger className="py-2 text-sm hover:no-underline">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{g.customerName}</span>
                        <Badge variant="secondary" className="text-[10px] h-5 shrink-0">{g.count}</Badge>
                      </div>
                      <span className="ml-auto font-mono text-primary whitespace-nowrap text-xs">{fmt(g.totalWeight)}kg · {symbol}{fmt(g.totalAmount)}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {g.entries.map((e: any) => (
                      <div key={e.id} className="flex justify-between text-xs py-1 border-b border-border/30 pl-2">
                        <span className="truncate mr-2">{e.commodity} · {e.actual_weight}kg @ {symbol}{fmt(Number(e.rate))}</span>
                        <span className="font-mono text-primary whitespace-nowrap">{symbol}{fmt(Number(e.amount))}</span>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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
          <div className="max-h-64 overflow-y-auto">
            {salesEntries.length === 0 && <p className="text-sm text-muted-foreground">No entries</p>}
            <Accordion type="multiple" className="w-full">
              {groupEntriesByCustomer(salesEntries, "weight").map((g) => (
                <AccordionItem key={g.customerName} value={g.customerName}>
                  <AccordionTrigger className="py-2 text-sm hover:no-underline">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{g.customerName || "No Name"}</span>
                        <Badge variant="secondary" className="text-[10px] h-5 shrink-0">{g.count}</Badge>
                      </div>
                      <span className="ml-auto font-mono text-success whitespace-nowrap text-xs">{fmt(g.totalWeight)}kg · {symbol}{fmt(g.totalAmount)}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {g.entries.map((e: any) => (
                      <div key={e.id} className="flex justify-between text-xs py-1 border-b border-border/30 pl-2">
                        <span className="truncate mr-2">{e.commodity || "Exchange"} · {e.weight}kg {e.rate ? `@ ${symbol}${fmt(Number(e.rate))}` : ""}</span>
                        <span className="font-mono text-success whitespace-nowrap">{e.amount ? `${symbol}${fmt(Number(e.amount))}` : "Exchange"}</span>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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

        {/* Commodity Flow */}
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

        {/* Commodity Profit Breakdown */}
        <AnalyticsSection
          title="Commodity Profit Breakdown"
          icon={<BarChart3 className="w-4 h-4 text-primary" />}
          csvRows={[
            ["Commodity", "Avg Buy Rate", "Avg Sell Rate", "Margin/kg", "Weight Sold (kg)", "Total Profit"],
            ...commodityProfitBreakdown.map((c) => [c.commodity, fmt(c.avgBuyRate), fmt(c.avgSellRate), fmt(c.marginPerKg), fmt(c.totalWeightSold), fmt(c.totalProfit)]),
          ]}
          csvFilename={`${filePrefix}_CommodityProfit.csv`}
        >
          <div className="space-y-1">
            {commodityProfitBreakdown.length === 0 && <p className="text-sm text-muted-foreground">No data</p>}
            <div className="hidden sm:grid grid-cols-6 text-xs text-muted-foreground font-medium pb-1 border-b border-border">
              <span>Commodity</span><span className="text-right">Buy/kg</span><span className="text-right">Sell/kg</span>
              <span className="text-right">Margin/kg</span><span className="text-right">Sold (kg)</span><span className="text-right">Profit</span>
            </div>
            {commodityProfitBreakdown.map((c) => (
              <div key={c.commodity}>
                <div className="hidden sm:grid grid-cols-6 text-sm py-1.5 border-b border-border/50">
                  <span className="truncate font-medium">{c.commodity}</span>
                  <span className="text-right font-mono text-info">{symbol}{fmt(c.avgBuyRate)}</span>
                  <span className="text-right font-mono text-success">{symbol}{fmt(c.avgSellRate)}</span>
                  <span className={`text-right font-mono font-semibold ${c.marginPerKg >= 0 ? "text-success" : "text-destructive"}`}>{symbol}{fmt(c.marginPerKg)}</span>
                  <span className="text-right font-mono">{fmt(c.totalWeightSold)}</span>
                  <span className={`text-right font-mono font-bold ${c.totalProfit >= 0 ? "text-success" : "text-destructive"}`}>{symbol}{fmt(c.totalProfit)}</span>
                </div>
                <div className="sm:hidden border border-border/50 rounded-lg p-2 space-y-1">
                  <p className="font-medium text-sm">{c.commodity}</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className="text-muted-foreground">Buy: <span className="font-mono text-info">{symbol}{fmt(c.avgBuyRate)}</span></span>
                    <span className="text-muted-foreground">Sell: <span className="font-mono text-success">{symbol}{fmt(c.avgSellRate)}</span></span>
                    <span className="text-muted-foreground">Sold: <span className="font-mono">{fmt(c.totalWeightSold)}kg</span></span>
                    <span className={`font-mono font-bold ${c.totalProfit >= 0 ? "text-success" : "text-destructive"}`}>Profit: {symbol}{fmt(c.totalProfit)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {commodityProfitBreakdown.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border flex justify-between font-bold text-sm">
              <span>Total</span>
              <span className={`font-mono ${commodityProfitBreakdown.reduce((s, c) => s + c.totalProfit, 0) >= 0 ? "text-success" : "text-destructive"}`}>
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
              <div key={w.id} className="flex flex-wrap justify-between gap-x-2 text-sm py-1 border-b border-border/50">
                <span className="truncate min-w-0">{w.name}</span>
                <div className="flex gap-3 font-mono text-xs sm:text-sm">
                  <span>{symbol}{fmt(Number(w.salary))}</span>
                  <span className="text-success">{symbol}{fmt(Number(w.paid))}</span>
                  <span className="text-destructive">{symbol}{fmt(Number(w.balance))}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-border flex flex-wrap justify-between gap-x-2 font-bold text-sm">
            <span>Total</span>
            <div className="flex gap-3 font-mono text-xs sm:text-sm">
              <span>{symbol}{fmt(salaryTotal)}</span>
              <span className="text-success">{symbol}{fmt(salaryPaid)}</span>
              <span className="text-destructive">{symbol}{fmt(salaryBalance)}</span>
            </div>
          </div>
        </AnalyticsSection>

        {/* Savings Summary */}
        <AnalyticsSection
          title={`Savings (${savingsAccounts.length} accounts)`}
          icon={<PiggyBank className="w-4 h-4 text-primary" />}
          csvRows={savingsCSV()}
          csvFilename={`${filePrefix}_Savings.csv`}
        >
          <div className="space-y-1">
            <StatRow label="Total Deposits" value={totalDeposits} />
            <StatRow label="Total Withdrawals" value={totalWithdrawals} negative />
            <StatRow label="Net Savings Held" value={netSavingsHeld} bold />
          </div>
          <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
            {savingsAccounts.length === 0 && <p className="text-sm text-muted-foreground">No savings accounts</p>}
            {savingsAccounts.map((a: any) => (
              <div key={a.id} className="flex justify-between text-sm py-1 border-b border-border/50">
                <span className="truncate">{a.customer_name}</span>
                <span className="font-mono font-bold">{symbol}{fmt(Number(a.balance))}</span>
              </div>
            ))}
          </div>
        </AnalyticsSection>
      </div>
    </div>
  );
};

export default FinancialReportPage;
