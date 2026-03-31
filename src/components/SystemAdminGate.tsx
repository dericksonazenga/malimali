import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const SESSION_KEY = "sysadmin_verified";

const SystemAdminGate = ({ children }: { children: React.ReactNode }) => {
  const { isSystemAdmin } = useAuth();
  const navigate = useNavigate();
  const [verified, setVerified] = useState(false);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored === "true") setVerified(true);
  }, []);

  if (!isSystemAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground gap-3">
        <Lock className="w-12 h-12" />
        <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
        <p className="text-sm">You are not a system administrator.</p>
      </div>
    );
  }

  if (verified) return <>{children}</>;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("verify-sysadmin-pin", {
        body: { pin },
      });

      if (fnError) {
        setError("Verification failed. Try again.");
      } else if (data?.valid) {
        sessionStorage.setItem(SESSION_KEY, "true");
        setVerified(true);
        toast.success("System Admin access granted");
      } else {
        setError("Invalid PIN. Access denied.");
      }
    } catch {
      setError("Network error. Please try again.");
    }

    setSubmitting(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-scale-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 mb-4">
            <ShieldCheck className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">System Admin</h1>
          <p className="text-muted-foreground text-sm mt-1">Enter your security PIN to continue</p>
        </div>

        <form onSubmit={handleVerify} className="bg-card rounded-xl p-6 shadow-2xl space-y-5 border border-border">
          <div className="space-y-2">
            <Label htmlFor="sysadmin-pin">Security PIN</Label>
            <Input
              id="sysadmin-pin"
              type="password"
              placeholder="Enter system admin PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="h-12 text-center text-lg tracking-widest"
              autoFocus
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>
          )}

          <Button type="submit" className="w-full h-12 text-base font-semibold gap-2" disabled={submitting}>
            <Lock className="w-4 h-4" />
            {submitting ? "Verifying..." : "Unlock"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full gap-2 text-muted-foreground"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SystemAdminGate;
