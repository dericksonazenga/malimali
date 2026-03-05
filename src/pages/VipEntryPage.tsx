import { useState, useMemo, useEffect } from "react";
import { mockCommodities } from "@/data/mockData";
import { VipEntry } from "@/types";
import { useEndOfDay } from "@/contexts/EndOfDayContext";
import { useInventory } from "@/contexts/InventoryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Star } from "lucide-react";
import ImageCaptureButton from "@/components/ImageCaptureButton";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";

const VipEntryPage = () => {
  const { hasPermission } = useAuth();
  const { symbol } = useCurrency();
  const { resetSignal } = useEndOfDay();
  const { vipEntries: entries, addVipEntry, removeVipEntry, clearAll } = useInventory();
  const [customerName, setCustomerName] = useState("");
  const [commodity, setCommodity] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [containerWeight, setContainerWeight] = useState("");
  const [rateOverride, setRateOverride] = useState("");

  useEffect(() => {
    if (resetSignal === 0) return;
    clearAll();
  }, [resetSignal]);

  const selectedCommodity = mockCommodities.find((c) => c.name === commodity);
  const rate = rateOverride ? parseFloat(rateOverride) : (selectedCommodity?.vipRate || 0);
  const gross = parseFloat(grossWeight) || 0;
  const container = parseFloat(containerWeight) || 0;
  const actualWeight = Math.max(0, gross - container);
  const amount = actualWeight * rate;
  const totalAmount = useMemo(() => entries.reduce((s, e) => s + e.amount, 0), [entries]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !commodity || !grossWeight) { toast.error("Fill required fields"); return; }
    const entry: VipEntry = { id: Date.now().toString(), customerName, commodity, grossWeight: gross, containerWeight: container, actualWeight, rate, amount, createdBy: "current", createdAt: new Date().toISOString().split("T")[0] };
    addVipEntry(entry);
    setCustomerName(""); setCommodity(""); setGrossWeight(""); setContainerWeight(""); setRateOverride("");
    toast.success("VIP entry added!");
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Star className="w-5 h-5 text-primary" /> New VIP Entry</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Customer Name *</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="VIP customer" className="h-12" /></div>
            <div className="space-y-2">
              <Label>Commodity *</Label>
              <Select value={commodity} onValueChange={setCommodity}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Select commodity" /></SelectTrigger>
                <SelectContent>{mockCommodities.map((c) => (<SelectItem key={c.id} value={c.name}>{c.name} — {symbol}{c.vipRate}/kg</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Gross Weight (kg) *</Label><Input type="number" value={grossWeight} onChange={(e) => setGrossWeight(e.target.value)} placeholder="0" className="h-12" /></div>
            <div className="space-y-2"><Label>Container Weight (kg)</Label><Input type="number" value={containerWeight} onChange={(e) => setContainerWeight(e.target.value)} placeholder="0" className="h-12" /></div>
            <div className="space-y-2"><Label>Rate ({symbol}/kg)</Label><Input type="number" value={rateOverride} onChange={(e) => setRateOverride(e.target.value)} placeholder={`${selectedCommodity?.vipRate || "Auto"}`} disabled={!hasPermission("update_rates")} className="h-12" /></div>
            <div className="space-y-2">
              <Label>Calculated</Label>
              <div className="h-12 rounded-lg bg-accent flex items-center px-4 gap-4 text-sm font-mono">
                <span>Wt: <strong>{actualWeight}</strong>kg</span>
                <span>Amt: <strong className="text-primary">{symbol}{amount.toLocaleString()}</strong></span>
              </div>
            </div>
            <div className="flex items-center gap-2 md:col-span-2 lg:col-span-3">
              <ImageCaptureButton label="Weight Image" onCapture={(f) => console.log("Weight image:", f.name)} />
              <ImageCaptureButton label="Item Image" onCapture={(f) => console.log("Item image:", f.name)} />
              <div className="flex-1" />
              <Button type="submit" className="h-12 px-8 text-base font-semibold">Add Entry</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center justify-between"><span>VIP Entries</span><span className="text-primary font-mono">Total: {symbol}{totalAmount.toLocaleString()}</span></CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Commodity</TableHead><TableHead className="text-right">Gross</TableHead><TableHead className="text-right">Container</TableHead><TableHead className="text-right">Actual</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead>{hasPermission("delete_entries") && <TableHead />}</TableRow></TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.customerName}</TableCell>
                  <TableCell>{entry.commodity}</TableCell>
                  <TableCell className="text-right font-mono">{entry.grossWeight}</TableCell>
                  <TableCell className="text-right font-mono">{entry.containerWeight}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{entry.actualWeight}</TableCell>
                  <TableCell className="text-right font-mono">{symbol}{entry.rate}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-primary">{symbol}{entry.amount.toLocaleString()}</TableCell>
                  {hasPermission("delete_entries") && (<TableCell><Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeVipEntry(entry.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default VipEntryPage;
