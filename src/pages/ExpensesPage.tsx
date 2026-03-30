import { useState, useEffect, useCallback } from "react";
import { Expense, Worker } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, Search, UserCheck } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/utils/auditLog";
import AuditLogViewer from "@/components/AuditLogViewer";

const ExpensesPage = () => {
  const { symbol } = useCurrency();
  const { user, hasPermission } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  const [showWorkerPicker, setShowWorkerPicker] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [workerSearch, setWorkerSearch] = useState("");
  const [dbWorkers, setDbWorkers] = useState<Worker[]>([]);

  const fetchExpenses = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("date", today)
      .order("created_at", { ascending: false });
    if (data) {
      setExpenses(data.map((d: any) => ({
        id: d.id,
        category: d.category,
        amount: Number(d.amount),
        date: d.date,
        notes: d.notes || "",
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchExpenses();
    // Realtime subscription for expenses
    const channel = supabase
      .channel("expenses-page-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => fetchExpenses())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchExpenses]);

  useEffect(() => {
    const fetchWorkers = async () => {
      const { data } = await supabase.from("workers").select("*").order("name");
      if (data) {
        setDbWorkers(data.map((w: any) => ({ id: w.id, name: w.name, role: w.role, salary: Number(w.salary), paid: Number(w.paid), balance: Number(w.balance) })));
      }
    };
    fetchWorkers();
  }, []);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const handleWorkerSelect = (worker: Worker) => {
    setSelectedWorker(worker);
    setShowWorkerPicker(false);
    if (category.toLowerCase() === "lunch") {
      setNotes(`Lunch for ${worker.name} (${worker.role})`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount) { toast.error("Fill required fields"); return; }

    if (!selectedWorker) {
      setShowWorkerPicker(true);
      toast.error("Select the responsible person");
      return;
    }

    const isLunch = category.toLowerCase() === "lunch";
    const expenseNotes = isLunch ? `Lunch for ${selectedWorker.name} (${selectedWorker.role})` : (notes || `Verified by ${selectedWorker.name}`);

    if (isLunch) {
      const alreadyHasLunch = expenses.some(
        (exp) => exp.category.toLowerCase() === "lunch" && exp.notes?.includes(`Lunch for ${selectedWorker.name}`)
      );
      if (alreadyHasLunch) {
        toast.error(`${selectedWorker.name} already has a lunch entry for today`);
        return;
      }
    }

    const { data, error } = await supabase.from("expenses").insert({
      category,
      amount: parseFloat(amount),
      date,
      notes: expenseNotes,
      verified_by: selectedWorker.name,
    }).select("id").single();

    if (error) {
      toast.error("Failed to save expense");
      return;
    }

    await logAuditEvent({ tableName: "expenses", recordId: data.id, action: "create", newData: { category, amount: parseFloat(amount), date, verified_by: selectedWorker.name }, changedByName: user?.name || "Unknown" });

    setCategory(""); setAmount(""); setNotes("");
    setSelectedWorker(null);
    toast.success(`Expense saved — ${selectedWorker.name}`);
  };

  const handleDelete = async (id: string) => {
    const expense = expenses.find(e => e.id === id);
    await supabase.from("expenses").delete().eq("id", id);
    if (expense) await logAuditEvent({ tableName: "expenses", recordId: id, action: "delete", oldData: { category: expense.category, amount: expense.amount }, changedByName: user?.name || "Unknown" });
  };

  const canDelete = hasPermission("delete_expenses") || hasPermission("delete_entries");

  return (
    <div className="space-y-4 max-w-4xl">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Add Expense</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Category *</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Transport, Lunch, Fuel..." className="h-10" />
            </div>
            <div className="space-y-1"><Label className="text-xs">Amount ({symbol}) *</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="h-10" /></div>
            <div className="space-y-1"><Label className="text-xs">Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10" /></div>
            <div className="space-y-1">
              <Label className="text-xs">Verified By *</Label>
              {selectedWorker ? (
                <div className="h-10 flex items-center gap-2 rounded-md border border-input bg-muted px-3">
                  <UserCheck className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium truncate">{selectedWorker.name}</span>
                  <Button type="button" variant="ghost" size="sm" className="ml-auto h-7 text-xs p-1" onClick={() => { setSelectedWorker(null); setShowWorkerPicker(true); }}>Change</Button>
                </div>
              ) : (
                <Button type="button" variant="outline" className="h-10 w-full text-xs" onClick={() => setShowWorkerPicker(true)}>
                  <UserCheck className="w-4 h-4 mr-1" /> Select Person
                </Button>
              )}
            </div>
            {category.toLowerCase() !== "lunch" && (
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" className="h-10" />
              </div>
            )}
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" className="h-10 px-6 w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-1" /> Add Expense
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={showWorkerPicker} onOpenChange={setShowWorkerPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserCheck className="w-5 h-5 text-primary" /> Select Responsible Person</DialogTitle>
            <DialogDescription>Choose who is responsible for this expense.</DialogDescription>
          </DialogHeader>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={workerSearch} onChange={(e) => setWorkerSearch(e.target.value)} placeholder="Search worker..." className="pl-9 h-10" autoFocus />
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {dbWorkers
              .filter((w) => w.name.toLowerCase().includes(workerSearch.toLowerCase()) || w.role.toLowerCase().includes(workerSearch.toLowerCase()))
              .map((w) => (
                <button key={w.id} type="button" onClick={() => { handleWorkerSelect(w); setWorkerSearch(""); }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left">
                  <div>
                    <p className="font-medium text-sm">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{w.role}</p>
                  </div>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader><CardTitle className="flex flex-col sm:flex-row justify-between gap-1"><span>Today's Expenses</span><span className="text-destructive font-mono">Total: {symbol}{total.toLocaleString()}</span></CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <p className="text-muted-foreground text-center py-4">Loading...</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Verified By</TableHead><TableHead>Notes</TableHead>{canDelete && <TableHead />}</TableRow></TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.category}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-destructive">{symbol}{e.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{e.notes}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{e.date}</TableCell>
                    {canDelete && (
                      <TableCell><Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => handleDelete(e.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpensesPage;
