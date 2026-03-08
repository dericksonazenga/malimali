import { DateRange } from "@/hooks/useAnalyticsData";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ranges: { value: DateRange; label: string }[] = [
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
  value: DateRange;
  onChange: (v: DateRange) => void;
}

const DateRangeSelector = ({ value, onChange }: Props) => (
  <div className="flex flex-wrap gap-1.5">
    {ranges.map(r => (
      <Button
        key={r.value}
        size="sm"
        variant={value === r.value ? "default" : "outline"}
        className={cn("h-8 text-xs", value === r.value && "shadow-md")}
        onClick={() => onChange(r.value)}
      >
        {r.label}
      </Button>
    ))}
  </div>
);

export default DateRangeSelector;
