import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockWorkers } from "@/data/mockData";
import { Worker } from "@/types";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Banknote, Plus } from "lucide-react";
import { toast } from "sonner";

const SalaryPage = () => {
  const { symbol } = useCurrency();
  const [workers, setWorkers] = useState<Worker[]>(mockWorkers);
  const [payAmounts, setPayAmounts] = useState<Record<string, string>>({});

  const handlePay = (id: string) => {
    const amount = parseFloat(payAmounts[id] || "0");
    if (amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, paid: w.paid + amount, balance: w.salary - (w.paid + amount) } : w
      )
    );
    setPayAmounts((prev) => ({ ...prev, [id]: "" }));
    toast.success("Payment recorded");
  };

  const totalSalary = workers.reduce((s, w) => s + w.salary, 0);
  const totalPaid = workers.reduce((s, w) => s + w.paid, 0);
  const totalBalance = workers.reduce((s, w) => s + w.balance, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Total Salary</p>
            <p className="text-2xl font-bold font-mono text-primary">{symbol}{totalSalary.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="text-2xl font-bold font-mono text-success">{symbol}{totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Total Balance</p>
            <p className="text-2xl font-bold font-mono text-destructive">{symbol}{totalBalance.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-primary" /> Salary & Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell>{w.role}</TableCell>
                  <TableCell className="font-mono">{symbol}{w.salary.toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-success">{symbol}{w.paid.toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-destructive">{symbol}{w.balance.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Amount"
                        className="w-24 h-9"
                        value={payAmounts[w.id] || ""}
                        onChange={(e) => setPayAmounts((prev) => ({ ...prev, [w.id]: e.target.value }))}
                      />
                      <Button size="sm" className="h-9" onClick={() => handlePay(w.id)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalaryPage;
