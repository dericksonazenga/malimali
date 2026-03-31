import { useState } from "react";
import { Commodity } from "@/types";
import { useCommodities } from "@/contexts/CommodityContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings, Save, Plus, X, Loader2, RefreshCw } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import RateHistory from "@/components/RateHistory";
import { useCategoryLabels } from "@/contexts/CategoryLabelsContext";

const RatesPage = () => {
  const { symbol } = useCurrency();
  const { user } = useAuth();
  const { commodities, loading, addCommodity, updateCommodity } = useCommodities();
  const { labels } = useCategoryLabels();
  const [editing, setEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ agentRate: 0, vipRate: 0, salesRate: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAgent, setNewAgent] = useState("");
  const [newVip, setNewVip] = useState("");
  const [newSales, setNewSales] = useState("");

  const startEdit = (c: Commodity) => { setEditing(c.id); setEditValues({ agentRate: c.agentRate, vipRate: c.vipRate, salesRate: c.salesRate }); };

  const saveEdit = async (id: string) => {
    const old = commodities.find(c => c.id === id);
    if (old) {
      // Log rate change history
      const company_id = await (await import("@/utils/getCompanyId")).getCompanyId();
      await supabase.from("rate_change_history").insert({
        commodity_id: id,
        commodity_name: old.name,
        old_agent_rate: old.agentRate,
        old_vip_rate: old.vipRate,
        old_sales_rate: old.salesRate,
        new_agent_rate: editValues.agentRate,
        new_vip_rate: editValues.vipRate,
        new_sales_rate: editValues.salesRate,
        changed_by: user?.id,
        changed_by_name: user?.name || "",
        company_id,
      });
    }
    await updateCommodity(id, editValues);
    setEditing(null);
    toast.success("Rates updated!");
  };

  const handleAdd = async () => {
    if (!newName.trim()) { toast.error("Enter commodity name"); return; }
    if (commodities.some((c) => c.name.toLowerCase() === newName.trim().toLowerCase())) { toast.error("Commodity already exists"); return; }
    const newCommodity: Commodity = {
      id: Date.now().toString(),
      name: newName.trim(),
      agentRate: parseFloat(newAgent) || 0,
      vipRate: parseFloat(newVip) || 0,
      salesRate: parseFloat(newSales) || 0,
    };
    await addCommodity(newCommodity);
    setNewName(""); setNewAgent(""); setNewVip(""); setNewSales(""); setShowAdd(false);
    toast.success(`${newCommodity.name} added!`);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Rate Management</span>
            <Button size="sm" className="gap-1" onClick={() => setShowAdd(!showAdd)}>
              {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showAdd ? "Cancel" : "Add Commodity"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAdd && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-lg bg-accent border border-border">
              <div className="space-y-1 lg:col-span-2">
                <Label className="text-xs">Name *</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Zinc" className="h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{labels.agent} ({symbol})</Label>
                <Input type="number" value={newAgent} onChange={(e) => setNewAgent(e.target.value)} placeholder="0" className="h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{labels.vip} ({symbol})</Label>
                <Input type="number" value={newVip} onChange={(e) => setNewVip(e.target.value)} placeholder="0" className="h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{labels.sales} ({symbol})</Label>
                <div className="flex gap-2">
                  <Input type="number" value={newSales} onChange={(e) => setNewSales(e.target.value)} placeholder="0" className="h-10" />
                  <Button size="sm" className="h-10 px-4" onClick={handleAdd}><Save className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          )}
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading commodities...</span>
              </div>
            ) : commodities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">No commodities found. Add one above or check your connection.</p>
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto max-h-[480px] overflow-y-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Commodity</TableHead><TableHead className="text-right">{labels.agent} ({symbol}/kg)</TableHead><TableHead className="text-right">{labels.vip} ({symbol}/kg)</TableHead><TableHead className="text-right">{labels.sales} ({symbol}/kg)</TableHead><TableHead /></TableRow></TableHeader>
                    <TableBody>
                      {commodities.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          {editing === c.id ? (
                            <>
                              <TableCell className="text-right"><Input type="number" value={editValues.agentRate} onChange={(e) => setEditValues((v) => ({ ...v, agentRate: +e.target.value }))} className="w-24 ml-auto text-right" /></TableCell>
                              <TableCell className="text-right"><Input type="number" value={editValues.vipRate} onChange={(e) => setEditValues((v) => ({ ...v, vipRate: +e.target.value }))} className="w-24 ml-auto text-right" /></TableCell>
                              <TableCell className="text-right"><Input type="number" value={editValues.salesRate} onChange={(e) => setEditValues((v) => ({ ...v, salesRate: +e.target.value }))} className="w-24 ml-auto text-right" /></TableCell>
                              <TableCell><Button size="sm" onClick={() => saveEdit(c.id)} className="gap-1"><Save className="w-3 h-3" /> Save</Button></TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="text-right font-mono">{symbol}{c.agentRate}</TableCell>
                              <TableCell className="text-right font-mono">{symbol}{c.vipRate}</TableCell>
                              <TableCell className="text-right font-mono">{symbol}{c.salesRate}</TableCell>
                              <TableCell><Button variant="outline" size="sm" onClick={() => startEdit(c)}>Edit</Button></TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Mobile */}
                <div className="md:hidden space-y-2 max-h-[480px] overflow-y-auto">
                  {commodities.map((c) => (
                    <div key={c.id} className="border border-border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="font-medium">{c.name}</p>
                        {editing === c.id ? (
                          <Button size="sm" onClick={() => saveEdit(c.id)} className="gap-1 h-7"><Save className="w-3 h-3" /> Save</Button>
                        ) : (
                          <Button variant="outline" size="sm" className="h-7" onClick={() => startEdit(c)}>Edit</Button>
                        )}
                      </div>
                      {editing === c.id ? (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">{labels.agent}</span>
                            <Input type="number" value={editValues.agentRate} onChange={(e) => setEditValues((v) => ({ ...v, agentRate: +e.target.value }))} className="h-8 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">{labels.vip}</span>
                            <Input type="number" value={editValues.vipRate} onChange={(e) => setEditValues((v) => ({ ...v, vipRate: +e.target.value }))} className="h-8 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">{labels.sales}</span>
                            <Input type="number" value={editValues.salesRate} onChange={(e) => setEditValues((v) => ({ ...v, salesRate: +e.target.value }))} className="h-8 text-sm" />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Agent</span><p className="font-mono font-semibold">{symbol}{c.agentRate}</p></div>
                          <div><span className="text-muted-foreground">VIP</span><p className="font-mono font-semibold text-primary">{symbol}{c.vipRate}</p></div>
                          <div><span className="text-muted-foreground">Sales</span><p className="font-mono font-semibold text-success">{symbol}{c.salesRate}</p></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <RateHistory />
    </div>
  );
};

export default RatesPage;
