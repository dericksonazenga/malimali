import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Fingerprint, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
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
  const [scans, setScans] = useState<({ credentialId: string; publicKey: string } | null)[]>(
    Array(REQUIRED_SCANS).fill(null)
  );
  const [scanningIndex, setScanningIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const completedScans = scans.filter(Boolean).length;
  const progress = (completedScans / REQUIRED_SCANS) * 100;
  const allDone = completedScans === REQUIRED_SCANS;

  const resetState = () => {
    setScans(Array(REQUIRED_SCANS).fill(null));
    setScanningIndex(null);
    setError(null);
  };

  const handleClose = (val: boolean) => {
    if (!val) resetState();
    onOpenChange(val);
  };

  const doScan = async (index: number) => {
    if (!isWebAuthnSupported()) {
      playRejectionAlarm();
      setError("Biometric authentication is not supported on this device/browser");
      return;
    }

    setScanningIndex(index);
    setError(null);

    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "ScrapFlow Attendance", id: window.location.hostname },
          user: { id: userId, name: `${workerName}-scan-${index + 1}`, displayName: workerName },
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
        setError("Scan cancelled — tap the slot to try again");
        setScanningIndex(null);
        return;
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      const newScan = {
        credentialId: bufferToBase64(credential.rawId),
        publicKey: bufferToBase64(response.getPublicKey?.() || new ArrayBuffer(0)),
      };

      const updated = [...scans];
      updated[index] = newScan;
      setScans(updated);
      playSuccessSound();

      const newCompleted = updated.filter(Boolean).length;
      if (newCompleted >= REQUIRED_SCANS) {
        toast.success(`✅ All ${REQUIRED_SCANS} fingerprints registered for ${workerName}!`);
        onComplete(updated.filter(Boolean) as { credentialId: string; publicKey: string }[]);
        resetState();
        onOpenChange(false);
      } else {
        toast.success(`Scan ${index + 1} captured! ${REQUIRED_SCANS - newCompleted} remaining.`);
      }
    } catch (err: any) {
      playRejectionAlarm();
      if (err.name === "NotAllowedError") {
        setError("Scan denied — tap the slot to retry");
      } else {
        setError(`Scan failed: ${err.message} — tap to retry`);
      }
    } finally {
      setScanningIndex(null);
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
            Tap each scan slot below to activate your device scanner for <strong>{workerName}</strong>. You can retry any slot until it's accepted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{completedScans} / {REQUIRED_SCANS} scans</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Clickable scan slots */}
          <div className="flex justify-center gap-4">
            {scans.map((scan, i) => {
              const isScanning = scanningIndex === i;
              const isDone = scan !== null;

              return (
                <button
                  key={i}
                  type="button"
                  disabled={isScanning || allDone}
                  onClick={() => doScan(i)}
                  className={`relative flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all cursor-pointer
                    ${isDone
                      ? "border-primary bg-primary/10 hover:bg-primary/15"
                      : isScanning
                      ? "border-primary/70 bg-primary/5 animate-pulse"
                      : "border-muted bg-muted/30 hover:border-primary/40 hover:bg-primary/5"
                    }
                    disabled:cursor-not-allowed
                  `}
                >
                  {isDone ? (
                    <>
                      <CheckCircle2 className="w-9 h-9 text-primary" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-muted hover:bg-destructive/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = [...scans];
                          updated[i] = null;
                          setScans(updated);
                          toast.info(`Scan ${i + 1} cleared — tap to rescan`);
                        }}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <Fingerprint className={`w-9 h-9 ${isScanning ? "text-primary animate-bounce" : "text-muted-foreground/50"}`} />
                  )}
                  <span className="text-xs font-semibold text-muted-foreground">
                    {isScanning ? "Scanning…" : isDone ? "Done ✓" : `Scan ${i + 1}`}
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <XCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground">
            {allDone
              ? "All scans complete!"
              : "Tap any slot to activate your device fingerprint scanner. Retry anytime."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FingerprintRegistrationDialog;
