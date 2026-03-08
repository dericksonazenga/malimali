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
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {!showCustom ? (
          <div className="p-1.5 space-y-0.5 min-w-[200px]">
            {presets.map(p => (
              <button
                key={p.value}
                onClick={() => selectPreset(p.value)}
                className={cn(
                  "w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-accent",
                  value.preset === p.value && "bg-accent font-medium"
                )}
              >
                {p.label}
                {value.preset === p.value && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            ))}
            <div className="border-t border-border my-1" />
            <button
              onClick={() => setShowCustom(true)}
              className={cn(
                "w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-accent",
                value.preset === "custom" && "bg-accent font-medium"
              )}
            >
              Custom Date Range
              <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Custom Range</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setShowCustom(false)}>
                ← Back
              </Button>
            </div>

            {/* Side-by-side calendars */}
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5 block">From</label>
                <div className="border border-border rounded-md">
                  <Calendar
                    mode="single"
                    selected={customFrom}
                    onSelect={setCustomFrom}
                    className="p-1 pointer-events-auto !w-full"
                    classNames={{
                      months: "flex flex-col",
                      month: "space-y-1",
                      caption: "flex justify-center pt-0.5 relative items-center",
                      caption_label: "text-xs font-medium",
                      nav: "space-x-0.5 flex items-center",
                      nav_button: "h-5 w-5 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-sm border border-input",
                      nav_button_previous: "absolute left-0.5",
                      nav_button_next: "absolute right-0.5",
                      table: "w-full border-collapse",
                      head_row: "flex",
                      head_cell: "text-muted-foreground rounded-md w-7 font-normal text-[10px]",
                      row: "flex w-full mt-0.5",
                      cell: "h-7 w-7 text-center text-xs p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-7 w-7 p-0 font-normal text-xs aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md inline-flex items-center justify-center",
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground",
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-50",
                      day_hidden: "invisible",
                    }}
                    disabled={(date) => date > new Date()}
                  />
                </div>
                {customFrom && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 text-center">{format(customFrom, "MMM d, yyyy")}</p>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5 block">To</label>
                <div className="border border-border rounded-md">
                  <Calendar
                    mode="single"
                    selected={customTo}
                    onSelect={setCustomTo}
                    className="p-1 pointer-events-auto !w-full"
                    classNames={{
                      months: "flex flex-col",
                      month: "space-y-1",
                      caption: "flex justify-center pt-0.5 relative items-center",
                      caption_label: "text-xs font-medium",
                      nav: "space-x-0.5 flex items-center",
                      nav_button: "h-5 w-5 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-sm border border-input",
                      nav_button_previous: "absolute left-0.5",
                      nav_button_next: "absolute right-0.5",
                      table: "w-full border-collapse",
                      head_row: "flex",
                      head_cell: "text-muted-foreground rounded-md w-7 font-normal text-[10px]",
                      row: "flex w-full mt-0.5",
                      cell: "h-7 w-7 text-center text-xs p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-7 w-7 p-0 font-normal text-xs aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md inline-flex items-center justify-center",
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground",
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-50",
                      day_hidden: "invisible",
                    }}
                    disabled={(date) => date > new Date() || (customFrom ? date < customFrom : false)}
                  />
                </div>
                {customTo && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 text-center">{format(customTo, "MMM d, yyyy")}</p>
                )}
              </div>
            </div>

            {/* Apply button */}
            <Button
              size="sm"
              className="w-full h-8 text-xs"
              disabled={!customFrom}
              onClick={applyCustomRange}
            >
              {customFrom && customTo
                ? `Apply: ${format(customFrom, "MMM d")} – ${format(customTo, "MMM d")}`
                : customFrom
                  ? `Apply: ${format(customFrom, "MMM d, yyyy")}`
                  : "Select a start date"}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default DateRangeSelector;
