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
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShoppingCart, Trash2, ArrowLeftRight, RefreshCw, Package } from "lucide-react";
import ImageCaptureButton from "@/components/ImageCaptureButton";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";
import BulkEntryForm from "@/components/BulkEntryForm";

const SalesEntryPage = () => {
  const [bulkMode, setBulkMode] = useState(false);
  const [lastSubmit, setLastSubmit] = useState<{ key: string; time: number } | null>(null);
  const { hasPermission } = useAuth();
  const { symbol } = useCurrency();
  const { resetSignal } = useEndOfDay();
  const { salesEntries: entries, addSalesEntry, removeSalesEntry, clearAll, refresh } = useInventory();
  const { commodities } = useCommodities();
  const [customerName, setCustomerName] = useState("");
  const [commodity, setCommodity] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [containerWeight, setContainerWeight] = useState("");
  const [rateOverride, setRateOverride] = useState("");
  const [isExchange, setIsExchange] = useState(false);
  const [exchangeCommodity, setExchangeCommodity] = useState("");
  const [exchangeWeight, setExchangeWeight] = useState("");
  const [exchangeFee, setExchangeFee] = useState("");
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

  const selectedCommodity = commodities.find((c) => c.name === commodity);
  const rate = rateOverride ? parseFloat(rateOverride) : (selectedCommodity?.salesRate || 0);
  const gross = parseFloat(grossWeight) || 0;
  const container = parseFloat(containerWeight) || 0;
  const actualWeight = Math.max(0, gross - container);
  const amount = rate > 0 ? actualWeight * rate : undefined;
  const exchFee = parseFloat(exchangeFee) || 0;
  const totalAmount = useMemo(() => entries.reduce((s, e) => s + (e.amount || 0), 0), [entries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExchange) {
      if (!exchangeCommodity || !exchangeWeight) { toast.error("Fill exchange fields"); return; }
    } else {
      if (!commodity || !grossWeight) { toast.error("Fill required fields"); return; }
    }
    const entryAmount = isExchange ? exchFee : amount;
    await addSalesEntry({
      id: Date.now().toString(),
      customerName,
      commodity: isExchange ? exchangeCommodity : commodity,
      grossWeight: isExchange ? 0 : gross,
      containerWeight: isExchange ? 0 : container,
      weight: isExchange ? (parseFloat(exchangeWeight) || 0) : actualWeight,
      rate: isExchange ? undefined : (rate > 0 ? rate : undefined),
      amount: entryAmount,
      isExchange,
      exchangeCommodity: isExchange ? exchangeCommodity : undefined,
      exchangeWeight: isExchange ? parseFloat(exchangeWeight) || 0 : undefined,
      exchangeFee: isExchange ? exchFee : 0,
      createdBy: "current",
      createdAt: new Date().toISOString().split("T")[0],
    });
    setCustomerName(""); setCommodity(""); setGrossWeight(""); setContainerWeight(""); setRateOverride("");
    setIsExchange(false); setExchangeCommodity(""); setExchangeWeight(""); setExchangeFee("");
    toast.success("Sales entry added!");
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-primary" /> New Sales Entry</span>
            <Button variant={bulkMode ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setBulkMode(!bulkMode)}>
              <Package className="w-4 h-4" /> Bulk Sales
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!bulkMode ? (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Customer Name</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Buyer name (optional)" className="h-12" /></div>
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
              <div className="space-y-2"><Label>Gross Weight (kg) *</Label><Input type="number" value={grossWeight} onChange={(e) => setGrossWeight(e.target.value)} placeholder="0" className="h-12" /></div>
              <div className="space-y-2"><Label>Container Weight (kg)</Label><Input type="number" value={containerWeight} onChange={(e) => setContainerWeight(e.target.value)} placeholder="0" className="h-12" /></div>
              <div className="space-y-2">
                <Label>Rate ({symbol}/kg)</Label>
                <Input type="number" value={rateOverride} onChange={(e) => setRateOverride(e.target.value)} placeholder={`${selectedCommodity?.salesRate || "Auto"}`} disabled={!hasPermission("update_rates")} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Calculated</Label>
                <div className="h-12 rounded-lg bg-accent flex items-center px-4 gap-4 text-sm font-mono">
                  <span>Wt: <strong>{actualWeight}</strong>kg</span>
                  <span>Amt: {amount !== undefined ? <strong className="text-primary">{symbol}{amount.toLocaleString()}</strong> : <span className="text-muted-foreground">Pending</span>}</span>
                </div>
              </div>

              {/* Exchange Section */}
              <div className="lg:col-span-3 border-t border-border pt-4">
                <div className="flex items-center gap-3 mb-4">
                  <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="exchange-toggle" className="cursor-pointer">Exchange / Barter Trade</Label>
                  <Switch id="exchange-toggle" checked={isExchange} onCheckedChange={setIsExchange} />
                </div>
                {isExchange && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Exchange Commodity *</Label>
                      <Select value={exchangeCommodity} onValueChange={setExchangeCommodity}>
                        <SelectTrigger className="h-12"><SelectValue placeholder="Commodity given in exchange" /></SelectTrigger>
                        <SelectContent>
                          {commodities.filter(c => c.name !== commodity).map((c) => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                     <div className="space-y-2"><Label>Exchange Weight (kg) *</Label><Input type="number" value={exchangeWeight} onChange={(e) => setExchangeWeight(e.target.value)} placeholder="0" className="h-12" /></div>
                     <div className="space-y-2"><Label>Exchange Fee ({symbol})</Label><Input type="number" value={exchangeFee} onChange={(e) => setExchangeFee(e.target.value)} placeholder="Extra cash from customer" className="h-12" /></div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 lg:col-span-3">
                <ImageCaptureButton label="Weight Image" onCapture={(f) => console.log("Weight image:", f.name)} />
                <ImageCaptureButton label="Item Image" onCapture={(f) => console.log("Item image:", f.name)} />
                <div className="flex-1" />
                <Button type="submit" className="h-12 px-8 text-base font-semibold">Add Entry</Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>

      {bulkMode && (
        <BulkEntryForm
          type="sales"
          title="Bulk Sales — Multi-Commodity Entry"
          onSubmitEntries={async (entries, customerName) => {
            for (const entry of entries) {
              await addSalesEntry({
                id: Date.now().toString() + Math.random(),
                customerName,
                commodity: entry.commodity,
                grossWeight: entry.grossWeight,
                containerWeight: entry.containerWeight,
                weight: entry.actualWeight,
                rate: entry.rate,
                amount: entry.amount,
                isExchange: false,
                exchangeFee: 0,
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
            <span>Sales Entries</span>
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
              const key = (entry.customerName || "Walk-in").trim().toLowerCase();
              if (!acc[key]) acc[key] = { displayName: entry.customerName || "Walk-in", entries: [] };
              acc[key].entries.push(entry);
              return acc;
            }, {} as Record<string, { displayName: string; entries: SalesEntry[] }>);

            return Object.values(grouped).map((group) => {
              const totalGross = group.entries.reduce((s, e) => s + (e.grossWeight || 0), 0);
              const totalContainer = group.entries.reduce((s, e) => s + (e.containerWeight || 0), 0);
              const totalWt = group.entries.reduce((s, e) => s + (e.weight || 0), 0);
              const totalAmt = group.entries.reduce((s, e) => s + (e.amount || 0), 0);
              const commodities = [...new Set(group.entries.map(e => e.commodity).filter(Boolean))];

              return (
                <Accordion key={group.displayName} type="single" collapsible className="mb-2">
                  <AccordionItem value={group.displayName} className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex flex-1 items-center justify-between pr-4 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{group.displayName}</span>
                          <span className="bg-primary/10 text-primary text-xs font-mono px-2 py-0.5 rounded-full">{group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}</span>
                        </div>
                        <div className="flex items-center gap-4 font-mono text-xs">
                          <span className="text-muted-foreground">{commodities.join(', ')}</span>
                          <span>Wt: <strong>{totalWt}</strong>kg</span>
                          <span className="text-primary font-semibold">{symbol}{totalAmt.toLocaleString()}</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-0 pb-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Commodity</TableHead>
                            <TableHead className="text-right">Gross</TableHead>
                            <TableHead className="text-right">Container</TableHead>
                            <TableHead className="text-right">Actual Wt</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Exchange</TableHead>
                            {hasPermission("delete_entries") && <TableHead />}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.entries.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>{entry.commodity || "—"}</TableCell>
                              <TableCell className="text-right font-mono">{entry.grossWeight}</TableCell>
                              <TableCell className="text-right font-mono">{entry.containerWeight}</TableCell>
                              <TableCell className="text-right font-mono font-semibold">{entry.weight}</TableCell>
                              <TableCell className="text-right font-mono">{entry.rate ? `${symbol}${entry.rate}` : "—"}</TableCell>
                              <TableCell className="text-right font-mono font-semibold">{entry.amount ? <span className="text-primary">{symbol}{entry.amount.toLocaleString()}</span> : <span className="text-muted-foreground">Pending</span>}</TableCell>
                              <TableCell>{entry.isExchange ? <span className="text-xs bg-accent px-2 py-1 rounded">{entry.exchangeCommodity} ({entry.exchangeWeight}kg)</span> : "—"}</TableCell>
                              {hasPermission("delete_entries") && (
                                <TableCell><Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeSalesEntry(entry.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                              )}
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/30 font-semibold">
                            <TableCell>Totals</TableCell>
                            <TableCell className="text-right font-mono">{totalGross}</TableCell>
                            <TableCell className="text-right font-mono">{totalContainer}</TableCell>
                            <TableCell className="text-right font-mono">{totalWt}</TableCell>
                            <TableCell />
                            <TableCell className="text-right font-mono text-primary">{symbol}{totalAmt.toLocaleString()}</TableCell>
                            <TableCell />
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

export default SalesEntryPage;
