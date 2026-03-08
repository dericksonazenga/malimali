import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  scanning: boolean;
  onToggle: () => void;
}

const QRScanner = ({ onScan, scanning, onToggle }: QRScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!scanning) {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
      return;
    }

    const startScanner = async () => {
      try {
        setError("");
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScan(decodedText);
            scanner.stop().catch(() => {});
          },
          () => {}
        );
      } catch (err: any) {
        setError("Camera access denied or unavailable");
        onToggle();
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [scanning]);

  return (
    <div className="space-y-3">
      <Button
        variant={scanning ? "destructive" : "outline"}
        onClick={onToggle}
        className="gap-2"
      >
        {scanning ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
        {scanning ? "Stop Scanner" : "Scan QR to Sign In"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div
        id="qr-reader"
        className={scanning ? "rounded-lg overflow-hidden border border-border" : "hidden"}
        style={{ width: "100%", maxWidth: 350 }}
      />
    </div>
  );
};

export default QRScanner;
