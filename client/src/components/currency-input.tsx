import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number; // In cents
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CurrencyInput({ 
  value, 
  onChange, 
  placeholder = "0.00", 
  className,
  disabled = false,
  ...rest
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const lastExternalValue = useRef(value);

  // Only sync from external value when not focused and value changed externally
  useEffect(() => {
    if (!isFocused && value !== lastExternalValue.current) {
      lastExternalValue.current = value;
      if (value === 0) {
        setDisplayValue("");
      } else {
        setDisplayValue((value / 100).toFixed(2));
      }
    }
  }, [value, isFocused]);

  // Initialize display value on mount
  useEffect(() => {
    if (value !== 0) {
      setDisplayValue((value / 100).toFixed(2));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9.]/g, "");
    setDisplayValue(rawValue);
    
    const numericValue = parseFloat(rawValue);
    if (!isNaN(numericValue)) {
      const cents = Math.round(numericValue * 100);
      lastExternalValue.current = cents;
      onChange(cents);
    } else if (rawValue === "" || rawValue === ".") {
      lastExternalValue.current = 0;
      onChange(0);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const numericValue = parseFloat(displayValue);
    if (!isNaN(numericValue)) {
      setDisplayValue(numericValue.toFixed(2));
    } else {
      setDisplayValue("");
      onChange(0);
    }
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
      <Input
        {...rest}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn("pl-7 font-mono", className)}
        disabled={disabled}
        data-testid="input-currency"
      />
    </div>
  );
}
