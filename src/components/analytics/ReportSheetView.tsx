import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface ReportSheetViewProps {
  symbol: string;
  fmt: (n: number) => string;
  rangeLabel: string;
  currency: string;
  salesTotal: number;
  agentTotal: number;
  vipTotal: number;
  totalPurchases: number;
  grossProfit: number;
  expenseTotal: number;
  salaryPaid: number;
  salaryTotal: number;
  salaryBalance: number;
  netProfit: number;
  agentEntries: any[];
  vipEntries: any[];
  salesEntries: any[];
  expenses: any[];
  workers: any[];
  stockData: any[];
  commodityBreakdown: Record<string, { bought: number; sold: number; net: number }>;
  commodityProfitBreakdown: { commodity: string; avgBuyRate: number; avgSellRate: number; marginPerKg: number; totalWeightSold: number; totalProfit: number }[];
}

const ReportSheetView = ({
  symbol, fmt, rangeLabel, currency,
  salesTotal, agentTotal, vipTotal, totalPurchases, grossProfit,
  expenseTotal, salaryPaid, salaryTotal, salaryBalance, netProfit,
  agentEntries, vipEntries, salesEntries, expenses, workers, stockData,
  commodityBreakdown, commodityProfitBreakdown,
}: ReportSheetViewProps) => {

  const openInExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Summary sheet
    const summaryData = [
      ["RACHEL SCRAP LTD - FINANCIAL REPORT"],
      [`Period: ${rangeLabel}`, `Currency: ${currency}`, `Generated: ${new Date().toLocaleString()}`],
      [],
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
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

    // 2. Agent Entries sheet
    const agentData = [
      ["Customer", "Commodity", "Weight (kg)", "Rate", "Amount", "Date"],
      ...agentEntries.map((e: any) => [e.customer_name, e.commodity, Number(e.actual_weight), Number(e.rate), Number(e.amount), e.date]),
      [],
      ["", "", "", "TOTAL:", agentTotal, ""],
    ];
    const agentWs = XLSX.utils.aoa_to_sheet(agentData);
    agentWs["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, agentWs, "Agent Entries");

    // 3. VIP Entries sheet
    const vipData = [
      ["Customer", "Commodity", "Weight (kg)", "Rate", "Amount", "Date"],
      ...vipEntries.map((e: any) => [e.customer_name, e.commodity, Number(e.actual_weight), Number(e.rate), Number(e.amount), e.date]),
      [],
      ["", "", "", "TOTAL:", vipTotal, ""],
    ];
    const vipWs = XLSX.utils.aoa_to_sheet(vipData);
    vipWs["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, vipWs, "VIP Entries");

    // 4. Sales Entries sheet
    const salesData = [
      ["Customer", "Commodity", "Weight (kg)", "Rate", "Amount", "Exchange", "Date"],
      ...salesEntries.map((e: any) => [
        e.customer_name || "", e.commodity || "Exchange", Number(e.weight),
        e.rate ? Number(e.rate) : "", e.amount ? Number(e.amount) : "", e.is_exchange ? "Yes" : "No", e.date,
      ]),
      [],
      ["", "", "", "", salesTotal, "TOTAL", ""],
    ];
    const salesWs = XLSX.utils.aoa_to_sheet(salesData);
    salesWs["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, salesWs, "Sales Entries");

    // 5. Expenses sheet
    const expData = [
      ["Category", "Amount", "Notes", "Date"],
      ...expenses.map((e: any) => [e.category, Number(e.amount), e.notes || "", e.date]),
      [],
      ["TOTAL:", expenseTotal, "", ""],
    ];
    const expWs = XLSX.utils.aoa_to_sheet(expData);
    expWs["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 24 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, expWs, "Expenses");

    // 6. Commodity Flow sheet
    const commodityRows = Object.entries(commodityBreakdown);
    const totalBought = commodityRows.reduce((s, [, v]) => s + v.bought, 0);
    const totalSold = commodityRows.reduce((s, [, v]) => s + v.sold, 0);
    const totalNet = commodityRows.reduce((s, [, v]) => s + v.net, 0);
    const invData = [
      ["Commodity", "Bought (kg)", "Sold (kg)", "Net (kg)"],
      ...commodityRows.map(([c, v]) => [c, v.bought, v.sold, v.net]),
      [],
      ["TOTAL:", totalBought, totalSold, totalNet],
    ];
    const invWs = XLSX.utils.aoa_to_sheet(invData);
    invWs["!cols"] = [{ wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, invWs, "Commodity Flow");

    // 7. Current Stock sheet
    const totalStock = stockData.reduce((s: number, x: any) => s + Number(x.weight), 0);
    const stockSheetData = [
      ["Commodity", "Weight (kg)"],
      ...stockData.map((s: any) => [s.commodity, Number(s.weight)]),
      [],
      ["TOTAL:", totalStock],
    ];
    const stockWs = XLSX.utils.aoa_to_sheet(stockSheetData);
    stockWs["!cols"] = [{ wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, stockWs, "Current Stock");

    // 8. Payroll sheet
    const payrollData = [
      ["Worker", "Role", "Salary", "Paid", "Balance"],
      ...workers.map((w: any) => [w.name, w.role, Number(w.salary), Number(w.paid), Number(w.balance)]),
      [],
      ["TOTAL:", "", salaryTotal, salaryPaid, salaryBalance],
    ];
    const payrollWs = XLSX.utils.aoa_to_sheet(payrollData);
    payrollWs["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, payrollWs, "Payroll");

    // 9. Commodity Profit sheet
    const totalCommodityProfit = commodityProfitBreakdown.reduce((s, c) => s + c.totalProfit, 0);
    const profitData = [
      ["Commodity", "Avg Buy Rate", "Avg Sell Rate", "Margin/kg", "Weight Sold (kg)", "Total Profit"],
      ...commodityProfitBreakdown.map((c) => [c.commodity, c.avgBuyRate, c.avgSellRate, c.marginPerKg, c.totalWeightSold, c.totalProfit]),
      [],
      ["TOTAL:", "", "", "", "", totalCommodityProfit],
    ];
    const profitWs = XLSX.utils.aoa_to_sheet(profitData);
    profitWs["!cols"] = [{ wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, profitWs, "Commodity Profit");

    // Generate and download
    const fileName = `RachelScrap_${rangeLabel.replace(/ /g, "")}_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Excel report opened!");
  };

  return (
    <Button variant="outline" className="h-10 gap-2" onClick={openInExcel}>
      <Eye className="w-4 h-4" /> View in Excel
    </Button>
  );
};

export default ReportSheetView;
