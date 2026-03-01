import { useState, useMemo } from "react";
import { mockCommodities, mockAgentEntries } from "@/data/mockData";
import { AgentEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Camera, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const AgentEntryPage = () => {
  const { hasPermission } = useAuth();
  const [entries, setEntries] = useState<AgentEntry[]>(mockAgentEntries);
  const [customerName, setCustomerName] = useState("");
  const [commodity, setCommodity] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [containerWeight, setContainerWeight] = useState("");
  const [rateOverride, setRateOverride] = useState("");

  const selectedCommodity = mockCommodities.find((c) => c.name === commodity);
  const rate = rateOverride ? parseFloat(rateOverride) : (selectedCommodity?.agentRate || 0);
  const gross = parseFloat(grossWeight) || 0;
  const container = parseFloat(containerWeight) || 0;
  const actualWeight = Math.max(0, gross - container);
  const amount = actualWeight * rate;

  const totalAmount = useMemo(() => entries.reduce((s, e) => s + e.amount, 0), [entries]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !commodity || !grossWeight) {
      toast.error("Fill required fields");
      return;
    }
    const entry: AgentEntry = {
      id: Date.now().toString(),
      customerName,
      commodity,
      grossWeight: gross,
      containerWeight: container,
      actualWeight,
      rate,
      amount,
      createdBy: "current",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setEntries((prev) => [entry, ...prev]);
    setCustomerName("");
    setCommodity("");
    setGrossWeight("");
    setContainerWeight("");
    setRateOverride("");
    toast.success("Agent entry added!");
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            New Agent Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label>Commodity *</Label>
              <Select value={commodity} onValueChange={setCommodity}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Select commodity" /></SelectTrigger>
                <SelectContent>
                  {mockCommodities.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name} — ₹{c.agentRate}/kg</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Gross Weight (kg) *</Label>
              <Input type="number" value={grossWeight} onChange={(e) => setGrossWeight(e.target.value)} placeholder="0" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label>Container Weight (kg)</Label>
              <Input type="number" value={containerWeight} onChange={(e) => setContainerWeight(e.target.value)} placeholder="0" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label>Rate (₹/kg) {!hasPermission("update_rates") && <span className="text-muted-foreground text-xs">(locked)</span>}</Label>
              <Input
                type="number"
                value={rateOverride}
                onChange={(e) => setRateOverride(e.target.value)}
                placeholder={`${selectedCommodity?.agentRate || "Auto"}`}
                disabled={!hasPermission("update_rates")}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>Calculated</Label>
              <div className="h-12 rounded-lg bg-accent flex items-center px-4 gap-4 text-sm font-mono">
                <span>Wt: <strong>{actualWeight}</strong>kg</span>
                <span>Amt: <strong className="text-primary">₹{amount.toLocaleString()}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:col-span-2 lg:col-span-3">
              <Button type="button" variant="outline" className="h-12 gap-2">
                <Camera className="w-4 h-4" /> Weight Image
              </Button>
              <Button type="button" variant="outline" className="h-12 gap-2">
                <Camera className="w-4 h-4" /> Item Image
              </Button>
              <div className="flex-1" />
              <Button type="submit" className="h-12 px-8 text-base font-semibold">Add Entry</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Agent Entries</span>
            <span className="text-primary font-mono">Total: ₹{totalAmount.toLocaleString()}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Commodity</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Container</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {hasPermission("delete_entries") && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.customerName}</TableCell>
                  <TableCell>{entry.commodity}</TableCell>
                  <TableCell className="text-right font-mono">{entry.grossWeight}</TableCell>
                  <TableCell className="text-right font-mono">{entry.containerWeight}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{entry.actualWeight}</TableCell>
                  <TableCell className="text-right font-mono">₹{entry.rate}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-primary">₹{entry.amount.toLocaleString()}</TableCell>
                  {hasPermission("delete_entries") && (
                    <TableCell>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setEntries((p) => p.filter((e) => e.id !== entry.id))}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentEntryPage;
