import { cn } from "@/utils";
import { Loader2 } from "lucide-react";

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  className,
  disabled,
  isLoading
}: {
  children: React.ReactNode,
  onClick?: () => void,
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger',
  className?: string,
  disabled?: boolean,
  isLoading?: boolean
}) => {
  const variants = {
    primary: "bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]",
    secondary: "bg-slate-800 hover:bg-slate-700 text-white",
    ghost: "hover:bg-slate-800/50 text-slate-400 hover:text-white",
    outline: "border border-slate-700 hover:border-slate-500 text-slate-300 bg-transparent",
    danger: "bg-red-500/10 border border-red-500/50 text-red-400 hover:bg-red-500/20"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        "px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm relative overflow-hidden",
        variants[variant],
        (disabled || isLoading) && "opacity-50 cursor-not-allowed hover:bg-none hover:shadow-none",
        className
      )}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};