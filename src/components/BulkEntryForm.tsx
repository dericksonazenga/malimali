import { useState, useMemo } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useCommodities } from "@/contexts/CommodityContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Package, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export type BulkEntryType = "agent" | "vip" | "sales";

interface ParsedEntry {
  commodity: string;
  grossWeight: number;
  containerWeight: number;
  actualWeight: number;
  rate: number;
  amount: number;
}

/**
 * Parse weight expressions like "102-10 + 100-2 + 65-2"
 * Each item is "gross-deduction" or just "gross" (no deduction).
 * Supports formats: "102-10" → gross=102, container=10
 */
function parseWeightExpression(expr: string): { gross: number; container: number }[] {
  if (!expr.trim()) return [];
  // Split by +, comma, or newline
  const parts = expr.split(/[+\n]+/).map(s => s.trim()).filter(Boolean);
  return parts.map(part => {
    // Support "gross-container" format
    const match = part.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
    if (match) {
      return { gross: parseFloat(match[1]), container: parseFloat(match[2]) };
    }
    // Support multiplication e.g. "50*3"
    const mulMatch = part.match(/^(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)$/);
    if (mulMatch) {
      const result = parseFloat(mulMatch[1]) * parseFloat(mulMatch[2]);
      return { gross: result, container: 0 };
    }
    // Just a number — no deduction
    const num = parseFloat(part);
    if (!isNaN(num)) {
      return { gross: num, container: 0 };
    }
    return null;
  }).filter(Boolean) as { gross: number; container: number }[];
}

interface BulkEntryFormProps {
  type: BulkEntryType;
  title: string;
  storageKeyPrefix?: string;
  onSubmitEntries: (entries: ParsedEntry[], customerName: string) => Promise<void>;
}

