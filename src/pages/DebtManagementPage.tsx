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
import { Plus, Trash2, Edit, CreditCard, Search } from "lucide-react";
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
}

interface DebtPayment {
  id: string;
  debt_id: string;
  amount: number;
  notes: string;
  created_at: string;
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
  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");

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

  const handleAdd = async () => {
    if (!customerName.trim() || !totalAmount) { toast.error("Fill required fields"); return; }
    const amt = parseFloat(totalAmount);
    const { error } = await supabase.from("debts").insert({
      customer_name: customerName.trim(),
      description,
      total_amount: amt,
      balance: amt,
      created_by: user?.id,
    });
    if (error) { toast.error("Failed to add debt"); return; }
    setCustomerName(""); setDescription(""); setTotalAmount(""); setShowAdd(false);
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
      status: newBalance <= 0 ? "paid" : "unpaid",
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
      status: newBalance <= 0 ? "paid" : "unpaid",
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
              <Button size="sm" onClick={() => setShowAdd(!showAdd)}><Plus className="w-4 h-4 mr-1" /> Add</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAdd && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-accent rounded-lg border border-border">
              <div className="space-y-1"><Label className="text-xs">Customer *</Label><Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Name" /></div>
              <div className="space-y-1"><Label className="text-xs">Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Details" /></div>
              <div className="space-y-1"><Label className="text-xs">Amount ({symbol}) *</Label><Input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="0" /></div>
              <div className="flex items-end"><Button onClick={handleAdd} className="w-full">Save Debt</Button></div>
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
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.customer_name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[150px] truncate">{d.description}</TableCell>
                    <TableCell className="text-right font-mono">{symbol}{d.total_amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-success">{symbol}{d.paid_amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-destructive font-semibold">{symbol}{d.balance.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={d.status === "paid" ? "default" : "destructive"} className="text-xs">
                        {d.status === "paid" ? "Paid" : "Unpaid"}
                      </Badge>
                    </TableCell>
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
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No debts found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
            <DialogTitle>Payment for {payDebt?.customer_name}</DialogTitle>
            <DialogDescription>Balance: {symbol}{payDebt?.balance.toLocaleString()}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Amount ({symbol})</Label><Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" /></div>
            <div className="space-y-1"><Label>Notes</Label><Input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Optional" /></div>
            <Button onClick={handlePayment} className="w-full">Record Payment</Button>
          </div>
          {payments.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold mb-2">Payment History</p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-accent rounded text-sm">
                    <div>
                      <span className="font-mono font-semibold text-success">{symbol}{p.amount.toLocaleString()}</span>
                      {p.notes && <span className="text-muted-foreground ml-2">— {p.notes}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
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
