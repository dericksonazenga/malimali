import { useState } from "react";
import { mockWorkers } from "@/data/mockData";
import { Worker } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Fingerprint, Trash2 } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";

interface StoredCredential {
  workerName: string;
  credentialId: string;
  publicKey: string;
}

const isWebAuthnSupported = () =>
  typeof window !== "undefined" &&
  window.PublicKeyCredential !== undefined &&
  typeof window.PublicKeyCredential === "function";

const bufferToBase64 = (buffer: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)));

const WorkersPage = () => {
  const { symbol } = useCurrency();
  const [workers, setWorkers] = useState<Worker[]>(mockWorkers);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [salary, setSalary] = useState("");
  const [registering, setRegistering] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<StoredCredential[]>(() => {
    const stored = localStorage.getItem("biometric_credentials");
    return stored ? JSON.parse(stored) : [];
  });

  const totalBalance = workers.reduce((s, w) => s + w.balance, 0);

  const saveCredentials = (creds: StoredCredential[]) => {
    setCredentials(creds);
    localStorage.setItem("biometric_credentials", JSON.stringify(creds));
  };

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

  const registerFingerprint = async (workerName: string) => {
    if (!isWebAuthnSupported()) {
      toast.error("Biometric authentication is not supported on this device/browser");
      return;
    }
    if (credentials.find((c) => c.workerName === workerName)) {
      toast.error(`${workerName} already has a registered fingerprint`);
      return;
    }

    setRegistering(workerName);
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "ScrapFlow Attendance", id: window.location.hostname },
          user: {
            id: userId,
            name: workerName,
            displayName: workerName,
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60000,
          attestation: "none",
        },
      })) as PublicKeyCredential;

      if (!credential) {
        toast.error("Registration cancelled");
        return;
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      const newCred: StoredCredential = {
        workerName,
        credentialId: bufferToBase64(credential.rawId),
        publicKey: bufferToBase64(response.getPublicKey?.() || new ArrayBuffer(0)),
      };

      saveCredentials([...credentials, newCred]);
      toast.success(`✅ Fingerprint registered for ${workerName}!`);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        toast.error("Biometric registration was cancelled or denied");
      } else {
        toast.error(`Registration failed: ${err.message}`);
      }
    } finally {
      setRegistering(null);
    }
  };

  const removeFingerprint = (workerName: string) => {
    saveCredentials(credentials.filter((c) => c.workerName !== workerName));
    toast.success(`Removed fingerprint for ${workerName}`);
  };

  const hasFingerprint = (workerName: string) => credentials.some((c) => c.workerName === workerName);

  return (
    <div className="space-y-6 max-w-5xl">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Add Worker</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Worker name" className="h-12" /></div>
            <div className="space-y-2"><Label>Role</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Loader, Driver..." className="h-12" /></div>
            <div className="space-y-2"><Label>Salary ({symbol}) *</Label><Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="0" className="h-12" /></div>
            <div className="md:col-span-3"><Button type="submit" className="h-12 px-8">Add Worker</Button></div>
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
                        disabled={registering === w.name}
                        onClick={() => registerFingerprint(w.name)}
                      >
                        <Fingerprint className="w-3 h-3" />
                        {registering === w.name ? "Scanning..." : "Register"}
                      </Button>
                    )}
                  </TableCell>
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
