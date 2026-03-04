import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, LogIn, LogOut, UserPlus, Trash2, Clock, CalendarDays } from "lucide-react";
import { toast } from "sonner";

// Types for WebAuthn
interface StoredCredential {
  workerName: string;
  credentialId: string;
  publicKey: string;
}

interface AttendanceRecord {
  id: string;
  workerName: string;
  signInAt: string | null;
  signOutAt: string | null;
  date: string;
  status: string;
}

const isWebAuthnSupported = () =>
  typeof window !== "undefined" &&
  window.PublicKeyCredential !== undefined &&
  typeof window.PublicKeyCredential === "function";

const bufferToBase64 = (buffer: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)));

const base64ToBuffer = (base64: string): ArrayBuffer =>
  Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer;

const AttendancePage = () => {
  const [credentials, setCredentials] = useState<StoredCredential[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authMode, setAuthMode] = useState<"sign_in" | "sign_out">("sign_in");

  // Load from localStorage (will migrate to Supabase when auth is connected)
  useEffect(() => {
    const stored = localStorage.getItem("biometric_credentials");
    if (stored) setCredentials(JSON.parse(stored));
    const storedRecords = localStorage.getItem("attendance_records");
    if (storedRecords) setRecords(JSON.parse(storedRecords));
  }, []);

  const saveCredentials = (creds: StoredCredential[]) => {
    setCredentials(creds);
    localStorage.setItem("biometric_credentials", JSON.stringify(creds));
  };

  const saveRecords = (recs: AttendanceRecord[]) => {
    setRecords(recs);
    localStorage.setItem("attendance_records", JSON.stringify(recs));
  };

  // Register a new worker's fingerprint
  const registerBiometric = async () => {
    if (!newWorkerName.trim()) {
      toast.error("Enter worker name first");
      return;
    }
    if (!isWebAuthnSupported()) {
      toast.error("Biometric authentication is not supported on this device/browser");
      return;
    }
    if (credentials.find((c) => c.workerName === newWorkerName.trim())) {
      toast.error("This worker already has a registered fingerprint");
      return;
    }

    setIsRegistering(true);
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "ScrapFlow Attendance", id: window.location.hostname },
          user: {
            id: userId,
            name: newWorkerName.trim(),
            displayName: newWorkerName.trim(),
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
        workerName: newWorkerName.trim(),
        credentialId: bufferToBase64(credential.rawId),
        publicKey: bufferToBase64(response.getPublicKey?.() || new ArrayBuffer(0)),
      };

      saveCredentials([...credentials, newCred]);
      setNewWorkerName("");
      toast.success(`Fingerprint registered for ${newCred.workerName}!`);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        toast.error("Biometric registration was cancelled or denied");
      } else {
        toast.error(`Registration failed: ${err.message}`);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // Authenticate a worker using their fingerprint
  const authenticateWorker = async (mode: "sign_in" | "sign_out") => {
    if (!isWebAuthnSupported()) {
      toast.error("Biometric authentication is not supported on this device/browser");
      return;
    }
    if (credentials.length === 0) {
      toast.error("No workers registered. Register a fingerprint first.");
      return;
    }

    setIsAuthenticating(true);
    setAuthMode(mode);
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const allowCredentials = credentials.map((c) => ({
        id: base64ToBuffer(c.credentialId),
        type: "public-key" as const,
        transports: ["internal" as const],
      }));

      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials,
          userVerification: "required",
          timeout: 60000,
        },
      })) as PublicKeyCredential;

      if (!assertion) {
        toast.error("Authentication cancelled");
        return;
      }

      const matchedId = bufferToBase64(assertion.rawId);
      const worker = credentials.find((c) => c.credentialId === matchedId);

      if (!worker) {
        toast.error("Fingerprint not recognized");
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();

      if (mode === "sign_in") {
        const existing = records.find(
          (r) => r.workerName === worker.workerName && r.date === today && r.signInAt
        );
        if (existing) {
          toast.error(`${worker.workerName} already signed in today`);
          return;
        }

        const newRecord: AttendanceRecord = {
          id: crypto.randomUUID(),
          workerName: worker.workerName,
          signInAt: now,
          signOutAt: null,
          date: today,
          status: "present",
        };
        saveRecords([...records, newRecord]);
        toast.success(`${worker.workerName} signed in at ${new Date().toLocaleTimeString()}`);
      } else {
        const todayRecord = records.find(
          (r) => r.workerName === worker.workerName && r.date === today && r.signInAt && !r.signOutAt
        );
        if (!todayRecord) {
          toast.error(`${worker.workerName} hasn't signed in today or already signed out`);
          return;
        }

        const updated = records.map((r) =>
          r.id === todayRecord.id ? { ...r, signOutAt: now } : r
        );
        saveRecords(updated);
        toast.success(`${worker.workerName} signed out at ${new Date().toLocaleTimeString()}`);
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        toast.error("Authentication was cancelled or denied");
      } else {
        toast.error(`Authentication failed: ${err.message}`);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const removeCredential = (workerName: string) => {
    saveCredentials(credentials.filter((c) => c.workerName !== workerName));
    toast.success(`Removed fingerprint for ${workerName}`);
  };

  const filteredRecords = records.filter((r) => r.date === selectedDate);

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Biometric Sign In/Out Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-6">
            <Button
              onClick={() => authenticateWorker("sign_in")}
              disabled={isAuthenticating || credentials.length === 0}
              className="w-full h-20 text-lg font-bold gap-3 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Fingerprint className="w-8 h-8" />
              {isAuthenticating && authMode === "sign_in" ? "Scanning..." : "Sign In with Fingerprint"}
              <LogIn className="w-6 h-6" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-500/20">
          <CardContent className="pt-6">
            <Button
              onClick={() => authenticateWorker("sign_out")}
              disabled={isAuthenticating || credentials.length === 0}
              className="w-full h-20 text-lg font-bold gap-3 bg-red-600 hover:bg-red-700 text-white"
            >
              <Fingerprint className="w-8 h-8" />
              {isAuthenticating && authMode === "sign_out" ? "Scanning..." : "Sign Out with Fingerprint"}
              <LogOut className="w-6 h-6" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Register New Worker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> Register Worker Fingerprint
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label>Worker Name</Label>
              <Input
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
                placeholder="Enter worker name"
                className="h-12"
                onKeyDown={(e) => e.key === "Enter" && registerBiometric()}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={registerBiometric}
                disabled={isRegistering || !newWorkerName.trim()}
                className="h-12 px-6 gap-2"
              >
                <Fingerprint className="w-5 h-5" />
                {isRegistering ? "Scanning..." : "Register"}
              </Button>
            </div>
          </div>

          {!isWebAuthnSupported() && (
            <p className="text-sm text-destructive mt-3">
              ⚠️ Biometric authentication is not supported on this device or browser. 
              Try using Chrome on a device with a fingerprint sensor.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Registered Workers */}
      {credentials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5" /> Registered Workers ({credentials.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {credentials.map((c) => (
                <Badge key={c.credentialId} variant="secondary" className="px-3 py-2 text-sm gap-2">
                  {c.workerName}
                  <button
                    onClick={() => removeCredential(c.workerName)}
                    className="hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" /> Attendance Records
            </span>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto h-9"
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {filteredRecords.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No attendance records for {new Date(selectedDate).toLocaleDateString()}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Sign In</TableHead>
                  <TableHead>Sign Out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.workerName}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {formatTime(r.signInAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {formatTime(r.signOutAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.signOutAt ? "default" : "secondary"}>
                        {r.signOutAt ? "Complete" : "Signed In"}
                      </Badge>
                    </TableCell>
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

export default AttendancePage;
