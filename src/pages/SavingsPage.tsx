import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { PiggyBank, Plus, ArrowDownToLine, ArrowUpFromLine, Trash2, Edit, History, Search } from "lucide-react";
import { logAuditEvent } from "@/utils/auditLog";
import AuditLogViewer from "@/components/AuditLogViewer";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import { applyRealtimePayload } from "@/utils/applyRealtimePayload";
import { nameIncludes } from "@/utils/nameMatch";

interface SavingsAccount {
  id: string;
  customer_name: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

interface SavingsTransaction {
  id: string;
  account_id: string;
  type: string;
  amount: number;
  payment_method: string;
  served_by_name: string;
  notes: string;
  created_at: string;
}

const SavingsPage = () => {
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission("manage_savings");
  const canEditSavings = hasPermission("edit_savings") || user?.role === "admin";
  const canDeleteSavings = hasPermission("delete_savings") || user?.role === "admin";
  const canView = hasPermission("view_savings") || canManage;

  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [search, setSearch] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<SavingsAccount | null>(null);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [editName, setEditName] = useState("");

  const fetchAccounts = useCallback(async () => {
    const { data } = await supabase
      .from("savings_accounts")
      .select("*")
      .order("customer_name", { ascending: true });
    if (data) setAccounts(data as any[]);
  }, []);

  const fetchTransactions = useCallback(async (accountId: string) => {
    const { data } = await supabase
      .from("savings_transactions")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });
    if (data) setTransactions(data as any[]);
  }, []);

  useEffect(() => {
    if (canView) fetchAccounts();
  }, [canView, fetchAccounts]);

  useEffect(() => {
    const mapAccount = (r: any): SavingsAccount => ({
      id: r.id,
      customer_name: r.customer_name,
      balance: Number(r.balance) || 0,
      created_at: r.created_at,
      updated_at: r.updated_at,
    });
    const mapTx = (r: any): SavingsTransaction => ({
      id: r.id,
      account_id: r.account_id,
      type: r.type,
      amount: Number(r.amount) || 0,
      payment_method: r.payment_method,
      served_by_name: r.served_by_name,
      notes: r.notes || "",
      created_at: r.created_at,
    });
    const channel = supabase
      .channel(`savings-rt-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "savings_accounts" }, (payload) => {
        setAccounts((prev) => {
          const next = applyRealtimePayload(prev, payload as any, mapAccount);
          // Keep alphabetical order on inserts/updates
          return [...next].sort((a, b) => a.customer_name.localeCompare(b.customer_name));
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "savings_transactions" }, (payload) => {
        if (!selectedAccount) return;
        setTransactions((prev) =>
          applyRealtimePayload(prev, payload as any, mapTx, {
            filter: (row: any) => row.account_id === selectedAccount.id,
          })
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedAccount]);

  const handleDeposit = async () => {
    if (!customerName.trim() || !amount || Number(amount) <= 0) {
      toast.error("Enter customer name and valid amount");
      return;
    }

    const name = customerName.trim();
    const depositAmount = Number(amount);

    // Check if customer exists (case-insensitive)
    const existing = accounts.find(a => a.customer_name.toLowerCase() === name.toLowerCase());

    let accountId: string;

    if (existing) {
      // Update existing balance
      const newBalance = existing.balance + depositAmount;
      const { error } = await supabase
        .from("savings_accounts")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) { toast.error("Failed to update balance"); return; }
      accountId = existing.id;
    } else {
      // Create new account
      const company_id = await (await import("@/utils/getCompanyId")).getCompanyId();
      const { data, error } = await supabase
        .from("savings_accounts")
        .insert({ customer_name: name, balance: depositAmount, created_by: user?.id, company_id })
        .select("id")
        .single();
      if (error || !data) { toast.error("Failed to create account"); return; }
      accountId = data.id;
    }

    // Record transaction
    const txCompanyId = await (await import("@/utils/getCompanyId")).getCompanyId();
    const { error: txError } = await supabase.from("savings_transactions").insert({
      account_id: accountId,
      type: "deposit",
      amount: depositAmount,
      payment_method: paymentMethod,
      served_by_name: user?.name || "Unknown",
      notes,
      company_id: txCompanyId,
    });
    if (txError) { toast.error("Failed to record transaction"); return; }

    await logAuditEvent({
      tableName: "savings_accounts",
      recordId: accountId,
      action: "payment",
      oldData: existing ? { balance: existing.balance } : null,
      newData: { balance: (existing?.balance || 0) + depositAmount, deposit: depositAmount, method: paymentMethod },
      changedByName: user?.name || "Unknown",
    });

    toast.success(`Deposited ${depositAmount.toLocaleString()} for ${name}`);
    resetForm();
    setShowDepositDialog(false);
    fetchAccounts();
  };

  const handleWithdraw = async () => {
    if (!selectedAccount || !amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const withdrawAmount = Number(amount);
    if (withdrawAmount > selectedAccount.balance) {
      toast.error("Insufficient balance");
      return;
    }

    const newBalance = selectedAccount.balance - withdrawAmount;
    const { error } = await supabase
      .from("savings_accounts")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", selectedAccount.id);
    if (error) { toast.error("Failed to update balance"); return; }

    const wCompanyId = await (await import("@/utils/getCompanyId")).getCompanyId();
    await supabase.from("savings_transactions").insert({
      account_id: selectedAccount.id,
      type: "withdrawal",
      amount: withdrawAmount,
      payment_method: paymentMethod,
      served_by_name: user?.name || "Unknown",
      notes,
      company_id: wCompanyId,
    });

    await logAuditEvent({
      tableName: "savings_accounts",
      recordId: selectedAccount.id,
      action: "update",
      oldData: { balance: selectedAccount.balance },
      newData: { balance: newBalance, withdrawal: withdrawAmount, method: paymentMethod },
      changedByName: user?.name || "Unknown",
    });

    toast.success(`Withdrawn ${withdrawAmount.toLocaleString()} from ${selectedAccount.customer_name}`);
    resetForm();
    setShowWithdrawDialog(false);
    setSelectedAccount(null);
    fetchAccounts();
  };

  const handleEdit = async () => {
    if (!selectedAccount || !editName.trim()) return;
    const { error } = await supabase
      .from("savings_accounts")
      .update({ customer_name: editName.trim(), updated_at: new Date().toISOString() })
      .eq("id", selectedAccount.id);
    if (error) { toast.error("Failed to update"); return; }

    await logAuditEvent({
      tableName: "savings_accounts",
      recordId: selectedAccount.id,
      action: "update",
      oldData: { customer_name: selectedAccount.customer_name },
      newData: { customer_name: editName.trim() },
      changedByName: user?.name || "Unknown",
    });

    toast.success("Account updated");
    setShowEditDialog(false);
    setSelectedAccount(null);
    fetchAccounts();
  };

  const handleDelete = async (account: SavingsAccount) => {
    if (!confirm(`Delete savings account for "${account.customer_name}"? This will remove all transaction history.`)) return;
    const { error } = await supabase.from("savings_accounts").delete().eq("id", account.id);
    if (error) { toast.error("Failed to delete"); return; }

    await logAuditEvent({
      tableName: "savings_accounts",
      recordId: account.id,
      action: "delete",
      oldData: { customer_name: account.customer_name, balance: account.balance },
      changedByName: user?.name || "Unknown",
    });

    toast.success("Account deleted");
    fetchAccounts();
  };

  const openHistory = (account: SavingsAccount) => {
    setSelectedAccount(account);
    fetchTransactions(account.id);
    setShowHistoryDialog(true);
  };

  const resetForm = () => {
    setCustomerName("");
    setAmount("");
    setPaymentMethod("cash");
    setNotes("");
  };

  const filtered = accounts.filter(a =>
    a.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalSavings = accounts.reduce((s, a) => s + a.balance, 0);

  if (!canView) return <p className="text-muted-foreground p-6">You don't have permission to view savings.</p>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <PiggyBank className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total Savings</p>
              <p className="text-xl font-bold">{totalSavings.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Accounts</p>
            <p className="text-xl font-bold">{accounts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Active Today</p>
            <p className="text-xl font-bold">
              {accounts.filter(a => a.updated_at && new Date(a.updated_at).toDateString() === new Date().toDateString()).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <PDFDownloadButton
          title="Savings Accounts Report"
          filename={`savings-${format(new Date(), "yyyy-MM-dd")}.pdf`}
          headers={["#", "Customer", "Balance", "Last Updated"]}
          rows={[
            ...filtered.map((a, i) => [
              i + 1,
              a.customer_name,
              a.balance.toLocaleString(),
              format(new Date(a.updated_at), "yyyy-MM-dd HH:mm"),
            ]),
            ["", "TOTAL", totalSavings.toLocaleString(), ""],
          ]}
          summary={[
            `Total Savings: ${totalSavings.toLocaleString()}`,
            `Active Accounts: ${accounts.length}`,
          ]}
        />
        {canManage && (
          <Dialog open={showDepositDialog} onOpenChange={v => { setShowDepositDialog(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Deposit</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Deposit Savings</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Customer Name</Label>
                  <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Enter customer name" list="savings-customers" />
                  <datalist id="savings-customers">
                    {accounts.map(a => <option key={a.id} value={a.customer_name} />)}
                  </datalist>
                  {customerName && accounts.find(a => a.customer_name.toLowerCase() === customerName.toLowerCase()) && (
                    <p className="text-xs text-primary mt-1">
                      Existing customer — balance: {accounts.find(a => a.customer_name.toLowerCase() === customerName.toLowerCase())!.balance.toLocaleString()}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" min="0" />
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes (optional)</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" rows={2} />
                </div>
                <Button onClick={handleDeposit} className="w-full">
                  <ArrowDownToLine className="w-4 h-4 mr-1" /> Deposit
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Savings Accounts</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {/* Desktop */}
          <div className="hidden md:block max-h-[480px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a, i) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{a.customer_name}</TableCell>
                    <TableCell className="text-right font-semibold">{a.balance.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(a.updated_at), "MMM dd, yyyy HH:mm")}</TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openHistory(a)} title="History">
                          <History className="w-3.5 h-3.5" />
                        </Button>
                        {canManage && (
                          <>
                            {canEditSavings && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                setSelectedAccount(a);
                                setAmount("");
                                setPaymentMethod("cash");
                                setNotes("");
                                setShowWithdrawDialog(true);
                              }} title="Withdraw">
                                <ArrowUpFromLine className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {canEditSavings && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                setSelectedAccount(a);
                                setEditName(a.customer_name);
                                setShowEditDialog(true);
                              }} title="Edit">
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {canDeleteSavings && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(a)} title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No savings accounts found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {/* Mobile */}
          <div className="md:hidden space-y-2 max-h-[480px] overflow-y-auto">
            {filtered.map((a, i) => (
              <div key={a.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{a.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(a.updated_at), "MMM dd, yyyy")}</p>
                  </div>
                  <p className="font-bold text-lg">{a.balance.toLocaleString()}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => openHistory(a)}>
                    <History className="w-3 h-3 mr-1" /> History
                  </Button>
                  {canManage && (
                    <>
                      {canEditSavings && (
                        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => {
                          setSelectedAccount(a); setAmount(""); setPaymentMethod("cash"); setNotes(""); setShowWithdrawDialog(true);
                        }}>
                          <ArrowUpFromLine className="w-3 h-3 mr-1" /> Withdraw
                        </Button>
                      )}
                      {canEditSavings && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          setSelectedAccount(a); setEditName(a.customer_name); setShowEditDialog(true);
                        }}><Edit className="w-3 h-3" /></Button>
                      )}
                      {canDeleteSavings && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(a)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={v => { setShowWithdrawDialog(v); if (!v) { resetForm(); setSelectedAccount(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Withdraw from {selectedAccount?.customer_name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Current balance: <strong>{selectedAccount?.balance.toLocaleString()}</strong></p>
          <div className="space-y-3">
            <div>
              <Label>Amount</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" min="0" max={selectedAccount?.balance} />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleWithdraw} className="w-full" variant="destructive">
              <ArrowUpFromLine className="w-4 h-4 mr-1" /> Withdraw
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={v => { setShowEditDialog(v); if (!v) setSelectedAccount(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Customer Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <Button onClick={handleEdit} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={v => { setShowHistoryDialog(v); if (!v) { setSelectedAccount(null); setTransactions([]); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Transaction History — {selectedAccount?.customer_name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">Current balance: <strong>{selectedAccount?.balance.toLocaleString()}</strong></p>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No transactions yet</p>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Served By</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs whitespace-nowrap">{format(new Date(tx.created_at), "MMM dd, yyyy HH:mm")}</TableCell>
                        <TableCell>
                          <Badge variant={tx.type === "deposit" ? "default" : "destructive"} className="text-xs capitalize">
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{tx.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">{tx.payment_method}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{tx.served_by_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{tx.notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile */}
              <div className="md:hidden space-y-2">
                {transactions.map(tx => (
                  <div key={tx.id} className="border border-border rounded-lg p-3 space-y-1">
                    <div className="flex justify-between items-center">
                      <Badge variant={tx.type === "deposit" ? "default" : "destructive"} className="text-xs capitalize">{tx.type}</Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(tx.created_at), "MMM dd, HH:mm")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{tx.amount.toLocaleString()}</span>
                      <Badge variant="outline" className="text-xs capitalize">{tx.payment_method}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Served by: {tx.served_by_name}</p>
                    {tx.notes && <p className="text-xs text-muted-foreground">{tx.notes}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Audit Log */}
      <AuditLogViewer tableName="savings_accounts" title="Savings Change History" />
    </div>
  );
};

export default SavingsPage;
