import { createContext, useContext, useState, ReactNode } from "react";

interface CurrencyContextType {
  currency: string;
  symbol: string;
  setCurrencyCode: (code: string) => void;
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
  const [currency, setCurrency] = useState("KES");
  const symbol = currencies[currency] || currency;

  const setCurrencyCode = (code: string) => setCurrency(code);

  return (
    <CurrencyContext.Provider value={{ currency, symbol, setCurrencyCode }}>
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
