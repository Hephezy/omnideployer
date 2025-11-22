"use client";

import React, { useState, useId } from "react";
import { cn } from "@/utils";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

interface InputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "password" | "email";
  disabled?: boolean;
  error?: string;
  success?: boolean;
  hint?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  inputClassName?: string;
  required?: boolean;
  autoFocus?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
}

export const Input = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
  error,
  success,
  hint,
  maxLength,
  min,
  max,
  prefix,
  suffix,
  className,
  inputClassName,
  required,
  autoFocus,
  onBlur,
  onFocus,
}: InputProps) => {
  const id = useId();
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputType = type === "password" && showPassword ? "text" : type;
  const hasValue = value !== "" && value !== 0;
  const showValidation = hasValue && !isFocused;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Handle number type
    if (type === "number") {
      // Allow empty string for clearing
      if (newValue === "") {
        onChange("");
        return;
      }

      // Parse and validate number
      const num = parseFloat(newValue);
      if (isNaN(num)) return;

      if (min !== undefined && num < min) return;
      if (max !== undefined && num > max) return;
    }

    // Handle maxLength
    if (maxLength && newValue.length > maxLength) {
      newValue = newValue.slice(0, maxLength);
    }

    onChange(newValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1"
        >
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {maxLength && (
          <span className="text-xs text-slate-600">
            {String(value).length}/{maxLength}
          </span>
        )}
      </div>

      {/* Input wrapper */}
      <div className="relative group">
        {/* Glow effect */}
        <div
          className={cn(
            "absolute -inset-0.5 rounded-lg blur opacity-0 transition duration-500",
            isFocused && !error && "opacity-100",
            error
              ? "bg-red-500/20"
              : success
                ? "bg-green-500/20"
                : "bg-linear-to-r from-cyan-500/20 to-purple-500/20"
          )}
        />

        {/* Input container */}
        <div
          className={cn(
            "relative flex items-center bg-slate-900/80 border rounded-lg transition-all",
            error
              ? "border-red-500/50"
              : success
                ? "border-green-500/50"
                : isFocused
                  ? "border-cyan-500/50 ring-1 ring-cyan-500/20"
                  : "border-slate-800 group-hover:border-slate-700",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {/* Prefix */}
          {prefix && (
            <span className="pl-3 text-slate-500 text-sm select-none">
              {prefix}
            </span>
          )}

          {/* Input */}
          <input
            id={id}
            type={inputType}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            min={min}
            max={max}
            className={cn(
              "w-full bg-transparent text-slate-200 px-4 py-2.5",
              "focus:outline-none transition-all",
              "placeholder:text-slate-600",
              "disabled:cursor-not-allowed",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              prefix && "pl-1",
              (suffix || type === "password" || showValidation) && "pr-10",
              inputClassName
            )}
          />

          {/* Suffix / Validation Icon / Password Toggle */}
          <div className="flex items-center pr-3 gap-2">
            {suffix && (
              <span className="text-slate-500 text-sm select-none">
                {suffix}
              </span>
            )}

            {type === "password" && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 hover:bg-slate-800 rounded transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-slate-400" />
                ) : (
                  <Eye className="w-4 h-4 text-slate-400" />
                )}
              </button>
            )}

            {showValidation && !error && !success && type !== "password" && (
              <CheckCircle2 className="w-4 h-4 text-slate-600" />
            )}

            {showValidation && error && (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}

            {showValidation && success && !error && (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            )}
          </div>
        </div>
      </div>

      {/* Error / Hint */}
      {(error || hint) && (
        <p
          className={cn(
            "text-xs ml-1 transition-colors",
            error ? "text-red-400" : "text-slate-500"
          )}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
};

// Number input with increment/decrement buttons
interface NumberInputProps extends Omit<InputProps, "type"> {
  step?: number;
}

export const NumberInput = ({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  ...props
}: NumberInputProps) => {
  const numValue = typeof value === "string" ? parseFloat(value) || 0 : value;

  const increment = () => {
    const newValue = numValue + step;
    if (max !== undefined && newValue > max) return;
    onChange(String(newValue));
  };

  const decrement = () => {
    const newValue = numValue - step;
    if (min !== undefined && newValue < min) return;
    onChange(String(newValue));
  };

  return (
    <div className="relative">
      <Input {...props} type="number" value={value} onChange={onChange} min={min} max={max} />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
        <button
          type="button"
          onClick={increment}
          disabled={props.disabled || (max !== undefined && numValue >= max)}
          className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={decrement}
          disabled={props.disabled || (min !== undefined && numValue <= min)}
          className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Textarea component
interface TextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
}

export const Textarea = ({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  error,
  rows = 4,
  maxLength,
  className,
}: TextareaProps) => {
  const id = useId();

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1"
        >
          {label}
        </label>
        {maxLength && (
          <span className="text-xs text-slate-600">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={cn(
          "w-full bg-slate-900/80 border border-slate-800 text-slate-200 rounded-lg px-4 py-2.5",
          "focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20",
          "placeholder:text-slate-600 resize-none transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error && "border-red-500/50"
        )}
      />
      {error && <p className="text-xs text-red-400 ml-1">{error}</p>}
    </div>
  );
};