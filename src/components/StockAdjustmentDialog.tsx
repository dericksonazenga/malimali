import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/utils/auditLog";
import { toast } from "sonner";

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commodities: { name: string }[];
  persistentStock: Record<string, number>;
}

const StockAdjustmentDialog = ({ open, onOpenChange, commodities, persistentStock }: StockAdjustmentDialogProps) => {
  const [commodity, setCommodity] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const currentWeight = commodity ? (persistentStock[commodity] || 0) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commodity || !reason.trim()) {
      toast.error("Select a commodity and provide a reason");
      return;
    }

    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight < 0) {
      toast.error("Enter a valid weight");
      return;
    }

    setSaving(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const company_id = await (await import("@/utils/getCompanyId")).getCompanyId();

      // Log the adjustment
      const { error: logError } = await supabase.from("stock_adjustments").insert({
        commodity,
        previous_weight: currentWeight,
        new_weight: weight,
        reason: reason.trim(),
        adjusted_by: userId,
        company_id,
      });

      if (logError) throw logError;

      // Update persistent stock
      const { error: updateError } = await supabase.from("persistent_stock").upsert(
        { commodity, weight, updated_at: new Date().toISOString(), company_id },
        { onConflict: "commodity,company_id" }
      );

      if (updateError) throw updateError;

      const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", userId).single();
      await logAuditEvent({ tableName: "stock", recordId: commodity, action: "update", oldData: { commodity, weight: currentWeight }, newData: { commodity, weight, reason: reason.trim() }, changedByName: profile?.display_name || "Unknown" });

      toast.success(`Stock adjusted: ${commodity} → ${weight.toLocaleString()} kg`);
      setCommodity("");
      setNewWeight("");
      setReason("");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to adjust stock: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            Manually correct the persistent stock for a commodity. This is logged for audit purposes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Commodity *</Label>
            <Select value={commodity} onValueChange={(v) => { setCommodity(v); setNewWeight(""); }}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Select commodity" /></SelectTrigger>
              <SelectContent>
                {commodities.map((c) => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {commodity && (
            <div className="rounded-lg bg-accent p-3 text-sm font-mono">
              Current persistent stock: <strong>{currentWeight.toLocaleString()} kg</strong>
            </div>
          )}

          <div className="space-y-2">
            <Label>New Weight (kg) *</Label>
            <Input
              type="number"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              placeholder={commodity ? currentWeight.toString() : "0"}
              className="h-12"
              min="0"
              step="any"
            />
            {commodity && newWeight && !isNaN(parseFloat(newWeight)) && (
              <p className={`text-xs font-mono ${parseFloat(newWeight) > currentWeight ? "text-success" : parseFloat(newWeight) < currentWeight ? "text-destructive" : "text-muted-foreground"}`}>
                {parseFloat(newWeight) > currentWeight
                  ? `+${(parseFloat(newWeight) - currentWeight).toLocaleString()} kg`
                  : parseFloat(newWeight) < currentWeight
                  ? `${(parseFloat(newWeight) - currentWeight).toLocaleString()} kg`
                  : "No change"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Reason *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Physical count correction, spillage, theft..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Apply Adjustment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StockAdjustmentDialog;
