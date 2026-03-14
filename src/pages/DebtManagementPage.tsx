import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, CreditCard, Search, ArrowDownCircle, ArrowUpCircle, Minus } from "lucide-react";
import { toast } from "sonner";

interface Debt {
  id: string;
  customer_name: string;
  description: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: string;
  created_at: string;
  debt_type?: string;
}

interface DebtPayment {
  id: string;
  debt_id: string;
  amount: number;
  notes: string;
  created_at: string;
}

interface Deduction {
  id: string;
  label: string;
  amount: number;
}

const DebtManagementPage = () => {
  const { symbol } = useCurrency();
  const { user, hasPermission } = useAuth();
  const canEdit = user?.role === "admin" || hasPermission("edit_records");
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [debtType, setDebtType] = useState<"money_in" | "money_out">("money_in");
  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");

  // Deduction dialog for money out
  const [showDeduction, setShowDeduction] = useState(false);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [newDeductionLabel, setNewDeductionLabel] = useState("");
  const [newDeductionAmount, setNewDeductionAmount] = useState("");

  // Edit form
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");

  // Payment
  const [payDebt, setPayDebt] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payments, setPayments] = useState<DebtPayment[]>([]);

  const fetchDebts = useCallback(async () => {
    const { data } = await supabase
      .from("debts")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setDebts(data.map((d: any) => ({ ...d, total_amount: Number(d.total_amount), paid_amount: Number(d.paid_amount), balance: Number(d.balance) })));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDebts();
    const channel = supabase
      .channel("debts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "debts" }, () => fetchDebts())
      .on("postgres_changes", { event: "*", schema: "public", table: "debt_payments" }, () => {
        fetchDebts();
        if (payDebt) fetchPayments(payDebt.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDebts]);

  const fetchPayments = async (debtId: string) => {
    const { data } = await supabase
      .from("debt_payments")
      .select("*")
      .eq("debt_id", debtId)
      .order("created_at", { ascending: false });
    if (data) setPayments(data.map((p: any) => ({ ...p, amount: Number(p.amount) })));
  };

  const grossAmount = parseFloat(totalAmount) || 0;
  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  const finalAmount = Math.max(0, grossAmount - totalDeductions);

  const handleAddDeduction = () => {
    if (!newDeductionLabel.trim() || !newDeductionAmount) return;
    setDeductions(prev => [...prev, {
      id: crypto.randomUUID(),
      label: newDeductionLabel.trim(),
      amount: parseFloat(newDeductionAmount) || 0,
    }]);
    setNewDeductionLabel("");
    setNewDeductionAmount("");
  };

  const removeDeduction = (id: string) => {
    setDeductions(prev => prev.filter(d => d.id !== id));
  };

  const handleAddClick = () => {
    if (!customerName.trim() || !totalAmount) { toast.error("Fill required fields"); return; }
    if (debtType === "money_out") {
      setShowDeduction(true);
    } else {
      saveDebt(parseFloat(totalAmount));
    }
  };

  const handleConfirmDeduction = () => {
    const deductionDesc = deductions.length > 0
      ? `${description ? description + " | " : ""}Deductions: ${deductions.map(d => `${d.label}: ${symbol}${d.amount.toLocaleString()}`).join(", ")} | Gross: ${symbol}${grossAmount.toLocaleString()}`
      : description;
    saveDebt(finalAmount, deductionDesc);
    setShowDeduction(false);
    setDeductions([]);
  };

  const saveDebt = async (amt: number, desc?: string) => {
    const { error } = await supabase.from("debts").insert({
      customer_name: customerName.trim(),
      description: desc ?? description,
      total_amount: amt,
      balance: amt,
      created_by: user?.id,
      status: debtType === "money_out" ? "money_out" : "unpaid",
    });
    if (error) { toast.error("Failed to add debt"); return; }
    setCustomerName(""); setDescription(""); setTotalAmount(""); setShowAdd(false); setDebtType("money_in");
    toast.success("Debt added");
  };

  const handleEdit = async () => {
    if (!editDebt) return;
    const amt = parseFloat(editAmount);
    const newBalance = amt - editDebt.paid_amount;
    const { error } = await supabase.from("debts").update({
      customer_name: editName,
      description: editDesc,
      total_amount: amt,
      balance: newBalance,
      status: newBalance <= 0 ? "paid" : editDebt.status === "money_out" ? "money_out" : "unpaid",
      updated_at: new Date().toISOString(),
    }).eq("id", editDebt.id);
    if (error) { toast.error("Failed to update"); return; }
    setEditDebt(null);
    toast.success("Debt updated");
  };

  const handlePayment = async () => {
    if (!payDebt || !payAmount) { toast.error("Enter payment amount"); return; }
    const amt = parseFloat(payAmount);
    if (amt <= 0) { toast.error("Invalid amount"); return; }
    if (amt > payDebt.balance) { toast.error("Amount exceeds balance"); return; }

    const { error: payErr } = await supabase.from("debt_payments").insert({
      debt_id: payDebt.id,
      amount: amt,
      notes: payNotes,
      paid_by: user?.id,
    });
    if (payErr) { toast.error("Payment failed"); return; }

    const newPaid = payDebt.paid_amount + amt;
    const newBalance = payDebt.total_amount - newPaid;
    await supabase.from("debts").update({
      paid_amount: newPaid,
      balance: newBalance,
      status: newBalance <= 0 ? "paid" : payDebt.status === "money_out" ? "money_out" : "unpaid",
      updated_at: new Date().toISOString(),
    }).eq("id", payDebt.id);

    setPayAmount(""); setPayNotes("");
    toast.success("Payment recorded");
    fetchPayments(payDebt.id);
    fetchDebts();
    setPayDebt({ ...payDebt, paid_amount: newPaid, balance: newBalance });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("debts").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Debt deleted");
  };

  const filtered = debts.filter(d =>
    d.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);

  // Parse deduction amount from description for Money Out debts
  const parseDeductionAmount = (description: string): number => {
    const match = description.match(/Deductions:[^|]*\|/);
    if (!match) return 0;
    const deductionText = match[0];
    // Extract amounts from deduction items like "Fee: KSh1,000, Tax: KSh200"
    const amounts = deductionText.match(/:\s*[^\s:,]+/g);
    if (!amounts) return 0;
    return amounts.reduce((sum, amt) => {
      const num = parseFloat(amt.replace(/[:\s,]/g, "").replace(/[^\d.]/g, ""));
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  };

  const getStatusBadge = (status: string) => {
    if (status === "paid") return <Badge variant="default" className="text-xs">Paid</Badge>;
    if (status === "money_out") return <Badge variant="secondary" className="text-xs bg-orange-500/15 text-orange-600 border-orange-500/30">Money Out</Badge>;
    return <Badge variant="destructive" className="text-xs">Money In</Badge>;
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> Debt Management</span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer..." className="pl-8 h-9 w-full sm:w-48" />
              </div>
              {canEdit && <Button size="sm" onClick={() => setShowAdd(!showAdd)}><Plus className="w-4 h-4 mr-1" /> Add</Button>}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAdd && (
            <div className="p-4 bg-accent rounded-lg border border-border space-y-3">
              {/* Type Selector */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={debtType === "money_in" ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => setDebtType("money_in")}
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  Money In
                </Button>
                <Button
                  type="button"
                  variant={debtType === "money_out" ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => setDebtType("money_out")}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  Money Out
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1"><Label className="text-xs">Customer *</Label><Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Name" /></div>
                <div className="space-y-1"><Label className="text-xs">Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Details" /></div>
                <div className="space-y-1"><Label className="text-xs">{debtType === "money_out" ? "Gross" : ""} Amount ({symbol}) *</Label><Input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="0" /></div>
                <div className="flex items-end"><Button onClick={handleAddClick} className="w-full">Save Debt</Button></div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-muted-foreground">{filtered.length} debts</span>
            <span className="text-sm font-semibold text-destructive">Total Outstanding: {symbol}{totalDebt.toLocaleString()}</span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Gross Amount</TableHead>
                  <TableHead className="text-right">Deducted Fee</TableHead>
                  <TableHead className="text-right">Net Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(d => {
                  const isMoneyOut = d.status === "money_out";
                  const deductionAmount = isMoneyOut ? parseDeductionAmount(d.description) : 0;
                  const grossAmount = isMoneyOut ? d.total_amount + deductionAmount : d.total_amount;

                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.customer_name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate" title={d.description}>
                        {isMoneyOut && deductionAmount > 0
                          ? d.description.split(" | ")[0] || d.description
                          : d.description}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {isMoneyOut ? symbol + grossAmount.toLocaleString() : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        {isMoneyOut && deductionAmount > 0 ? "-" + symbol + deductionAmount.toLocaleString() : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {symbol}{d.total_amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-success">{symbol}{d.paid_amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-destructive font-semibold">{symbol}{d.balance.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(d.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {d.status !== "paid" && canEdit && (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setPayDebt(d); fetchPayments(d.id); }}>
                              Pay
                            </Button>
                          )}
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditDebt(d); setEditName(d.customer_name); setEditDesc(d.description); setEditAmount(String(d.total_amount)); }}>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(d.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No debts found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Deduction Dialog for Money Out */}
      <Dialog open={showDeduction} onOpenChange={setShowDeduction}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deductions for {customerName}</DialogTitle>
            <DialogDescription>Add deductions to calculate the final amount</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
              <span className="text-sm text-muted-foreground">Gross Amount</span>
              <span className="font-mono font-semibold">{symbol}{grossAmount.toLocaleString()}</span>
            </div>

            {/* Add deduction */}
            <div className="flex gap-2">
              <Input value={newDeductionLabel} onChange={e => setNewDeductionLabel(e.target.value)} placeholder="Deduction name" className="flex-1" />
              <Input type="number" value={newDeductionAmount} onChange={e => setNewDeductionAmount(e.target.value)} placeholder="Amount" className="w-28" />
              <Button size="icon" variant="outline" onClick={handleAddDeduction}><Plus className="w-4 h-4" /></Button>
            </div>

            {/* Deduction list */}
            {deductions.length > 0 && (
              <div className="space-y-2">
                {deductions.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-2 bg-destructive/10 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <Minus className="w-3 h-3 text-destructive" />
                      <span>{d.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-destructive">{symbol}{d.amount.toLocaleString()}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeDeduction(d.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Deductions</span>
                <span className="font-mono text-destructive">- {symbol}{totalDeductions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Final Amount</span>
                <span className="font-mono text-primary">{symbol}{finalAmount.toLocaleString()}</span>
              </div>
            </div>

            <Button onClick={handleConfirmDeduction} className="w-full">
              Confirm & Save ({symbol}{finalAmount.toLocaleString()})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDebt} onOpenChange={() => setEditDebt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Debt</DialogTitle>
            <DialogDescription>Update debt details</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Customer</Label><Input value={editName} onChange={e => setEditName(e.target.value)} /></div>
            <div className="space-y-1"><Label>Description</Label><Input value={editDesc} onChange={e => setEditDesc(e.target.value)} /></div>
            <div className="space-y-1"><Label>Total Amount ({symbol})</Label><Input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} /></div>
            <Button onClick={handleEdit} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={!!payDebt} onOpenChange={() => setPayDebt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">Balance</span>
                <span className="font-semibold">{symbol}{payDebt?.balance.toLocaleString()}</span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Amount ({symbol})</Label><Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" /></div>
            <div className="space-y-1"><Label>Notes</Label><Input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Optional" /></div>
            <Button onClick={handlePayment} className="w-full">Record Payment</Button>
          </div>
          {payments.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Payment History</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-accent rounded text-sm">
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                    <span className="font-mono font-semibold">{symbol}{p.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DebtManagementPage;
