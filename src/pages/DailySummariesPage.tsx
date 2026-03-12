import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Package, Wallet, ShoppingCart, Users, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DailySummary {
  id: string;
  date: string;
  agent_entries: any[];
  vip_entries: any[];
  sales_entries: any[];
  expenses: any[];
  stock_changes: Record<string, { in: number; out: number }>;
  total_agent_amount: number;
  total_vip_amount: number;
  total_sales_amount: number;
  total_expenses: number;
  net_profit: number;
}

interface EodLog {
  id: string;
  triggered_at: string;
  triggered_by: string | null;
  date: string;
}

const DailySummariesPage = () => {
  const { symbol } = useCurrency();
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [eodLogs, setEodLogs] = useState<EodLog[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchAll = async () => {
      const [summariesRes, logsRes, profilesRes] = await Promise.all([
        supabase.from("daily_summaries").select("*").order("date", { ascending: false }).limit(30),
        supabase.from("end_of_day_log").select("*").order("triggered_at", { ascending: false }).limit(30),
        supabase.from("profiles").select("user_id, display_name"),
      ]);
      if (summariesRes.data) setSummaries(summariesRes.data as any);
      if (logsRes.data) setEodLogs(logsRes.data as any);
      if (profilesRes.data) {
        const map: Record<string, string> = {};
        profilesRes.data.forEach((p: any) => { map[p.user_id] = p.display_name; });
        setProfiles(map);
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  if (loading) return <p className="text-muted-foreground p-4">Loading summaries…</p>;

  if (summaries.length === 0)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <FileText className="w-12 h-12 mb-4 opacity-40" />
        <p className="text-lg font-medium">No daily summaries yet</p>
        <p className="text-sm">Summaries are auto-generated when End of Day is triggered.</p>
      </div>
    );

  return (
    <div className="space-y-4 max-w-6xl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <FileText className="w-6 h-6 text-primary" /> Daily Summaries
      </h1>

      {/* End of Day Trigger Log */}
      {eodLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> End of Day History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Triggered By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eodLogs.map((log) => {
                  const dt = new Date(log.triggered_at);
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">{log.date}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {dt.toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.triggered_by ? (profiles[log.triggered_by] || "Unknown user") : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {summaries.map((s) => {
        const expanded = expandedId === s.id;
        const profitable = s.net_profit >= 0;

        return (
          <Card key={s.id} className="overflow-hidden">
            <CardHeader
              className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedId(expanded ? null : s.id)}
            >
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-sm">{s.date}</Badge>
                  <span className="hidden sm:inline text-muted-foreground text-sm">
                    {s.agent_entries.length + s.vip_entries.length} purchases · {s.sales_entries.length} sales · {s.expenses.length} expenses
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-mono font-bold ${profitable ? "text-green-600" : "text-destructive"}`}>
                    {profitable ? "+" : ""}{symbol}{s.net_profit.toLocaleString()}
                  </span>
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </CardTitle>
            </CardHeader>

            {expanded && (
              <CardContent className="space-y-6 border-t pt-6">
                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <SummaryCard icon={<Users className="w-4 h-4" />} label="Agent Purchases" value={`${symbol}${s.total_agent_amount.toLocaleString()}`} color="text-blue-600" />
                  <SummaryCard icon={<Package className="w-4 h-4" />} label="VIP Purchases" value={`${symbol}${s.total_vip_amount.toLocaleString()}`} color="text-purple-600" />
                  <SummaryCard icon={<ShoppingCart className="w-4 h-4" />} label="Total Sales" value={`${symbol}${s.total_sales_amount.toLocaleString()}`} color="text-green-600" />
                  <SummaryCard icon={<Wallet className="w-4 h-4" />} label="Expenses" value={`${symbol}${s.total_expenses.toLocaleString()}`} color="text-destructive" />
                </div>

                {/* Net profit */}
                <div className={`flex items-center gap-2 p-3 rounded-lg ${profitable ? "bg-green-500/10" : "bg-destructive/10"}`}>
                  {profitable ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
                  <span className="font-semibold">Net Profit:</span>
                  <span className={`font-mono font-bold ${profitable ? "text-green-600" : "text-destructive"}`}>
                    {symbol}{s.net_profit.toLocaleString()}
                  </span>
                </div>

                {/* Stock changes */}
                {Object.keys(s.stock_changes).length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wider">Stock Changes</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Commodity</TableHead>
                          <TableHead className="text-right">Stock In (kg)</TableHead>
                          <TableHead className="text-right">Stock Out (kg)</TableHead>
                          <TableHead className="text-right">Net Change</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(s.stock_changes).map(([commodity, changes]) => {
                          const net = changes.in - changes.out;
                          return (
                            <TableRow key={commodity}>
                              <TableCell className="font-medium">{commodity}</TableCell>
                              <TableCell className="text-right font-mono text-green-600">+{changes.in.toLocaleString()}</TableCell>
                              <TableCell className="text-right font-mono text-destructive">-{changes.out.toLocaleString()}</TableCell>
                              <TableCell className={`text-right font-mono font-semibold ${net >= 0 ? "text-green-600" : "text-destructive"}`}>
                                {net >= 0 ? "+" : ""}{net.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Agent entries detail */}
                {s.agent_entries.length > 0 && (
                  <EntryTable title="Agent Entries" entries={s.agent_entries} type="purchase" symbol={symbol} />
                )}

                {/* VIP entries detail */}
                {s.vip_entries.length > 0 && (
                  <EntryTable title="VIP Entries" entries={s.vip_entries} type="purchase" symbol={symbol} />
                )}

                {/* Sales entries detail */}
                {s.sales_entries.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wider">Sales Entries</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Commodity</TableHead>
                          <TableHead className="text-right">Weight</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {s.sales_entries.map((e: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell>{e.customer_name || "—"}</TableCell>
                            <TableCell>{e.commodity || "—"}</TableCell>
                            <TableCell className="text-right font-mono">{e.weight}</TableCell>
                            <TableCell className="text-right font-mono">{e.rate ? `${symbol}${e.rate}` : "—"}</TableCell>
                            <TableCell className="text-right font-mono font-semibold">{e.amount ? `${symbol}${Number(e.amount).toLocaleString()}` : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Expenses detail */}
                {s.expenses.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wider">Expenses</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {s.expenses.map((e: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{e.category}</TableCell>
                            <TableCell className="text-right font-mono">{symbol}{Number(e.amount).toLocaleString()}</TableCell>
                            <TableCell className="text-muted-foreground">{e.notes || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

const SummaryCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => (
  <div className="rounded-lg border bg-card p-3">
    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">{icon} {label}</div>
    <p className={`font-mono font-bold text-lg ${color}`}>{value}</p>
  </div>
);

const EntryTable = ({ title, entries, type, symbol }: { title: string; entries: any[]; type: string; symbol: string }) => (
  <div>
    <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wider">{title}</h3>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead>Commodity</TableHead>
          <TableHead className="text-right">Weight (kg)</TableHead>
          <TableHead className="text-right">Rate</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((e: any, i: number) => (
          <TableRow key={i}>
            <TableCell>{e.customer_name}</TableCell>
            <TableCell>{e.commodity}</TableCell>
            <TableCell className="text-right font-mono">{e.actual_weight}</TableCell>
            <TableCell className="text-right font-mono">{symbol}{e.rate}</TableCell>
            <TableCell className="text-right font-mono font-semibold">{symbol}{Number(e.amount).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export default DailySummariesPage;
