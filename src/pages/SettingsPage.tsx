import { useCurrency, availableCurrencies } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Globe, User, X } from "lucide-react";
import { toast } from "sonner";
import ChangePasswordCard from "@/components/ChangePasswordCard";

const SettingsPage = () => {
  const { currency, symbol, globalCurrency, globalSymbol, setCurrencyCode, setGlobalCurrency, isPersonalOverride, clearPersonalOverride } = useCurrency();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" /> System Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Admin: Global Currency */}
          {isAdmin && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="w-4 h-4" /> Global Currency (affects all users)
              </Label>
              <Select value={globalCurrency} onValueChange={handleGlobalChange}>
                <SelectTrigger className="h-12 max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(availableCurrencies).map(([code, sym]) => (
                    <SelectItem key={code} value={code}>
                      {code} — {sym}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Global default is <strong>{globalSymbol}</strong> ({globalCurrency}). All users without a personal override will see this currency.
              </p>
            </div>
          )}

          {/* Personal Currency Override */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4" /> My Currency Preference
            </Label>
            <div className="flex items-center gap-2">
              <Select value={currency} onValueChange={handlePersonalChange}>
                <SelectTrigger className="h-12 max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(availableCurrencies).map(([code, sym]) => (
                    <SelectItem key={code} value={code}>
                      {code} — {sym}
                    </SelectItem>
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
                ? <>You're using <strong>{symbol}</strong> ({currency}) as a personal override. The global default is {globalSymbol} ({globalCurrency}).</>
                : <>Using the global currency <strong>{symbol}</strong> ({currency}). Change above to set a personal preference.</>
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
