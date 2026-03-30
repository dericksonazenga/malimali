import { useState, useMemo, useEffect } from "react";
import { useCommodities } from "@/contexts/CommodityContext";
import { AgentEntry } from "@/types";
import { useEndOfDay } from "@/contexts/EndOfDayContext";
import { useInventory } from "@/contexts/InventoryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, RefreshCw, Package } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ImageCaptureButton from "@/components/ImageCaptureButton";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";
import BulkEntryForm from "@/components/BulkEntryForm";

const AgentEntryPage = () => {
  const [bulkMode, setBulkMode] = useState(false);
  const [lastSubmit, setLastSubmit] = useState<{ key: string; time: number } | null>(null);
  const { hasPermission } = useAuth();
  const { commodities: mockCommodities } = useCommodities();
  const { symbol } = useCurrency();
  const { resetSignal } = useEndOfDay();
  const { agentEntries: entries, addAgentEntry, removeAgentEntry, clearAll, refresh } = useInventory();
  const [customerName, setCustomerName] = useState("");
  const [commodity, setCommodity] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [containerWeight, setContainerWeight] = useState("");
  const [rateOverride, setRateOverride] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
    toast.success("Entries refreshed");
  };

  useEffect(() => {
    if (resetSignal === 0) return;
    clearAll();
  }, [resetSignal]);

  const selectedCommodity = mockCommodities.find((c) => c.name === commodity);
  const rate = rateOverride ? parseFloat(rateOverride) : (selectedCommodity?.agentRate || 0);
  const gross = parseFloat(grossWeight) || 0;
  const container = parseFloat(containerWeight) || 0;
  const actualWeight = Math.max(0, gross - container);
  const amount = actualWeight * rate;

  const totalAmount = useMemo(() => entries.reduce((s, e) => s + e.amount, 0), [entries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !commodity || !grossWeight) { toast.error("Fill required fields"); return; }

    // Duplicate guard: block identical entry within 15 seconds
    const entryKey = `${customerName.trim().toLowerCase()}|${commodity}|${gross}|${container}`;
    const now = Date.now();
    if (lastSubmit && lastSubmit.key === entryKey && now - lastSubmit.time < 15000) {
      toast.error("Duplicate entry blocked. Wait 15 seconds or change values.");
      return;
    }

    const entry: AgentEntry = {
      id: Date.now().toString(), customerName, commodity,
      grossWeight: gross, containerWeight: container, actualWeight, rate, amount,
      createdBy: "current", createdAt: new Date().toISOString().split("T")[0],
    };
    await addAgentEntry(entry);
    setLastSubmit({ key: entryKey, time: now });
    setCustomerName(""); setCommodity(""); setGrossWeight(""); setContainerWeight(""); setRateOverride("");
    toast.success("Agent entry added!");
  };

  const canEntry = hasPermission("data_entry");

  return (
    <div className="space-y-6 max-w-6xl">
      {canEntry && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> New Agent Entry</span>
              <Button variant={bulkMode ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setBulkMode(!bulkMode)}>
                <Package className="w-4 h-4" /> Pick-up
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!bulkMode ? (
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Customer Name *</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" className="h-12" /></div>
                <div className="space-y-2">
                  <Label>Commodity *</Label>
                  <Select value={commodity} onValueChange={setCommodity}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="Select commodity" /></SelectTrigger>
                    <SelectContent>
                      {mockCommodities.map((c) => (
                        <SelectItem key={c.id} value={c.name}>{c.name} — {symbol}{c.agentRate}/kg</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Gross Weight (kg) *</Label><Input type="number" value={grossWeight} onChange={(e) => setGrossWeight(e.target.value)} placeholder="0" className="h-12" /></div>
                <div className="space-y-2"><Label>Container Weight (kg)</Label><Input type="number" value={containerWeight} onChange={(e) => setContainerWeight(e.target.value)} placeholder="0" className="h-12" /></div>
                <div className="space-y-2">
                  <Label>Rate ({symbol}/kg) {!hasPermission("update_rates") && <span className="text-muted-foreground text-xs">(locked)</span>}</Label>
                  <Input type="number" value={rateOverride} onChange={(e) => setRateOverride(e.target.value)} placeholder={`${selectedCommodity?.agentRate || "Auto"}`} disabled={!hasPermission("update_rates")} className="h-12" />
                </div>
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
            ) : null}
          </CardContent>
        </Card>
      )}

      {canEntry && bulkMode && (
        <BulkEntryForm
          type="agent"
          title="Agent Pick-up — Bulk Entry"
          onSubmitEntries={async (entries, customerName) => {
            for (const entry of entries) {
              await addAgentEntry({
                id: Date.now().toString() + Math.random(),
                customerName,
                commodity: entry.commodity,
                grossWeight: entry.grossWeight,
                containerWeight: entry.containerWeight,
                actualWeight: entry.actualWeight,
                rate: entry.rate,
                amount: entry.amount,
                createdBy: "current",
                createdAt: new Date().toISOString().split("T")[0],
              });
            }
          }}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Agent Entries</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh entries"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
              <span className="text-primary font-mono">Total: {symbol}{totalAmount.toLocaleString()}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {(() => {
            const grouped = entries.reduce((acc, entry) => {
              const key = entry.customerName.trim().toLowerCase();
              if (!acc[key]) acc[key] = { displayName: entry.customerName, entries: [] };
              acc[key].entries.push(entry);
              return acc;
            }, {} as Record<string, { displayName: string; entries: AgentEntry[] }>);

            return Object.values(grouped).map((group) => {
              const totalGross = group.entries.reduce((s, e) => s + e.grossWeight, 0);
              const totalContainer = group.entries.reduce((s, e) => s + e.containerWeight, 0);
              const totalActual = group.entries.reduce((s, e) => s + e.actualWeight, 0);
              const totalAmt = group.entries.reduce((s, e) => s + e.amount, 0);
              const commodities = [...new Set(group.entries.map(e => e.commodity))];

              return (
                <Accordion key={group.displayName} type="single" collapsible className="mb-2">
                  <AccordionItem value={group.displayName} className="border rounded-lg">
                     <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 pr-4 text-sm w-full">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold truncate">{group.displayName}</span>
                          <span className="bg-primary/10 text-primary text-xs font-mono px-2 py-0.5 rounded-full shrink-0">{group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 font-mono text-xs">
                          <span className="text-muted-foreground truncate hidden sm:inline">{commodities.join(', ')}</span>
                          <span className="whitespace-nowrap">Wt: <strong>{totalActual}</strong>kg</span>
                          <span className="text-primary font-semibold whitespace-nowrap">{symbol}{totalAmt.toLocaleString()}</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-0 pb-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Commodity</TableHead>
                            <TableHead className="text-right">Gross</TableHead><TableHead className="text-right">Container</TableHead>
                            <TableHead className="text-right">Actual</TableHead><TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            {hasPermission("delete_entries") && <TableHead />}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.entries.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>{entry.commodity}</TableCell>
                              <TableCell className="text-right font-mono">{entry.grossWeight}</TableCell>
                              <TableCell className="text-right font-mono">{entry.containerWeight}</TableCell>
                              <TableCell className="text-right font-mono font-semibold">{entry.actualWeight}</TableCell>
                              <TableCell className="text-right font-mono">{symbol}{entry.rate}</TableCell>
                              <TableCell className="text-right font-mono font-semibold text-primary">{symbol}{entry.amount.toLocaleString()}</TableCell>
                              {hasPermission("delete_entries") && (
                                <TableCell><Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeAgentEntry(entry.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                              )}
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/30 font-semibold">
                            <TableCell>Totals</TableCell>
                            <TableCell className="text-right font-mono">{totalGross}</TableCell>
                            <TableCell className="text-right font-mono">{totalContainer}</TableCell>
                            <TableCell className="text-right font-mono">{totalActual}</TableCell>
                            <TableCell />
                            <TableCell className="text-right font-mono text-primary">{symbol}{totalAmt.toLocaleString()}</TableCell>
                            {hasPermission("delete_entries") && <TableCell />}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              );
            });
          })()}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentEntryPage;
