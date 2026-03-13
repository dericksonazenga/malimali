import { useMemo, useState, useEffect, useCallback } from "react";
import { useCommodities } from "@/contexts/CommodityContext";
import { useInventory } from "@/contexts/InventoryContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingUp, TrendingDown, Wrench, Trash2, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import StockAdjustmentDialog from "@/components/StockAdjustmentDialog";

interface AdjustmentLog {
  id: string;
  commodity: string;
  previous_weight: number;
  new_weight: number;
  reason: string;
  adjusted_by: string | null;
  created_at: string;
  adjuster_name?: string;
}

const InventoryPage = () => {
  const { commodities } = useCommodities();
  const { agentEntries, vipEntries, salesEntries, persistentStock } = useInventory();
  const { hasPermission, user } = useAuth();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustments, setAdjustments] = useState<AdjustmentLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const fetchAdjustments = useCallback(async () => {
    const { data } = await supabase
      .from("stock_adjustments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      const userIds = [...new Set(data.map((d: any) => d.adjusted_by).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);
        if (profiles) {
          profiles.forEach((p: any) => { profileMap[p.user_id] = p.display_name; });
        }
      }

      setAdjustments(data.map((d: any) => ({
        ...d,
        previous_weight: Number(d.previous_weight),
        new_weight: Number(d.new_weight),
        adjuster_name: d.adjusted_by ? (profileMap[d.adjusted_by] || "Unknown") : "Unknown",
      })));
    }
    setLoadingLogs(false);
  }, []);

  useEffect(() => {
    fetchAdjustments();
    const channel = supabase
      .channel("stock-adjustments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_adjustments" }, () => fetchAdjustments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAdjustments]);

  const deleteAdjustment = async (id: string) => {
    const { error } = await supabase.from("stock_adjustments").delete().eq("id", id);
    if (error) { toast.error("Failed to delete adjustment log"); return; }
    toast.success("Adjustment log deleted");
  };

  const commodityStock = useMemo(() => commodities.map((c) => {
    const dailyIn = agentEntries.filter((e) => e.commodity === c.name).reduce((s, e) => s + e.actualWeight, 0)
      + vipEntries.filter((e) => e.commodity === c.name).reduce((s, e) => s + e.actualWeight, 0);
    const dailyOut = salesEntries.filter((e) => e.commodity === c.name && !e.isExchange).reduce((s, e) => s + e.weight, 0);
    const persistent = persistentStock[c.name] || 0;
    const current = persistent + dailyIn - dailyOut;
    return { name: c.name, persistent, stockIn: dailyIn, stockOut: dailyOut, current: Math.max(0, current) };
  }), [commodities, agentEntries, vipEntries, salesEntries, persistentStock]);

  const totalDailyIn = commodityStock.reduce((s, c) => s + c.stockIn, 0);
  const totalDailyOut = commodityStock.reduce((s, c) => s + c.stockOut, 0);
  const totalCurrent = commodityStock.reduce((s, c) => s + c.current, 0);
  const hasData = commodityStock.some((c) => c.persistent > 0 || c.stockIn > 0 || c.stockOut > 0 || c.current > 0);
  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-5 text-center"><TrendingUp className="w-6 h-6 mx-auto text-success mb-2" /><p className="text-sm text-muted-foreground">Today's Stock In</p><p className="text-2xl font-bold font-mono">{totalDailyIn.toLocaleString()} kg</p></CardContent></Card>
        <Card><CardContent className="p-5 text-center"><TrendingDown className="w-6 h-6 mx-auto text-destructive mb-2" /><p className="text-sm text-muted-foreground">Today's Stock Out</p><p className="text-2xl font-bold font-mono">{totalDailyOut.toLocaleString()} kg</p></CardContent></Card>
        <Card><CardContent className="p-5 text-center"><Package className="w-6 h-6 mx-auto text-primary mb-2" /><p className="text-sm text-muted-foreground">Current Stock</p><p className="text-2xl font-bold font-mono text-primary">{totalCurrent.toLocaleString()} kg</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> Stock by Commodity</span>
            {hasPermission("adjust_stock") && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setAdjustOpen(true)}>
                <Wrench className="w-4 h-4" /> Adjust Stock
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commodity</TableHead>
                <TableHead className="text-right">Carried Over</TableHead>
                <TableHead className="text-right">Today In</TableHead>
                <TableHead className="text-right">Today Out</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commodityStock.filter((c) => c.persistent > 0 || c.stockIn > 0 || c.stockOut > 0 || c.current > 0).map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{c.persistent.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-success">+{c.stockIn.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-destructive">-{c.stockOut.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-primary">{c.current.toLocaleString()} kg</TableCell>
                </TableRow>
              ))}
              {!hasData && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No stock data yet.</TableCell>
                </TableRow>
              )}
              {hasData && (
                <TableRow className="border-t-2 border-primary/20 bg-accent/50">
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-muted-foreground">{commodityStock.reduce((s, c) => s + c.persistent, 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-success">+{totalDailyIn.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-destructive">-{totalDailyOut.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-primary">{totalCurrent.toLocaleString()} kg</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stock Adjustment History - responsive card layout on mobile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> Stock Adjustment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading history…</p>
          ) : adjustments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No manual adjustments recorded yet.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Commodity</TableHead>
                      <TableHead className="text-right">Before</TableHead>
                      <TableHead className="text-right">After</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>By</TableHead>
                      {isAdmin && <TableHead />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustments.map((a) => {
                      const diff = a.new_weight - a.previous_weight;
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(a.created_at).toLocaleDateString()}{" "}
                            {new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </TableCell>
                          <TableCell className="font-medium">{a.commodity}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">{a.previous_weight.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">{a.new_weight.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">
                            <Badge variant={diff > 0 ? "default" : diff < 0 ? "destructive" : "secondary"} className="font-mono">
                              {diff > 0 ? "+" : ""}{diff.toLocaleString()} kg
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate" title={a.reason}>{a.reason}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{a.adjuster_name}</TableCell>
                          {isAdmin && (
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteAdjustment(a.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile card layout */}
              <div className="md:hidden space-y-3">
                {adjustments.map((a) => {
                  const diff = a.new_weight - a.previous_weight;
                  return (
                    <div key={a.id} className="border border-border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{a.commodity}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(a.created_at).toLocaleDateString()}{" "}
                            {new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <Badge variant={diff > 0 ? "default" : diff < 0 ? "destructive" : "secondary"} className="font-mono text-xs">
                          {diff > 0 ? "+" : ""}{diff.toLocaleString()} kg
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Before:</span> <span className="font-mono">{a.previous_weight.toLocaleString()}</span></div>
                        <div><span className="text-muted-foreground">After:</span> <span className="font-mono">{a.new_weight.toLocaleString()}</span></div>
                      </div>
                      {a.reason && <p className="text-xs text-muted-foreground">Reason: {a.reason}</p>}
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">By: {a.adjuster_name}</p>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAdjustment(a.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <StockAdjustmentDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        commodities={commodities}
        persistentStock={persistentStock}
      />
    </div>
  );
};

export default InventoryPage;
