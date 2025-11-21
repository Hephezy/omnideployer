import { Card } from "./ui/Card";
import { GasEstimation } from "@/hooks/useGasEstimation";
import { Fuel, RefreshCw, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/utils";
import { ethers } from "ethers";

interface GasEstimationCardProps {
  estimation: GasEstimation | null;
  isEstimating: boolean;
  error: string | null;
  lastUpdated: number | null;
  onRefresh: () => void;
  currency: string;
}

const date = Date.now();

export const GasEstimationCard = ({
  estimation,
  isEstimating,
  error,
  lastUpdated,
  onRefresh,
  currency,
}: GasEstimationCardProps) => {
  const formatGasPrice = (wei: bigint): string => {
    return `${parseFloat(ethers.formatUnits(wei, "gwei")).toFixed(2)} Gwei`;
  };



  const getTimeSinceUpdate = (): string => {
    if (!lastUpdated) return "";
    const seconds = Math.floor((date - lastUpdated) / 1000);
    if (seconds < 5) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  if (error) {
    return (
      <Card className="p-4 bg-red-950/20 border-red-900/50">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-400">Estimation Failed</p>
            <p className="text-xs text-red-400/70">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-slate-900/50 border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-cyan-400">
          <Fuel className="w-4 h-4" />
          <span className="text-xs font-bold tracking-widest uppercase">
            Gas Estimation
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={isEstimating}
          className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <RefreshCw
            className={cn(
              "w-3.5 h-3.5 text-slate-400",
              isEstimating && "animate-spin"
            )}
          />
        </button>
      </div>

      {!estimation && !isEstimating && (
        <p className="text-sm text-slate-500 italic">
          Fill in token details to estimate gas
        </p>
      )}

      {isEstimating && !estimation && (
        <div className="flex items-center gap-2 text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Calculating...</span>
        </div>
      )}

      {estimation && (
        <div className="space-y-3">
          {/* Estimated Cost */}
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Estimated Cost</span>
              {estimation.estimatedCostUsd && (
                <span className="text-xs text-slate-400">
                  {estimation.estimatedCostUsd}
                </span>
              )}
            </div>
            <p className="text-lg font-bold text-white mt-1">
              {estimation.estimatedCostFormatted}
            </p>
          </div>

          {/* Gas Details Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-slate-800/30 rounded-lg">
              <p className="text-xs text-slate-500">Gas Limit</p>
              <p className="text-sm font-mono text-slate-300">
                {estimation.gasLimit.toLocaleString()}
              </p>
            </div>

            <div className="p-2 bg-slate-800/30 rounded-lg">
              <p className="text-xs text-slate-500">
                {estimation.isEIP1559 ? "Max Fee" : "Gas Price"}
              </p>
              <p className="text-sm font-mono text-slate-300">
                {formatGasPrice(
                  estimation.isEIP1559 && estimation.maxFeePerGas
                    ? estimation.maxFeePerGas
                    : estimation.gasPrice
                )}
              </p>
            </div>

            {estimation.isEIP1559 && estimation.baseFee && (
              <>
                <div className="p-2 bg-slate-800/30 rounded-lg">
                  <p className="text-xs text-slate-500">Base Fee</p>
                  <p className="text-sm font-mono text-slate-300">
                    {formatGasPrice(estimation.baseFee)}
                  </p>
                </div>

                {estimation.maxPriorityFeePerGas && (
                  <div className="p-2 bg-slate-800/30 rounded-lg">
                    <p className="text-xs text-slate-500">Priority Fee</p>
                    <p className="text-sm font-mono text-slate-300">
                      {formatGasPrice(estimation.maxPriorityFeePerGas)}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* EIP-1559 Badge */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              {estimation.isEIP1559 ? (
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                  EIP-1559
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-slate-700 text-slate-400 rounded-full">
                  Legacy
                </span>
              )}
            </div>
            {lastUpdated && (
              <span className="text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {getTimeSinceUpdate()}
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};