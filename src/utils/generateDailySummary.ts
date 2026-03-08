import { supabase } from "@/integrations/supabase/client";

export const generateDailySummary = async () => {
  const today = new Date().toISOString().split("T")[0];

  // Fetch today's data in parallel
  const [agentRes, vipRes, salesRes, expensesRes] = await Promise.all([
    supabase.from("agent_entries").select("*").eq("date", today),
    supabase.from("vip_entries").select("*").eq("date", today),
    supabase.from("sales_entries").select("*").eq("date", today),
    supabase.from("expenses").select("*").eq("date", today),
  ]);

  const agentEntries = agentRes.data || [];
  const vipEntries = vipRes.data || [];
  const salesEntries = salesRes.data || [];
  const expenses = expensesRes.data || [];

  const totalAgent = agentEntries.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalVip = vipEntries.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalSales = salesEntries.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  // Stock changes: commodity -> { in, out }
  const stockChanges: Record<string, { in: number; out: number }> = {};
  agentEntries.forEach((e) => {
    if (!stockChanges[e.commodity]) stockChanges[e.commodity] = { in: 0, out: 0 };
    stockChanges[e.commodity].in += Number(e.actual_weight || 0);
  });
  vipEntries.forEach((e) => {
    if (!stockChanges[e.commodity]) stockChanges[e.commodity] = { in: 0, out: 0 };
    stockChanges[e.commodity].in += Number(e.actual_weight || 0);
  });
  salesEntries.forEach((e) => {
    if (e.commodity) {
      if (!stockChanges[e.commodity]) stockChanges[e.commodity] = { in: 0, out: 0 };
      stockChanges[e.commodity].out += Number(e.weight || 0);
    }
  });

  const netProfit = totalSales - totalAgent - totalVip - totalExpenses;

  const userId = (await supabase.auth.getUser()).data.user?.id;

  const { error } = await supabase.from("daily_summaries").upsert(
    {
      date: today,
      created_by: userId,
      agent_entries: agentEntries,
      vip_entries: vipEntries,
      sales_entries: salesEntries,
      expenses: expenses,
      stock_changes: stockChanges,
      total_agent_amount: totalAgent,
      total_vip_amount: totalVip,
      total_sales_amount: totalSales,
      total_expenses: totalExpenses,
      net_profit: netProfit,
    },
    { onConflict: "date" }
  );

  if (error) {
    console.error("Failed to save daily summary:", error);
    return false;
  }
  return true;
};
