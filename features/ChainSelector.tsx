"use client";

import { ChainConfig, CHAINS } from "@/config/constants";
import { cn } from "@/utils";
import {
  ArrowRightLeft,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Droplets,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useState } from "react";

interface ChainSelectorProps {
  selected: ChainConfig | null;
  currentChainId: number | null;
  onSelect: (chain: ChainConfig) => void;
  onSwitch: (chain: ChainConfig) => void;
}

export const ChainSelector = ({
  selected,
  currentChainId,
  onSelect,
  onSwitch
}: ChainSelectorProps) => {
  const [showAll, setShowAll] = useState(false);

  // Show first 3 chains by default on mobile, all on desktop
  const visibleChains = showAll ? CHAINS : CHAINS.slice(0, 3);
  const hasMore = CHAINS.length > 3;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-cyan-400">
          <Cpu className="w-4 h-4" />
          <span className="text-xs font-bold tracking-widest uppercase">
            Select Network
          </span>
        </div>
        <span className="text-xs text-slate-500">
          {CHAINS.length} testnets available
        </span>
      </div>

      {/* Chain Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleChains.map((chain) => {
          const isSelected = selected?.id === chain.id;
          const isConnected = currentChainId === chain.chainId;
          const needsSwitch = isSelected && !isConnected;

          return (
            <ChainCard
              key={chain.id}
              chain={chain}
              isSelected={isSelected}
              isConnected={isConnected}
              needsSwitch={needsSwitch}
              onSelect={() => onSelect(chain)}
              onSwitch={() => onSwitch(chain)}
            />
          );
        })}
      </div>

      {/* Show More Button (Mobile) */}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-3 py-2 flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-300 transition-colors sm:hidden"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show {CHAINS.length - 3} More Networks
            </>
          )}
        </button>
      )}
    </section>
  );
};

// Individual chain card component
interface ChainCardProps {
  chain: ChainConfig;
  isSelected: boolean;
  isConnected: boolean;
  needsSwitch: boolean;
  onSelect: () => void;
  onSwitch: () => void;
}

const ChainCard = ({
  chain,
  isSelected,
  isConnected,
  needsSwitch,
  onSelect,
  onSwitch,
}: ChainCardProps) => {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "cursor-pointer relative p-4 rounded-xl border transition-all duration-200",
        "hover:shadow-lg group overflow-hidden",
        isSelected
          ? "bg-slate-900 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
          : "bg-slate-950/50 border-slate-800 hover:bg-slate-900 hover:border-slate-700"
      )}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
        </div>
      )}

      {/* Chain Icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-white bg-linear-to-br transition-transform group-hover:scale-105",
          chain.color
        )}
      >
        {chain.icon}
      </div>

      {/* Chain Info */}
      <div className="font-semibold text-sm text-slate-200 group-hover:text-white mb-1">
        {chain.name}
      </div>

      {/* Chain Details */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>{chain.currency}</span>
        <span>•</span>
        <span>Testnet</span>
      </div>

      {/* Status / Actions */}
      <div className="mt-3">
        {needsSwitch ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSwitch();
            }}
            className={cn(
              "w-full py-1.5 flex items-center justify-center gap-1.5",
              "text-xs bg-yellow-500/10 text-yellow-400",
              "border border-yellow-500/30 rounded-lg",
              "hover:bg-yellow-500/20 transition-colors"
            )}
          >
            <ArrowRightLeft className="w-3 h-3" />
            Switch Network
          </button>
        ) : isSelected && isConnected ? (
          <div className="flex items-center justify-between">
            <div className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Connected
            </div>
            <ChainLinks chain={chain} />
          </div>
        ) : (
          <div className="h-6" /> // Spacer for consistent height
        )}
      </div>
    </div>
  );
};

// Quick links for selected chain
const ChainLinks = ({ chain }: { chain: ChainConfig }) => {
  const faucetUrls: Record<string, string> = {
    "eth-sepolia": "https://sepoliafaucet.com",
    "poly-amoy": "https://faucet.polygon.technology",
    "base-sepolia": "https://www.coinbase.com/faucets/base-ethereum-goerli-faucet",
    "arb-sepolia": "https://faucet.quicknode.com/arbitrum/sepolia",
    "op-sepolia": "https://app.optimism.io/faucet",
  };

  const faucetUrl = faucetUrls[chain.id];

  return (
    <div className="flex items-center gap-1">
      {faucetUrl && (
        <a
          href={faucetUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1 hover:bg-slate-800 rounded transition-colors"
          title="Get testnet tokens"
        >
          <Droplets className="w-3 h-3 text-cyan-400" />
        </a>
      )}
      <a
        href={chain.blockExplorer}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="p-1 hover:bg-slate-800 rounded transition-colors"
        title="View explorer"
      >
        <ExternalLink className="w-3 h-3 text-slate-400" />
      </a>
    </div>
  );
};

// Compact chain selector for header/mobile
interface CompactChainSelectorProps {
  selected: ChainConfig | null;
  onSelect: (chain: ChainConfig) => void;
}

export const CompactChainSelector = ({
  selected,
  onSelect,
}: CompactChainSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg",
          "bg-slate-900 border border-slate-800",
          "hover:border-slate-700 transition-colors"
        )}
      >
        {selected ? (
          <>
            <div
              className={cn(
                "w-5 h-5 rounded flex items-center justify-center text-white text-xs bg-linear-to-br",
                selected.color
              )}
            >
              {selected.icon}
            </div>
            <span className="text-sm text-slate-300 hidden sm:inline">
              {selected.name}
            </span>
          </>
        ) : (
          <span className="text-sm text-slate-400">Select Chain</span>
        )}
        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-400 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 right-0 z-50 w-64 p-2 bg-slate-900 border border-slate-800 rounded-xl shadow-xl">
            {CHAINS.map((chain) => (
              <button
                key={chain.id}
                onClick={() => {
                  onSelect(chain);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg transition-colors",
                  selected?.id === chain.id
                    ? "bg-cyan-500/10 text-cyan-400"
                    : "hover:bg-slate-800 text-slate-300"
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded flex items-center justify-center text-white text-xs bg-linear-to-br",
                    chain.color
                  )}
                >
                  {chain.icon}
                </div>
                <span className="text-sm">{chain.name}</span>
                {selected?.id === chain.id && (
                  <CheckCircle2 className="w-4 h-4 ml-auto" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};