import { useState } from "react";
import { Commodity } from "@/types";
import { useCommodities } from "@/contexts/CommodityContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings, Save, Plus, X } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";

const RatesPage = () => {
  const { symbol } = useCurrency();
  const { commodities, addCommodity, updateCommodity } = useCommodities();
  const [editing, setEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ agentRate: 0, vipRate: 0, salesRate: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAgent, setNewAgent] = useState("");
  const [newVip, setNewVip] = useState("");
  const [newSales, setNewSales] = useState("");

  const startEdit = (c: Commodity) => { setEditing(c.id); setEditValues({ agentRate: c.agentRate, vipRate: c.vipRate, salesRate: c.salesRate }); };
  const saveEdit = (id: string) => { updateCommodity(id, editValues); setEditing(null); toast.success("Rates updated!"); };

  const handleAdd = () => {
    if (!newName.trim()) { toast.error("Enter commodity name"); return; }
    if (commodities.some((c) => c.name.toLowerCase() === newName.trim().toLowerCase())) { toast.error("Commodity already exists"); return; }
    const newCommodity: Commodity = {
      id: Date.now().toString(),
      name: newName.trim(),
      agentRate: parseFloat(newAgent) || 0,
      vipRate: parseFloat(newVip) || 0,
      salesRate: parseFloat(newSales) || 0,
    };
    addCommodity(newCommodity);
    setNewName(""); setNewAgent(""); setNewVip(""); setNewSales(""); setShowAdd(false);
    toast.success(`${newCommodity.name} added!`);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
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
                <Label className="text-xs">Agent ({symbol})</Label>
                <Input type="number" value={newAgent} onChange={(e) => setNewAgent(e.target.value)} placeholder="0" className="h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">VIP ({symbol})</Label>
                <Input type="number" value={newVip} onChange={(e) => setNewVip(e.target.value)} placeholder="0" className="h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sales ({symbol})</Label>
                <div className="flex gap-2">
                  <Input type="number" value={newSales} onChange={(e) => setNewSales(e.target.value)} placeholder="0" className="h-10" />
                  <Button size="sm" className="h-10 px-4" onClick={handleAdd}><Save className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Commodity</TableHead><TableHead className="text-right">Agent Rate ({symbol}/kg)</TableHead><TableHead className="text-right">VIP Rate ({symbol}/kg)</TableHead><TableHead className="text-right">Sales Rate ({symbol}/kg)</TableHead><TableHead /></TableRow></TableHeader>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default RatesPage;
