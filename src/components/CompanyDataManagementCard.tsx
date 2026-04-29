import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldAlert, Save, Loader2, KeyRound, Users, Lock, Unlock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DeleteWizard from "./DeleteWizard";

const PIN_KEY = "company_delete_pin";
const DELEGATES_KEY = "company_delete_delegates";

type Profile = { user_id: string; display_name: string; role: string };

const CompanyDataManagementCard = () => {
  const { user, companyId } = useAuth();
  const isAdmin = user?.role === "admin";

  const [pin, setPin] = useState<string>("");
  const [pinDraft, setPinDraft] = useState<string>("");
  const [pinConfirm, setPinConfirm] = useState<string>("");
  const [savingPin, setSavingPin] = useState(false);

  const [delegates, setDelegates] = useState<string[]>([]);
  const [savingDelegates, setSavingDelegates] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [unlocked, setUnlocked] = useState(false);
  const [unlockPin, setUnlockPin] = useState("");

  const canUseWizard = useMemo(() => {
    if (!user) return false;
    if (isAdmin) return true;
    return delegates.includes(user.id);
  }, [user, isAdmin, delegates]);

  // Load settings
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", [PIN_KEY, DELEGATES_KEY]);
      if (data) {
        const p = data.find((d) => d.key === PIN_KEY)?.value || "";
        const d = data.find((d) => d.key === DELEGATES_KEY)?.value || "[]";
        setPin(p);
        try { setDelegates(JSON.parse(d)); } catch { setDelegates([]); }
      }
    })();
  }, [companyId]);

  // Load company profiles for admin to pick delegates
  useEffect(() => {
    if (!isAdmin || !companyId) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, role")
        .order("display_name");
      if (data) setProfiles(data as Profile[]);
    })();
  }, [isAdmin, companyId]);

  const upsertSetting = async (key: string, value: string) => {
    const { data: existing } = await supabase
      .from("app_settings").select("id").eq("key", key).maybeSingle();
    if (existing) {
      const { error } = await supabase.from("app_settings").update({ value }).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("app_settings").insert({ key, value, company_id: companyId! });
      if (error) throw error;
    }
  };

  const handleSavePin = async () => {
    if (pinDraft.length < 4) { toast.error("PIN must be at least 4 digits"); return; }
    if (pinDraft !== pinConfirm) { toast.error("PINs do not match"); return; }
    setSavingPin(true);
    try {
      await upsertSetting(PIN_KEY, pinDraft);
      setPin(pinDraft);
      setPinDraft(""); setPinConfirm("");
      toast.success("Delete PIN updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to save PIN");
    } finally { setSavingPin(false); }
  };

  const toggleDelegate = (uid: string, checked: boolean) => {
    setDelegates((prev) => checked ? Array.from(new Set([...prev, uid])) : prev.filter((u) => u !== uid));
  };

  const handleSaveDelegates = async () => {
    setSavingDelegates(true);
    try {
      await upsertSetting(DELEGATES_KEY, JSON.stringify(delegates));
      toast.success("Delegated users saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally { setSavingDelegates(false); }
  };

  const handleUnlock = () => {
    if (!pin) { toast.error("Admin must set a delete PIN first"); return; }
    if (unlockPin === pin) {
      setUnlocked(true);
      setUnlockPin("");
    } else {
      toast.error("Incorrect PIN");
    }
  };

  // Non-admin without delegate access: don't render anything
  if (!isAdmin && !canUseWizard) return null;

  return (
    <div className="space-y-6">
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive" /> Data Management (Danger Zone)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Permanently remove records from your company's database. All deletions are scoped to <strong className="text-foreground">your company only</strong> — other companies are not affected.
          </p>

          {isAdmin && (
            <>
              <Separator />
              {/* PIN Section */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4" /> Company Delete PIN
                  {pin
                    ? <Badge variant="outline" className="text-xs">Configured</Badge>
                    : <Badge variant="destructive" className="text-xs">Not set</Badge>}
                </Label>
                <p className="text-xs text-muted-foreground">
                  Required before any deletion. Share only with trusted users.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md">
                  <Input
                    type="password" inputMode="numeric" placeholder="New PIN (4-8 digits)"
                    value={pinDraft}
                    onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    className="font-mono tracking-widest" autoComplete="new-password"
                  />
                  <Input
                    type="password" inputMode="numeric" placeholder="Confirm PIN"
                    value={pinConfirm}
                    onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    className="font-mono tracking-widest" autoComplete="new-password"
                  />
                </div>
                <Button onClick={handleSavePin} disabled={savingPin || !pinDraft} size="sm" className="gap-1">
                  {savingPin ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  {pin ? "Change PIN" : "Set PIN"}
                </Button>
              </div>

              <Separator />
              {/* Delegates Section */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" /> Delegated Users
                  <Badge variant="outline" className="text-xs">{delegates.length} selected</Badge>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Select non-admin users who may also use the Delete Wizard (still requires the PIN).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-3 rounded-lg border border-border bg-muted/30">
                  {profiles.filter((p) => p.role !== "admin" && p.user_id !== user?.id).length === 0 ? (
                    <p className="text-xs text-muted-foreground col-span-2 text-center py-4">No other users in this company.</p>
                  ) : (
                    profiles
                      .filter((p) => p.role !== "admin" && p.user_id !== user?.id)
                      .map((p) => (
                        <label key={p.user_id} className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer">
                          <Checkbox
                            checked={delegates.includes(p.user_id)}
                            onCheckedChange={(c) => toggleDelegate(p.user_id, !!c)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.display_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{p.role}</p>
                          </div>
                        </label>
                      ))
                  )}
                </div>
                <Button onClick={handleSaveDelegates} disabled={savingDelegates} size="sm" className="gap-1">
                  {savingDelegates ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Save Delegates
                </Button>
              </div>

              <Separator />
            </>
          )}

          {/* Wizard launcher */}
          {canUseWizard && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-destructive" /> Delete Wizard
              </Label>
              {!pin ? (
                <p className="text-xs text-destructive">
                  An administrator must set a Delete PIN before the wizard can be used.
                </p>
              ) : !unlocked ? (
                <div className="flex items-end gap-2 max-w-sm">
                  <div className="flex-1">
                    <Label className="text-xs">Enter PIN to unlock</Label>
                    <Input
                      type="password" inputMode="numeric"
                      value={unlockPin}
                      onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                      onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                      placeholder="••••" className="font-mono tracking-widest"
                    />
                  </div>
                  <Button onClick={handleUnlock} disabled={!unlockPin} className="gap-1">
                    <Unlock className="w-4 h-4" /> Unlock
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" /> Wizard unlocked for this session.
                  <Button variant="ghost" size="sm" onClick={() => setUnlocked(false)} className="h-6 px-2 text-xs">Lock</Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {canUseWizard && unlocked && pin && (
        <DeleteWizard requiredPin={pin} excludeTables={["audit_log"]} />
      )}
    </div>
  );
};

export default CompanyDataManagementCard;
