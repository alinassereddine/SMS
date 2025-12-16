import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: number; // In cents
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export function CurrencyInput({ 
  value, 
  onChange, 
  placeholder = "0.00", 
  className,
  disabled = false,
  id,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState("");

  useEffect(() => {
    if (value === 0 && displayValue === "") return;
    setDisplayValue((value / 100).toFixed(2));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9.]/g, "");
    setDisplayValue(rawValue);
    
    const numericValue = parseFloat(rawValue);
    if (!isNaN(numericValue)) {
      onChange(Math.round(numericValue * 100));
    } else if (rawValue === "" || rawValue === ".") {
      onChange(0);
    }
  };

  const handleBlur = () => {
    const numericValue = parseFloat(displayValue);
    if (!isNaN(numericValue)) {
      setDisplayValue(numericValue.toFixed(2));
    } else {
      setDisplayValue("0.00");
      onChange(0);
    }
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn("pl-7 font-mono", className)}
        disabled={disabled}
        data-testid="input-currency"
      />
    </div>
  );
}
