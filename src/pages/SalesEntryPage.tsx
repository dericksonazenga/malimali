import { useState, useMemo, useEffect } from "react";
import { SalesEntry } from "@/types";
import { useEndOfDay } from "@/contexts/EndOfDayContext";
import { useInventory } from "@/contexts/InventoryContext";
import { useCommodities } from "@/contexts/CommodityContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Trash2 } from "lucide-react";
import ImageCaptureButton from "@/components/ImageCaptureButton";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";

const SalesEntryPage = () => {
  const { hasPermission } = useAuth();
  const { symbol } = useCurrency();
  const { resetSignal } = useEndOfDay();
  const { salesEntries: entries, addSalesEntry, removeSalesEntry, clearAll } = useInventory();
  const { commodities } = useCommodities();
  const [customerName, setCustomerName] = useState("");
  const [commodity, setCommodity] = useState("");
  const [weight, setWeight] = useState("");
  const [rateOverride, setRateOverride] = useState("");

  useEffect(() => {
    if (resetSignal === 0) return;
    clearAll();
  }, [resetSignal]);

  const selectedCommodity = commodities.find((c) => c.name === commodity);
  const rate = rateOverride ? parseFloat(rateOverride) : (selectedCommodity?.salesRate || 0);
  const w = parseFloat(weight) || 0;
  const amount = rate > 0 ? w * rate : undefined;
  const totalAmount = useMemo(() => entries.reduce((s, e) => s + (e.amount || 0), 0), [entries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !weight || !commodity) { toast.error("Fill required fields"); return; }
    await addSalesEntry({
      id: Date.now().toString(),
      customerName,
      commodity,
      weight: w,
      rate: rate > 0 ? rate : undefined,
      amount,
      createdBy: "current",
      createdAt: new Date().toISOString().split("T")[0],
    });
    setCustomerName(""); setCommodity(""); setWeight(""); setRateOverride("");
    toast.success("Sales entry added!");
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-primary" /> New Sales Entry</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Customer Name *</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Buyer name" className="h-12" /></div>
            <div className="space-y-2">
              <Label>Commodity *</Label>
              <Select value={commodity} onValueChange={setCommodity}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Select commodity" /></SelectTrigger>
                <SelectContent>
                  {commodities.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name} — {symbol}{c.salesRate}/kg</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Weight (kg) *</Label><Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0" className="h-12" /></div>
            <div className="space-y-2">
              <Label>Rate ({symbol}/kg)</Label>
              <Input type="number" value={rateOverride} onChange={(e) => setRateOverride(e.target.value)} placeholder={`${selectedCommodity?.salesRate || "Auto"}`} disabled={!hasPermission("update_rates")} className="h-12" />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label>Amount</Label>
              <div className="h-12 rounded-lg bg-accent flex items-center px-4 font-mono text-sm">
                {amount !== undefined ? <strong className="text-primary">{symbol}{amount.toLocaleString()}</strong> : <span className="text-muted-foreground">Pending</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 lg:col-span-4">
              <ImageCaptureButton label="Weight Image" onCapture={(f) => console.log("Weight image:", f.name)} />
              <ImageCaptureButton label="Item Image" onCapture={(f) => console.log("Item image:", f.name)} />
              <div className="flex-1" />
              <Button type="submit" className="h-12 px-8 text-base font-semibold">Add Entry</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center justify-between"><span>Sales Entries</span><span className="text-primary font-mono">Total: {symbol}{totalAmount.toLocaleString()}</span></CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Commodity</TableHead><TableHead className="text-right">Weight</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Date</TableHead>{hasPermission("delete_entries") && <TableHead />}</TableRow></TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.customerName}</TableCell>
                  <TableCell>{entry.commodity || "—"}</TableCell>
                  <TableCell className="text-right font-mono">{entry.weight}</TableCell>
                  <TableCell className="text-right font-mono">{entry.rate ? `${symbol}${entry.rate}` : "—"}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{entry.amount ? <span className="text-primary">{symbol}{entry.amount.toLocaleString()}</span> : <span className="text-warning">Pending</span>}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{entry.createdAt}</TableCell>
                  {hasPermission("delete_entries") && (<TableCell><Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeSalesEntry(entry.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesEntryPage;
