import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, LogIn, LogOut, Clock, CalendarDays, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useEndOfDay } from "@/contexts/EndOfDayContext";
import { playRejectionAlarm, playSuccessSound } from "@/utils/alarmSound";

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
  const { resetSignal } = useEndOfDay();
  const [credentials, setCredentials] = useState<StoredCredential[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authMode, setAuthMode] = useState<"sign_in" | "sign_out">("sign_in");

  // Load credentials from localStorage (registered on Workers page)
  useEffect(() => {
    const stored = localStorage.getItem("biometric_credentials");
    if (stored) setCredentials(JSON.parse(stored));
    const storedRecords = localStorage.getItem("attendance_records");
    if (storedRecords) setRecords(JSON.parse(storedRecords));
  }, []);

  // Listen for credential changes from Workers page
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "biometric_credentials" && e.newValue) {
        setCredentials(JSON.parse(e.newValue));
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // End of Day: clear displayed records (keep in localStorage as "archived")
  useEffect(() => {
    if (resetSignal === 0) return;
    // Archive current records
    const existing = localStorage.getItem("attendance_archive");
    const archive: AttendanceRecord[] = existing ? JSON.parse(existing) : [];
    const merged = [...archive, ...records];
    localStorage.setItem("attendance_archive", JSON.stringify(merged));
    // Clear displayed
    setRecords([]);
    localStorage.setItem("attendance_records", JSON.stringify([]));
  }, [resetSignal]);

  const saveRecords = (recs: AttendanceRecord[]) => {
    setRecords(recs);
    localStorage.setItem("attendance_records", JSON.stringify(recs));
  };

  // Authenticate a worker using their fingerprint
  const authenticateWorker = async (mode: "sign_in" | "sign_out") => {
    if (!isWebAuthnSupported()) {
      playRejectionAlarm();
      toast.error("Biometric authentication is not supported on this device/browser");
      return;
    }
    if (credentials.length === 0) {
      playRejectionAlarm();
      toast.error("No workers have registered fingerprints. Register fingerprints from the Workers page first.");
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
        playRejectionAlarm();
        toast.error("Authentication cancelled");
        return;
      }

      const matchedId = bufferToBase64(assertion.rawId);
      const worker = credentials.find((c) => c.credentialId === matchedId);

      if (!worker) {
        playRejectionAlarm();
        toast.error("⛔ Fingerprint NOT recognized! This person is not registered as a worker.", { duration: 5000 });
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();

      if (mode === "sign_in") {
        // Check for duplicate attendance
        const existing = records.find(
          (r) => r.workerName === worker.workerName && r.date === today && r.signInAt
        );
        if (existing) {
          playRejectionAlarm();
          toast.error(`⛔ ${worker.workerName} has already signed in today! Duplicate attendance not allowed.`, { duration: 5000 });
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
        playSuccessSound();
        toast.success(`✅ ${worker.workerName} signed in at ${new Date().toLocaleTimeString()}`);
      } else {
        const todayRecord = records.find(
          (r) => r.workerName === worker.workerName && r.date === today && r.signInAt && !r.signOutAt
        );
        if (!todayRecord) {
          playRejectionAlarm();
          toast.error(`⛔ ${worker.workerName} hasn't signed in today or already signed out`, { duration: 5000 });
          return;
        }

        const updated = records.map((r) =>
          r.id === todayRecord.id ? { ...r, signOutAt: now } : r
        );
        saveRecords(updated);
        playSuccessSound();
        toast.success(`✅ ${worker.workerName} signed out at ${new Date().toLocaleTimeString()}`);
      }
    } catch (err: any) {
      playRejectionAlarm();
      if (err.name === "NotAllowedError") {
        toast.error("⛔ Authentication was cancelled or denied");
      } else {
        toast.error(`⛔ Authentication failed: ${err.message}`);
      }
    } finally {
      setIsAuthenticating(false);
    }
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

        <Card className="border-2 border-destructive/20">
          <CardContent className="pt-6">
            <Button
              onClick={() => authenticateWorker("sign_out")}
              disabled={isAuthenticating || credentials.length === 0}
              className="w-full h-20 text-lg font-bold gap-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              <Fingerprint className="w-8 h-8" />
              {isAuthenticating && authMode === "sign_out" ? "Scanning..." : "Sign Out with Fingerprint"}
              <LogOut className="w-6 h-6" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info about registration */}
      {credentials.length === 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
            <p className="text-sm text-muted-foreground">
              No fingerprints registered. Go to the <strong>Workers</strong> page to register fingerprints for each worker during recruitment.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Registered Workers Summary */}
      {credentials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Fingerprint className="w-5 h-5" /> Registered Workers ({credentials.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {credentials.map((c) => (
                <Badge key={c.credentialId} variant="secondary" className="px-3 py-1.5 text-sm">
                  {c.workerName}
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
