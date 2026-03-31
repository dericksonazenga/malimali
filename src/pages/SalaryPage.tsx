import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Banknote, Plus, AlertTriangle, Pencil, Check, X, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/utils/auditLog";
import AuditLogViewer from "@/components/AuditLogViewer";
import { differenceInDays, format, setDate, isBefore, addMonths, isWithinInterval } from "date-fns";
import SalaryPayDialog from "@/components/salary/SalaryPayDialog";
import PeriodPicker, { getDateRange, type PeriodOption } from "@/components/salary/PeriodPicker";

interface WorkerRow {
  id: string;
  name: string;
  role: string;
  salary: number;
  paid: number;
  balance: number;
  created_at: string;
  pay_day?: number;
}

interface SalaryPayment {
  id: string;
  worker_id: string;
  worker_name: string;
  amount: number;
  type: string;
  paid_by_name: string;
  notes: string;
  created_at: string;
  payment_month: string;
}

const SalaryPage = () => {
  const { symbol } = useCurrency();
  const { user, hasPermission } = useAuth();
  const canEdit = user?.role === "admin" || hasPermission("edit_records");
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null);
  const [editSalaryValue, setEditSalaryValue] = useState("");
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payingWorker, setPayingWorker] = useState<WorkerRow | null>(null);

  // Period picker state
  const [period, setPeriod] = useState<PeriodOption>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const fetchWorkers = useCallback(async () => {
    const { data } = await supabase.from("workers").select("*").order("name");
    if (data) {
      setWorkers(data.map((w: any) => ({
        id: w.id, name: w.name, role: w.role,
        salary: Number(w.salary), paid: Number(w.paid),
        balance: Number(w.balance), created_at: w.created_at,
        pay_day: new Date(w.created_at).getDate(),
      })));
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    const { data } = await supabase
      .from("salary_payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data) setPayments(data as SalaryPayment[]);
  }, []);

  useEffect(() => {
    fetchWorkers();
    fetchPayments();
    const ch1 = supabase.channel("salary-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "workers" }, () => fetchWorkers())
      .on("postgres_changes", { event: "*", schema: "public", table: "salary_payments" }, () => fetchPayments())
      .subscribe();
    return () => { supabase.removeChannel(ch1); };
  }, [fetchWorkers, fetchPayments]);

  // Filter payments by period
  const filteredPayments = useMemo(() => {
    const range = getDateRange(period, customFrom, customTo);
    return payments.filter(p => {
      const d = new Date(p.created_at);
      return isWithinInterval(d, { start: range.from, end: range.to });
    });
  }, [payments, period, customFrom, customTo]);

  const handlePay = async (data: { amount: number; type: string; paymentMonth: string; paymentMethod: string; accountNumber?: string }) => {
    if (!payingWorker) return;
    const worker = payingWorker;
    const { amount, type: payType, paymentMonth, paymentMethod, accountNumber } = data;

    const newPaid = worker.paid + amount;
    const newBalance = worker.salary - newPaid;

    const { error } = await supabase
      .from("workers")
      .update({ paid: newPaid, balance: newBalance })
      .eq("id", worker.id);
    if (error) { toast.error("Failed to record payment"); return; }

    const notes = [
      payType === "advance" ? "Advance salary" : "Regular payment",
      accountNumber ? `(${paymentMethod === "mpesa" ? "M-Pesa" : "Acct"}: ${accountNumber})` : "",
    ].filter(Boolean).join(" ");

    await supabase.from("salary_payments").insert({
      worker_id: worker.id,
      worker_name: worker.name,
      amount,
      type: payType,
      paid_by_name: user?.name || "Unknown",
      notes,
      payment_month: paymentMonth,
      payment_method: paymentMethod,
    });

    await logAuditEvent({
      tableName: "salaries", recordId: worker.id, action: "payment",
      newData: { worker: worker.name, payment_amount: amount, type: payType, paid_by: user?.name, new_paid: newPaid, new_balance: newBalance, payment_month: paymentMonth, payment_method: paymentMethod },
      changedByName: user?.name || "Unknown",
    });
    toast.success(`${payType === "advance" ? "Advance" : "Payment"} of ${symbol}${amount.toLocaleString()} for ${paymentMonth} recorded`);
  };

  const saveSalary = async (workerId: string) => {
    const salary = parseFloat(editSalaryValue) || 0;
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;
    const oldSalary = worker.salary;
    const newBalance = salary - worker.paid;
    const { error } = await supabase.from("workers").update({ salary, balance: newBalance }).eq("id", workerId);
    if (error) { toast.error("Failed to update salary"); return; }
    await logAuditEvent({ tableName: "salaries", recordId: workerId, action: "update", oldData: { worker: worker.name, salary: oldSalary }, newData: { worker: worker.name, salary }, changedByName: user?.name || "Unknown" });
    toast.success("Salary updated");
    setEditingSalaryId(null);
  };

  const getSalaryStatus = (worker: WorkerRow) => {
    const now = new Date();
    const payDay = worker.pay_day || 1;
    let nextPayDate = setDate(now, payDay);
    if (isBefore(nextPayDate, now)) nextPayDate = setDate(addMonths(now, 1), payDay);
    const daysUntilPay = differenceInDays(nextPayDate, now);
    if (worker.balance <= 0) return { label: "Paid", variant: "default" as const, alert: false };
    if (daysUntilPay <= 0) return { label: "Due Today", variant: "destructive" as const, alert: true };
    if (daysUntilPay <= 3) return { label: `Due in ${daysUntilPay}d`, variant: "destructive" as const, alert: true };
    return { label: "Pending", variant: "secondary" as const, alert: false };
  };

  // Check if worker is paid for current month
  const isWorkerPaidForMonth = (workerId: string, monthKey: string) => {
    return filteredPayments.some(p => p.worker_id === workerId && p.payment_month === monthKey);
  };

  const currentMonthKey = format(new Date(), "yyyy-MM");

  const alertWorkers = useMemo(() => workers.filter(w => getSalaryStatus(w).alert), [workers]);

  const totalSalary = workers.reduce((s, w) => s + w.salary, 0);
  const totalPaid = filteredPayments.reduce((s, p) => s + p.amount, 0);
  const totalBalance = workers.reduce((s, w) => s + w.balance, 0);
  const totalAdvance = filteredPayments.filter(p => p.type === "advance").reduce((s, p) => s + p.amount, 0);

  const getWorkerPeriodPayments = (workerId: string) => filteredPayments.filter(p => p.worker_id === workerId);
  const getWorkerPeriodPaid = (workerId: string) => getWorkerPeriodPayments(workerId).reduce((s, p) => s + p.amount, 0);
  const getWorkerPeriodAdvance = (workerId: string) => getWorkerPeriodPayments(workerId).filter(p => p.type === "advance").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      {alertWorkers.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span className="font-semibold text-destructive">Salary Alert</span>
            </div>
            <div className="space-y-1">
              {alertWorkers.map(w => (
                <p key={w.id} className="text-sm">
                  <span className="font-medium">{w.name}</span> — {symbol}{w.balance.toLocaleString()} due (pay day: {w.pay_day || 1}th)
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Period Picker */}
      <Card>
        <CardContent className="p-4">
          <PeriodPicker
            period={period}
            onPeriodChange={setPeriod}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-5 text-center">
          <p className="text-sm text-muted-foreground">Total Salary</p>
          <p className="text-2xl font-bold font-mono text-primary">{symbol}{totalSalary.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-sm text-muted-foreground">Period Paid</p>
          <p className="text-2xl font-bold font-mono text-success">{symbol}{totalPaid.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-sm text-muted-foreground">Total Balance</p>
          <p className="text-2xl font-bold font-mono text-destructive">{symbol}{totalBalance.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-sm text-muted-foreground">Period Advances</p>
          <p className="text-2xl font-bold font-mono text-warning">{symbol}{totalAdvance.toLocaleString()}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-primary" /> Salary & Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto max-h-[480px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Pay Day</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Salary</TableHead>
                  <TableHead className="text-right">Period Paid</TableHead>
                  <TableHead className="text-right">Period Advance</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map((w) => {
                  const status = getSalaryStatus(w);
                  const periodPaid = getWorkerPeriodPaid(w.id);
                  const periodAdvance = getWorkerPeriodAdvance(w.id);
                  const paidThisMonth = isWorkerPaidForMonth(w.id, currentMonthKey);
                  return (
                    <TableRow key={w.id} className={status.alert ? "bg-destructive/5" : ""}>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{w.role}</TableCell>
                      <TableCell className="text-sm">{w.pay_day || 1}th</TableCell>
                      <TableCell><Badge variant={status.variant} className="text-xs">{status.label}</Badge></TableCell>
                      <TableCell className="text-right font-mono">
                        {canEdit && editingSalaryId === w.id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Input type="number" className="w-24 h-8 text-sm" value={editSalaryValue} onChange={e => setEditSalaryValue(e.target.value)} autoFocus />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveSalary(w.id)}><Check className="w-3 h-3 text-success" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingSalaryId(null)}><X className="w-3 h-3 text-destructive" /></Button>
                          </div>
                        ) : canEdit ? (
                          <span className="cursor-pointer hover:underline flex items-center gap-1 justify-end" onClick={() => { setEditingSalaryId(w.id); setEditSalaryValue(String(w.salary)); }}>
                            {symbol}{w.salary.toLocaleString()} <Pencil className="w-3 h-3 text-muted-foreground" />
                          </span>
                        ) : (
                          <span>{symbol}{w.salary.toLocaleString()}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-success">{symbol}{periodPaid.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-warning">{symbol}{periodAdvance.toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-mono ${w.balance < 0 ? "text-warning" : "text-destructive"}`}>
                        {symbol}{w.balance.toLocaleString()}
                        {w.balance < 0 && <span className="text-[10px] ml-1">(overpaid)</span>}
                      </TableCell>
                      <TableCell>
                        {paidThisMonth ? (
                          <Badge variant="default" className="text-xs bg-success/20 text-success border-success/30">✓ Paid</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">Unpaid</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {canEdit ? (
                          <Button size="sm" className="h-8 gap-1" onClick={() => { setPayingWorker(w); setPayDialogOpen(true); }}>
                            <Plus className="w-3 h-3" /> Pay
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No access</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {/* Mobile */}
          <div className="md:hidden space-y-3 max-h-[480px] overflow-y-auto">
            {workers.map((w) => {
              const status = getSalaryStatus(w);
              const periodPaid = getWorkerPeriodPaid(w.id);
              const periodAdvance = getWorkerPeriodAdvance(w.id);
              const paidThisMonth = isWorkerPaidForMonth(w.id, currentMonthKey);
              return (
                <div key={w.id} className={`border border-border rounded-lg p-3 space-y-2 ${status.alert ? "border-destructive/50 bg-destructive/5" : ""}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{w.name}</p>
                      <p className="text-xs text-muted-foreground">{w.role} • Pay day: {w.pay_day || 1}th</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {paidThisMonth ? (
                        <Badge variant="default" className="text-[10px] bg-success/20 text-success border-success/30">✓ Paid</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Unpaid</Badge>
                      )}
                      <Badge variant={status.variant} className="text-[10px]">{status.label}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Salary</span><p className="font-mono font-semibold">{symbol}{w.salary.toLocaleString()}</p></div>
                    <div><span className="text-muted-foreground">Paid</span><p className="font-mono text-success">{symbol}{periodPaid.toLocaleString()}</p></div>
                    <div><span className="text-muted-foreground">Advance</span><p className="font-mono text-warning">{symbol}{periodAdvance.toLocaleString()}</p></div>
                    <div><span className="text-muted-foreground">Balance</span><p className={`font-mono ${w.balance < 0 ? "text-warning" : "text-destructive"}`}>{symbol}{w.balance.toLocaleString()}</p></div>
                  </div>
                  {canEdit && (
                    <Button size="sm" className="w-full h-8 gap-1" onClick={() => { setPayingWorker(w); setPayDialogOpen(true); }}>
                      <Plus className="w-3 h-3" /> Pay
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowUpDown className="w-5 h-5 text-primary" /> Payment History ({filteredPayments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead>For Month</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Paid By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.slice(0, 100).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{format(new Date(p.created_at), "MMM dd, HH:mm")}</TableCell>
                    <TableCell className="font-medium text-sm">{p.worker_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.payment_month || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.type === "advance" ? "secondary" : "outline"} className="text-xs">
                        {p.type === "advance" ? "Advance" : "Regular"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-success">{symbol}{p.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.paid_by_name}</TableCell>
                  </TableRow>
                ))}
                {filteredPayments.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No payments in this period</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AuditLogViewer tableName="salaries" title="Salary & Payment History" />

      {payingWorker && (
        <SalaryPayDialog
          open={payDialogOpen}
          onOpenChange={setPayDialogOpen}
          workerName={payingWorker.name}
          onSubmit={handlePay}
        />
      )}
    </div>
  );
};

export default SalaryPage;
