import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  startOfDay, endOfDay, subDays, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths, subYears
} from "date-fns";

export type DateRange =
  | "today" | "yesterday" | "this_week" | "last_week"
  | "this_month" | "last_month" | "this_year" | "last_year" | "all_time";

function getDateBounds(range: DateRange): { from: string | null; to: string | null } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString();

  switch (range) {
    case "today":
      return { from: fmt(startOfDay(now)), to: fmt(endOfDay(now)) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { from: fmt(startOfDay(y)), to: fmt(endOfDay(y)) };
    }
    case "this_week":
      return { from: fmt(startOfWeek(now, { weekStartsOn: 1 })), to: fmt(endOfWeek(now, { weekStartsOn: 1 })) };
    case "last_week": {
      const lw = subWeeks(now, 1);
      return { from: fmt(startOfWeek(lw, { weekStartsOn: 1 })), to: fmt(endOfWeek(lw, { weekStartsOn: 1 })) };
    }
    case "this_month":
      return { from: fmt(startOfMonth(now)), to: fmt(endOfMonth(now)) };
    case "last_month": {
      const lm = subMonths(now, 1);
      return { from: fmt(startOfMonth(lm)), to: fmt(endOfMonth(lm)) };
    }
    case "this_year":
      return { from: fmt(startOfYear(now)), to: fmt(endOfYear(now)) };
    case "last_year": {
      const ly = subYears(now, 1);
      return { from: fmt(startOfYear(ly)), to: fmt(endOfYear(ly)) };
    }
    case "all_time":
      return { from: null, to: null };
  }
}

export interface DailyProfit {
  date: string;
  sales: number;
  purchases: number;
  expenses: number;
  profit: number;
}

export interface CommodityProfit {
  commodity: string;
  avgBuyRate: number;
  avgSellRate: number;
  marginPerKg: number;
  totalWeightSold: number;
  totalProfit: number;
}

export interface AnalyticsData {
  agentEntries: any[];
  vipEntries: any[];
  salesEntries: any[];
  expenses: any[];
  workers: any[];
  stockData: any[];
  agentTotal: number;
  vipTotal: number;
  salesTotal: number;
  expenseTotal: number;
  salaryTotal: number;
  salaryPaid: number;
  salaryBalance: number;
  totalPurchases: number;
  grossProfit: number;
  netProfit: number;
  commodityBreakdown: Record<string, { bought: number; sold: number; net: number }>;
  dailyProfitTrend: DailyProfit[];
  commodityProfitBreakdown: CommodityProfit[];
}

