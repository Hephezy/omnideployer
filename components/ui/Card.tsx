import { cn } from "@/utils";

export const Card = ({ children, className, noBorder = false }: { children: React.ReactNode, className?: string, noBorder?: boolean }) => (
  <div className={cn(
    "rounded-xl bg-slate-950/50 backdrop-blur-md relative overflow-hidden transition-all duration-300",
    !noBorder && "border border-slate-800/60 hover:border-cyan-500/30",
    className
  )}>
    {children}
  </div>
);