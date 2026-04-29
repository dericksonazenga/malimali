import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, Eye, AlertTriangle, Loader2, CalendarIcon, ChevronRight, ChevronLeft, Database } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type TableConfig = {
  key: string;
  label: string;
  dateField?: string;
  customerField?: string;
  commodityField?: string;
  /** Has a status column with paid/unpaid/partial values */
  hasPaymentStatus?: boolean;
  displayFields: string[];
};

const TABLES: TableConfig[] = [
  { key: "agent_entries", label: "Agent Entries", dateField: "date", customerField: "customer_name", commodityField: "commodity", displayFields: ["date", "customer_name", "commodity", "actual_weight", "rate", "amount"] },
  { key: "vip_entries", label: "VIP Entries", dateField: "date", customerField: "customer_name", commodityField: "commodity", displayFields: ["date", "customer_name", "commodity", "actual_weight", "rate", "amount"] },
  { key: "sales_entries", label: "Sales Entries", dateField: "date", customerField: "customer_name", commodityField: "commodity", displayFields: ["date", "customer_name", "commodity", "weight", "rate", "amount"] },
  { key: "expenses", label: "Expenses", dateField: "date", displayFields: ["date", "category", "amount", "verified_by", "notes"] },
  { key: "debts", label: "Debts", customerField: "customer_name", hasPaymentStatus: true, displayFields: ["customer_name", "description", "total_amount", "balance", "status"] },
  { key: "creditors", label: "Creditors", customerField: "customer_name", commodityField: "commodity", hasPaymentStatus: true, displayFields: ["customer_name", "commodity", "kg", "total_amount", "balance", "status"] },
  { key: "savings_accounts", label: "Savings Accounts", customerField: "customer_name", displayFields: ["customer_name", "balance"] },
  { key: "attendance", label: "Attendance", dateField: "date", displayFields: ["date", "worker_name", "status", "sign_in_at", "sign_out_at"] },
  { key: "stock_adjustments", label: "Stock Adjustments", commodityField: "commodity", displayFields: ["created_at", "commodity", "previous_weight", "new_weight", "reason"] },
  { key: "rate_change_history", label: "Rate Change History", commodityField: "commodity_name", displayFields: ["created_at", "commodity_name", "new_agent_rate", "new_vip_rate", "new_sales_rate", "changed_by_name"] },
  { key: "salary_payments", label: "Salary Payments", displayFields: ["created_at", "worker_name", "amount", "type", "payment_method"] },
  { key: "audit_log", label: "Audit Log", displayFields: ["created_at", "table_name", "action", "changed_by_name"] },
];

type Step = 1 | 2 | 3 | 4;

interface DeleteWizardProps {
  /** When provided, requires user to enter this PIN before deletion. */
  requiredPin?: string | null;
  /** Hide tables that should not be exposed in company settings mode. */
  excludeTables?: string[];
}

