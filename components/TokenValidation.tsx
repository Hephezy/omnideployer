"use client";

import { useState, useCallback, useMemo } from "react";
import { AlertCircle, Info } from "lucide-react";
import { cn } from "@/utils";

// Validation rules
export interface TokenConfig {
  name: string;
  symbol: string;
  supply: number;
  decimals: number;
  devAllocation?: number;
  description?: string;
}

export interface ValidationError {
  field: "name" | "symbol" | "supply" | "decimals" | "devAllocation" | "description";
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Reserved/problematic token names and symbols
const RESERVED_SYMBOLS = [
  "ETH", "BTC", "USDT", "USDC", "DAI", "WETH", "WBTC",
  "BNB", "SOL", "ADA", "DOT", "MATIC", "AVAX", "LINK", "SUI", "APT"
];

const RESTRICTED_WORDS = [
  "scam", "rug", "hack", "steal", "fake", "ponzi", "admin"
];

export function validateToken(config: TokenConfig): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Name validation
  if (!config.name) {
    errors.push({
      field: "name",
      message: "Token name is required",
      severity: "error",
    });
  } else {
    if (config.name.length < 2) {
      errors.push({
        field: "name",
        message: "Token name must be at least 2 characters",
        severity: "error",
      });
    }
    if (config.name.length > 32) {
      errors.push({
        field: "name",
        message: "Token name must be 32 characters or less",
        severity: "error",
      });
    }
    const lowerName = config.name.toLowerCase();
    for (const word of RESTRICTED_WORDS) {
      if (lowerName.includes(word)) {
        warnings.push({
          field: "name",
          message: `Token name contains potentially problematic word: "${word}"`,
          severity: "warning",
        });
        break;
      }
    }
  }

  // Symbol validation
  if (!config.symbol) {
    errors.push({
      field: "symbol",
      message: "Token symbol is required",
      severity: "error",
    });
  } else {
    if (config.symbol.length < 2) {
      errors.push({
        field: "symbol",
        message: "Symbol must be at least 2 characters",
        severity: "error",
      });
    }
    if (config.symbol.length > 10) {
      errors.push({
        field: "symbol",
        message: "Symbol must be 10 characters or less",
        severity: "error",
      });
    }
    if (!/^[A-Z0-9]+$/.test(config.symbol)) {
      errors.push({
        field: "symbol",
        message: "Symbol must contain only uppercase letters and numbers",
        severity: "error",
      });
    }
    if (RESERVED_SYMBOLS.includes(config.symbol.toUpperCase())) {
      warnings.push({
        field: "symbol",
        message: `"${config.symbol}" is a reserved symbol`,
        severity: "warning",
      });
    }
  }

  // Supply validation
  if (config.supply <= 0) {
    errors.push({
      field: "supply",
      message: "Total supply must be greater than 0",
      severity: "error",
    });
  } else {
    if (config.supply > 100_000_000_000) {
      warnings.push({
        field: "supply",
        message: "Supply is very high (>100B)",
        severity: "warning",
      });
    }
  }

  // Decimals validation
  if (config.decimals < 0 || config.decimals > 18) {
    errors.push({
      field: "decimals",
      message: "Decimals must be between 0 and 18",
      severity: "error",
    });
  }

  // Dev allocation validation
  if (config.devAllocation !== undefined) {
    if (config.devAllocation < 0 || config.devAllocation > 100) {
      errors.push({
        field: "devAllocation",
        message: "Dev allocation must be between 0 and 100%",
        severity: "error",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function useTokenValidation() {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [warnings, setWarnings] = useState<ValidationError[]>([]);

  const validate = useCallback((config: TokenConfig): ValidationResult => {
    const result = validateToken(config);
    setErrors(result.errors);
    setWarnings(result.warnings);
    return result;
  }, []);

  const clearValidation = useCallback(() => {
    setErrors([]);
    setWarnings([]);
  }, []);

  const isValid = errors.length === 0;

  return {
    errors,
    warnings,
    isValid,
    validate,
    clearValidation,
  };
}

export const TokenValidation = ({
  errors,
  warnings = [],
  className,
}: {
  errors: ValidationError[];
  warnings?: ValidationError[];
  className?: string;
}) => {
  const allIssues = useMemo(() => [...errors, ...warnings], [errors, warnings]);

  if (allIssues.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {errors.map((error, idx) => (
        <div
          key={`error-${idx}`}
          className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
        >
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-red-400">{error.message}</p>
          </div>
        </div>
      ))}
      {warnings.map((warning, idx) => (
        <div
          key={`warning-${idx}`}
          className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
        >
          <Info className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-yellow-400">{warning.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
};