import { Fragment, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCommodities } from "@/contexts/CommodityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, CreditCard, Search, ArrowDownCircle, ArrowUpCircle, Minus, FileSpreadsheet, Users, ChevronDown, ChevronRight } from "lucide-react";
import { downloadCSV } from "@/utils/downloadCSV";
import { toast } from "sonner";
import { format } from "date-fns";
import { logAuditEvent } from "@/utils/auditLog";
import AuditLogViewer from "@/components/AuditLogViewer";
import { usePersistedState } from "@/hooks/usePersistedState";

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
  payment_method: string;
  paid_by_name: string;
  paid_to_name: string;
}

interface Creditor {
  id: string;
  customer_name: string;
  commodity: string;
  kg: number;
  rate: number;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: string;
  recorded_by_name: string;
  created_at: string;
}

interface CreditorPayment {
  id: string;
  creditor_id: string;
  amount: number;
  payment_method: string;
  paid_by_name: string;
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
  const { commodities } = useCommodities();
  const canEdit = user?.role === "admin" || hasPermission("manage_debts") || hasPermission("edit_records");
  const canPay = user?.role === "admin" || hasPermission("pay_debts");
  const canEditDebt = user?.role === "admin" || hasPermission("edit_debts") || hasPermission("edit_records");
  const canDelete = user?.role === "admin" || hasPermission("delete_debts");
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [debtType, setDebtType] = usePersistedState<"advance" | "debt" | "creditor">("debt_type", "advance");
  const [customerName, setCustomerName] = usePersistedState("debt_customerName", "");
  const [description, setDescription] = usePersistedState("debt_description", "");
  const [totalAmount, setTotalAmount] = usePersistedState("debt_totalAmount", "");

  // Creditor-specific fields
  const [creditorCommodity, setCreditorCommodity] = usePersistedState("creditor_commodity", "");
  const [creditorKg, setCreditorKg] = usePersistedState("creditor_kg", "");
  const [creditorRate, setCreditorRate] = usePersistedState("creditor_rate", "");

  // Deduction dialog for debt (money_out)
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
  const [payMethod, setPayMethod] = useState("cash");
  const [payToName, setPayToName] = useState("");
  const [payments, setPayments] = useState<DebtPayment[]>([]);

  // Creditors
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [editCreditor, setEditCreditor] = useState<Creditor | null>(null);
  const [editCreditorName, setEditCreditorName] = useState("");
  const [editCreditorCommodity, setEditCreditorCommodity] = useState("");
  const [editCreditorKg, setEditCreditorKg] = useState("");
  const [editCreditorRate, setEditCreditorRate] = useState("");
  const [editCreditorAmount, setEditCreditorAmount] = useState("");

  // Creditor payment
  const [payCreditor, setPayCreditor] = useState<Creditor | null>(null);
  const [creditorPayAmount, setCreditorPayAmount] = useState("");
  const [creditorPayNotes, setCreditorPayNotes] = useState("");
  const [creditorPayMethod, setCreditorPayMethod] = useState("cash");
  const [creditorPayments, setCreditorPayments] = useState<CreditorPayment[]>([]);

  // Collapsed customer groups (per section). Default: collapsed when group has >1 entry.
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (key: string) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const fetchDebts = useCallback(async () => {
    const { data } = await supabase
      .from("debts")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setDebts(data.map((d: any) => ({ ...d, total_amount: Number(d.total_amount), paid_amount: Number(d.paid_amount), balance: Number(d.balance) })));
    setLoading(false);
  }, []);

  const fetchCreditors = useCallback(async () => {
    const { data } = await supabase
      .from("creditors")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCreditors(data.map((c: any) => ({ ...c, kg: Number(c.kg), rate: Number(c.rate), total_amount: Number(c.total_amount), paid_amount: Number(c.paid_amount), balance: Number(c.balance) })));
  }, []);

