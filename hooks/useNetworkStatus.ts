import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { ChainConfig } from "@/config/constants";

export interface NetworkStatus {
  isOnline: boolean;
  latency: number | null; // in ms
  blockNumber: number | null;
  gasPrice: string | null;
  health: "excellent" | "good" | "slow" | "offline";
  lastChecked: number;
}

export interface UseNetworkStatusReturn {
  status: NetworkStatus;
  isChecking: boolean;
  checkNow: () => Promise<void>;
}

const getHealthFromLatency = (
  latency: number | null
): NetworkStatus["health"] => {
  if (latency === null) return "offline";
  if (latency < 500) return "excellent";
  if (latency < 1500) return "good";
  return "slow";
};

export function useNetworkStatus(
  chain: ChainConfig | null,
  refreshInterval: number = 30000
): UseNetworkStatusReturn {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: false,
    latency: null,
    blockNumber: null,
    gasPrice: null,
    health: "offline",
    lastChecked: 0,
  });
  const [isChecking, setIsChecking] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkNetwork = useCallback(async () => {
    if (!chain) {
      setStatus({
        isOnline: false,
        latency: null,
        blockNumber: null,
        gasPrice: null,
        health: "offline",
        lastChecked: Date.now(),
      });
      return;
    }

    setIsChecking(true);
    const startTime = performance.now();

    try {
      const provider = new ethers.JsonRpcProvider(chain.rpcUrl);

      // Parallel requests for speed
      const [blockNumber, feeData] = await Promise.race([
        Promise.all([provider.getBlockNumber(), provider.getFeeData()]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 10000)
        ),
      ]);

      const latency = Math.round(performance.now() - startTime);
      const gasPrice = feeData.gasPrice
        ? `${parseFloat(ethers.formatUnits(feeData.gasPrice, "gwei")).toFixed(
            2
          )} Gwei`
        : null;

      setStatus({
        isOnline: true,
        latency,
        blockNumber,
        gasPrice,
        health: getHealthFromLatency(latency),
        lastChecked: Date.now(),
      });
    } catch (err) {
      const latency = Math.round(performance.now() - startTime);
      setStatus({
        isOnline: false,
        latency: latency > 10000 ? null : latency,
        blockNumber: null,
        gasPrice: null,
        health: "offline",
        lastChecked: Date.now(),
      });
    } finally {
      setIsChecking(false);
    }
  }, [chain]);

  // Initial check and interval
  useEffect(() => {
    checkNetwork();

    if (refreshInterval > 0) {
      intervalRef.current = setInterval(checkNetwork, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkNetwork, refreshInterval]);

  return {
    status,
    isChecking,
    checkNow: checkNetwork,
  };
}

// Helper component for displaying network status
export const getStatusColor = (health: NetworkStatus["health"]): string => {
  switch (health) {
    case "excellent":
      return "text-green-400";
    case "good":
      return "text-yellow-400";
    case "slow":
      return "text-orange-400";
    case "offline":
      return "text-red-400";
  }
};

export const getStatusBgColor = (health: NetworkStatus["health"]): string => {
  switch (health) {
    case "excellent":
      return "bg-green-500";
    case "good":
      return "bg-yellow-500";
    case "slow":
      return "bg-orange-500";
    case "offline":
      return "bg-red-500";
  }
};
