import React from "react";

interface InputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}

export const Input = ({ label, value, onChange, placeholder, type = "text", disabled }: InputProps) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-linear-to-r from-cyan-500/20 to-purple-500/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="relative w-full bg-slate-900/80 border border-slate-800 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  </div>
);