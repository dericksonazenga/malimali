import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";

export type PeriodOption = "this_month" | "last_month" | "this_year" | "custom";

interface PeriodPickerProps {
  period: PeriodOption;
  onPeriodChange: (p: PeriodOption) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
}

export const getDateRange = (period: PeriodOption, customFrom: string, customTo: string) => {
  const now = new Date();
  switch (period) {
    case "this_month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "last_month": {
      const last = subMonths(now, 1);
      return { from: startOfMonth(last), to: endOfMonth(last) };
    }
    case "this_year":
      return { from: startOfYear(now), to: endOfYear(now) };
    case "custom":
      return {
        from: customFrom ? new Date(customFrom) : startOfMonth(now),
        to: customTo ? new Date(customTo + "T23:59:59") : endOfMonth(now),
      };
  }
};

const PeriodPicker = ({ period, onPeriodChange, customFrom, customTo, onCustomFromChange, onCustomToChange }: PeriodPickerProps) => {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <Label className="text-xs text-muted-foreground">Period</Label>
        <Select value={period} onValueChange={(v) => onPeriodChange(v as PeriodOption)}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {period === "custom" && (
        <>
          <div>
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input type="date" className="h-9 w-36 text-sm" value={customFrom} onChange={e => onCustomFromChange(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input type="date" className="h-9 w-36 text-sm" value={customTo} onChange={e => onCustomToChange(e.target.value)} />
          </div>
        </>
      )}
    </div>
  );
};

export default PeriodPicker;
