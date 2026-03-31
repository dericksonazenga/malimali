import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { KeyRound, Mail, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Step = "idle" | "otp_sent" | "verified";

const ChangePasswordCard = () => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("idle");
  const [otp, setOtp] = useState("");
  const [storedOtp, setStoredOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-password-otp", {
        body: { action: "send" },
      });

      if (error) {
        toast.error("Failed to send OTP. Please try again.");
        setLoading(false);
        return;
      }

      if (data?.success) {
        setMaskedEmail(data.maskedEmail || "your email");
        // Store OTP temporarily for client-side display (edge function returns it for now)
        if (data._otp) setStoredOtp(data._otp);
        setStep("otp_sent");
        toast.success(`Verification code sent to ${data.maskedEmail || "your email"}`);
      } else {
        toast.error(data?.error || "Failed to send OTP");
      }
    } catch {
      toast.error("Failed to send OTP. Please try again.");
    }
    setLoading(false);
  };

  const handleVerifyAndChange = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-password-otp", {
        body: { action: "verify", otp, newPassword },
      });

      if (error) {
        toast.error("Failed to change password");
        setLoading(false);
        return;
      }

      if (data?.success) {
        toast.success("Password changed successfully! Use your new password next time you sign in.");
        setStep("idle");
        setOtp("");
        setStoredOtp("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(data?.error || "Failed to change password");
      }
    } catch {
      toast.error("Failed to change password");
    }
    setLoading(false);
  };

  const handleCancel = () => {
    setStep("idle");
    setOtp("");
    setStoredOtp("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-primary" /> Change Password
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "idle" && (
          <>
            <p className="text-sm text-muted-foreground">
              To change your password, we'll send a verification code to your registered email address.
            </p>
            <Button onClick={handleSendOtp} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Send Verification Code
            </Button>
          </>
        )}

        {step === "otp_sent" && (
          <div className="space-y-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <p className="text-sm font-medium text-primary flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Verification code sent to {maskedEmail}
              </p>
              {storedOtp && (
                <p className="text-xs text-muted-foreground mt-1">
                  Your code: <span className="font-mono font-bold text-foreground">{storedOtp}</span>
                  <span className="ml-1">(check your email in production)</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Enter 6-digit verification code</Label>
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-pw">New Password</Label>
              <Input
                id="new-pw"
                type="password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11"
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Confirm New Password</Label>
              <Input
                id="confirm-pw"
                type="password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11"
                minLength={6}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleVerifyAndChange} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Change Password
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={loading}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChangePasswordCard;
