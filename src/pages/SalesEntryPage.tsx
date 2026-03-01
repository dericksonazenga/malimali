import { useState, useMemo } from "react";
import { mockSalesEntries } from "@/data/mockData";
import { SalesEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Camera, ShoppingCart, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";

const SalesEntryPage = () => {
  const { hasPermission } = useAuth();
  const { symbol } = useCurrency();
  const [entries, setEntries] = useState<SalesEntry[]>(mockSalesEntries);
  const [customerName, setCustomerName] = useState("");
  const [weight, setWeight] = useState("");
  const [rate, setRate] = useState("");

  const w = parseFloat(weight) || 0;
  const r = parseFloat(rate) || 0;
  const amount = r > 0 ? w * r : undefined;
  const totalAmount = useMemo(() => entries.reduce((s, e) => s + (e.amount || 0), 0), [entries]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !weight) { toast.error("Fill required fields"); return; }
    setEntries((prev) => [{ id: Date.now().toString(), customerName, weight: w, rate: r > 0 ? r : undefined, amount, createdBy: "current", createdAt: new Date().toISOString().split("T")[0] }, ...prev]);
    setCustomerName(""); setWeight(""); setRate("");
    toast.success("Sales entry added!");
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-primary" /> New Sales Entry</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Customer Name *</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Buyer name" className="h-12" /></div>
            <div className="space-y-2"><Label>Weight (kg) *</Label><Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0" className="h-12" /></div>
            <div className="space-y-2"><Label>Rate ({symbol}/kg) <span className="text-muted-foreground text-xs">(optional)</span></Label><Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Optional" className="h-12" /></div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="h-12 rounded-lg bg-accent flex items-center px-4 font-mono text-sm">
                {amount !== undefined ? <strong className="text-primary">{symbol}{amount.toLocaleString()}</strong> : <span className="text-muted-foreground">Pending</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 lg:col-span-4">
              <Button type="button" variant="outline" className="h-12 gap-2"><Camera className="w-4 h-4" /> Weight Image</Button>
              <Button type="button" variant="outline" className="h-12 gap-2"><Camera className="w-4 h-4" /> Item Image</Button>
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
            <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead className="text-right">Weight</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Date</TableHead>{hasPermission("delete_entries") && <TableHead />}</TableRow></TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.customerName}</TableCell>
                  <TableCell className="text-right font-mono">{entry.weight}</TableCell>
                  <TableCell className="text-right font-mono">{entry.rate ? `${symbol}${entry.rate}` : "—"}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{entry.amount ? <span className="text-primary">{symbol}{entry.amount.toLocaleString()}</span> : <span className="text-warning">Pending</span>}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{entry.createdAt}</TableCell>
                  {hasPermission("delete_entries") && (<TableCell><Button variant="ghost" size="icon" className="text-destructive" onClick={() => setEntries((p) => p.filter((x) => x.id !== entry.id))}><Trash2 className="w-4 h-4" /></Button></TableCell>)}
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
