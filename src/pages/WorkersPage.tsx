import { useState } from "react";
import { mockWorkers } from "@/data/mockData";
import { Worker } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus } from "lucide-react";
import { toast } from "sonner";

const WorkersPage = () => {
  const [workers, setWorkers] = useState<Worker[]>(mockWorkers);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [salary, setSalary] = useState("");

  const totalBalance = workers.reduce((s, w) => s + w.balance, 0);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !salary) { toast.error("Fill required fields"); return; }
    setWorkers((prev) => [...prev, { id: Date.now().toString(), name, role, salary: parseFloat(salary), paid: 0, balance: parseFloat(salary) }]);
    setName(""); setRole(""); setSalary("");
    toast.success("Worker added!");
  };

  const recordPayment = (id: string) => {
    const amt = prompt("Enter payment amount:");
    if (!amt) return;
    const payment = parseFloat(amt);
    if (isNaN(payment) || payment <= 0) return;
    setWorkers((prev) =>
      prev.map((w) => w.id === id ? { ...w, paid: w.paid + payment, balance: Math.max(0, w.salary - (w.paid + payment)) } : w)
    );
    toast.success("Payment recorded!");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Add Worker</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Worker name" className="h-12" /></div>
            <div className="space-y-2"><Label>Role</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Loader, Driver..." className="h-12" /></div>
            <div className="space-y-2"><Label>Salary (₹) *</Label><Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="0" className="h-12" /></div>
            <div className="md:col-span-3"><Button type="submit" className="h-12 px-8">Add Worker</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex justify-between"><span className="flex items-center gap-2"><Users className="w-5 h-5" /> Workers</span><span className="text-warning font-mono">Pending: ₹{totalBalance.toLocaleString()}</span></CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Salary</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Balance</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {workers.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell className="text-muted-foreground">{w.role}</TableCell>
                  <TableCell className="text-right font-mono">₹{w.salary.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-success">₹{w.paid.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{w.balance > 0 ? <span className="text-warning">₹{w.balance.toLocaleString()}</span> : <span className="text-success">Paid</span>}</TableCell>
                  <TableCell><Button variant="outline" size="sm" onClick={() => recordPayment(w.id)}>Pay</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkersPage;
