import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Fingerprint, CheckCircle2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { playSuccessSound, playRejectionAlarm } from "@/utils/alarmSound";

interface FingerprintRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerName: string;
  onComplete: (credentials: { credentialId: string; publicKey: string }[]) => void;
}

const REQUIRED_SCANS = 3;

const isWebAuthnSupported = () =>
  typeof window !== "undefined" &&
  window.PublicKeyCredential !== undefined &&
  typeof window.PublicKeyCredential === "function";

const bufferToBase64 = (buffer: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)));

const FingerprintRegistrationDialog = ({
  open,
  onOpenChange,
  workerName,
  onComplete,
}: FingerprintRegistrationDialogProps) => {
  const [scans, setScans] = useState<{ credentialId: string; publicKey: string }[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completedScans = scans.length;
  const progress = (completedScans / REQUIRED_SCANS) * 100;

  const resetState = () => {
    setScans([]);
    setScanning(false);
    setError(null);
  };

  const handleClose = (val: boolean) => {
    if (!val) resetState();
    onOpenChange(val);
  };

  const doScan = async () => {
    if (!isWebAuthnSupported()) {
      playRejectionAlarm();
      setError("Biometric authentication is not supported on this device/browser");
      return;
    }

    setScanning(true);
    setError(null);

    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "ScrapFlow Attendance", id: window.location.hostname },
          user: { id: userId, name: `${workerName}-scan-${completedScans + 1}`, displayName: workerName },
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
        playRejectionAlarm();
        setError("Scan cancelled");
        setScanning(false);
        return;
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      const newScan = {
        credentialId: bufferToBase64(credential.rawId),
        publicKey: bufferToBase64(response.getPublicKey?.() || new ArrayBuffer(0)),
      };

      const updatedScans = [...scans, newScan];
      setScans(updatedScans);
      playSuccessSound();

      if (updatedScans.length >= REQUIRED_SCANS) {
        toast.success(`✅ All ${REQUIRED_SCANS} fingerprints registered for ${workerName}!`);
        onComplete(updatedScans);
        resetState();
        onOpenChange(false);
      } else {
        toast.success(`Scan ${updatedScans.length}/${REQUIRED_SCANS} captured!`);
      }
    } catch (err: any) {
      playRejectionAlarm();
      if (err.name === "NotAllowedError") {
        setError("Biometric scan was cancelled or denied");
      } else {
        setError(`Scan failed: ${err.message}`);
      }
    } finally {
      setScanning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-primary" />
            Register Fingerprint
          </DialogTitle>
          <DialogDescription>
            Registering fingerprint for <strong>{workerName}</strong>. Please scan {REQUIRED_SCANS} times to confirm identity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{completedScans} / {REQUIRED_SCANS} scans</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Scan indicators */}
          <div className="flex justify-center gap-4">
            {Array.from({ length: REQUIRED_SCANS }).map((_, i) => (
              <div
                key={i}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                  i < completedScans
                    ? "border-primary bg-primary/10"
                    : i === completedScans
                    ? "border-primary/50 bg-primary/5 animate-pulse"
                    : "border-muted bg-muted/30"
                }`}
              >
                {i < completedScans ? (
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                ) : (
                  <Fingerprint className={`w-8 h-8 ${i === completedScans ? "text-primary/70" : "text-muted-foreground/40"}`} />
                )}
                <span className="text-xs font-medium text-muted-foreground">Scan {i + 1}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <XCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Action */}
          <Button
            onClick={doScan}
            disabled={scanning}
            className="w-full h-14 text-base gap-2"
            size="lg"
          >
            <Fingerprint className="w-5 h-5" />
            {scanning
              ? "Place your finger on the sensor..."
              : completedScans === 0
              ? "Start First Scan"
              : `Scan Again (${completedScans + 1}/${REQUIRED_SCANS})`}
          </Button>

          {completedScans > 0 && completedScans < REQUIRED_SCANS && (
            <p className="text-xs text-center text-muted-foreground">
              Place the same finger slightly differently each time for better accuracy
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FingerprintRegistrationDialog;
