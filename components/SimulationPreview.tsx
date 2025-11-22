"use client";

import { useState, useCallback } from "react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { ethers } from "ethers";
import { ChainConfig, TOKEN_ABI } from "@/config/constants";
import { ERC20_BYTECODE } from "@/config/contracts/erc20";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Fuel,
  Info,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/utils";

interface SimulationResult {
  success: boolean;
  gasLimit: bigint;
  estimatedCost: {
    wei: bigint;
    formatted: string;
    usd?: string;
  };
  warnings: Array<{
    type: string;
    message: string;
    severity: "low" | "medium" | "high";
  }>;
  errors: Array<{
    type: string;
    message: string;
  }>;
}

interface SimulationPreviewProps {
  chain: ChainConfig | null;
  account: string | null;
  tokenConfig: {
    name: string;
    symbol: string;
    supply: number;
  };
  onSimulationComplete?: (result: SimulationResult) => void;
  className?: string;
}

export const SimulationPreview = ({
  chain,
  account,
  tokenConfig,
  onSimulationComplete,
  className,
}: SimulationPreviewProps) => {
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSimulate =
    chain &&
    account &&
    tokenConfig.name &&
    tokenConfig.symbol &&
    tokenConfig.supply > 0 &&
    window.ethereum;

  const runSimulation = useCallback(async () => {
    if (!canSimulate || !chain || !account) return;

    setIsSimulating(true);
    setError(null);
    setSimulation(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);

      // Create factory to get deployment transaction
      const signer = await provider.getSigner();
      const factory = new ethers.ContractFactory(
        TOKEN_ABI,
        ERC20_BYTECODE,
        signer
      );

      // Get deployment transaction data
      const deployTx = await factory.getDeployTransaction(
        tokenConfig.name,
        tokenConfig.symbol,
        tokenConfig.supply
      );

      // Get user balance
      const balance = await provider.getBalance(account);

      // Estimate gas
      let gasLimit: bigint;
      const warnings: SimulationResult["warnings"] = [];
      const errors: SimulationResult["errors"] = [];

      try {
        gasLimit = await provider.estimateGas({
          ...deployTx,
          from: account,
        });

        // Add 20% buffer
        gasLimit = (gasLimit * BigInt(120)) / BigInt(100);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";

        // Try to decode the error
        if (errorMsg.includes("insufficient funds")) {
          errors.push({
            type: "insufficient_funds",
            message: "Insufficient funds for gas fees",
          });
        } else if (errorMsg.includes("execution reverted")) {
          errors.push({
            type: "revert",
            message: "Contract deployment would fail",
          });
        } else {
          errors.push({
            type: "estimation_failed",
            message: errorMsg,
          });
        }

        setSimulation({
          success: false,
          gasLimit: BigInt(0),
          estimatedCost: {
            wei: BigInt(0),
            formatted: "0",
          },
          warnings: [],
          errors,
        });
        return;
      }

      // Get fee data
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || BigInt(0);
      const estimatedCostWei = gasLimit * gasPrice;

      // Check balance warnings
      if (balance < estimatedCostWei) {
        warnings.push({
          type: "low_balance",
          message: `Insufficient balance. Need ~${ethers.formatEther(estimatedCostWei)} ${chain.currency}`,
          severity: "high",
        });
      } else if (balance < estimatedCostWei * BigInt(2)) {
        warnings.push({
          type: "low_balance",
          message: "Balance will be low after deployment",
          severity: "medium",
        });
      }

      // Check gas usage
      if (gasLimit > BigInt(500000)) {
        warnings.push({
          type: "high_gas",
          message: "This deployment uses significant gas",
          severity: "low",
        });
      }

      // Check token config
      if (tokenConfig.supply > 1_000_000_000_000) {
        warnings.push({
          type: "high_supply",
          message: "Very large token supply",
          severity: "low",
        });
      }

      const result: SimulationResult = {
        success: errors.length === 0,
        gasLimit,
        estimatedCost: {
          wei: estimatedCostWei,
          formatted: `${parseFloat(ethers.formatEther(estimatedCostWei)).toFixed(6)} ${chain.currency}`,
        },
        warnings,
        errors,
      };

      setSimulation(result);
      onSimulationComplete?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setIsSimulating(false);
    }
  }, [canSimulate, chain, account, tokenConfig, onSimulationComplete]);

  // Initial state - not simulated yet
  if (!simulation && !isSimulating && !error) {
    return (
      <Card className={cn("p-4 bg-slate-900/30 border-slate-800", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-bold tracking-widest uppercase">
              Pre-Deploy Check
            </span>
          </div>
          <Button
            variant="ghost"
            onClick={runSimulation}
            disabled={!canSimulate || isSimulating}
            className="text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Simulate
          </Button>
        </div>
        <p className="text-sm text-slate-500 mt-2">
          Test your deployment before sending the transaction
        </p>
        {!canSimulate && (
          <p className="text-xs text-slate-600 mt-2">
            Fill in all token details to enable simulation
          </p>
        )}
      </Card>
    );
  }

  // Loading state
  if (isSimulating) {
    return (
      <Card className={cn("p-4 bg-slate-900/30 border-slate-800", className)}>
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          <div>
            <p className="text-sm text-slate-300">Running simulation...</p>
            <p className="text-xs text-slate-500">
              Estimating gas and checking for issues
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Error state
  if (error && !simulation) {
    return (
      <Card className={cn("p-4 bg-red-950/20 border-red-900/50", className)}>
        <div className="flex items-start gap-3">
          <ShieldX className="w-5 h-5 text-red-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-400">Simulation Failed</p>
            <p className="text-xs text-red-400/70 mt-1">{error}</p>
          </div>
          <Button
            variant="ghost"
            onClick={runSimulation}
            disabled={!canSimulate}
            className="text-xs"
          >
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  // Results state
  if (simulation) {
    return (
      <Card
        className={cn(
          "p-4 border",
          simulation.success
            ? simulation.warnings.length > 0
              ? "bg-yellow-950/20 border-yellow-900/50"
              : "bg-green-950/20 border-green-900/50"
            : "bg-red-950/20 border-red-900/50",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {simulation.success ? (
              simulation.warnings.length > 0 ? (
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-green-400" />
              )
            ) : (
              <ShieldX className="w-5 h-5 text-red-400" />
            )}
            <span
              className={cn(
                "font-medium text-sm",
                simulation.success
                  ? simulation.warnings.length > 0
                    ? "text-yellow-400"
                    : "text-green-400"
                  : "text-red-400"
              )}
            >
              {simulation.success
                ? simulation.warnings.length > 0
                  ? "Ready with warnings"
                  : "Ready to deploy"
                : "Deployment will fail"}
            </span>
          </div>
          <Button
            variant="ghost"
            onClick={runSimulation}
            disabled={isSimulating}
            className="text-xs"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>

        {/* Cost Estimate */}
        {simulation.success && (
          <div className="flex items-center gap-2 p-2 bg-slate-800/30 rounded-lg mb-3">
            <Fuel className="w-4 h-4 text-slate-400" />
            <div className="flex-1">
              <p className="text-xs text-slate-500">Estimated Cost</p>
              <p className="text-sm text-white font-mono">
                {simulation.estimatedCost.formatted}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Gas Limit</p>
              <p className="text-sm text-slate-400 font-mono">
                {simulation.gasLimit.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Warnings */}
        {simulation.warnings.length > 0 && (
          <div className="space-y-2 mb-3">
            {simulation.warnings.map((warning, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-2 p-2 rounded text-xs",
                  warning.severity === "high"
                    ? "bg-red-500/10 text-red-400"
                    : warning.severity === "medium"
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "bg-blue-500/10 text-blue-400"
                )}
              >
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{warning.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Errors */}
        {simulation.errors.length > 0 && (
          <div className="space-y-2">
            {simulation.errors.map((err, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded bg-red-500/10 text-red-400 text-xs"
              >
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{err.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Success indicator */}
        {simulation.success && simulation.warnings.length === 0 && (
          <div className="flex items-center gap-2 text-green-400 text-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>All checks passed - safe to deploy</span>
          </div>
        )}
      </Card>
    );
  }

  return null;
};

// Hook for using simulation in parent components
export function useSimulation() {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const simulate = useCallback(
    async (
      chain: ChainConfig,
      account: string,
      tokenConfig: { name: string; symbol: string; supply: number }
    ): Promise<SimulationResult | null> => {
      if (!window.ethereum) return null;

      setIsSimulating(true);
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const factory = new ethers.ContractFactory(
          TOKEN_ABI,
          ERC20_BYTECODE,
          signer
        );

        const deployTx = await factory.getDeployTransaction(
          tokenConfig.name,
          tokenConfig.symbol,
          tokenConfig.supply
        );

        const gasLimit = await provider.estimateGas({
          ...deployTx,
          from: account,
        });

        const feeData = await provider.getFeeData();
        const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || BigInt(0);
        const estimatedCostWei = gasLimit * gasPrice;

        const simulationResult: SimulationResult = {
          success: true,
          gasLimit: (gasLimit * BigInt(120)) / BigInt(100),
          estimatedCost: {
            wei: estimatedCostWei,
            formatted: `${parseFloat(ethers.formatEther(estimatedCostWei)).toFixed(6)} ${chain.currency}`,
          },
          warnings: [],
          errors: [],
        };

        setResult(simulationResult);
        return simulationResult;
      } catch (err) {
        const errorResult: SimulationResult = {
          success: false,
          gasLimit: BigInt(0),
          estimatedCost: { wei: BigInt(0), formatted: "0" },
          warnings: [],
          errors: [
            {
              type: "simulation_error",
              message: err instanceof Error ? err.message : "Simulation failed",
            },
          ],
        };
        setResult(errorResult);
        return errorResult;
      } finally {
        setIsSimulating(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setResult(null);
  }, []);

  return {
    result,
    isSimulating,
    simulate,
    reset,
  };
}