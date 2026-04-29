import { useState } from "react";
import { useCurrency, availableCurrencies } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCategoryLabels } from "@/contexts/CategoryLabelsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings, Globe, User, X, Tags, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ChangePasswordCard from "@/components/ChangePasswordCard";
import RolesManager from "@/components/RolesManager";
import CompanyBrandingSettings from "@/components/CompanyBrandingSettings";
import StorageManagementCard from "@/components/StorageManagementCard";

const SettingsPage = () => {
  const { currency, symbol, globalCurrency, globalSymbol, setCurrencyCode, setGlobalCurrency, isPersonalOverride, clearPersonalOverride } = useCurrency();
  const { user } = useAuth();
  const { labels, updateLabels } = useCategoryLabels();
  const isAdmin = user?.role === "admin";

  const [editingLabels, setEditingLabels] = useState(false);
  const [agentLabel, setAgentLabel] = useState(labels.agent);
  const [vipLabel, setVipLabel] = useState(labels.vip);
  const [salesLabel, setSalesLabel] = useState(labels.sales);
  const [savingLabels, setSavingLabels] = useState(false);

  const handleSaveLabels = async () => {
    setSavingLabels(true);
    await updateLabels({ agent: agentLabel.trim() || "Agent", vip: vipLabel.trim() || "VIP", sales: salesLabel.trim() || "Sales" });
    setSavingLabels(false);
    setEditingLabels(false);
    toast.success("Category names updated!");
  };

  const handleGlobalChange = async (code: string) => {
    await setGlobalCurrency(code);
    toast.success(`Global currency changed to ${code}`);
  };

  const handlePersonalChange = async (code: string) => {
    await setCurrencyCode(code);
    toast.success(`Your personal currency set to ${code}`);
  };

  const handleClearOverride = async () => {
    await clearPersonalOverride();
    toast.success("Reverted to global currency");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {isAdmin && <CompanyBrandingSettings />}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" /> System Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isAdmin && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="w-4 h-4" /> Global Currency (affects all users)
              </Label>
              <Select value={globalCurrency} onValueChange={handleGlobalChange}>
                <SelectTrigger className="h-12 max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(availableCurrencies).map(([code, sym]) => (
                    <SelectItem key={code} value={code}>{code} — {sym}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Global default is <strong>{globalSymbol}</strong> ({globalCurrency}).
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4" /> My Currency Preference
            </Label>
            <div className="flex items-center gap-2">
              <Select value={currency} onValueChange={handlePersonalChange}>
                <SelectTrigger className="h-12 max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(availableCurrencies).map(([code, sym]) => (
                    <SelectItem key={code} value={code}>{code} — {sym}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isPersonalOverride && (
                <Button variant="ghost" size="sm" onClick={handleClearOverride} className="text-muted-foreground gap-1">
                  <X className="w-3 h-3" /> Reset to global
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isPersonalOverride
                ? <>You're using <strong>{symbol}</strong> ({currency}) as a personal override.</>
                : <>Using the global currency <strong>{symbol}</strong> ({currency}).</>
              }
            </p>
          </div>

          {isAdmin && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Tags className="w-4 h-4" /> Transaction Category Names
                </Label>
                {!editingLabels && (
                  <Button variant="outline" size="sm" onClick={() => { setAgentLabel(labels.agent); setVipLabel(labels.vip); setSalesLabel(labels.sales); setEditingLabels(true); }}>
                    Edit
                  </Button>
                )}
              </div>
              {editingLabels ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-lg bg-accent border border-border">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Category 1 (buying)</span>
                    <Input value={agentLabel} onChange={(e) => setAgentLabel(e.target.value)} placeholder="Agent" className="h-10" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Category 2 (buying)</span>
                    <Input value={vipLabel} onChange={(e) => setVipLabel(e.target.value)} placeholder="VIP" className="h-10" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Category 3 (selling)</span>
                    <Input value={salesLabel} onChange={(e) => setSalesLabel(e.target.value)} placeholder="Sales" className="h-10" />
                  </div>
                  <div className="sm:col-span-3 flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingLabels(false)}>Cancel</Button>
                    <Button size="sm" className="gap-1" onClick={handleSaveLabels} disabled={savingLabels}>
                      {savingLabels ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-accent/50 border border-border">
                    <span className="text-xs text-muted-foreground block">Category 1</span>
                    <span className="font-medium">{labels.agent}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/50 border border-border">
                    <span className="text-xs text-muted-foreground block">Category 2</span>
                    <span className="font-medium">{labels.vip}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/50 border border-border">
                    <span className="text-xs text-muted-foreground block">Category 3</span>
                    <span className="font-medium">{labels.sales}</span>
                  </div>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Customize the names of your three transaction categories. These labels appear on the dashboard, data entry tabs, rates, and reports.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && <RolesManager />}

      <StorageManagementCard />

      <ChangePasswordCard />
    </div>
  );
};

export default SettingsPage;