export function useAnalyticsData(range: DateRange) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { from, to } = getDateBounds(range);

    const applyRange = (q: any) => {
      if (from) q = q.gte("created_at", from);
      if (to) q = q.lte("created_at", to);
      return q;
    };

    const [agents, vips, sales, exps, workers, stock] = await Promise.all([
      applyRange(supabase.from("agent_entries").select("*")),
      applyRange(supabase.from("vip_entries").select("*")),
      applyRange(supabase.from("sales_entries").select("*")),
      applyRange(supabase.from("expenses").select("*")),
      supabase.from("workers").select("*"),
      supabase.from("persistent_stock").select("*"),
    ]);

    const agentRows = agents.data || [];
    const vipRows = vips.data || [];
    const salesRows = sales.data || [];
    const expRows = exps.data || [];
    const workerRows = workers.data || [];
    const stockRows = stock.data || [];

    const agentTotal = agentRows.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const vipTotal = vipRows.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const salesTotal = salesRows.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const expenseTotal = expRows.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const salaryTotal = workerRows.reduce((s: number, x: any) => s + Number(x.salary), 0);
    const salaryPaid = workerRows.reduce((s: number, x: any) => s + Number(x.paid), 0);
    const salaryBalance = workerRows.reduce((s: number, x: any) => s + Number(x.balance), 0);

    const totalPurchases = agentTotal + vipTotal;

    // Calculate weighted average purchase rate per commodity
    const purchaseWeights: Record<string, { totalWeight: number; totalCost: number }> = {};
    const ensurePW = (c: string) => { if (!purchaseWeights[c]) purchaseWeights[c] = { totalWeight: 0, totalCost: 0 }; };
    agentRows.forEach((e: any) => {
      ensurePW(e.commodity);
      purchaseWeights[e.commodity].totalWeight += Number(e.actual_weight);
      purchaseWeights[e.commodity].totalCost += Number(e.amount);
    });
    vipRows.forEach((e: any) => {
      ensurePW(e.commodity);
      purchaseWeights[e.commodity].totalWeight += Number(e.actual_weight);
      purchaseWeights[e.commodity].totalCost += Number(e.amount);
    });

    // Gross profit = for each sale, (sale_rate - avg_buy_rate) × weight
    // For exchanges (no rate/weight), just count the exchange fee as revenue
    let grossProfit = 0;
    salesRows.forEach((e: any) => {
      const commodity = e.commodity;
      const saleRate = Number(e.rate || 0);
      const saleWeight = Number(e.weight || 0);
      const saleAmount = Number(e.amount || 0);

      if (e.is_exchange || !commodity || saleWeight === 0) {
        // Exchange entries: fee is pure revenue (no commodity cost)
        grossProfit += saleAmount;
      } else {
        // Regular sale: profit = (sell_rate - avg_buy_rate) × weight
        const pw = purchaseWeights[commodity];
        const avgBuyRate = pw && pw.totalWeight > 0 ? pw.totalCost / pw.totalWeight : 0;
        grossProfit += (saleRate - avgBuyRate) * saleWeight;
      }
    });

    const netProfit = grossProfit - expenseTotal - salaryPaid;

    // Commodity breakdown
    const cb: Record<string, { bought: number; sold: number; net: number }> = {};
    const ensure = (c: string) => { if (!cb[c]) cb[c] = { bought: 0, sold: 0, net: 0 }; };
    agentRows.forEach((e: any) => { ensure(e.commodity); cb[e.commodity].bought += Number(e.actual_weight); });
    vipRows.forEach((e: any) => { ensure(e.commodity); cb[e.commodity].bought += Number(e.actual_weight); });
    salesRows.forEach((e: any) => { if (e.commodity) { ensure(e.commodity); cb[e.commodity].sold += Number(e.weight); } });
    Object.keys(cb).forEach(c => { cb[c].net = cb[c].bought - cb[c].sold; });

    // Daily profit trend
    const dailyMap: Record<string, { sales: number; purchases: number; expenses: number }> = {};
    const ensureDay = (d: string) => { if (!dailyMap[d]) dailyMap[d] = { sales: 0, purchases: 0, expenses: 0 }; };
    salesRows.forEach((e: any) => { const d = e.date || e.created_at?.split("T")[0]; ensureDay(d); dailyMap[d].sales += Number(e.amount || 0); });
    agentRows.forEach((e: any) => { const d = e.date || e.created_at?.split("T")[0]; ensureDay(d); dailyMap[d].purchases += Number(e.amount); });
    vipRows.forEach((e: any) => { const d = e.date || e.created_at?.split("T")[0]; ensureDay(d); dailyMap[d].purchases += Number(e.amount); });
    expRows.forEach((e: any) => { const d = e.date || e.created_at?.split("T")[0]; ensureDay(d); dailyMap[d].expenses += Number(e.amount); });
    const dailyProfitTrend: DailyProfit[] = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        sales: v.sales,
        purchases: v.purchases,
        expenses: v.expenses,
        profit: v.sales - v.purchases - v.expenses,
      }));

    setData({
      agentEntries: agentRows, vipEntries: vipRows, salesEntries: salesRows,
      expenses: expRows, workers: workerRows, stockData: stockRows,
      agentTotal, vipTotal, salesTotal, expenseTotal,
      salaryTotal, salaryPaid, salaryBalance,
      totalPurchases, grossProfit, netProfit, commodityBreakdown: cb,
      dailyProfitTrend,
    });
    setLoading(false);
  }, [range]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, refetch: fetch };
}
