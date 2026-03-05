import { useState, useEffect } from "react";
import { mockExpenses, mockWorkers } from "@/data/mockData";
import { Expense, Worker } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, Fingerprint, UtensilsCrossed, Search } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";
import { playRejectionAlarm, playSuccessSound } from "@/utils/alarmSound";

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
  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Lunch flow state
  const [isLunch, setIsLunch] = useState(false);
  const [showWorkerPicker, setShowWorkerPicker] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [credentials, setCredentials] = useState<StoredCredential[]>([]);
  const [workerSearch, setWorkerSearch] = useState("");

  // Load biometric credentials
  useEffect(() => {
    const stored = localStorage.getItem("biometric_credentials");
    if (stored) setCredentials(JSON.parse(stored));
  }, []);

  // Detect "lunch" category
  useEffect(() => {
    const val = category.trim().toLowerCase();
    const lunchDetected = val === "lunch" || val === "lunc" || val === "lun";
    setIsLunch(val === "lunch");
    if (val === "lunch" && !showWorkerPicker && !selectedWorker) {
      setShowWorkerPicker(true);
    }
  }, [category]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const handleWorkerSelect = (worker: Worker) => {
    setSelectedWorker(worker);
    setShowWorkerPicker(false);
    setNotes(`Lunch for ${worker.name} (${worker.role})`);
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

    if (isLunch) {
      if (!selectedWorker) {
        setShowWorkerPicker(true);
        toast.error("Select a worker for the lunch expense");
        return;
      }
      const verified = await verifyFingerprint();
      if (!verified) return;
    }

    setExpenses((prev) => [{
      id: Date.now().toString(),
      category,
      amount: parseFloat(amount),
      date,
      notes: isLunch && selectedWorker ? `Lunch for ${selectedWorker.name} (${selectedWorker.role})` : notes,
    }, ...prev]);
    setCategory(""); setAmount(""); setNotes("");
    setSelectedWorker(null);
    setIsLunch(false);
    toast.success(isLunch ? `Lunch expense verified & added for ${selectedWorker?.name}!` : "Expense added!");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Add Expense</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Transport, Lunch, Labour..." className="h-12" />
              {isLunch && (
                <p className="text-xs text-primary flex items-center gap-1">
                  <UtensilsCrossed className="w-3 h-3" /> Lunch mode — fingerprint required
                </p>
              )}
            </div>
            <div className="space-y-2"><Label>Amount ({symbol}) *</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="h-12" /></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12" /></div>
            <div className="space-y-2">
              <Label>Notes</Label>
              {isLunch && selectedWorker ? (
                <div className="h-12 flex items-center gap-2 rounded-md border border-input bg-muted px-3">
                  <Fingerprint className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{selectedWorker.name}</span>
                  <span className="text-xs text-muted-foreground">({selectedWorker.role})</span>
                  <Button type="button" variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => { setSelectedWorker(null); setShowWorkerPicker(true); }}>Change</Button>
                </div>
              ) : (
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" className="h-12" />
              )}
            </div>
            <div className="lg:col-span-4 flex gap-3">
              <Button type="submit" className="h-12 px-8" disabled={verifying}>
                {isLunch ? (
                  <><Fingerprint className="w-4 h-4 mr-2" />{verifying ? "Verifying..." : "Verify & Add Lunch"}</>
                ) : (
                  "Add Expense"
                )}
              </Button>
              {isLunch && !selectedWorker && (
                <Button type="button" variant="outline" className="h-12" onClick={() => setShowWorkerPicker(true)}>
                  Select Worker
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Worker Picker Dialog for Lunch */}
      <Dialog open={showWorkerPicker} onOpenChange={setShowWorkerPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-primary" /> Select Lunch Recipient
            </DialogTitle>
            <DialogDescription>Choose the worker receiving lunch. Fingerprint verification required.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {mockWorkers.map((w) => {
              const hasFp = credentials.some(c => c.workerName === w.name);
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => handleWorkerSelect(w)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left"
                >
                  <div>
                    <p className="font-medium text-sm">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{w.role}</p>
                  </div>
                  {hasFp ? (
                    <Fingerprint className="w-4 h-4 text-primary" />
                  ) : (
                    <span className="text-xs text-destructive">No fingerprint</span>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader><CardTitle className="flex justify-between"><span>Expenses</span><span className="text-destructive font-mono">Total: {symbol}{total.toLocaleString()}</span></CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Date</TableHead><TableHead>Notes</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.category}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-destructive">{symbol}{e.amount.toLocaleString()}</TableCell>
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
