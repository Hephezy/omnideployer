import { useState, useEffect, useCallback, useMemo } from "react";

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

// SSR-safe localStorage wrapper
const safeStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn("localStorage.getItem failed:", error);
      return null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    if (typeof window === "undefined") return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn("localStorage.setItem failed:", error);
      return false;
    }
  },

  removeItem: (key: string): boolean => {
    if (typeof window === "undefined") return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn("localStorage.removeItem failed:", error);
      return false;
    }
  },
};

// Parse stored history with validation
function parseHistory(stored: string | null): DeploymentRecord[] {
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);

    // Validate array
    if (!Array.isArray(parsed)) return [];

    // Validate and filter valid records
    return parsed.filter((record): record is DeploymentRecord => {
      return (
        typeof record === "object" &&
        record !== null &&
        typeof record.id === "string" &&
        typeof record.timestamp === "number" &&
        typeof record.chainId === "number" &&
        typeof record.contractAddress === "string" &&
        typeof record.tokenName === "string" &&
        typeof record.tokenSymbol === "string"
      );
    });
  } catch (error) {
    console.warn("Failed to parse deployment history:", error);
    return [];
  }
}

export function useDeploymentHistory() {
  const [history, setHistory] = useState<DeploymentRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const stored = safeStorage.getItem(STORAGE_KEY);
    const parsed = parseHistory(stored);
    setHistory(parsed);
    setIsLoaded(true);
  }, []);

  // Save history to localStorage
  const saveHistory = useCallback((records: DeploymentRecord[]): boolean => {
    try {
      const success = safeStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      if (!success) {
        setStorageError("Failed to save deployment history");
      } else {
        setStorageError(null);
      }
      return success;
    } catch (error) {
      setStorageError("Failed to serialize deployment history");
      return false;
    }
  }, []);

  // Add new deployment
  const addDeployment = useCallback(
    (deployment: Omit<DeploymentRecord, "id" | "timestamp">): string => {
      const newRecord: DeploymentRecord = {
        ...deployment,
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
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

  // Update existing deployment
  const updateDeployment = useCallback(
    (id: string, updates: Partial<DeploymentRecord>): boolean => {
      let found = false;

      setHistory((prev) => {
        const updated = prev.map((record) => {
          if (record.id === id) {
            found = true;
            return { ...record, ...updates };
          }
          return record;
        });

        if (found) {
          saveHistory(updated);
        }

        return updated;
      });

      return found;
    },
    [saveHistory]
  );

  // Mark deployment as verified
  const markVerified = useCallback(
    (id: string): boolean => {
      return updateDeployment(id, { verified: true });
    },
    [updateDeployment]
  );

  // Update deployment status
  const updateStatus = useCallback(
    (id: string, status: DeploymentRecord["status"]): boolean => {
      return updateDeployment(id, { status });
    },
    [updateDeployment]
  );

  // Remove single deployment
  const removeDeployment = useCallback(
    (id: string): boolean => {
      let found = false;

      setHistory((prev) => {
        const updated = prev.filter((record) => {
          if (record.id === id) {
            found = true;
            return false;
          }
          return true;
        });

        if (found) {
          saveHistory(updated);
        }

        return updated;
      });

      return found;
    },
    [saveHistory]
  );

  // Clear all history
  const clearHistory = useCallback((): boolean => {
    setHistory([]);
    return safeStorage.removeItem(STORAGE_KEY);
  }, []);

  // Get deployments by chain
  const getByChain = useCallback(
    (chainId: number): DeploymentRecord[] => {
      return history.filter((record) => record.chainId === chainId);
    },
    [history]
  );

  // Get deployments by deployer address
  const getByDeployer = useCallback(
    (address: string): DeploymentRecord[] => {
      const lowerAddress = address.toLowerCase();
      return history.filter(
        (record) => record.deployer.toLowerCase() === lowerAddress
      );
    },
    [history]
  );

  // Get recent deployments
  const getRecent = useCallback(
    (count: number = 5): DeploymentRecord[] => {
      return history.slice(0, Math.min(count, history.length));
    },
    [history]
  );

  // Get deployment by ID
  const getById = useCallback(
    (id: string): DeploymentRecord | undefined => {
      return history.find((record) => record.id === id);
    },
    [history]
  );

  // Get deployment by contract address
  const getByAddress = useCallback(
    (address: string): DeploymentRecord | undefined => {
      const lowerAddress = address.toLowerCase();
      return history.find(
        (record) => record.contractAddress.toLowerCase() === lowerAddress
      );
    },
    [history]
  );

  // Statistics
  const stats = useMemo(() => {
    const successful = history.filter((r) => r.status === "success").length;
    const failed = history.filter((r) => r.status === "failed").length;
    const verified = history.filter((r) => r.verified).length;

    const chainCounts = history.reduce((acc, record) => {
      acc[record.chainName] = (acc[record.chainName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: history.length,
      successful,
      failed,
      verified,
      byChain: chainCounts,
    };
  }, [history]);

  // Export history as JSON
  const exportHistory = useCallback((): string => {
    return JSON.stringify(history, null, 2);
  }, [history]);

  // Import history from JSON
  const importHistory = useCallback(
    (jsonString: string, merge: boolean = false): boolean => {
      try {
        const imported = parseHistory(jsonString);

        if (imported.length === 0) {
          return false;
        }

        setHistory((prev) => {
          const newHistory = merge
            ? [...imported, ...prev].slice(0, MAX_HISTORY)
            : imported.slice(0, MAX_HISTORY);

          // Deduplicate by ID
          const seen = new Set<string>();
          const deduplicated = newHistory.filter((record) => {
            if (seen.has(record.id)) return false;
            seen.add(record.id);
            return true;
          });

          saveHistory(deduplicated);
          return deduplicated;
        });

        return true;
      } catch {
        return false;
      }
    },
    [saveHistory]
  );

  return {
    // Data
    history,
    isLoaded,
    storageError,
    stats,

    // CRUD operations
    addDeployment,
    updateDeployment,
    removeDeployment,
    clearHistory,

    // Status updates
    markVerified,
    updateStatus,

    // Queries
    getByChain,
    getByDeployer,
    getRecent,
    getById,
    getByAddress,

    // Import/Export
    exportHistory,
    importHistory,
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
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months}mo ago`;
  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  if (seconds > 10) return `${seconds}s ago`;
  return "Just now";
}

// Helper to format date
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
