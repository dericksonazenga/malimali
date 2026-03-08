import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Fingerprint, Trash2 } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";
import { playSuccessSound, playRejectionAlarm } from "@/utils/alarmSound";
import FingerprintRegistrationDialog from "@/components/FingerprintRegistrationDialog";

interface WorkerRow {
  id: string;
  name: string;
  role: string;
  salary: number;
  paid: number;
  balance: number;
}

interface StoredCredential {
  workerName: string;
  credentialId: string;
  publicKey: string;
}

const WorkersPage = () => {
  const { symbol } = useCurrency();
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [salary, setSalary] = useState("");
  const [fpDialogOpen, setFpDialogOpen] = useState(false);
  const [fpDialogWorker, setFpDialogWorker] = useState("");
  const [pendingCreds, setPendingCreds] = useState<{ credentialId: string; publicKey: string }[]>([]);
  const [credentials, setCredentials] = useState<StoredCredential[]>(() => {
    const stored = localStorage.getItem("biometric_credentials");
    return stored ? JSON.parse(stored) : [];
  });

  const fetchWorkers = useCallback(async () => {
    const { data } = await supabase.from("workers").select("*").order("created_at", { ascending: true });
    if (data) {
      setWorkers(data.map((r: any) => ({
        id: r.id,
        name: r.name,
        role: r.role,
        salary: Number(r.salary),
        paid: Number(r.paid),
        balance: Number(r.balance),
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorkers();
    const channel = supabase
      .channel("workers-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "workers" }, () => fetchWorkers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchWorkers]);

  const totalBalance = workers.reduce((s, w) => s + w.balance, 0);

  const saveCredentials = (creds: StoredCredential[]) => {
    setCredentials(creds);
    localStorage.setItem("biometric_credentials", JSON.stringify(creds));
  };

  const handleFpComplete = (workerName: string, creds: { credentialId: string; publicKey: string }[]) => {
    setPendingCreds(creds);
    toast.success(`Fingerprints captured for ${workerName}! Now click Add Worker.`);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !salary) { toast.error("Fill required fields"); return; }

    const workerName = name;
    const salaryNum = parseFloat(salary);

    const { error } = await supabase.from("workers").insert({
      name: workerName,
      role,
      salary: salaryNum,
      paid: 0,
      balance: salaryNum,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });

    if (error) {
      toast.error("Failed to add worker");
      return;
    }

    // Save fingerprint credentials if captured
    if (pendingCreds.length > 0) {
      const newCreds: StoredCredential[] = pendingCreds.map((c) => ({ workerName, ...c }));
      saveCredentials([...credentials.filter((c) => c.workerName !== workerName), ...newCreds]);
      setPendingCreds([]);
    }

    setName(""); setRole(""); setSalary("");
    toast.success("Worker added!");
  };

  const recordPayment = async (worker: WorkerRow) => {
    const amt = prompt("Enter payment amount:");
    if (!amt) return;
    const payment = parseFloat(amt);
    if (isNaN(payment) || payment <= 0) return;

    const newPaid = worker.paid + payment;
    const newBalance = Math.max(0, worker.salary - newPaid);

    const { error } = await supabase.from("workers").update({ paid: newPaid, balance: newBalance }).eq("id", worker.id);
    if (error) { toast.error("Failed to record payment"); return; }
    toast.success("Payment recorded!");
  };

  const deleteWorker = async (id: string) => {
    const { error } = await supabase.from("workers").delete().eq("id", id);
    if (error) { toast.error("Failed to delete worker"); return; }
    toast.success("Worker removed");
  };

  const openFpDialog = (workerName: string) => {
    setFpDialogWorker(workerName);
    setFpDialogOpen(true);
  };

  const removeFingerprint = (workerName: string) => {
    saveCredentials(credentials.filter((c) => c.workerName !== workerName));
    toast.success(`Removed fingerprint for ${workerName}`);
  };

  const hasFingerprint = (workerName: string) => credentials.some((c) => c.workerName === workerName);

  if (loading) return <p className="text-muted-foreground p-4">Loading workers…</p>;

  return (
    <div className="space-y-6 max-w-5xl">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Add Worker</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Worker name" className="h-12" /></div>
            <div className="space-y-2"><Label>Role</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Loader, Driver..." className="h-12" /></div>
            <div className="space-y-2"><Label>Salary ({symbol}) *</Label><Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="0" className="h-12" /></div>
            <div className="md:col-span-3 flex items-center gap-4 flex-wrap">
              <Button
                type="button"
                variant={pendingCreds.length > 0 ? "default" : "outline"}
                className="h-12 gap-2"
                disabled={!name}
                onClick={() => {
                  setFpDialogWorker(name);
                  setFpDialogOpen(true);
                }}
              >
                <Fingerprint className="w-4 h-4" />
                {pendingCreds.length > 0 ? `Fingerprint: ${pendingCreds.length} scans ✓` : "Register Fingerprint"}
              </Button>
              {pendingCreds.length > 0 && (
                <p className="text-xs text-primary">Fingerprints captured — click Add Worker to save</p>
              )}
              <div className="flex-1" />
              <Button type="submit" className="h-12 px-8">Add Worker</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex justify-between"><span className="flex items-center gap-2"><Users className="w-5 h-5" /> Workers</span><span className="text-warning font-mono">Pending: {symbol}{totalBalance.toLocaleString()}</span></CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Salary</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Fingerprint</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell className="text-muted-foreground">{w.role}</TableCell>
                  <TableCell className="text-right font-mono">{symbol}{w.salary.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-success">{symbol}{w.paid.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{w.balance > 0 ? <span className="text-warning">{symbol}{w.balance.toLocaleString()}</span> : <span className="text-success">Paid</span>}</TableCell>
                  <TableCell>
                    {hasFingerprint(w.name) ? (
                      <div className="flex items-center gap-1">
                        <Badge variant="default" className="gap-1">
                          <Fingerprint className="w-3 h-3" /> Registered
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFingerprint(w.name)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => openFpDialog(w.name)}
                      >
                        <Fingerprint className="w-3 h-3" />
                        Register
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => recordPayment(w)}>Pay</Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteWorker(w.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {workers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No workers yet. Add one above.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FingerprintRegistrationDialog
        open={fpDialogOpen}
        onOpenChange={setFpDialogOpen}
        workerName={fpDialogWorker}
        onComplete={(creds) => handleFpComplete(fpDialogWorker, creds)}
      />
    </div>
  );
};

export default WorkersPage;
