import { useState, useEffect, useCallback } from "react";

export interface DeploymentRecord {
  id: string;
  timestamp: number;
  chainId: number;
  chainName: string;
  tokenName: string;
  tokenSymbol: string;
  totalSupply: number;
  contractAddress: string;
  txHash: string;
  deployer: string;
  explorerUrl: string;
  verified: boolean;
  status: "success" | "pending" | "failed";
}

const STORAGE_KEY = "omni_deployer_history";
const MAX_HISTORY = 50;

export function useDeploymentHistory() {
  const [history, setHistory] = useState<DeploymentRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DeploymentRecord[];
        setHistory(parsed);
      }
    } catch (err) {
      console.error("Failed to load deployment history:", err);
    }
    setIsLoaded(true);
  }, []);

  // Save history to localStorage
  const saveHistory = useCallback((records: DeploymentRecord[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (err) {
      console.error("Failed to save deployment history:", err);
    }
  }, []);

  // Add new deployment
  const addDeployment = useCallback(
    (deployment: Omit<DeploymentRecord, "id" | "timestamp">) => {
      const newRecord: DeploymentRecord = {
        ...deployment,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };

      setHistory((prev) => {
        const updated = [newRecord, ...prev].slice(0, MAX_HISTORY);
        saveHistory(updated);
        return updated;
      });

      return newRecord.id;
    },
    [saveHistory]
  );

  // Update deployment status
  const updateDeployment = useCallback(
    (id: string, updates: Partial<DeploymentRecord>) => {
      setHistory((prev) => {
        const updated = prev.map((record) =>
          record.id === id ? { ...record, ...updates } : record
        );
        saveHistory(updated);
        return updated;
      });
    },
    [saveHistory]
  );

  // Mark as verified
  const markVerified = useCallback(
    (id: string) => {
      updateDeployment(id, { verified: true });
    },
    [updateDeployment]
  );

  // Remove deployment
  const removeDeployment = useCallback(
    (id: string) => {
      setHistory((prev) => {
        const updated = prev.filter((record) => record.id !== id);
        saveHistory(updated);
        return updated;
      });
    },
    [saveHistory]
  );

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Get deployments by chain
  const getByChain = useCallback(
    (chainId: number) => {
      return history.filter((record) => record.chainId === chainId);
    },
    [history]
  );

  // Get deployments by deployer
  const getByDeployer = useCallback(
    (address: string) => {
      return history.filter(
        (record) => record.deployer.toLowerCase() === address.toLowerCase()
      );
    },
    [history]
  );

  // Get recent deployments
  const getRecent = useCallback(
    (count: number = 5) => {
      return history.slice(0, count);
    },
    [history]
  );

  return {
    history,
    isLoaded,
    addDeployment,
    updateDeployment,
    markVerified,
    removeDeployment,
    clearHistory,
    getByChain,
    getByDeployer,
    getRecent,
  };
}

// Helper to format relative time
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}
