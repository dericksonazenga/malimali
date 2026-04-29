import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { History, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface RateChange {
  id: string;
  commodity_name: string;
  old_agent_rate: number;
  old_vip_rate: number;
  old_sales_rate: number;
  new_agent_rate: number;
  new_vip_rate: number;
  new_sales_rate: number;
  changed_by_name: string;
  created_at: string;
}

const RateHistory = () => {
  const { symbol } = useCurrency();
  const { hasPermission } = useAuth();
  const [history, setHistory] = useState<RateChange[]>([]);

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase
      .from("rate_change_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setHistory(data.map((r: any) => ({
      ...r,
      old_agent_rate: Number(r.old_agent_rate),
      old_vip_rate: Number(r.old_vip_rate),
      old_sales_rate: Number(r.old_sales_rate),
      new_agent_rate: Number(r.new_agent_rate),
      new_vip_rate: Number(r.new_vip_rate),
      new_sales_rate: Number(r.new_sales_rate),
    })));
  }, []);

  useEffect(() => {
    fetchHistory();
    const channel = supabase
      .channel(`rate-history-rt-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rate_change_history" }, () => fetchHistory())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchHistory]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("rate_change_history").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("History entry deleted");
  };

  const canDelete = hasPermission("delete_rates") || hasPermission("delete_entries");

  if (history.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="w-5 h-5 text-primary" /> Rate Change History
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Commodity</TableHead>
              <TableHead className="text-right">Old Agent</TableHead>
              <TableHead className="text-right">New Agent</TableHead>
              <TableHead className="text-right">Old VIP</TableHead>
              <TableHead className="text-right">New VIP</TableHead>
              <TableHead className="text-right">Old Sales</TableHead>
              <TableHead className="text-right">New Sales</TableHead>
              <TableHead>Changed By</TableHead>
              {canDelete && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map(h => (
              <TableRow key={h.id}>
                <TableCell className="text-xs whitespace-nowrap">{new Date(h.created_at).toLocaleString()}</TableCell>
                <TableCell className="font-medium">{h.commodity_name}</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">{symbol}{h.old_agent_rate}</TableCell>
                <TableCell className="text-right font-mono">{symbol}{h.new_agent_rate}</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">{symbol}{h.old_vip_rate}</TableCell>
                <TableCell className="text-right font-mono">{symbol}{h.new_vip_rate}</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">{symbol}{h.old_sales_rate}</TableCell>
                <TableCell className="text-right font-mono">{symbol}{h.new_sales_rate}</TableCell>
                <TableCell className="text-sm">{h.changed_by_name}</TableCell>
                {canDelete && (
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(h.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default RateHistory;
