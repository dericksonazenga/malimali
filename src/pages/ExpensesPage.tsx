import { useState } from "react";
import { mockExpenses } from "@/data/mockData";
import { Expense } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount) { toast.error("Fill required fields"); return; }
    setExpenses((prev) => [{ id: Date.now().toString(), category, amount: parseFloat(amount), date, notes }, ...prev]);
    setCategory(""); setAmount(""); setNotes("");
    toast.success("Expense added!");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Add Expense</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Category *</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Transport, Labour..." className="h-12" /></div>
            <div className="space-y-2"><Label>Amount (₹) *</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="h-12" /></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12" /></div>
            <div className="space-y-2"><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" className="h-12" /></div>
            <div className="lg:col-span-4"><Button type="submit" className="h-12 px-8">Add Expense</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex justify-between"><span>Expenses</span><span className="text-destructive font-mono">Total: ₹{total.toLocaleString()}</span></CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Date</TableHead><TableHead>Notes</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.category}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-destructive">₹{e.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{e.date}</TableCell>
                  <TableCell className="text-muted-foreground">{e.notes}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" className="text-destructive" onClick={() => setExpenses((p) => p.filter((x) => x.id !== e.id))}><Trash2 className="w-4 h-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpensesPage;
