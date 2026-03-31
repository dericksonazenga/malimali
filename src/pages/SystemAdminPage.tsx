import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Building2, Plus, UserPlus, Power, PowerOff, KeyRound, Mail, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Company {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

const SystemAdminPage = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
    if (data) setCompanies(data);
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim() || !adminName.trim() || !adminEmail.trim()) {
      toast.error("Fill in company name, admin name, and admin email");
      return;
    }
    setLoading(true);
    try {
      // Create company
      const { data: company, error: companyErr } = await supabase
        .from("companies")
        .insert({ name: newCompanyName.trim() })
        .select()
        .single();
      if (companyErr || !company) throw companyErr;

      // Pre-register the first admin user
      const { error: recruitErr } = await supabase
        .from("recruited_workers")
        .insert({
          name: adminName.trim(),
          email: adminEmail.trim().toLowerCase(),
          role: "admin",
          company_id: company.id,
        });
      if (recruitErr) throw recruitErr;

      toast.success(`Company "${company.name}" created. Admin can now sign up with ${adminEmail}`);
      setNewCompanyName("");
      setAdminName("");
      setAdminEmail("");
      fetchCompanies();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create company");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (company: Company) => {
    const { error } = await supabase
      .from("companies")
      .update({ is_active: !company.is_active })
      .eq("id", company.id);
    if (error) {
      toast.error("Failed to update");
    } else {
      toast.success(`${company.name} ${company.is_active ? "deactivated" : "activated"}`);
      fetchCompanies();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Building2 className="w-6 h-6 text-primary" /> System Administration
      </h1>

      {/* Create new company */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create New Company
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Company Name</Label>
              <Input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="Acme Recyclers" />
            </div>
            <div>
              <Label>Admin Full Name</Label>
              <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="John Doe" />
            </div>
            <div>
              <Label>Admin Email</Label>
              <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@company.com" />
            </div>
          </div>
          <Button onClick={handleCreateCompany} disabled={loading} className="gap-2">
            <UserPlus className="w-4 h-4" /> Create Company & Pre-register Admin
          </Button>
        </CardContent>
      </Card>

      {/* Company list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Companies ({companies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {companies.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">Created: {new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.is_active ? "default" : "secondary"}>
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(c)}
                      className="gap-1"
                    >
                      {c.is_active ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                      {c.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              ))}
              {companies.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No companies yet</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      <ChangePinCard />
    </div>
  );
};

// ── Change System Admin PIN Card ──
type PinStep = "idle" | "otp_sent" | "verified";

const ChangePinCard = () => {
  const { user } = useAuth();
  const [step, setStep] = useState<PinStep>("idle");
  const [otp, setOtp] = useState("");
  const [storedOtp, setStoredOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-password-otp", {
        body: { action: "send" },
      });
      if (error) { toast.error("Failed to send OTP"); setLoading(false); return; }
      if (data?.success) {
        setMaskedEmail(data.maskedEmail || "your email");
        if (data._otp) setStoredOtp(data._otp);
        setStep("otp_sent");
        toast.success(`Verification code sent to ${data.maskedEmail || "your email"}`);
      } else {
        toast.error(data?.error || "Failed to send OTP");
      }
    } catch { toast.error("Failed to send OTP"); }
    setLoading(false);
  };

  const handleVerifyAndChange = async () => {
    if (otp.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    if (newPin.length < 4) { toast.error("PIN must be at least 4 characters"); return; }
    if (newPin !== confirmPin) { toast.error("PINs do not match"); return; }

    setLoading(true);
    try {
      // First verify OTP
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke("send-password-otp", {
        body: { action: "verify_only", otp },
      });

      if (verifyError || !verifyData?.success) {
        toast.error(verifyData?.error || "Invalid verification code");
        setLoading(false);
        return;
      }

      // Then update the PIN via edge function
      const { data: pinData, error: pinError } = await supabase.functions.invoke("verify-sysadmin-pin", {
        body: { action: "change", newPin },
      });

      if (pinError || !pinData?.success) {
        toast.error(pinData?.error || "Failed to update PIN");
        setLoading(false);
        return;
      }

      toast.success("System Admin PIN changed successfully!");
      setStep("idle");
      setOtp(""); setStoredOtp(""); setNewPin(""); setConfirmPin("");
    } catch { toast.error("Failed to change PIN"); }
    setLoading(false);
  };

  const handleCancel = () => { setStep("idle"); setOtp(""); setStoredOtp(""); setNewPin(""); setConfirmPin(""); };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-primary" /> Change System Admin PIN
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "idle" && (
          <>
            <p className="text-sm text-muted-foreground">
              To change the system admin PIN, we'll first verify your identity by sending a code to your email.
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
                <ShieldCheck className="w-4 h-4" /> Code sent to {maskedEmail}
              </p>
              {storedOtp && (
                <p className="text-xs text-muted-foreground mt-1">
                  Your code: <span className="font-mono font-bold text-foreground">{storedOtp}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Enter 6-digit verification code</Label>
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                  <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-pin">New PIN</Label>
              <Input id="new-pin" type="password" placeholder="At least 4 characters" value={newPin} onChange={(e) => setNewPin(e.target.value)} className="h-11" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-pin">Confirm New PIN</Label>
              <Input id="confirm-pin" type="password" placeholder="Repeat new PIN" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} className="h-11" />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleVerifyAndChange} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Change PIN
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={loading}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemAdminPage;