const DeleteWizard = ({ requiredPin, excludeTables }: DeleteWizardProps = {}) => {
  const { companyId } = useAuth();
  const tables = useMemo(
    () => (excludeTables?.length ? TABLES.filter((t) => !excludeTables.includes(t.key)) : TABLES),
    [excludeTables]
  );
  const [enteredPin, setEnteredPin] = useState("");
  const [step, setStep] = useState<Step>(1);
  const [tableKey, setTableKey] = useState<string>("");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [customer, setCustomer] = useState("");
  const [commodity, setCommodity] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("any");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [deleting, setDeleting] = useState(false);

  const config = useMemo(() => tables.find((t) => t.key === tableKey), [tableKey, tables]);

  const reset = () => {
    setStep(1); setTableKey(""); setFromDate(undefined); setToDate(undefined);
    setCustomer(""); setCommodity(""); setStatusFilter("any"); setSortOrder("desc");
    setPreviewRows([]); setTotalCount(0); setConfirmPhrase(""); setEnteredPin("");
  };

  const buildQuery = (countOnly: boolean) => {
    if (!config) return null;
    let q: any = supabase.from(config.key as any).select("*", countOnly ? { count: "exact", head: true } : { count: "exact" });
    if (companyId && config.key !== "audit_log") {
      // RLS already filters, but be explicit
      q = q.eq("company_id", companyId);
    }
    if (config.dateField && fromDate) q = q.gte(config.dateField, format(fromDate, "yyyy-MM-dd"));
    if (config.dateField && toDate) q = q.lte(config.dateField, format(toDate, "yyyy-MM-dd"));
    if (config.customerField && customer.trim()) q = q.ilike(config.customerField, `%${customer.trim()}%`);
    if (config.commodityField && commodity.trim()) q = q.ilike(config.commodityField, `%${commodity.trim()}%`);
    if (config.hasPaymentStatus && statusFilter !== "any") q = q.eq("status", statusFilter);
    return q;
  };

  const loadPreview = async () => {
    if (!config) return;
    setLoading(true);
    try {
      const q = buildQuery(false);
      if (!q) return;
      const { data, count, error } = await q.limit(50).order(config.dateField || "created_at", { ascending: sortOrder === "asc" });
      if (error) { toast.error(error.message); return; }
      setPreviewRows(data || []);
      setTotalCount(count || 0);
      setStep(3);
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!config) return;
    if (confirmPhrase !== "DELETE") { toast.error('Type DELETE to confirm'); return; }
    if (requiredPin) {
      if (!enteredPin || enteredPin !== requiredPin) { toast.error('Incorrect company PIN'); return; }
    }
    setDeleting(true);
    try {
      let q: any = supabase.from(config.key as any).delete();
      if (companyId && config.key !== "audit_log") q = q.eq("company_id", companyId);
      if (config.dateField && fromDate) q = q.gte(config.dateField, format(fromDate, "yyyy-MM-dd"));
      if (config.dateField && toDate) q = q.lte(config.dateField, format(toDate, "yyyy-MM-dd"));
      if (config.customerField && customer.trim()) q = q.ilike(config.customerField, `%${customer.trim()}%`);
      if (config.commodityField && commodity.trim()) q = q.ilike(config.commodityField, `%${commodity.trim()}%`);
      const { error } = await q;
      if (error) { toast.error(error.message); return; }

      // Log deletion event for company audit trail
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id ?? null;
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", userId)
          .maybeSingle();
        await supabase.from("audit_log").insert({
          table_name: "audit_log",
          record_id: crypto.randomUUID(),
          action: "bulk_delete",
          old_data: null,
          new_data: {
            target_table: config.key,
            target_label: config.label,
            row_count: totalCount,
            filters: {
              from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : null,
              to_date: toDate ? format(toDate, "yyyy-MM-dd") : null,
              customer: customer.trim() || null,
              commodity: commodity.trim() || null,
            },
          } as any,
          changed_by: userId,
          changed_by_name: profile?.display_name || userRes.data.user?.email || "unknown",
          company_id: companyId,
        });
      } catch (logErr) {
        console.warn("Failed to log deletion event", logErr);
      }

      toast.success(`Deleted ${totalCount} row${totalCount === 1 ? "" : "s"} from ${config.label}`);
      reset();
    } finally { setDeleting(false); }
  };

  const filtersActive = !!(fromDate || toDate || customer.trim() || commodity.trim());

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="w-5 h-5" /> Guided Delete Wizard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step indicator */}
        <div className="flex items-center gap-1 text-xs">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={cn("flex-1 h-1.5 rounded-full transition-colors", step >= s ? "bg-destructive" : "bg-muted")} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Step {step} of 4 · {["Choose table", "Set filters", "Preview", "Confirm"][step - 1]}</p>

        {/* Step 1: Table */}
        {step === 1 && (
          <div className="space-y-3">
            <Label className="flex items-center gap-2"><Database className="w-4 h-4" /> Select table</Label>
            <Select value={tableKey} onValueChange={setTableKey}>
              <SelectTrigger><SelectValue placeholder="Choose a table to delete from" /></SelectTrigger>
              <SelectContent>
                {tables.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!tableKey} className="gap-1">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Filters */}
        {step === 2 && config && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Filter <strong className="text-foreground">{config.label}</strong>. Leave blank to match all rows for that filter.</p>

            {config.dateField && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">From date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start font-normal", !fromDate && "text-muted-foreground")}>
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {fromDate ? format(fromDate, "PPP") : "Any"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={fromDate} onSelect={setFromDate} className={cn("p-3 pointer-events-auto")} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs">To date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start font-normal", !toDate && "text-muted-foreground")}>
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {toDate ? format(toDate, "PPP") : "Any"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={toDate} onSelect={setToDate} className={cn("p-3 pointer-events-auto")} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {config.customerField && (
              <div>
                <Label className="text-xs">Customer / name contains</Label>
                <Input value={customer} onChange={(e) => setCustomer(e.target.value.slice(0, 100))} placeholder="e.g. John" />
              </div>
            )}

            {config.commodityField && (
              <div>
                <Label className="text-xs">Commodity contains</Label>
                <Input value={commodity} onChange={(e) => setCommodity(e.target.value.slice(0, 100))} placeholder="e.g. Copper" />
              </div>
            )}

            {!filtersActive && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">No filters set — this will target <strong>ALL rows</strong> in {config.label}.</p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1"><ChevronLeft className="w-4 h-4" /> Back</Button>
              <Button onClick={loadPreview} disabled={loading} className="gap-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                Preview
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && config && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm">
                Found <Badge variant="destructive">{totalCount}</Badge> row{totalCount === 1 ? "" : "s"} matching your filters
                {totalCount > previewRows.length && <span className="text-muted-foreground"> (showing first {previewRows.length})</span>}.
              </p>
            </div>

            {previewRows.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">No matching rows.</p>
            ) : (
              <ScrollArea className="h-[300px] border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      {config.displayFields.map((f) => <th key={f} className="text-left px-2 py-2 whitespace-nowrap">{f}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => (
                      <tr key={row.id} className="border-t border-border">
                        {config.displayFields.map((f) => (
                          <td key={f} className="px-2 py-1.5 font-mono whitespace-nowrap max-w-[200px] truncate">
                            {row[f] === null || row[f] === undefined ? "—" : typeof row[f] === "object" ? JSON.stringify(row[f]) : String(row[f])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-1"><ChevronLeft className="w-4 h-4" /> Back</Button>
              <Button variant="destructive" onClick={() => setStep(4)} disabled={totalCount === 0} className="gap-1">
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && config && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 space-y-1">
              <p className="text-sm font-medium text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> This action is permanent
              </p>
              <p className="text-xs text-muted-foreground">
                You are about to delete <strong className="text-foreground">{totalCount}</strong> row{totalCount === 1 ? "" : "s"} from <strong className="text-foreground">{config.label}</strong>. There is no undo.
              </p>
            </div>

            <div>
              <Label className="text-xs">Type <strong className="text-destructive">DELETE</strong> to confirm</Label>
              <Input value={confirmPhrase} onChange={(e) => setConfirmPhrase(e.target.value)} placeholder="DELETE" className="font-mono" />
            </div>

            {requiredPin && (
              <div>
                <Label className="text-xs">Enter company delete PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="••••"
                  className="font-mono tracking-widest"
                  autoComplete="off"
                />
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)} disabled={deleting} className="gap-1"><ChevronLeft className="w-4 h-4" /> Back</Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={reset} disabled={deleting}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting || confirmPhrase !== "DELETE" || (!!requiredPin && enteredPin !== requiredPin)} className="gap-1">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Permanently Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeleteWizard;
