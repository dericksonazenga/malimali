import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Banknote, Plus, AlertTriangle, Pencil, Check, X, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/utils/auditLog";
import AuditLogViewer from "@/components/AuditLogViewer";
import { differenceInDays, format, setDate, isBefore, addMonths } from "date-fns";

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
}

const SalaryPage = () => {
  const { symbol } = useCurrency();
  const { user, hasPermission } = useAuth();
  const canEdit = user?.role === "admin" || hasPermission("edit_records");
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [payAmounts, setPayAmounts] = useState<Record<string, string>>({});
  const [payTypes, setPayTypes] = useState<Record<string, string>>({});
  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null);
  const [editSalaryValue, setEditSalaryValue] = useState("");

  const fetchWorkers = useCallback(async () => {
    const { data } = await supabase.from("workers").select("*").order("name");
    if (data) {
      setWorkers(data.map((w: any) => {
        const createdDate = new Date(w.created_at);
        const payDay = createdDate.getDate();
        return {
          id: w.id, name: w.name, role: w.role,
          salary: Number(w.salary), paid: Number(w.paid),
          balance: Number(w.balance), created_at: w.created_at, pay_day: payDay,
        };
      }));
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    const { data } = await supabase
      .from("salary_payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
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

  const handlePay = async (id: string) => {
    const amount = parseFloat(payAmounts[id] || "0");
    if (amount <= 0) { toast.error("Enter a valid amount"); return; }
    const worker = workers.find((w) => w.id === id);
    if (!worker) return;

    const payType = payTypes[id] || "regular";
    const newPaid = worker.paid + amount;
    const newBalance = worker.salary - newPaid;

    const { error } = await supabase
      .from("workers")
      .update({ paid: newPaid, balance: newBalance })
      .eq("id", id);
    if (error) { toast.error("Failed to record payment"); return; }

    // Record payment in salary_payments
    await supabase.from("salary_payments").insert({
      worker_id: id,
      worker_name: worker.name,
      amount,
      type: payType,
      paid_by_name: user?.name || "Unknown",
      notes: payType === "advance" ? "Advance salary" : "Regular payment",
    });

    await logAuditEvent({
      tableName: "salaries", recordId: id, action: "payment",
      newData: { worker: worker.name, payment_amount: amount, type: payType, paid_by: user?.name, new_paid: newPaid, new_balance: newBalance },
      changedByName: user?.name || "Unknown",
    });
    setPayAmounts((prev) => ({ ...prev, [id]: "" }));
    setPayTypes((prev) => ({ ...prev, [id]: "regular" }));
    toast.success(`${payType === "advance" ? "Advance" : "Payment"} of ${symbol}${amount.toLocaleString()} recorded`);
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

  const alertWorkers = useMemo(() => workers.filter(w => getSalaryStatus(w).alert), [workers]);

  const totalSalary = workers.reduce((s, w) => s + w.salary, 0);
  const totalPaid = workers.reduce((s, w) => s + w.paid, 0);
  const totalBalance = workers.reduce((s, w) => s + w.balance, 0);
  const totalAdvance = payments.filter(p => p.type === "advance").reduce((s, p) => s + p.amount, 0);

  // Get worker payments for detail
  const getWorkerPayments = (workerId: string) => payments.filter(p => p.worker_id === workerId);
  const getWorkerAdvance = (workerId: string) => getWorkerPayments(workerId).filter(p => p.type === "advance").reduce((s, p) => s + p.amount, 0);

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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-5 text-center">
          <p className="text-sm text-muted-foreground">Total Salary</p>
          <p className="text-2xl font-bold font-mono text-primary">{symbol}{totalSalary.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-sm text-muted-foreground">Total Paid</p>
          <p className="text-2xl font-bold font-mono text-success">{symbol}{totalPaid.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-sm text-muted-foreground">Total Balance</p>
          <p className="text-2xl font-bold font-mono text-destructive">{symbol}{totalBalance.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-sm text-muted-foreground">Total Advances</p>
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
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Pay Day</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Salary</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Advance</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map((w) => {
                  const status = getSalaryStatus(w);
                  const advanceTotal = getWorkerAdvance(w.id);
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
                      <TableCell className="text-right font-mono text-success">{symbol}{w.paid.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-warning">{symbol}{advanceTotal.toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-mono ${w.balance < 0 ? "text-warning" : "text-destructive"}`}>
                        {symbol}{w.balance.toLocaleString()}
                        {w.balance < 0 && <span className="text-[10px] ml-1">(overpaid)</span>}
                      </TableCell>
                      <TableCell>
                        {canEdit && (
                          <Select value={payTypes[w.id] || "regular"} onValueChange={(v) => setPayTypes(prev => ({ ...prev, [w.id]: v }))}>
                            <SelectTrigger className="w-24 h-9 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="regular">Regular</SelectItem>
                              <SelectItem value="advance">Advance</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        {canEdit ? (
                          <div className="flex gap-1">
                            <Input type="number" placeholder="Amount" className="w-24 h-9" value={payAmounts[w.id] || ""} onChange={(e) => setPayAmounts((prev) => ({ ...prev, [w.id]: e.target.value }))} />
                            <Button size="sm" className="h-9" onClick={() => handlePay(w.id)}><Plus className="w-3 h-3" /></Button>
                          </div>
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
              const advanceTotal = getWorkerAdvance(w.id);
              return (
                <div key={w.id} className={`border border-border rounded-lg p-3 space-y-2 ${status.alert ? "border-destructive/50 bg-destructive/5" : ""}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{w.name}</p>
                      <p className="text-xs text-muted-foreground">{w.role} • Pay day: {w.pay_day || 1}th</p>
                    </div>
                    <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Salary</span><p className="font-mono font-semibold">{symbol}{w.salary.toLocaleString()}</p></div>
                    <div><span className="text-muted-foreground">Paid</span><p className="font-mono text-success">{symbol}{w.paid.toLocaleString()}</p></div>
                    <div><span className="text-muted-foreground">Advance</span><p className="font-mono text-warning">{symbol}{advanceTotal.toLocaleString()}</p></div>
                    <div><span className="text-muted-foreground">Balance</span><p className={`font-mono ${w.balance < 0 ? "text-warning" : "text-destructive"}`}>{symbol}{w.balance.toLocaleString()}</p></div>
                  </div>
                  {canEdit && (
                    <div className="space-y-2">
                      <Select value={payTypes[w.id] || "regular"} onValueChange={(v) => setPayTypes(prev => ({ ...prev, [w.id]: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="advance">Advance</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Input type="number" placeholder="Amount" className="h-8 flex-1 text-sm" value={payAmounts[w.id] || ""} onChange={(e) => setPayAmounts((prev) => ({ ...prev, [w.id]: e.target.value }))} />
                        <Button size="sm" className="h-8" onClick={() => handlePay(w.id)}>Pay</Button>
                      </div>
                    </div>
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
            <ArrowUpDown className="w-5 h-5 text-primary" /> Recent Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Paid By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.slice(0, 50).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{format(new Date(p.created_at), "MMM dd, HH:mm")}</TableCell>
                    <TableCell className="font-medium text-sm">{p.worker_name}</TableCell>
                    <TableCell>
                      <Badge variant={p.type === "advance" ? "secondary" : "outline"} className="text-xs">
                        {p.type === "advance" ? "Advance" : "Regular"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-success">{symbol}{p.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.paid_by_name}</TableCell>
                  </TableRow>
                ))}
                {payments.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No payments recorded yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AuditLogViewer tableName="salaries" title="Salary & Payment History" />
    </div>
  );
};

export default SalaryPage;
