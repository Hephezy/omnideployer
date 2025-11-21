import { useState, useCallback, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { ChainConfig } from "@/config/constants";
import { ERC20_ABI, ERC20_BYTECODE } from "@/config/contracts/erc20";

export interface GasEstimation {
  gasLimit: bigint;
  gasPrice: bigint;
  maxFeePerGas: bigint | null;
  maxPriorityFeePerGas: bigint | null;
  estimatedCostWei: bigint;
  estimatedCostFormatted: string;
  estimatedCostUsd: string | null;
  baseFee: bigint | null;
  isEIP1559: boolean;
}

export interface GasEstimationState {
  estimation: GasEstimation | null;
  isEstimating: boolean;
  error: string | null;
  lastUpdated: number | null;
}

// Simple price cache
let ethPriceCache: { price: number; timestamp: number } | null = null;
const PRICE_CACHE_TTL = 60000; // 1 minute

async function getEthPrice(): Promise<number | null> {
  if (ethPriceCache && Date.now() - ethPriceCache.timestamp < PRICE_CACHE_TTL) {
    return ethPriceCache.price;
  }

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    );
    const data = await response.json();
    const price = data.ethereum?.usd || null;

    if (price) {
      ethPriceCache = { price, timestamp: Date.now() };
    }
    return price;
  } catch {
    return ethPriceCache?.price || null;
  }
}

export function useGasEstimation(
  chain: ChainConfig | null,
  account: string | null,
  tokenConfig: { name: string; symbol: string; supply: number }
) {
  const [state, setState] = useState<GasEstimationState>({
    estimation: null,
    isEstimating: false,
    error: null,
    lastUpdated: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const estimate = useCallback(async () => {
    if (!chain || !account || !window.ethereum) {
      setState((prev) => ({ ...prev, estimation: null, error: null }));
      return;
    }

    if (!tokenConfig.name || !tokenConfig.symbol || tokenConfig.supply <= 0) {
      return;
    }

    // Cancel previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setState((prev) => ({ ...prev, isEstimating: true, error: null }));

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const factory = new ethers.ContractFactory(
        ERC20_ABI,
        ERC20_BYTECODE,
        signer
      );

      // Get deployment transaction data
      const deployTx = await factory.getDeployTransaction(
        tokenConfig.name,
        tokenConfig.symbol,
        tokenConfig.supply
      );

      // Estimate gas
      const gasLimit = await provider.estimateGas({
        ...deployTx,
        from: account,
      });

      // Get fee data
      const feeData = await provider.getFeeData();
      const block = await provider.getBlock("latest");

      const isEIP1559 = !!feeData.maxFeePerGas;
      const gasPrice = feeData.gasPrice || BigInt(0);
      const maxFeePerGas = feeData.maxFeePerGas;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      const baseFee = block?.baseFeePerGas || null;

      // Calculate cost with buffer
      const gasLimitWithBuffer = (gasLimit * BigInt(120)) / BigInt(100);
      const effectiveGasPrice = maxFeePerGas || gasPrice;
      const estimatedCostWei = gasLimitWithBuffer * effectiveGasPrice;

      // Format cost
      const estimatedCostFormatted = `${parseFloat(
        ethers.formatEther(estimatedCostWei)
      ).toFixed(6)} ${chain.currency}`;

      // Get USD price
      let estimatedCostUsd: string | null = null;
      const ethPrice = await getEthPrice();
      if (ethPrice) {
        const costInEth = parseFloat(ethers.formatEther(estimatedCostWei));
        estimatedCostUsd = `$${(costInEth * ethPrice).toFixed(2)}`;
      }

      setState({
        estimation: {
          gasLimit: gasLimitWithBuffer,
          gasPrice,
          maxFeePerGas,
          maxPriorityFeePerGas,
          estimatedCostWei,
          estimatedCostFormatted,
          estimatedCostUsd,
          baseFee,
          isEIP1559,
        },
        isEstimating: false,
        error: null,
        lastUpdated: Date.now(),
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;

      let errorMessage = "Failed to estimate gas";
      if (err instanceof Error) {
        if (err.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for deployment";
        } else if (err.message.includes("execution reverted")) {
          errorMessage = "Contract deployment would fail";
        }
      }

      setState((prev) => ({
        ...prev,
        isEstimating: false,
        error: errorMessage,
      }));
    }
  }, [
    chain,
    account,
    tokenConfig.name,
    tokenConfig.symbol,
    tokenConfig.supply,
  ]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (chain && account && tokenConfig.name && tokenConfig.symbol) {
      estimate();

      intervalRef.current = setInterval(estimate, 15000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [
    chain,
    account,
    tokenConfig.name,
    tokenConfig.symbol,
    tokenConfig.supply,
    estimate,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    refresh: estimate,
  };
}
