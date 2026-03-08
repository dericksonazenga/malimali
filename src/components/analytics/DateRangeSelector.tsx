import { useState } from "react";
import { DateRange, DateRangeValue } from "@/hooks/useAnalyticsData";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const presets: { value: DateRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_year", label: "This Year" },
  { value: "last_year", label: "Last Year" },
  { value: "all_time", label: "All Time" },
];

interface Props {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
}

function getDisplayLabel(value: DateRangeValue): string {
  if (value.preset === "custom" && value.customFrom) {
    const from = format(value.customFrom, "MMM d, yyyy");
    const to = value.customTo ? format(value.customTo, "MMM d, yyyy") : from;
    return from === to ? from : `${from} – ${to}`;
  }
  const found = presets.find(p => p.value === value.preset);
  return found?.label || "Select period";
}

const DateRangeSelector = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState<Date | undefined>(value.customFrom);
  const [customTo, setCustomTo] = useState<Date | undefined>(value.customTo);
  const [showCustom, setShowCustom] = useState(value.preset === "custom");

  const selectPreset = (preset: DateRange) => {
    onChange({ preset });
    setShowCustom(false);
    setOpen(false);
  };

  const applyCustomRange = () => {
    if (customFrom) {
      onChange({ preset: "custom", customFrom, customTo: customTo || customFrom });
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 text-sm font-medium">
          <CalendarIcon className="w-4 h-4" />
          <span className="truncate max-w-[200px]">{getDisplayLabel(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 min-w-[280px] max-h-[80vh] overflow-y-auto" align="start">
        {!showCustom ? (
          <div className="p-2 space-y-0.5">
            {presets.map(p => (
              <button
                key={p.value}
                onClick={() => selectPreset(p.value)}
                className={cn(
                  "w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                  value.preset === p.value && "bg-accent font-medium"
                )}
              >
                {p.label}
                {value.preset === p.value && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
            <div className="border-t border-border my-1" />
            <button
              onClick={() => setShowCustom(true)}
              className={cn(
                "w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                value.preset === "custom" && "bg-accent font-medium"
              )}
            >
              Custom Date Range
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Select dates</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowCustom(false)}>
                ← Presets
              </Button>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">From</label>
                <Calendar
                  mode="single"
                  selected={customFrom}
                  onSelect={setCustomFrom}
                  className="p-2 pointer-events-auto"
                  disabled={(date) => date > new Date()}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">To</label>
                <Calendar
                  mode="single"
                  selected={customTo}
                  onSelect={setCustomTo}
                  className="p-2 pointer-events-auto"
                  disabled={(date) => date > new Date() || (customFrom ? date < customFrom : false)}
                />
              </div>
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={!customFrom}
              onClick={applyCustomRange}
            >
              Apply Range
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default DateRangeSelector;
