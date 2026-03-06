import { useState, useEffect } from "react";
import { mockWorkers } from "@/data/mockData";
import { Expense, Worker } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, Fingerprint, Search } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";
import { playRejectionAlarm, playSuccessSound } from "@/utils/alarmSound";
import { supabase } from "@/integrations/supabase/client";

const isWebAuthnSupported = () =>
  typeof window !== "undefined" &&
  window.PublicKeyCredential !== undefined &&
  typeof window.PublicKeyCredential === "function";

const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

const bufferToBase64 = (buffer: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)));

interface StoredCredential {
  workerName: string;
  credentialId: string;
  publicKey: string;
}

const ExpensesPage = () => {
  const { symbol } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  // Worker picker for fingerprint verification
  const [showWorkerPicker, setShowWorkerPicker] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [credentials, setCredentials] = useState<StoredCredential[]>([]);
  const [workerSearch, setWorkerSearch] = useState("");

  // Load expenses from DB
  useEffect(() => {
    const fetchExpenses = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
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
    };
    fetchExpenses();
  }, []);

  // Load biometric credentials
  useEffect(() => {
    const stored = localStorage.getItem("biometric_credentials");
    if (stored) setCredentials(JSON.parse(stored));
  }, []);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const handleWorkerSelect = (worker: Worker) => {
    setSelectedWorker(worker);
    setShowWorkerPicker(false);
    if (category.toLowerCase() === "lunch") {
      setNotes(`Lunch for ${worker.name} (${worker.role})`);
    }
  };

  const verifyFingerprint = async (): Promise<boolean> => {
    if (!selectedWorker) return false;
    if (!isWebAuthnSupported()) {
      toast.error("Biometric not supported on this device");
      return false;
    }

    const workerCreds = credentials.filter(c => c.workerName === selectedWorker.name);
    if (workerCreds.length === 0) {
      playRejectionAlarm();
      toast.error(`No fingerprint registered for ${selectedWorker.name}. Register in Workers page first.`);
      return false;
    }

    setVerifying(true);
    try {
      const allowCredentials = workerCreds.map(c => ({
        id: base64ToBuffer(c.credentialId),
        type: "public-key" as const,
      }));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: window.location.hostname,
          allowCredentials,
          userVerification: "required",
          timeout: 60000,
        },
      }) as PublicKeyCredential | null;

      if (!assertion) {
        playRejectionAlarm();
        toast.error("Fingerprint verification cancelled");
        return false;
      }

      const matchedId = bufferToBase64(assertion.rawId);
      const matched = workerCreds.some(c => c.credentialId === matchedId);

      if (matched) {
        playSuccessSound();
        return true;
      } else {
        playRejectionAlarm();
        toast.error("Fingerprint does not match! Expense rejected.");
        return false;
      }
    } catch (err: any) {
      playRejectionAlarm();
      if (err.name === "NotAllowedError") {
        toast.error("Fingerprint scan denied or cancelled");
      } else {
        toast.error(`Verification failed: ${err.message}`);
      }
      return false;
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount) { toast.error("Fill required fields"); return; }

    // All expenses require a responsible person + fingerprint
    if (!selectedWorker) {
      setShowWorkerPicker(true);
      toast.error("Select the responsible person and verify fingerprint");
      return;
    }

    const verified = await verifyFingerprint();
    if (!verified) return;

    const isLunch = category.toLowerCase() === "lunch";
    const expenseNotes = isLunch ? `Lunch for ${selectedWorker.name} (${selectedWorker.role})` : (notes || `Verified by ${selectedWorker.name}`);

    // Save to database
    const { data, error } = await supabase.from("expenses").insert({
      category,
      amount: parseFloat(amount),
      date,
      notes: expenseNotes,
      verified_by: selectedWorker.name,
    }).select().single();

    if (error) {
      toast.error("Failed to save expense");
      return;
    }

    setExpenses(prev => [{
      id: data.id,
      category,
      amount: parseFloat(amount),
      date,
      notes: expenseNotes,
    }, ...prev]);

    setCategory(""); setAmount(""); setNotes("");
    setSelectedWorker(null);
    toast.success(`Expense verified & saved — ${selectedWorker.name}`);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses(p => p.filter(x => x.id !== id));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Add Expense</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Transport, Lunch, Fuel..." className="h-12" />
            </div>
            <div className="space-y-2"><Label>Amount ({symbol}) *</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="h-12" /></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12" /></div>
            <div className="space-y-2">
              <Label>Verified By *</Label>
              {selectedWorker ? (
                <div className="h-12 flex items-center gap-2 rounded-md border border-input bg-muted px-3">
                  <Fingerprint className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{selectedWorker.name}</span>
                  <span className="text-xs text-muted-foreground">({selectedWorker.role})</span>
                  <Button type="button" variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => { setSelectedWorker(null); setShowWorkerPicker(true); }}>Change</Button>
                </div>
              ) : (
                <Button type="button" variant="outline" className="h-12 w-full" onClick={() => setShowWorkerPicker(true)}>
                  <Fingerprint className="w-4 h-4 mr-2" /> Select Person
                </Button>
              )}
            </div>
            {category.toLowerCase() !== "lunch" && (
              <div className="space-y-2 lg:col-span-2">
                <Label>Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" className="h-12" />
              </div>
            )}
            <div className="lg:col-span-4">
              <Button type="submit" className="h-12 px-8" disabled={verifying}>
                <Fingerprint className="w-4 h-4 mr-2" />{verifying ? "Verifying..." : "Verify & Add Expense"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Worker Picker Dialog */}
      <Dialog open={showWorkerPicker} onOpenChange={setShowWorkerPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-primary" /> Select Responsible Person
            </DialogTitle>
            <DialogDescription>Choose who is responsible. Fingerprint verification required.</DialogDescription>
          </DialogHeader>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={workerSearch} onChange={(e) => setWorkerSearch(e.target.value)} placeholder="Search worker..." className="pl-9 h-10" autoFocus />
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {mockWorkers
              .filter((w) => w.name.toLowerCase().includes(workerSearch.toLowerCase()) || w.role.toLowerCase().includes(workerSearch.toLowerCase()))
              .map((w) => {
              const hasFp = credentials.some(c => c.workerName === w.name);
              return (
                <button key={w.id} type="button" onClick={() => { handleWorkerSelect(w); setWorkerSearch(""); }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left">
                  <div>
                    <p className="font-medium text-sm">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{w.role}</p>
                  </div>
                  {hasFp ? <Fingerprint className="w-4 h-4 text-primary" /> : <span className="text-xs text-destructive">No fingerprint</span>}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader><CardTitle className="flex justify-between"><span>Today's Expenses</span><span className="text-destructive font-mono">Total: {symbol}{total.toLocaleString()}</span></CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <p className="text-muted-foreground text-center py-4">Loading...</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Verified By</TableHead><TableHead>Notes</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.category}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-destructive">{symbol}{e.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{e.notes}</TableCell>
                    <TableCell className="text-muted-foreground">{e.date}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(e.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
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