const BulkEntryForm = ({ type, title, onSubmitEntries }: BulkEntryFormProps) => {
  const { commodities } = useCommodities();
  const { symbol } = useCurrency();
  const { hasPermission } = useAuth();

  const [customerName, setCustomerName] = useState("");
  // Map of commodity name → raw weight expression string
  const [weightExpressions, setWeightExpressions] = useState<Record<string, string>>({});
  // Map of commodity name → rate override
  const [rateOverrides, setRateOverrides] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [lastBulkSubmit, setLastBulkSubmit] = useState<{ key: string; time: number } | null>(null);

  const getRateForCommodity = (commodityName: string) => {
    const override = rateOverrides[commodityName];
    if (override && parseFloat(override)) return parseFloat(override);
    const c = commodities.find(c => c.name === commodityName);
    if (!c) return 0;
    if (type === "agent") return c.agentRate;
    if (type === "vip") return c.vipRate;
    return c.salesRate;
  };

  // Parse all entries for preview
  const allParsed = useMemo(() => {
    const results: ParsedEntry[] = [];
    commodities.forEach(c => {
      const expr = weightExpressions[c.name] || "";
      const parsed = parseWeightExpression(expr);
      const rate = getRateForCommodity(c.name);
      parsed.forEach(p => {
        const actual = Math.max(0, p.gross - p.container);
        results.push({
          commodity: c.name,
          grossWeight: p.gross,
          containerWeight: p.container,
          actualWeight: actual,
          rate,
          amount: actual * rate,
        });
      });
    });
    return results;
  }, [weightExpressions, rateOverrides, commodities, type]);

  // Group by commodity for summary
  const commoditySummary = useMemo(() => {
    const map: Record<string, { count: number; totalWeight: number; totalAmount: number }> = {};
    allParsed.forEach(e => {
      if (!map[e.commodity]) map[e.commodity] = { count: 0, totalWeight: 0, totalAmount: 0 };
      map[e.commodity].count++;
      map[e.commodity].totalWeight += e.actualWeight;
      map[e.commodity].totalAmount += e.amount;
    });
    return map;
  }, [allParsed]);

  const grandTotal = useMemo(() => allParsed.reduce((s, e) => s + e.amount, 0), [allParsed]);
  const totalEntries = allParsed.length;

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      toast.error("Enter customer name");
      return;
    }
    if (allParsed.length === 0) {
      toast.error("Enter at least one weight entry");
      return;
    }

    // Duplicate guard: block identical bulk submission within 15 seconds
    const bulkKey = `${customerName.trim().toLowerCase()}|${allParsed.map(e => `${e.commodity}:${e.grossWeight}-${e.containerWeight}`).join(",")}`;
    const now = Date.now();
    if (lastBulkSubmit && lastBulkSubmit.key === bulkKey && now - lastBulkSubmit.time < 15000) {
      toast.error("Duplicate bulk entry blocked. Wait 15 seconds or change values.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitEntries(allParsed, customerName.trim());
      setLastBulkSubmit({ key: bulkKey, time: now });
      setCustomerName("");
      setWeightExpressions({});
      setRateOverrides({});
      toast.success(`${totalEntries} entries added for ${customerName}!`);
    } catch (err) {
      toast.error("Failed to add entries");
    }
    setSubmitting(false);
  };

  const updateExpression = (name: string, val: string) => {
    setWeightExpressions(prev => ({ ...prev, [name]: val }));
  };

  const updateRate = (name: string, val: string) => {
    setRateOverrides(prev => ({ ...prev, [name]: val }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer Name */}
        <div className="space-y-2 max-w-sm">
          <Label className="text-base font-semibold">Customer Name *</Label>
          <Input
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="Enter customer name"
            className="h-12 text-base"
          />
        </div>

        {/* Commodity Grid */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Commodity</TableHead>
                <TableHead className="min-w-[250px]">Weights (gross-deduction, ...)</TableHead>
                <TableHead className="min-w-[100px] text-right">Rate ({symbol}/kg)</TableHead>
                <TableHead className="text-right min-w-[80px]">Entries</TableHead>
                <TableHead className="text-right min-w-[100px]">Total Wt</TableHead>
                <TableHead className="text-right min-w-[120px]">Total Amt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commodities.map(c => {
                const summary = commoditySummary[c.name];
                const defaultRate = getRateForCommodity(c.name);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold align-top pt-4">{c.name}</TableCell>
                    <TableCell className="align-top">
                      <Textarea
                        value={weightExpressions[c.name] || ""}
                        onChange={e => updateExpression(c.name, e.target.value)}
                        placeholder="e.g. 102-10 + 100-2 + 50*3"
                        className="min-h-[60px] font-mono text-sm resize-y"
                        rows={2}
                      />
                    </TableCell>
                    <TableCell className="text-right align-top pt-3">
                      <Input
                        type="number"
                        value={rateOverrides[c.name] || ""}
                        onChange={e => updateRate(c.name, e.target.value)}
                        placeholder={`${defaultRate}`}
                        disabled={!hasPermission("update_rates")}
                        className="w-24 ml-auto text-right font-mono"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono align-top pt-4">
                      {summary?.count || 0}
                    </TableCell>
                    <TableCell className="text-right font-mono align-top pt-4">
                      {summary?.totalWeight?.toFixed(1) || "0"}kg
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-primary align-top pt-4">
                      {symbol}{(summary?.totalAmount || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Grand total row */}
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell>Grand Total</TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right font-mono">{totalEntries}</TableCell>
                <TableCell className="text-right font-mono">
                  {allParsed.reduce((s, e) => s + e.actualWeight, 0).toFixed(1)}kg
                </TableCell>
                <TableCell className="text-right font-mono text-primary">
                  {symbol}{grandTotal.toLocaleString()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Preview of parsed entries */}
        {allParsed.length > 0 && (
          <div className="border border-border rounded-lg p-3 space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">
              Preview: {totalEntries} entries will be created
            </p>
            <div className="max-h-40 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Commodity</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Deduction</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allParsed.map((e, i) => (
                    <TableRow key={i} className="text-xs">
                      <TableCell>{e.commodity}</TableCell>
                      <TableCell className="text-right font-mono">{e.grossWeight}</TableCell>
                      <TableCell className="text-right font-mono">{e.containerWeight}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{e.actualWeight}</TableCell>
                      <TableCell className="text-right font-mono">{symbol}{e.rate}</TableCell>
                      <TableCell className="text-right font-mono text-primary">{symbol}{e.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !customerName.trim() || allParsed.length === 0}
            className="h-12 px-8 text-base font-semibold gap-2"
          >
            <Plus className="w-4 h-4" />
            Add {totalEntries} {totalEntries === 1 ? "Entry" : "Entries"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkEntryForm;
