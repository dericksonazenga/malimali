import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCommodities } from "@/contexts/CommodityContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { evalWeightExpression } from "@/utils/evalWeightExpression";
import { toast } from "sonner";

export type EntryKind = "agent" | "vip" | "sales";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  kind: EntryKind;
  entry: {
    id: string;
    customerName: string;
    commodity?: string;
    weight: number; // unified: actualWeight or sales weight
    rate: number;
  };
  onSave: (patch: { customerName: string; commodity: string; weight: number; rate: number; amount: number }) => Promise<void>;
}

const EditEntryDialog = ({ open, onOpenChange, kind, entry, onSave }: Props) => {
  const { commodities } = useCommodities();
  const { symbol } = useCurrency();
  const [customerName, setCustomerName] = useState(entry.customerName);
  const [commodity, setCommodity] = useState(entry.commodity || "");
  const [weightExpr, setWeightExpr] = useState(String(entry.weight));
  const [rate, setRate] = useState(String(entry.rate));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCustomerName(entry.customerName);
      setCommodity(entry.commodity || "");
      setWeightExpr(String(entry.weight));
      setRate(String(entry.rate));
    }
  }, [open, entry]);

  const weight = evalWeightExpression(weightExpr);
  const rateNum = parseFloat(rate) || 0;
  const amount = weight * rateNum;

  const handleSave = async () => {
    if (!customerName.trim()) { toast.error("Customer name required"); return; }
    if (!commodity) { toast.error("Commodity required"); return; }
    if (!weight || weight <= 0) { toast.error("Weight must be > 0"); return; }
    setSaving(true);
    try {
      await onSave({ customerName: customerName.trim(), commodity, weight, rate: rateNum, amount });
      toast.success("Entry updated");
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Failed to update: " + (e.message || "unknown"));
    } finally {
      setSaving(false);
    }
  };

  const title = kind === "agent" ? "Edit Agent Entry" : kind === "vip" ? "Edit VIP Entry" : "Edit Sales Entry";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Customer Name</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Commodity</Label>
            <Select value={commodity} onValueChange={setCommodity}>
              <SelectTrigger><SelectValue placeholder="Select commodity" /></SelectTrigger>
              <SelectContent>
                {commodities.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input value={weightExpr} onChange={(e) => setWeightExpr(e.target.value)} className="font-mono" />
              <p className="text-xs text-muted-foreground">= {weight} kg</p>
            </div>
            <div className="space-y-2">
              <Label>Rate ({symbol}/kg)</Label>
              <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className="font-mono" />
            </div>
          </div>
          <div className="rounded-lg bg-accent px-4 py-3 text-sm font-mono">
            Amount: <strong className="text-primary">{symbol}{amount.toLocaleString()}</strong>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditEntryDialog;
