import { ChainConfig, CHAINS } from "@/config/constants";
import { cn } from "@/utils";
import { ArrowRightLeft, CheckCircle2, Cpu } from "lucide-react";

export const ChainSelector = ({ selected, currentChainId, onSelect, onSwitch }: { selected: ChainConfig | null, currentChainId: number | null, onSelect: (c: ChainConfig) => void, onSwitch: (c: ChainConfig) => void }) => (
  <section>
    <div className="flex items-center gap-2 mb-4 text-cyan-400">
      <Cpu className="w-4 h-4" />
      <span className="text-xs font-bold tracking-widest uppercase">Select Network</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {CHAINS.map((chain) => {
        const isSelected = selected?.id === chain.id;
        const isOnWrongNetwork = isSelected && currentChainId !== chain.chainId;

        return (
          <div
            key={chain.id}
            onClick={() => onSelect(chain)}
            className={cn(
              "cursor-pointer relative p-4 rounded-xl border transition-all duration-200 hover:shadow-lg group overflow-hidden",
              isSelected
                ? "bg-slate-900 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                : "bg-slate-950/50 border-slate-800 hover:bg-slate-900 hover:border-slate-700"
            )}
          >
            {isSelected && (
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></div>
              </div>
            )}
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3 text-white bg-linear-to-br", chain.color)}>
              {chain.icon}
            </div>
            <div className="font-semibold text-sm text-slate-200 group-hover:text-white">{chain.name}</div>

            {isOnWrongNetwork && (
              <button
                onClick={(e) => { e.stopPropagation(); onSwitch(chain); }}
                className="mt-3 w-full py-1.5 flex items-center justify-center gap-1 text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 rounded hover:bg-yellow-500/20 transition"
              >
                <ArrowRightLeft className="w-3 h-3" /> Switch Network
              </button>
            )}
            {!isOnWrongNetwork && isSelected && (
              <div className="mt-3 text-[10px] text-green-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Connected
              </div>
            )}
          </div>
        );
      })}
    </div>
  </section>
);