import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isSpecialCommodity, SPECIAL_SOURCE_COMMODITY } from "@/constants/specialCommodity";
import { normalizeName } from "@/utils/nameMatch";
import {
  startOfDay, endOfDay, subDays, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths, subYears
} from "date-fns";

export type DateRange =
  | "today" | "yesterday" | "this_week" | "last_week"
  | "this_month" | "last_month" | "this_year" | "last_year" | "all_time"
  | "custom";

export interface DateRangeValue {
  preset: DateRange;
  customFrom?: Date;
  customTo?: Date;
}

function getDateBounds(range: DateRangeValue): { from: string | null; to: string | null } {
  if (range.preset === "custom" && range.customFrom) {
    return {
      from: startOfDay(range.customFrom).toISOString(),
      to: range.customTo ? endOfDay(range.customTo).toISOString() : endOfDay(range.customFrom).toISOString(),
    };
  }

  const now = new Date();
  const fmt = (d: Date) => d.toISOString();

  switch (range.preset) {
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
    default:
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
  debts: any[];
  debtPayments: any[];
  creditors: any[];
  creditorPayments: any[];
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
  debtTotal: number;
  debtPaid: number;
  debtBalance: number;
  creditorTotal: number;
  creditorPaid: number;
  creditorBalance: number;
  commodityBreakdown: Record<string, { bought: number; sold: number; net: number }>;
  dailyProfitTrend: DailyProfit[];
  commodityProfitBreakdown: CommodityProfit[];
}

export function useAnalyticsData(range: DateRangeValue) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef(0);

  const fetchData = useCallback(async () => {
    const id = ++fetchRef.current;
    setLoading(true);
    const { from, to } = getDateBounds(range);

    const applyRange = (q: any) => {
      if (from) q = q.gte("created_at", from);
      if (to) q = q.lte("created_at", to);
      return q;
    };

    const [agents, vips, sales, exps, workers, stock, debtsRes, debtPayRes, creditorsRes, creditorPayRes] = await Promise.all([
      applyRange(supabase.from("agent_entries").select("*")),
      applyRange(supabase.from("vip_entries").select("*")),
      applyRange(supabase.from("sales_entries").select("*")),
      applyRange(supabase.from("expenses").select("*")),
      supabase.from("workers").select("*"),
      supabase.from("persistent_stock").select("*"),
      supabase.from("debts").select("*"),
      supabase.from("debt_payments").select("*"),
      supabase.from("creditors").select("*"),
      supabase.from("creditor_payments").select("*"),
    ]);

    // Stale response guard
    if (id !== fetchRef.current) return;

    const agentRows = agents.data || [];
    const vipRows = vips.data || [];
    const salesRows = sales.data || [];
    const expRows = exps.data || [];
    const workerRows = workers.data || [];
    const stockRows = stock.data || [];
    const debtRows = debtsRes.data || [];
    const debtPayRows = debtPayRes.data || [];
    const creditorRows = creditorsRes.data || [];
    const creditorPayRows = creditorPayRes.data || [];

    const agentTotal = agentRows.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const vipTotal = vipRows.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const salesTotal = salesRows.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const expenseTotal = expRows.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const salaryTotal = workerRows.reduce((s: number, x: any) => s + Number(x.salary), 0);
    const salaryPaid = workerRows.reduce((s: number, x: any) => s + Number(x.paid), 0);
    const salaryBalance = workerRows.reduce((s: number, x: any) => s + Number(x.balance), 0);

    const debtTotal = debtRows.reduce((s: number, d: any) => s + Number(d.total_amount), 0);
    const debtPaid = debtRows.reduce((s: number, d: any) => s + Number(d.paid_amount), 0);
    const debtBalance = debtRows.reduce((s: number, d: any) => s + Number(d.balance), 0);

    const creditorTotal = creditorRows.reduce((s: number, c: any) => s + Number(c.total_amount), 0);
    const creditorPaid = creditorRows.reduce((s: number, c: any) => s + Number(c.paid_amount), 0);
    const creditorBalance = creditorRows.reduce((s: number, c: any) => s + Number(c.balance), 0);

    const totalPurchases = agentTotal + vipTotal;

    // Build average buying price per commodity
    const buyAgg: Record<string, { totalWeight: number; totalAmount: number }> = {};
    const ensureBuy = (c: string) => { if (!buyAgg[c]) buyAgg[c] = { totalWeight: 0, totalAmount: 0 }; };
    agentRows.forEach((e: any) => { ensureBuy(e.commodity); buyAgg[e.commodity].totalWeight += Number(e.actual_weight); buyAgg[e.commodity].totalAmount += Number(e.amount); });
    vipRows.forEach((e: any) => { ensureBuy(e.commodity); buyAgg[e.commodity].totalWeight += Number(e.actual_weight); buyAgg[e.commodity].totalAmount += Number(e.amount); });
    const avgBuyRateMap: Record<string, number> = {};
    Object.entries(buyAgg).forEach(([c, v]) => { avgBuyRateMap[c] = v.totalWeight > 0 ? v.totalAmount / v.totalWeight : 0; });

    let grossProfit = 0;
    salesRows.forEach((e: any) => {
      const commodity = e.commodity;
      const saleRate = Number(e.rate || 0);
      const saleWeight = Number(e.weight || 0);
      const saleAmount = Number(e.amount || 0);
      if (e.is_exchange || !commodity || saleWeight === 0) {
        grossProfit += saleAmount;
      } else {
        // "Special" sales draw cost basis from Heavy's weighted-avg buy rate.
        const costCommodity = isSpecialCommodity(commodity) ? SPECIAL_SOURCE_COMMODITY : commodity;
        const buyRate = avgBuyRateMap[costCommodity] || 0;
        grossProfit += (saleRate - buyRate) * saleWeight;
      }
    });

    const netProfit = grossProfit - expenseTotal;

    // Commodity breakdown
    const cb: Record<string, { bought: number; sold: number; net: number }> = {};
    const ensure = (c: string) => { if (!cb[c]) cb[c] = { bought: 0, sold: 0, net: 0 }; };
    agentRows.forEach((e: any) => { ensure(e.commodity); cb[e.commodity].bought += Number(e.actual_weight); });
    vipRows.forEach((e: any) => { ensure(e.commodity); cb[e.commodity].bought += Number(e.actual_weight); });
    salesRows.forEach((e: any) => {
      if (e.commodity) {
        const stockCommodity = isSpecialCommodity(e.commodity) ? SPECIAL_SOURCE_COMMODITY : e.commodity;
        ensure(stockCommodity);
        cb[stockCommodity].sold += Number(e.weight);
      }
    });
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
      .map(([date, v]) => ({ date, sales: v.sales, purchases: v.purchases, expenses: v.expenses, profit: v.sales - v.purchases - v.expenses }));

    // Per-commodity profit breakdown
    const sellAgg: Record<string, { totalWeight: number; totalAmount: number }> = {};
    const ensureSA = (c: string) => { if (!sellAgg[c]) sellAgg[c] = { totalWeight: 0, totalAmount: 0 }; };
    salesRows.forEach((e: any) => {
      if (!e.is_exchange && e.commodity && Number(e.weight || 0) > 0) {
        ensureSA(e.commodity);
        sellAgg[e.commodity].totalWeight += Number(e.weight);
        sellAgg[e.commodity].totalAmount += Number(e.amount || 0);
      }
    });
    const allCommodities = new Set([...Object.keys(avgBuyRateMap), ...Object.keys(sellAgg)]);
    const commodityProfitBreakdown: CommodityProfit[] = Array.from(allCommodities).map(commodity => {
      const sa = sellAgg[commodity] || { totalWeight: 0, totalAmount: 0 };
      const avgBuyRate = avgBuyRateMap[commodity] || 0;
      const avgSellRate = sa.totalWeight > 0 ? sa.totalAmount / sa.totalWeight : 0;
      const marginPerKg = avgSellRate - avgBuyRate;
      const totalProfit = sa.totalWeight > 0 ? marginPerKg * sa.totalWeight : 0;
      return { commodity, avgBuyRate, avgSellRate, marginPerKg, totalWeightSold: sa.totalWeight, totalProfit };
    }).sort((a, b) => b.totalProfit - a.totalProfit);

    setData({
      agentEntries: agentRows, vipEntries: vipRows, salesEntries: salesRows,
      expenses: expRows, workers: workerRows, stockData: stockRows,
      debts: debtRows, debtPayments: debtPayRows,
      creditors: creditorRows, creditorPayments: creditorPayRows,
      agentTotal, vipTotal, salesTotal, expenseTotal,
      salaryTotal, salaryPaid, salaryBalance,
      debtTotal, debtPaid, debtBalance,
      creditorTotal, creditorPaid, creditorBalance,
      totalPurchases, grossProfit, netProfit, commodityBreakdown: cb,
      dailyProfitTrend, commodityProfitBreakdown,
    });
    setLoading(false);
  }, [range.preset, range.customFrom?.getTime(), range.customTo?.getTime()]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime: auto-refresh on any change to key tables
  useEffect(() => {
    const tables = [
      "agent_entries", "vip_entries", "sales_entries", "expenses",
      "workers", "persistent_stock", "debts", "debt_payments",
      "creditors", "creditor_payments",
    ];
    let ch = supabase.channel(`analytics-rt-${crypto.randomUUID()}`);
    tables.forEach(t => {
      ch = ch.on("postgres_changes", { event: "*", schema: "public", table: t }, () => fetchData());
    });
    const channel = ch.subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  return { data, loading, refetch: fetchData };
}
