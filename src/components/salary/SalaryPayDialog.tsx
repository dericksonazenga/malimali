import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

interface SalaryPayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerName: string;
  onSubmit: (data: { amount: number; type: string; paymentMonth: string }) => void;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();
const years = [currentYear - 1, currentYear, currentYear + 1];

const SalaryPayDialog = ({ open, onOpenChange, workerName, onSubmit }: SalaryPayDialogProps) => {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth()));
  const [year, setYear] = useState(String(currentYear));
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("regular");

  const handleSubmit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    const m = String(Number(month) + 1).padStart(2, "0");
    onSubmit({ amount: amt, type, paymentMonth: `${year}-${m}` });
    setAmount("");
    setType("regular");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Pay {workerName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((m, i) => (
                    <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Payment Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="advance">Advance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Amount</Label>
            <Input type="number" placeholder="Enter amount" className="h-9" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!amount || parseFloat(amount) <= 0}>
            Record Payment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalaryPayDialog;
