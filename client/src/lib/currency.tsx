import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Currency } from "@shared/schema";

interface CurrencyContextType {
  currency: Currency | null;
  currencies: Currency[];
  isLoading: boolean;
  formatCurrency: (cents: number) => string;
  convertCurrency: (cents: number, fromCode: string, toCode: string) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { data: currencies = [], isLoading: currenciesLoading } = useQuery<Currency[]>({
    queryKey: ["/api/currencies"],
  });

  const { data: defaultCurrency, isLoading: defaultLoading } = useQuery<Currency>({
    queryKey: ["/api/currencies/default"],
  });

  const isLoading = currenciesLoading || defaultLoading;

  const formatCurrency = (cents: number): string => {
    const curr = defaultCurrency;
    if (!curr) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(cents / 100);
    }

    const decimals = curr.decimals ?? 2;
    const divisor = Math.pow(10, decimals);
    const amount = cents / divisor;

    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: curr.code,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(amount);
    } catch {
      return `${curr.symbol}${amount.toFixed(decimals)}`;
    }
  };

  const convertCurrency = (cents: number, fromCode: string, toCode: string): number => {
    if (fromCode === toCode) return cents;
    
    const fromCurrency = currencies.find(c => c.code === fromCode);
    const toCurrency = currencies.find(c => c.code === toCode);
    
    if (!fromCurrency || !toCurrency) return cents;
    
    const baseRate = 10000;
    const inBaseCurrency = (cents * baseRate) / fromCurrency.exchangeRate;
    const inTargetCurrency = (inBaseCurrency * toCurrency.exchangeRate) / baseRate;
    
    return Math.round(inTargetCurrency);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency: defaultCurrency || null,
        currencies,
        isLoading,
        formatCurrency,
        convertCurrency,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
