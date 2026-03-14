import { useState } from "react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet, TrendingUp, TrendingDown, DollarSign,
  BarChart3, Package, Users, Receipt, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAnalyticsData, DateRangeValue } from "@/hooks/useAnalyticsData";
import { downloadCSV } from "@/utils/downloadCSV";
import { groupEntriesByCustomer } from "@/utils/groupEntries";
import * as XLSX from "xlsx";
import DateRangeSelector from "@/components/analytics/DateRangeSelector";
import AnalyticsSection from "@/components/analytics/AnalyticsSection";
import AnalyticsCharts from "@/components/analytics/AnalyticsCharts";
import ReportSheetView from "@/components/analytics/ReportSheetView";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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

  const rangeLabel = range.preset === "custom" 
    ? "Custom" 
    : range.preset.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const filePrefix = `RachelScrap_${rangeLabel.replace(/ /g, "")}_${new Date().toISOString().split("T")[0]}`;

  // Helper to auto-fit column widths (snug, not too big)
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

  // Helper to style headers bold and freeze top row(s)
  const styleSheet = (ws: XLSX.WorkSheet, headerRows: number = 1, totalRowIdx?: number, totalCols?: number) => {
    // Freeze header rows
    ws["!freeze"] = { xSplit: 0, ySplit: headerRows };
    // Bold headers
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
    // Bold total row
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

  // Full report as multi-sheet Excel
  const downloadFullReport = () => {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ["Metric", "Amount"],
      ["Sales Revenue", salesTotal],
      ["Agent Purchases", agentTotal],
      ["VIP Purchases", vipTotal],
      ["Total Purchases", totalPurchases],
      ["Gross Profit", grossProfit],
      ["Total Expenses", expenseTotal],
      ["Salary Paid", salaryPaid],
      ["Net Profit", netProfit],
    ];
    XLSX.utils.book_append_sheet(wb, autoFitColumns(XLSX.utils.aoa_to_sheet(summaryData), summaryData), "Summary");

    // Helper to build commodity-column sheet for Agent/VIP entries
    const buildCommoditySheet = (entries: any[], sheetName: string) => {
      // Get unique commodities and their rates
      const commoditySet = new Map<string, number>();
      entries.forEach((e: any) => {
        if (!commoditySet.has(e.commodity)) {
          commoditySet.set(e.commodity, Number(e.rate));
        }
      });
      const commodityNames = Array.from(commoditySet.keys());

      // Header row: Date | Customer | Commodity1 Weight | Commodity1 Amount | Commodity2 Weight | ...
      const header: string[] = ["Date", "Customer"];
      commodityNames.forEach(c => {
        header.push(`${c} (kg)`, `${c} Amount`);
      });
      header.push("Total Amount");

      // Rate row
      const rateRow: any[] = ["", "Rate →"];
      commodityNames.forEach(c => {
        rateRow.push("", commoditySet.get(c) || 0);
      });
      rateRow.push("");

      // Group entries by date+customer
      const groupKey = (e: any) => `${e.date}|||${e.customer_name}`;
      const groups = new Map<string, any[]>();
      entries.forEach((e: any) => {
        const k = groupKey(e);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(e);
      });

      // Build data rows with formulas
      const dataRows: any[][] = [];
      const sortedKeys = Array.from(groups.keys()).sort();
      sortedKeys.forEach(key => {
        const [date, customer] = key.split("|||");
        const row: any[] = [date, customer];
        const group = groups.get(key)!;

        // Aggregate weights per commodity for this group
        const weightByCommodity: Record<string, number> = {};
        group.forEach((e: any) => {
          weightByCommodity[e.commodity] = (weightByCommodity[e.commodity] || 0) + Number(e.actual_weight);
        });

        commodityNames.forEach(c => {
          const weight = weightByCommodity[c] || 0;
          row.push(weight > 0 ? weight : "");
          row.push(""); // placeholder for formula
        });
        row.push(""); // placeholder for total formula
        dataRows.push(row);
      });

      // Build full AOA (header + rate + data + blank + total)
      const aoa: any[][] = [header, rateRow, ...dataRows, []];
      // Total row
      const totalRow: any[] = ["TOTAL", ""];
      commodityNames.forEach(() => {
        totalRow.push("", ""); // placeholders
      });
      totalRow.push("");
      aoa.push(totalRow);

      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Now inject formulas
      // Row 0 = header, Row 1 = rate row, Row 2+ = data rows
      // Rate for commodity i is at column (2 + i*2 + 1) in row 2 (0-indexed row 1)
      const dataStartRow = 3; // 1-indexed (row 3 in Excel)
      const totalExcelRow = dataStartRow + dataRows.length + 1; // after blank row

      dataRows.forEach((_, rowIdx) => {
        const excelRow = dataStartRow + rowIdx;
        let amountCols: string[] = [];

        commodityNames.forEach((_, cIdx) => {
          const weightCol = XLSX.utils.encode_col(2 + cIdx * 2);     // weight column
          const amountCol = XLSX.utils.encode_col(2 + cIdx * 2 + 1); // amount column
          const rateCell = `${amountCol}$2`; // rate is in row 2, same column as amount
          const weightCell = `${weightCol}${excelRow}`;
          const amountCellRef = `${amountCol}${excelRow}`;

          // Formula: weight * rate
          ws[amountCellRef] = { t: 'n', f: `IF(${weightCell}="",0,${weightCell}*${rateCell})` };
          amountCols.push(amountCellRef);
        });

        // Total Amount formula = sum of all amount cells in this row
        const totalCol = XLSX.utils.encode_col(2 + commodityNames.length * 2);
        const totalCell = `${totalCol}${excelRow}`;
        const sumParts = commodityNames.map((_, cIdx) => {
          const amountCol = XLSX.utils.encode_col(2 + cIdx * 2 + 1);
          return `${amountCol}${excelRow}`;
        });
        ws[totalCell] = { t: 'n', f: sumParts.join("+") };
      });

      // Total row formulas
      if (dataRows.length > 0) {
        commodityNames.forEach((_, cIdx) => {
          // Sum weight column
          const weightCol = XLSX.utils.encode_col(2 + cIdx * 2);
          ws[`${weightCol}${totalExcelRow}`] = { t: 'n', f: `SUM(${weightCol}${dataStartRow}:${weightCol}${dataStartRow + dataRows.length - 1})` };
          // Sum amount column
          const amountCol = XLSX.utils.encode_col(2 + cIdx * 2 + 1);
          ws[`${amountCol}${totalExcelRow}`] = { t: 'n', f: `SUM(${amountCol}${dataStartRow}:${amountCol}${dataStartRow + dataRows.length - 1})` };
        });
        // Grand total
        const totalCol = XLSX.utils.encode_col(2 + commodityNames.length * 2);
        ws[`${totalCol}${totalExcelRow}`] = { t: 'n', f: `SUM(${totalCol}${dataStartRow}:${totalCol}${dataStartRow + dataRows.length - 1})` };
      }

      autoFitColumns(ws, aoa);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    // Helper to build grouped-by-customer sheet for Agent/VIP
    const buildGroupedSheet = (entries: any[], sheetName: string) => {
      const groups = groupEntriesByCustomer(entries);
      const aoa: any[][] = [
        ["Customer", "Commodity", "Weight (kg)", "Rate", "Amount", "Date"],
      ];
      groups.forEach(g => {
        g.entries.forEach((e: any) => {
          aoa.push([e.customer_name, e.commodity, Number(e.actual_weight), Number(e.rate), Number(e.amount), e.date]);
        });
        // Subtotal row per customer
        aoa.push([`${g.customerName} TOTAL (${g.count} entries)`, g.commodities.join(", "), g.totalWeight, "", g.totalAmount, ""]);
        aoa.push([]); // blank separator
      });
      // Grand total
      const grandWeight = entries.reduce((s: number, e: any) => s + Number(e.actual_weight), 0);
      const grandAmount = entries.reduce((s: number, e: any) => s + Number(e.amount), 0);
      aoa.push(["GRAND TOTAL", "", grandWeight, "", grandAmount, ""]);

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      autoFitColumns(ws, aoa);
      styleSheet(ws, 1, aoa.length - 1, 6);
      // Bold each subtotal row
      let rowIdx = 1;
      groups.forEach(g => {
        rowIdx += g.entries.length;
        for (let c = 0; c < 6; c++) {
          const addr = XLSX.utils.encode_cell({ r: rowIdx, c });
          if (ws[addr]) ws[addr].s = { font: { bold: true } };
        }
        rowIdx += 2; // subtotal + blank
      });
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    buildGroupedSheet(agentEntries, "Agent Entries");
    buildGroupedSheet(vipEntries, "VIP Entries");

    // Sales Entries sheet
    const salesRows2 = salesEntries.map((e: any) => [e.customer_name || "", e.commodity || "", e.weight, e.rate || "", e.amount || 0, e.is_exchange ? "Yes" : "No", e.date]);
    const salesData = [
      ["Customer", "Commodity", "Weight (kg)", "Rate", "Amount", "Exchange", "Date"],
      ...salesRows2,
      [],
      ["TOTAL", "", salesRows2.reduce((s, r) => s + Number(r[2]), 0), "", salesRows2.reduce((s, r) => s + Number(r[4]), 0), "", ""],
    ];
    const salesWs = XLSX.utils.aoa_to_sheet(salesData);
    autoFitColumns(salesWs, salesData);
    styleSheet(salesWs, 1, salesData.length - 1, 7);
    XLSX.utils.book_append_sheet(wb, salesWs, "Sales Entries");

    // Expenses sheet
    const expRows2 = expenses.map((e: any) => [e.category, e.amount, e.notes || "", e.date]);
    const expData = [
      ["Category", "Amount", "Notes", "Date"],
      ...expRows2,
      [],
      ["TOTAL", expRows2.reduce((s, r) => s + Number(r[1]), 0), "", ""],
    ];
    const expWs = XLSX.utils.aoa_to_sheet(expData);
    autoFitColumns(expWs, expData);
    styleSheet(expWs, 1, expData.length - 1, 4);
    XLSX.utils.book_append_sheet(wb, expWs, "Expenses");

    // Commodity Flow sheet
    const flowRows = Object.entries(commodityBreakdown).map(([c, v]) => [c, v.bought, v.sold, v.net]);
    const flowData = [
      ["Commodity", "Bought (kg)", "Sold (kg)", "Net Change (kg)"],
      ...flowRows,
      [],
      ["TOTAL", flowRows.reduce((s, r) => s + Number(r[1]), 0), flowRows.reduce((s, r) => s + Number(r[2]), 0), flowRows.reduce((s, r) => s + Number(r[3]), 0)],
    ];
    const flowWs = XLSX.utils.aoa_to_sheet(flowData);
    autoFitColumns(flowWs, flowData);
    styleSheet(flowWs, 1, flowData.length - 1, 4);
    XLSX.utils.book_append_sheet(wb, flowWs, "Commodity Flow");

    // Current Stock sheet
    const stockRows2 = stockData.map((s: any) => [s.commodity, s.weight]);
    const stockSheetData = [
      ["Commodity", "Weight (kg)"],
      ...stockRows2,
      [],
      ["TOTAL", stockRows2.reduce((s, r) => s + Number(r[1]), 0)],
    ];
    const stockWs = XLSX.utils.aoa_to_sheet(stockSheetData);
    autoFitColumns(stockWs, stockSheetData);
    styleSheet(stockWs, 1, stockSheetData.length - 1, 2);
    XLSX.utils.book_append_sheet(wb, stockWs, "Current Stock");

    // Payroll sheet
    const payrollRows2 = workers.map((w: any) => [w.name, w.role, w.salary, w.paid, w.balance]);
    const payrollData = [
      ["Worker", "Role", "Salary", "Paid", "Balance"],
      ...payrollRows2,
      [],
      ["TOTAL", "", payrollRows2.reduce((s, r) => s + Number(r[2]), 0), payrollRows2.reduce((s, r) => s + Number(r[3]), 0), payrollRows2.reduce((s, r) => s + Number(r[4]), 0)],
    ];
    const payrollWs = XLSX.utils.aoa_to_sheet(payrollData);
    autoFitColumns(payrollWs, payrollData);
    styleSheet(payrollWs, 1, payrollData.length - 1, 5);
    XLSX.utils.book_append_sheet(wb, payrollWs, "Payroll");

    // Commodity Profit sheet
    const profitRows2 = commodityProfitBreakdown.map((c) => [c.commodity, c.avgBuyRate, c.avgSellRate, c.marginPerKg, c.totalWeightSold, c.totalProfit]);
    const profitData = [
      ["Commodity", "Avg Buy Rate", "Avg Sell Rate", "Margin/kg", "Weight Sold (kg)", "Total Profit"],
      ...profitRows2,
      [],
      ["TOTAL", "", "", "", profitRows2.reduce((s, r) => s + Number(r[4]), 0), profitRows2.reduce((s, r) => s + Number(r[5]), 0)],
    ];
    const profitWs = XLSX.utils.aoa_to_sheet(profitData);
    autoFitColumns(profitWs, profitData);
    styleSheet(profitWs, 1, profitData.length - 1, 6);
    XLSX.utils.book_append_sheet(wb, profitWs, "Commodity Profit");

    // Style summary sheet too
    const summaryWs = wb.Sheets["Summary"];
    if (summaryWs) styleSheet(summaryWs, 1, 8, 2);

    XLSX.writeFile(wb, `${filePrefix}_FullReport.xlsx`);
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
        <div className="flex gap-2">
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
          />
          <Button onClick={downloadFullReport} className="h-10 gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Download Full Report
          </Button>
        </div>
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
            <StatRow label="Gross Profit (Sales Margin)" value={grossProfit} bold />
            <StatRow label="Net Profit (Gross - Expenses - Salary)" value={netProfit} bold />
          </div>
        </AnalyticsSection>

        {/* Agent Entries - Grouped */}
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
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-medium truncate">{g.customerName}</span>
                      <Badge variant="secondary" className="text-[10px] h-5">{g.count}</Badge>
                      <span className="text-xs text-muted-foreground truncate">{g.commodities.join(", ")}</span>
                      <span className="ml-auto font-mono text-info whitespace-nowrap">{fmt(g.totalWeight)}kg · {symbol}{fmt(g.totalAmount)}</span>
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

        {/* VIP Entries - Grouped */}
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
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-medium truncate">{g.customerName}</span>
                      <Badge variant="secondary" className="text-[10px] h-5">{g.count}</Badge>
                      <span className="text-xs text-muted-foreground truncate">{g.commodities.join(", ")}</span>
                      <span className="ml-auto font-mono text-primary whitespace-nowrap">{fmt(g.totalWeight)}kg · {symbol}{fmt(g.totalAmount)}</span>
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