  useEffect(() => {
    fetchDebts();
    fetchCreditors();
    const channelName = `debts-rt-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "debts" }, () => fetchDebts())
      .on("postgres_changes", { event: "*", schema: "public", table: "debt_payments" }, () => {
        fetchDebts();
        if (payDebt) fetchPayments(payDebt.id);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "creditors" }, () => fetchCreditors())
      .on("postgres_changes", { event: "*", schema: "public", table: "creditor_payments" }, () => {
        fetchCreditors();
        if (payCreditor) fetchCreditorPayments(payCreditor.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDebts, fetchCreditors]);

  const fetchPayments = async (debtId: string) => {
    const { data } = await supabase
      .from("debt_payments")
      .select("*")
      .eq("debt_id", debtId)
      .order("created_at", { ascending: false });
    if (data) setPayments(data.map((p: any) => ({ ...p, amount: Number(p.amount) })));
  };

  const fetchCreditorPayments = async (creditorId: string) => {
    const { data } = await supabase
      .from("creditor_payments")
      .select("*")
      .eq("creditor_id", creditorId)
      .order("created_at", { ascending: false });
    if (data) setCreditorPayments(data.map((p: any) => ({ ...p, amount: Number(p.amount) })));
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
    if (debtType === "creditor") {
      handleAddCreditor();
      return;
    }
    if (!customerName.trim() || !totalAmount) { toast.error("Fill required fields"); return; }
    if (debtType === "debt") {
      setShowDeduction(true);
    } else {
      saveDebt(parseFloat(totalAmount));
    }
  };

  const handleAddCreditor = async () => {
    if (!customerName.trim() || !creditorCommodity || !creditorKg) { toast.error("Fill required fields"); return; }
    const kg = parseFloat(creditorKg) || 0;
    const rate = parseFloat(creditorRate) || 0;
    const amount = kg * rate;
    const company_id = await (await import("@/utils/getCompanyId")).getCompanyId();
    const { data, error } = await supabase.from("creditors").insert({
      customer_name: customerName.trim(),
      commodity: creditorCommodity,
      kg,
      rate,
      total_amount: amount,
      balance: amount,
      recorded_by: user?.id,
      recorded_by_name: user?.name || "Unknown",
      company_id,
    }).select("id").single();
    if (error) { toast.error("Failed to add creditor"); return; }
    await logAuditEvent({ tableName: "creditors", recordId: data.id, action: "create", newData: { customer_name: customerName.trim(), commodity: creditorCommodity, kg, rate, total_amount: amount }, changedByName: user?.name || "Unknown" });
    setCustomerName(""); setCreditorCommodity(""); setCreditorKg(""); setCreditorRate(""); setShowAdd(false);
    toast.success("Creditor record added");
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
    const company_id = await (await import("@/utils/getCompanyId")).getCompanyId();
    const { data, error } = await supabase.from("debts").insert({
      customer_name: customerName.trim(),
      description: desc ?? description,
      total_amount: amt,
      balance: amt,
      created_by: user?.id,
      status: debtType === "debt" ? "money_out" : "unpaid",
      company_id,
    }).select("id").single();
    if (error) { toast.error("Failed to add"); return; }
    await logAuditEvent({ tableName: "debts", recordId: data.id, action: "create", newData: { customer_name: customerName.trim(), total_amount: amt, type: debtType }, changedByName: user?.name || "Unknown" });
    setCustomerName(""); setDescription(""); setTotalAmount(""); setShowAdd(false); setDebtType("advance");
    toast.success("Record added");
  };

  const handleEdit = async () => {
    if (!editDebt) return;
    const amt = parseFloat(editAmount);
    const newBalance = amt - editDebt.paid_amount;
    const oldData = { customer_name: editDebt.customer_name, description: editDebt.description, total_amount: editDebt.total_amount };
    const { error } = await supabase.from("debts").update({
      customer_name: editName,
      description: editDesc,
      total_amount: amt,
      balance: newBalance,
      status: newBalance <= 0 ? "paid" : editDebt.status === "money_out" ? "money_out" : "unpaid",
      updated_at: new Date().toISOString(),
    }).eq("id", editDebt.id);
    if (error) { toast.error("Failed to update"); return; }
    await logAuditEvent({ tableName: "debts", recordId: editDebt.id, action: "update", oldData, newData: { customer_name: editName, description: editDesc, total_amount: amt }, changedByName: user?.name || "Unknown" });
    setEditDebt(null);
    toast.success("Updated");
  };

  const handleEditCreditor = async () => {
    if (!editCreditor) return;
    const kg = parseFloat(editCreditorKg) || 0;
    const rate = parseFloat(editCreditorRate) || 0;
    const amt = parseFloat(editCreditorAmount) || kg * rate;
    const newBalance = amt - editCreditor.paid_amount;
    const { error } = await supabase.from("creditors").update({
      customer_name: editCreditorName,
      commodity: editCreditorCommodity,
      kg,
      rate,
      total_amount: amt,
      balance: newBalance,
      status: newBalance <= 0 ? "paid" : "unpaid",
      updated_at: new Date().toISOString(),
    }).eq("id", editCreditor.id);
    if (error) { toast.error("Failed to update"); return; }
    await logAuditEvent({ tableName: "creditors", recordId: editCreditor.id, action: "update", oldData: { customer_name: editCreditor.customer_name }, newData: { customer_name: editCreditorName, kg, rate, total_amount: amt }, changedByName: user?.name || "Unknown" });
    setEditCreditor(null);
    toast.success("Updated");
  };

  const handlePayment = async () => {
    if (!payDebt || !payAmount) { toast.error("Enter payment amount"); return; }
    const amt = parseFloat(payAmount);
    if (amt <= 0) { toast.error("Invalid amount"); return; }
    if (amt > payDebt.balance) { toast.error("Amount exceeds balance"); return; }

    const company_id = await (await import("@/utils/getCompanyId")).getCompanyId();
    const { error: payErr } = await supabase.from("debt_payments").insert({
      debt_id: payDebt.id,
      amount: amt,
      notes: payNotes,
      paid_by: user?.id,
      payment_method: payMethod,
      paid_by_name: user?.name || "Unknown",
      paid_to_name: payToName.trim() || payDebt.customer_name,
      company_id,
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

    await logAuditEvent({ tableName: "debts", recordId: payDebt.id, action: "payment", newData: { payment_amount: amt, notes: payNotes, method: payMethod, new_balance: newBalance }, changedByName: user?.name || "Unknown" });
    setPayAmount(""); setPayNotes(""); setPayMethod("cash"); setPayToName("");
    toast.success("Payment recorded");
    fetchPayments(payDebt.id);
    fetchDebts();
    setPayDebt({ ...payDebt, paid_amount: newPaid, balance: newBalance });
  };

  const handleCreditorPayment = async () => {
    if (!payCreditor || !creditorPayAmount) { toast.error("Enter payment amount"); return; }
    const amt = parseFloat(creditorPayAmount);
    if (amt <= 0) { toast.error("Invalid amount"); return; }
    if (amt > payCreditor.balance) { toast.error("Amount exceeds balance"); return; }

    const company_id = await (await import("@/utils/getCompanyId")).getCompanyId();
    const { error } = await supabase.from("creditor_payments").insert({
      creditor_id: payCreditor.id,
      amount: amt,
      payment_method: creditorPayMethod,
      paid_by: user?.id,
      paid_by_name: user?.name || "Unknown",
      notes: creditorPayNotes,
      company_id,
    });
    if (error) { toast.error("Payment failed"); return; }

    const newPaid = payCreditor.paid_amount + amt;
    const newBalance = payCreditor.total_amount - newPaid;
    await supabase.from("creditors").update({
      paid_amount: newPaid,
      balance: newBalance,
      status: newBalance <= 0 ? "paid" : "unpaid",
      updated_at: new Date().toISOString(),
    }).eq("id", payCreditor.id);

    await logAuditEvent({ tableName: "creditors", recordId: payCreditor.id, action: "payment", newData: { payment_amount: amt, method: creditorPayMethod, new_balance: newBalance }, changedByName: user?.name || "Unknown" });
    setCreditorPayAmount(""); setCreditorPayNotes(""); setCreditorPayMethod("cash");
    toast.success("Payment recorded");
    fetchCreditorPayments(payCreditor.id);
    fetchCreditors();
    setPayCreditor({ ...payCreditor, paid_amount: newPaid, balance: newBalance });
  };

  const handleDelete = async (id: string) => {
    const debt = debts.find(d => d.id === id);
    if (!confirm("Delete this record?")) return;
    const { error } = await supabase.from("debts").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    if (debt) await logAuditEvent({ tableName: "debts", recordId: id, action: "delete", oldData: { customer_name: debt.customer_name, total_amount: debt.total_amount, balance: debt.balance }, changedByName: user?.name || "Unknown" });
    toast.success("Deleted");
  };

  const handleDeleteCreditor = async (id: string) => {
    const creditor = creditors.find(c => c.id === id);
    if (!confirm("Delete this creditor record?")) return;
    const { error } = await supabase.from("creditors").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    if (creditor) await logAuditEvent({ tableName: "creditors", recordId: id, action: "delete", oldData: { customer_name: creditor.customer_name, commodity: creditor.commodity, total_amount: creditor.total_amount }, changedByName: user?.name || "Unknown" });
    toast.success("Deleted");
  };

  const filtered = debts.filter(d =>
    d.customer_name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredCreditors = creditors.filter(c =>
    c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    c.commodity.toLowerCase().includes(search.toLowerCase())
  );

  const advanceDebts = filtered.filter(d => d.status === "unpaid");
  const debtDebts = filtered.filter(d => d.status === "money_out");
  const paidDebts = filtered.filter(d => d.status === "paid");
  const unpaidCreditors = filteredCreditors.filter(c => c.status !== "paid");
  const paidCreditors = filteredCreditors.filter(c => c.status === "paid");

  const totalOutstanding = debts.reduce((s, d) => s + d.balance, 0);
  const totalAdvance = debts.filter(d => d.status === "unpaid").reduce((s, d) => s + d.balance, 0);
  const totalDebt = debts.filter(d => d.status === "money_out").reduce((s, d) => s + d.balance, 0);
  const totalCreditors = creditors.filter(c => c.status !== "paid").reduce((s, c) => s + c.balance, 0);

  const parseDeductionAmount = (description: string): number => {
    const match = description.match(/Deductions:[^|]*\|/);
    if (!match) return 0;
    const amounts = match[0].match(/:\s*[^\s:,]+/g);
    if (!amounts) return 0;
    return amounts.reduce((sum, amt) => {
      const num = parseFloat(amt.replace(/[:\s,]/g, "").replace(/[^\d.]/g, ""));
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  };

  const getStatusBadge = (status: string) => {
    if (status === "paid") return <Badge variant="default" className="text-xs">Paid</Badge>;
    if (status === "money_out") return <Badge variant="secondary" className="text-xs bg-orange-500/15 text-orange-600 border-orange-500/30"><ArrowUpCircle className="w-3 h-3 mr-1" />Debt</Badge>;
    return <Badge variant="destructive" className="text-xs"><ArrowDownCircle className="w-3 h-3 mr-1" />Advance</Badge>;
  };

  // Group debts by lowercased customer name, preserving display name from first entry
  const groupDebtsByName = (items: Debt[]) => {
    const groups: Record<string, { name: string; items: Debt[] }> = {};
    items.forEach(d => {
      const key = d.customer_name.trim().toLowerCase();
      if (!groups[key]) groups[key] = { name: d.customer_name.trim(), items: [] };
      groups[key].items.push(d);
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  };

  const groupCreditorsByName = (items: Creditor[]) => {
    const groups: Record<string, { name: string; items: Creditor[] }> = {};
    items.forEach(c => {
      const key = c.customer_name.trim().toLowerCase();
      if (!groups[key]) groups[key] = { name: c.customer_name.trim(), items: [] };
      groups[key].items.push(c);
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  };

  const renderDebtRow = (d: Debt) => {
    const isDebt = d.status === "money_out";
    const deductionAmount = isDebt ? parseDeductionAmount(d.description) : 0;
    const gross = isDebt ? d.total_amount + deductionAmount : d.total_amount;

    return (
      <TableRow key={d.id}>
        <TableCell className="font-medium">{d.customer_name}</TableCell>
        <TableCell className="text-muted-foreground max-w-[150px] truncate" title={d.description}>
          {isDebt && deductionAmount > 0 ? d.description.split(" | ")[0] || d.description : d.description}
        </TableCell>
        <TableCell className="text-right font-mono">{isDebt ? symbol + gross.toLocaleString() : "-"}</TableCell>
        <TableCell className="text-right font-mono text-destructive">{isDebt && deductionAmount > 0 ? "-" + symbol + deductionAmount.toLocaleString() : "-"}</TableCell>
        <TableCell className="text-right font-mono font-semibold">{symbol}{d.total_amount.toLocaleString()}</TableCell>
        <TableCell className="text-right font-mono text-green-600">{symbol}{d.paid_amount.toLocaleString()}</TableCell>
        <TableCell className="text-right font-mono text-destructive font-semibold">{symbol}{d.balance.toLocaleString()}</TableCell>
        <TableCell>{getStatusBadge(d.status)}</TableCell>
        <TableCell>
          <div className="flex items-center justify-end gap-1">
            {d.status !== "paid" && canPay && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setPayDebt(d); fetchPayments(d.id); }}>Pay</Button>
            )}
            {canEditDebt && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditDebt(d); setEditName(d.customer_name); setEditDesc(d.description); setEditAmount(String(d.total_amount)); }}><Edit className="w-3.5 h-3.5" /></Button>
            )}
            {canDelete && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(d.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const renderDebtCard = (d: Debt) => (
    <div key={d.id} className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{d.customer_name}</p>
          <p className="text-xs text-muted-foreground truncate">{d.description}</p>
        </div>
        {getStatusBadge(d.status)}
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div><span className="text-muted-foreground">Amount</span><p className="font-mono font-semibold">{symbol}{d.total_amount.toLocaleString()}</p></div>
        <div><span className="text-muted-foreground">Paid</span><p className="font-mono text-green-600">{symbol}{d.paid_amount.toLocaleString()}</p></div>
        <div><span className="text-muted-foreground">Balance</span><p className="font-mono text-destructive font-semibold">{symbol}{d.balance.toLocaleString()}</p></div>
      </div>
      {(canPay || canEditDebt || canDelete) && (
        <div className="flex gap-1">
          {d.status !== "paid" && canPay && (
            <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => { setPayDebt(d); fetchPayments(d.id); }}>Pay</Button>
          )}
          {canEditDebt && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditDebt(d); setEditName(d.customer_name); setEditDesc(d.description); setEditAmount(String(d.total_amount)); }}><Edit className="w-3.5 h-3.5" /></Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(d.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
          )}
        </div>
      )}
    </div>
  );

  const renderCreditorRow = (c: Creditor) => (
    <TableRow key={c.id}>
      <TableCell className="font-medium">{c.customer_name}</TableCell>
      <TableCell>{c.commodity}</TableCell>
      <TableCell className="text-right font-mono">{c.kg.toLocaleString()} kg</TableCell>
      <TableCell className="text-right font-mono">{symbol}{c.rate.toLocaleString()}</TableCell>
      <TableCell className="text-right font-mono font-semibold">{symbol}{c.total_amount.toLocaleString()}</TableCell>
      <TableCell className="text-right font-mono text-green-600">{symbol}{c.paid_amount.toLocaleString()}</TableCell>
      <TableCell className="text-right font-mono text-destructive font-semibold">{symbol}{c.balance.toLocaleString()}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{c.recorded_by_name}</TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {c.status !== "paid" && canPay && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setPayCreditor(c); fetchCreditorPayments(c.id); }}>Pay</Button>
          )}
          {canEditDebt && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
              setEditCreditor(c);
              setEditCreditorName(c.customer_name);
              setEditCreditorCommodity(c.commodity);
              setEditCreditorKg(String(c.kg));
              setEditCreditorRate(String(c.rate));
              setEditCreditorAmount(String(c.total_amount));
            }}><Edit className="w-3.5 h-3.5" /></Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCreditor(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  const renderCreditorCard = (c: Creditor) => (
    <div key={c.id} className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{c.customer_name}</p>
          <p className="text-xs text-muted-foreground">{c.commodity} — {c.kg} kg @ {symbol}{c.rate}</p>
        </div>
        {c.status === "paid" ? <Badge variant="default" className="text-xs">Paid</Badge> : <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-600"><Users className="w-3 h-3 mr-1" />Creditor</Badge>}
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div><span className="text-muted-foreground">Amount</span><p className="font-mono font-semibold">{symbol}{c.total_amount.toLocaleString()}</p></div>
        <div><span className="text-muted-foreground">Paid</span><p className="font-mono text-green-600">{symbol}{c.paid_amount.toLocaleString()}</p></div>
        <div><span className="text-muted-foreground">Balance</span><p className="font-mono text-destructive font-semibold">{symbol}{c.balance.toLocaleString()}</p></div>
      </div>
      <p className="text-[10px] text-muted-foreground">Recorded by: {c.recorded_by_name}</p>
      {(canPay || canEditDebt || canDelete) && (
        <div className="flex gap-1">
          {c.status !== "paid" && canPay && (
            <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => { setPayCreditor(c); fetchCreditorPayments(c.id); }}>Pay</Button>
          )}
          {canEditDebt && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
              setEditCreditor(c);
              setEditCreditorName(c.customer_name);
              setEditCreditorCommodity(c.commodity);
              setEditCreditorKg(String(c.kg));
              setEditCreditorRate(String(c.rate));
              setEditCreditorAmount(String(c.total_amount));
            }}><Edit className="w-3.5 h-3.5" /></Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCreditor(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
          )}
        </div>
      )}
    </div>
  );

  const desktopTableHeaders = (
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
  );

  const creditorTableHeaders = (
    <TableHeader>
      <TableRow>
        <TableHead>Customer</TableHead>
        <TableHead>Commodity</TableHead>
        <TableHead className="text-right">Kg</TableHead>
        <TableHead className="text-right">Rate</TableHead>
        <TableHead className="text-right">Amount</TableHead>
        <TableHead className="text-right">Paid</TableHead>
        <TableHead className="text-right">Balance</TableHead>
        <TableHead>Recorded By</TableHead>
        <TableHead className="text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );

  // Grouped section renderer for debts (advance / debt / paid)
  const renderDebtGroupedSection = (sectionKey: string, items: Debt[]) => {
    const groups = groupDebtsByName(items);
    return (
      <>
        <div className="hidden lg:block max-h-[480px] overflow-y-auto">
          <Table>
            {desktopTableHeaders}
            <TableBody>
              {groups.map(g => {
                const groupKey = `${sectionKey}-${g.name.toLowerCase()}`;
                const isMulti = g.items.length > 1;
                const expanded = expandedGroups[groupKey] ?? !isMulti;
                const totals = g.items.reduce(
                  (acc, d) => {
                    acc.total += d.total_amount;
                    acc.paid += d.paid_amount;
                    acc.balance += d.balance;
                    return acc;
                  },
                  { total: 0, paid: 0, balance: 0 },
                );
                return (
                  <Fragment key={groupKey}>
                    {isMulti && (
                      <TableRow
                        key={`${groupKey}-header`}
                        className="bg-primary/5 hover:bg-primary/10 cursor-pointer border-t-2 border-primary/20"
                        onClick={() => toggleGroup(groupKey)}
                      >
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-1.5">
                            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            <span>{g.name}</span>
                            <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5 font-bold">× {g.items.length} times</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground italic">Combined total ({g.items.length} entries)</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">—</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">—</TableCell>
                        <TableCell className="text-right font-mono font-bold text-base">{symbol}{totals.total.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-green-600 font-semibold">{symbol}{totals.paid.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-destructive font-bold text-base">{symbol}{totals.balance.toLocaleString()}</TableCell>
                        <TableCell />
                        <TableCell className="text-right">
                          <span className="text-[10px] text-muted-foreground">{expanded ? "Hide" : "Show"} breakdown</span>
                        </TableCell>
                      </TableRow>
                    )}
                    {expanded && g.items.map(renderDebtRow)}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="lg:hidden space-y-2 max-h-[480px] overflow-y-auto">
          {groups.map(g => {
            const groupKey = `m-${sectionKey}-${g.name.toLowerCase()}`;
            const isMulti = g.items.length > 1;
            const expanded = expandedGroups[groupKey] ?? !isMulti;
            const totals = g.items.reduce(
              (acc, d) => {
                acc.total += d.total_amount;
                acc.paid += d.paid_amount;
                acc.balance += d.balance;
                return acc;
              },
              { total: 0, paid: 0, balance: 0 },
            );
            return (
              <div key={groupKey} className="space-y-2">
                {isMulti && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full flex items-center justify-between bg-primary/10 hover:bg-primary/15 border border-primary/30 rounded-lg p-3 text-left"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {expanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm truncate">{g.name}</span>
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold shrink-0">× {g.items.length}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Total: {symbol}{totals.total.toLocaleString()} · Paid: {symbol}{totals.paid.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-[10px] text-muted-foreground">Balance</p>
                      <p className="font-mono font-bold text-destructive text-base">{symbol}{totals.balance.toLocaleString()}</p>
                    </div>
                  </button>
                )}
                {expanded && g.items.map(renderDebtCard)}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  // Grouped section renderer for creditors
  const renderCreditorGroupedSection = (sectionKey: string, items: Creditor[]) => {
    const groups = groupCreditorsByName(items);
    return (
      <>
        <div className="hidden lg:block max-h-[480px] overflow-y-auto">
          <Table>
            {creditorTableHeaders}
            <TableBody>
              {groups.map(g => {
                const groupKey = `${sectionKey}-${g.name.toLowerCase()}`;
                const isMulti = g.items.length > 1;
                const expanded = expandedGroups[groupKey] ?? !isMulti;
                const totals = g.items.reduce(
                  (acc, c) => {
                    acc.kg += c.kg;
                    acc.total += c.total_amount;
                    acc.paid += c.paid_amount;
                    acc.balance += c.balance;
                    return acc;
                  },
                  { kg: 0, total: 0, paid: 0, balance: 0 },
                );
                return (
                  <Fragment key={groupKey}>
                    {isMulti && (
                      <TableRow
                        key={`${groupKey}-header`}
                        className="bg-primary/5 hover:bg-primary/10 cursor-pointer border-t-2 border-primary/20"
                        onClick={() => toggleGroup(groupKey)}
                      >
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-1.5">
                            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            <span>{g.name}</span>
                            <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5 font-bold">× {g.items.length} times</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground italic">Combined ({g.items.length} entries)</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{totals.kg.toLocaleString()} kg</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">—</TableCell>
                        <TableCell className="text-right font-mono font-bold text-base">{symbol}{totals.total.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-green-600 font-semibold">{symbol}{totals.paid.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-destructive font-bold text-base">{symbol}{totals.balance.toLocaleString()}</TableCell>
                        <TableCell />
                        <TableCell className="text-right">
                          <span className="text-[10px] text-muted-foreground">{expanded ? "Hide" : "Show"} breakdown</span>
                        </TableCell>
                      </TableRow>
                    )}
                    {expanded && g.items.map(renderCreditorRow)}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="lg:hidden space-y-2 max-h-[480px] overflow-y-auto">
          {groups.map(g => {
            const groupKey = `m-${sectionKey}-${g.name.toLowerCase()}`;
            const isMulti = g.items.length > 1;
            const expanded = expandedGroups[groupKey] ?? !isMulti;
            const totals = g.items.reduce(
              (acc, c) => {
                acc.kg += c.kg;
                acc.total += c.total_amount;
                acc.paid += c.paid_amount;
                acc.balance += c.balance;
                return acc;
              },
              { kg: 0, total: 0, paid: 0, balance: 0 },
            );
            return (
              <div key={groupKey} className="space-y-2">
                {isMulti && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full flex items-center justify-between bg-primary/10 hover:bg-primary/15 border border-primary/30 rounded-lg p-3 text-left"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {expanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm truncate">{g.name}</span>
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold shrink-0">× {g.items.length}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Total: {symbol}{totals.total.toLocaleString()} · {totals.kg}kg · Paid: {symbol}{totals.paid.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-[10px] text-muted-foreground">Balance</p>
                      <p className="font-mono font-bold text-destructive text-base">{symbol}{totals.balance.toLocaleString()}</p>
                    </div>
                  </button>
                )}
                {expanded && g.items.map(renderCreditorCard)}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const handleExportCSV = async () => {
    const { data: allPayments } = await supabase.from("debt_payments").select("*").order("created_at", { ascending: false });
    const rows: string[][] = [
      ["Type", "Customer", "Description", "Total Amount", "Paid", "Balance", "Status", "Created At", "Payment Amount", "Payment Method", "Paid By", "Paid To", "Payment Notes", "Payment Date"]
    ];
    for (const d of debts) {
      const dPayments = (allPayments || []).filter((p: any) => p.debt_id === d.id);
      if (dPayments.length === 0) {
        rows.push([d.status === "unpaid" ? "Advance" : "Debt", d.customer_name, d.description, String(d.total_amount), String(d.paid_amount), String(d.balance), d.status, format(new Date(d.created_at), "yyyy-MM-dd HH:mm"), "", "", "", "", "", ""]);
      } else {
        for (const p of dPayments) {
          rows.push([d.status === "unpaid" ? "Advance" : "Debt", d.customer_name, d.description, String(d.total_amount), String(d.paid_amount), String(d.balance), d.status, format(new Date(d.created_at), "yyyy-MM-dd HH:mm"), String(p.amount), p.payment_method, p.paid_by_name, p.paid_to_name, p.notes || "", format(new Date(p.created_at), "yyyy-MM-dd HH:mm")]);
        }
      }
    }
    // Add creditors
    for (const c of creditors) {
      rows.push(["Creditor", c.customer_name, `${c.commodity} - ${c.kg}kg @ ${c.rate}`, String(c.total_amount), String(c.paid_amount), String(c.balance), c.status, format(new Date(c.created_at), "yyyy-MM-dd HH:mm"), "", "", c.recorded_by_name, "", "", ""]);
    }
    downloadCSV(rows, `debt-management-${format(new Date(), "yyyy-MM-dd")}.csv`);
    toast.success("Debt report exported!");
  };

  // Auto-calculate creditor amount
  const creditorAutoAmount = (parseFloat(creditorKg) || 0) * (parseFloat(creditorRate) || 0);

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
              <Button size="sm" variant="outline" onClick={handleExportCSV} title="Export to CSV"><FileSpreadsheet className="w-4 h-4" /></Button>
              {canEdit && <Button size="sm" onClick={() => setShowAdd(!showAdd)}><Plus className="w-4 h-4 mr-1" /> Add</Button>}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAdd && (
            <div className="p-4 bg-accent rounded-lg border border-border space-y-3">
              <div className="flex gap-2">
                <Button type="button" variant={debtType === "advance" ? "default" : "outline"} className="flex-1 gap-2" onClick={() => setDebtType("advance")}>
                  <ArrowDownCircle className="w-4 h-4" /> Advance
                </Button>
                <Button type="button" variant={debtType === "debt" ? "default" : "outline"} className="flex-1 gap-2" onClick={() => setDebtType("debt")}>
                  <ArrowUpCircle className="w-4 h-4" /> Debt
                </Button>
                <Button type="button" variant={debtType === "creditor" ? "default" : "outline"} className="flex-1 gap-2" onClick={() => setDebtType("creditor")}>
                  <Users className="w-4 h-4" /> Creditor
                </Button>
              </div>

              {debtType === "creditor" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Customer *</Label><Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Name" /></div>
                  <div className="space-y-1">
                    <Label className="text-xs">Commodity *</Label>
                    <Select value={creditorCommodity} onValueChange={setCreditorCommodity}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {commodities.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Kg *</Label><Input type="number" value={creditorKg} onChange={e => setCreditorKg(e.target.value)} placeholder="0" /></div>
                  <div className="space-y-1"><Label className="text-xs">Rate ({symbol})</Label><Input type="number" value={creditorRate} onChange={e => setCreditorRate(e.target.value)} placeholder="0" /></div>
                  <div className="space-y-1"><Label className="text-xs">Amount ({symbol})</Label><Input type="number" value={creditorAutoAmount || ""} disabled className="bg-muted" /></div>
                  <div className="flex items-end"><Button onClick={handleAddClick} className="w-full">Save</Button></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Customer *</Label><Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Name" /></div>
                  <div className="space-y-1"><Label className="text-xs">Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Details" /></div>
                  <div className="space-y-1"><Label className="text-xs">{debtType === "debt" ? "Gross " : ""}Amount ({symbol}) *</Label><Input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="0" /></div>
                  <div className="flex items-end"><Button onClick={handleAddClick} className="w-full">Save</Button></div>
                </div>
              )}
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-muted-foreground">Total Outstanding</p>
              <p className="text-lg font-bold font-mono text-destructive">{symbol}{totalOutstanding.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowDownCircle className="w-3 h-3" /> Advance</p>
              <p className="text-lg font-bold font-mono">{symbol}{totalAdvance.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowUpCircle className="w-3 h-3" /> Debt</p>
              <p className="text-lg font-bold font-mono">{symbol}{totalDebt.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Creditors</p>
              <p className="text-lg font-bold font-mono">{symbol}{totalCreditors.toLocaleString()}</p>
            </div>
          </div>

          {/* Advance Section */}
          {advanceDebts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2"><ArrowDownCircle className="w-4 h-4 text-destructive" /> Advance ({advanceDebts.length})</h3>
              {renderDebtGroupedSection("advance", advanceDebts)}
            </div>
          )}

          {/* Debt Section */}
          {debtDebts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2"><ArrowUpCircle className="w-4 h-4 text-orange-500" /> Debts ({debtDebts.length})</h3>
              {renderDebtGroupedSection("debt", debtDebts)}
            </div>
          )}

          {/* Creditors Section */}
          {unpaidCreditors.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-purple-500" /> Creditors ({unpaidCreditors.length})</h3>
              {renderCreditorGroupedSection("creditor", unpaidCreditors)}
            </div>
          )}

          {/* Paid Section */}
          {(paidDebts.length > 0 || paidCreditors.length > 0) && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-green-600">✓ Paid ({paidDebts.length + paidCreditors.length})</h3>
              {paidDebts.length > 0 && renderDebtGroupedSection("paid-debt", paidDebts)}
              {paidCreditors.length > 0 && renderCreditorGroupedSection("paid-creditor", paidCreditors)}
            </div>
          )}

          {filtered.length === 0 && filteredCreditors.length === 0 && <p className="text-center text-muted-foreground py-8">No records found</p>}
        </CardContent>
      </Card>

      {/* Deduction Dialog for Debt */}
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
            <div className="flex gap-2">
              <Input value={newDeductionLabel} onChange={e => setNewDeductionLabel(e.target.value)} placeholder="Deduction name" className="flex-1" />
              <Input type="number" value={newDeductionAmount} onChange={e => setNewDeductionAmount(e.target.value)} placeholder="Amount" className="w-28" />
              <Button size="icon" variant="outline" onClick={handleAddDeduction}><Plus className="w-4 h-4" /></Button>
            </div>
            {deductions.length > 0 && (
              <div className="space-y-2">
                {deductions.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-2 bg-destructive/10 rounded text-sm">
                    <div className="flex items-center gap-2"><Minus className="w-3 h-3 text-destructive" /><span>{d.label}</span></div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-destructive">{symbol}{d.amount.toLocaleString()}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeDeduction(d.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            <Button onClick={handleConfirmDeduction} className="w-full">Confirm & Save ({symbol}{finalAmount.toLocaleString()})</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Debt Dialog */}
      <Dialog open={!!editDebt} onOpenChange={() => setEditDebt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
            <DialogDescription>Update details</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Customer</Label><Input value={editName} onChange={e => setEditName(e.target.value)} /></div>
            <div className="space-y-1"><Label>Description</Label><Input value={editDesc} onChange={e => setEditDesc(e.target.value)} /></div>
            <div className="space-y-1"><Label>Total Amount ({symbol})</Label><Input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} /></div>
            <Button onClick={handleEdit} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Creditor Dialog */}
      <Dialog open={!!editCreditor} onOpenChange={() => setEditCreditor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Creditor</DialogTitle>
            <DialogDescription>Update creditor details</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Customer</Label><Input value={editCreditorName} onChange={e => setEditCreditorName(e.target.value)} /></div>
            <div className="space-y-1">
              <Label>Commodity</Label>
              <Select value={editCreditorCommodity} onValueChange={setEditCreditorCommodity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {commodities.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Kg</Label><Input type="number" value={editCreditorKg} onChange={e => setEditCreditorKg(e.target.value)} /></div>
            <div className="space-y-1"><Label>Rate ({symbol})</Label><Input type="number" value={editCreditorRate} onChange={e => setEditCreditorRate(e.target.value)} /></div>
            <div className="space-y-1"><Label>Total Amount ({symbol})</Label><Input type="number" value={editCreditorAmount} onChange={e => setEditCreditorAmount(e.target.value)} /></div>
            <Button onClick={handleEditCreditor} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Debt Payment Dialog */}
      <Dialog open={!!payDebt} onOpenChange={() => setPayDebt(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Payment — {payDebt?.customer_name}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">Balance</span>
                <span className="font-semibold">{symbol}{payDebt?.balance.toLocaleString()}</span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Amount ({symbol}) *</Label><Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" /></div>
            <div className="space-y-1">
              <Label>Payment Method *</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Paid To</Label><Input value={payToName} onChange={e => setPayToName(e.target.value)} placeholder={payDebt?.customer_name || "Recipient name"} /></div>
            <div className="space-y-1"><Label>Notes</Label><Input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Optional" /></div>
            <Button onClick={handlePayment} className="w-full">Record Payment</Button>
          </div>

          {payments.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-semibold">Payment History</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {payments.map(p => (
                  <div key={p.id} className="p-2.5 bg-accent rounded-lg text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold">{symbol}{p.amount.toLocaleString()}</span>
                      <Badge variant="outline" className="text-xs capitalize">{p.payment_method}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{format(new Date(p.created_at), "MMM dd, yyyy HH:mm")}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span>By: <strong>{p.paid_by_name || "—"}</strong></span>
                      {p.paid_to_name && <span> → To: <strong>{p.paid_to_name}</strong></span>}
                    </div>
                    {p.notes && <p className="text-xs italic">{p.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Creditor Payment Dialog */}
      <Dialog open={!!payCreditor} onOpenChange={() => setPayCreditor(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Payment — {payCreditor?.customer_name}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">Balance</span>
                <span className="font-semibold">{symbol}{payCreditor?.balance.toLocaleString()}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{payCreditor?.commodity} — {payCreditor?.kg} kg</div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Amount ({symbol}) *</Label><Input type="number" value={creditorPayAmount} onChange={e => setCreditorPayAmount(e.target.value)} placeholder="0" /></div>
            <div className="space-y-1">
              <Label>Payment Method *</Label>
              <Select value={creditorPayMethod} onValueChange={setCreditorPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Input value={creditorPayNotes} onChange={e => setCreditorPayNotes(e.target.value)} placeholder="Optional" /></div>
            <Button onClick={handleCreditorPayment} className="w-full">Record Payment</Button>
          </div>

          {creditorPayments.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-semibold">Payment History</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {creditorPayments.map(p => (
                  <div key={p.id} className="p-2.5 bg-accent rounded-lg text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold">{symbol}{p.amount.toLocaleString()}</span>
                      <Badge variant="outline" className="text-xs capitalize">{p.payment_method}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{format(new Date(p.created_at), "MMM dd, yyyy HH:mm")}</div>
                    <div className="text-xs text-muted-foreground">By: <strong>{p.paid_by_name || "—"}</strong></div>
                    {p.notes && <p className="text-xs italic">{p.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AuditLogViewer tableName="debts" title="Debt Change History" />
    </div>
  );
};

export default DebtManagementPage;
