import { ethers } from "ethers";
import { ChainConfig } from "@/config/chains/types";

export interface SimulationResult {
  success: boolean;
  gasUsed: bigint;
  gasLimit: bigint;
  estimatedCost: {
    min: string;
    max: string;
    symbol: string;
  };
  warnings: SimulationWarning[];
  errors: SimulationError[];
  stateChanges?: StateChange[];
}

export interface SimulationWarning {
  type:
    | "high_gas"
    | "low_balance"
    | "contract_interaction"
    | "approval_required";
  message: string;
  severity: "low" | "medium" | "high";
}

export interface SimulationError {
  type: "revert" | "out_of_gas" | "invalid_params" | "network_error";
  message: string;
  decodedReason?: string;
}

export interface StateChange {
  type: "balance_change" | "token_transfer" | "approval" | "contract_creation";
  description: string;
  from?: string;
  to?: string;
  value?: string;
}

export class TransactionSimulator {
  /**
   * Simulate an EVM transaction before execution
   */
  static async simulateEVMTransaction(
    chain: ChainConfig,
    tx: ethers.TransactionRequest,
    userAddress: string,
    provider: ethers.Provider
  ): Promise<SimulationResult> {
    const warnings: SimulationWarning[] = [];
    const errors: SimulationError[] = [];
    const stateChanges: StateChange[] = [];

    try {
      // Get user balance
      const balance = await provider.getBalance(userAddress);

      // Estimate gas
      let gasLimit: bigint;
      try {
        gasLimit = await provider.estimateGas({
          ...tx,
          from: userAddress,
        });
      } catch (err) {
        // Try to decode revert reason
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        errors.push({
          type: "revert",
          message: "Transaction would fail",
          decodedReason: this.decodeRevertReason(errorMsg),
        });

        return {
          success: false,
          gasUsed: BigInt(0),
          gasLimit: BigInt(0),
          estimatedCost: {
            min: "0",
            max: "0",
            symbol: chain.nativeCurrency.symbol,
          },
          warnings,
          errors,
        };
      }

      // Add buffer to gas limit
      const gasLimitWithBuffer = (gasLimit * BigInt(120)) / BigInt(100);

      // Get fee data
      const feeData = await provider.getFeeData();

      // Calculate costs
      const minCost = gasLimit * (feeData.gasPrice ?? BigInt(0));
      const maxCost =
        gasLimitWithBuffer *
        (feeData.maxFeePerGas ?? feeData.gasPrice ?? BigInt(0));

      // Check balance warnings
      if (balance < maxCost) {
        warnings.push({
          type: "low_balance",
          message: `Insufficient balance. Need ~${ethers.formatUnits(
            maxCost,
            chain.nativeCurrency.decimals
          )} ${chain.nativeCurrency.symbol}`,
          severity: "high",
        });
      } else if (balance < maxCost * BigInt(2)) {
        warnings.push({
          type: "low_balance",
          message: "Balance is low after this transaction",
          severity: "medium",
        });
      }

      // Check gas usage
      if (gasLimit > BigInt(500000)) {
        warnings.push({
          type: "high_gas",
          message: "This transaction uses significant gas",
          severity: "medium",
        });
      }

      // Contract creation detection
      if (!tx.to) {
        stateChanges.push({
          type: "contract_creation",
          description: "New contract will be deployed",
        });
      }

      return {
        success: true,
        gasUsed: gasLimit,
        gasLimit: gasLimitWithBuffer,
        estimatedCost: {
          min: ethers.formatUnits(minCost, chain.nativeCurrency.decimals),
          max: ethers.formatUnits(maxCost, chain.nativeCurrency.decimals),
          symbol: chain.nativeCurrency.symbol,
        },
        warnings,
        errors,
        stateChanges,
      };
    } catch (err) {
      errors.push({
        type: "network_error",
        message: err instanceof Error ? err.message : "Simulation failed",
      });

      return {
        success: false,
        gasUsed: BigInt(0),
        gasLimit: BigInt(0),
        estimatedCost: {
          min: "0",
          max: "0",
          symbol: chain.nativeCurrency.symbol,
        },
        warnings,
        errors,
      };
    }
  }

  /**
   * Decode common revert reasons
   */
  private static decodeRevertReason(errorMessage: string): string {
    const commonReasons: Record<string, string> = {
      "insufficient funds": "Not enough balance for transaction",
      "execution reverted": "Contract rejected the transaction",
      "out of gas": "Transaction requires more gas than allowed",
      "nonce too low": "Transaction nonce conflict",
      "replacement fee too low":
        "Gas price too low to replace pending transaction",
      "max fee per gas less than block base fee":
        "Gas price below network minimum",
    };

    const lowerMessage = errorMessage.toLowerCase();
    for (const [pattern, reason] of Object.entries(commonReasons)) {
      if (lowerMessage.includes(pattern)) {
        return reason;
      }
    }

    // Try to extract custom error from message
    const customErrorMatch = errorMessage.match(/reason="([^"]+)"/);
    if (customErrorMatch) {
      return customErrorMatch[1];
    }

    return "Transaction would fail - check parameters";
  }

  /**
   * Get human-readable summary of simulation
   */
  static getSummary(result: SimulationResult): string {
    if (!result.success) {
      const error = result.errors[0];
      return `❌ ${
        error?.decodedReason || error?.message || "Simulation failed"
      }`;
    }

    let summary = `✅ Transaction will succeed\n`;
    summary += `⛽ Estimated gas: ${result.gasLimit.toString()}\n`;
    summary += `💰 Cost: ${result.estimatedCost.min} - ${result.estimatedCost.max} ${result.estimatedCost.symbol}`;

    if (result.warnings.length > 0) {
      summary += "\n\n⚠️ Warnings:\n";
      result.warnings.forEach((w) => {
        summary += `• ${w.message}\n`;
      });
    }

    return summary;
  }
}

// React hook for simulation
import { useState, useCallback } from "react";

export function useTransactionSimulation() {
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const simulate = useCallback(
    async (
      chain: ChainConfig,
      tx: ethers.TransactionRequest,
      userAddress: string,
      provider: ethers.Provider
    ) => {
      setIsSimulating(true);
      try {
        const result = await TransactionSimulator.simulateEVMTransaction(
          chain,
          tx,
          userAddress,
          provider
        );
        setSimulation(result);
        return result;
      } finally {
        setIsSimulating(false);
      }
    },
    []
  );

  const clear = useCallback(() => {
    setSimulation(null);
  }, []);

  return {
    simulation,
    isSimulating,
    simulate,
    clear,
  };
}
