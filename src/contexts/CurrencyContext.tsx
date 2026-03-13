import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CurrencyContextType {
  currency: string;
  symbol: string;
  globalCurrency: string;
  globalSymbol: string;
  setCurrencyCode: (code: string) => void;
  setGlobalCurrency: (code: string) => Promise<void>;
  isPersonalOverride: boolean;
  clearPersonalOverride: () => Promise<void>;
}

const currencies: Record<string, string> = {
  KES: "KSh",
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  TZS: "TSh",
  UGX: "USh",
  ZAR: "R",
  NGN: "₦",
};

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [globalCurrencyCode, setGlobalCurrencyCode] = useState("KES");
  const [personalCurrency, setPersonalCurrency] = useState<string | null>(null);
  const { user } = useAuth();

  const currency = personalCurrency || globalCurrencyCode;
  const symbol = currencies[currency] || currency;
  const globalSymbol = currencies[globalCurrencyCode] || globalCurrencyCode;
  const isPersonalOverride = !!personalCurrency;

  // Load global currency from app_settings
  useEffect(() => {
    const fetchGlobal = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "global_currency")
        .single();
      if (data) setGlobalCurrencyCode(data.value);
    };
    fetchGlobal();

    // Listen for realtime changes
    const channel = supabase
      .channel("app-settings-currency")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, (payload: any) => {
        if (payload.new?.key === "global_currency") {
          setGlobalCurrencyCode(payload.new.value);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Load personal currency preference from profile
  useEffect(() => {
    if (!user) return;
    const fetchPersonal = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("currency_preference")
        .eq("user_id", user.id)
        .single();
      if (data?.currency_preference) {
        setPersonalCurrency(data.currency_preference);
      } else {
        setPersonalCurrency(null);
      }
    };
    fetchPersonal();
  }, [user]);

  // Set personal currency override
  const setCurrencyCode = async (code: string) => {
    setPersonalCurrency(code);
    if (user) {
      await supabase
        .from("profiles")
        .update({ currency_preference: code })
        .eq("user_id", user.id);
    }
  };

  // Admin sets global currency
  const setGlobalCurrency = async (code: string) => {
    setGlobalCurrencyCode(code);
    await supabase
      .from("app_settings")
      .update({ value: code, updated_at: new Date().toISOString() })
      .eq("key", "global_currency");
  };

  const clearPersonalOverride = async () => {
    setPersonalCurrency(null);
    if (user) {
      await supabase
        .from("profiles")
        .update({ currency_preference: null })
        .eq("user_id", user.id);
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, symbol, globalCurrency: globalCurrencyCode, globalSymbol, setCurrencyCode, setGlobalCurrency, isPersonalOverride, clearPersonalOverride }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be within CurrencyProvider");
  return ctx;
};

export const availableCurrencies = currencies;
