import { useCurrency, availableCurrencies } from "@/contexts/CurrencyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import PermissionsManager from "@/components/PermissionsManager";
import { useAuth } from "@/contexts/AuthContext";

const SettingsPage = () => {
  const { currency, symbol, setCurrencyCode } = useCurrency();

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" /> System Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrencyCode}>
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
              Currently using <strong>{symbol}</strong> ({currency}). All amounts across the system will display in this currency.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
