import { ChainConfig } from "@/config/constants";
import { useCallback, useEffect, useState, useRef } from "react";
import { ethers } from "ethers";

interface Web3State {
  account: string | null;
  chainId: number | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  balance: string | null;
  provider: ethers.BrowserProvider | null;
}

interface UseWeb3Return extends Omit<Web3State, "provider"> {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chain: ChainConfig) => Promise<boolean>;
  refreshBalance: () => Promise<void>;
  isCorrectNetwork: (targetChainId: number) => boolean;
  formatBalance: (decimals?: number) => string;
}

export function useWeb3(): UseWeb3Return {
  const [state, setState] = useState<Web3State>({
    account: null,
    chainId: null,
    isConnecting: false,
    isConnected: false,
    error: null,
    balance: null,
    provider: null,
  });

  const providerRef = useRef<ethers.BrowserProvider | null>(null);

  const getEthereum = useCallback(() => {
    if (typeof window === "undefined") return null;
    return window.ethereum ?? null;
  }, []);

  const updateState = useCallback((updates: Partial<Web3State>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const refreshBalance = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum || !state.account) return;

    try {
      const provider = new ethers.BrowserProvider(ethereum);
      const balance = await provider.getBalance(state.account);
      updateState({ balance: ethers.formatEther(balance) });
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    }
  }, [getEthereum, state.account, updateState]);

  const connect = useCallback(async () => {
    const ethereum = getEthereum();

    if (!ethereum) {
      updateState({
        error: "No wallet detected. Please install MetaMask.",
      });
      return;
    }

    updateState({ isConnecting: true, error: null });

    try {
      const accounts = (await ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned");
      }

      const chainIdHex = (await ethereum.request({
        method: "eth_chainId",
      })) as string;

      const chainId = parseInt(chainIdHex, 16);

      const provider = new ethers.BrowserProvider(ethereum);
      providerRef.current = provider;

      const balance = await provider.getBalance(accounts[0]);

      updateState({
        account: accounts[0],
        chainId,
        isConnected: true,
        balance: ethers.formatEther(balance),
        provider,
        error: null,
      });
    } catch (err) {
      let errorMessage = "Connection failed";

      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes("user rejected") || msg.includes("user denied")) {
          errorMessage = "Connection rejected by user";
        } else if (msg.includes("already pending")) {
          errorMessage =
            "Connection request already pending. Check your wallet.";
        } else {
          errorMessage = err.message;
        }
      }

      updateState({ error: errorMessage });
    } finally {
      updateState({ isConnecting: false });
    }
  }, [getEthereum, updateState]);

  const disconnect = useCallback(() => {
    providerRef.current = null;
    updateState({
      account: null,
      chainId: null,
      isConnected: false,
      balance: null,
      provider: null,
      error: null,
    });
  }, [updateState]);

  const switchNetwork = useCallback(
    async (chain: ChainConfig): Promise<boolean> => {
      const ethereum = getEthereum();
      if (!ethereum) return false;

      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chain.hexChainId }],
        });
        return true;
      } catch (switchError) {
        const error = switchError as { code?: number };

        if (error.code === 4902) {
          try {
            await ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: chain.hexChainId,
                  chainName: chain.name,
                  rpcUrls: [chain.rpcUrl],
                  blockExplorerUrls: [chain.blockExplorer],
                  nativeCurrency: {
                    name: chain.currency,
                    symbol: chain.currency,
                    decimals: 18,
                  },
                },
              ],
            });
            return true;
          } catch (addError) {
            updateState({
              error: `Could not add ${chain.name} to your wallet`,
            });
            return false;
          }
        }

        updateState({
          error: `Could not switch to ${chain.name}`,
        });
        return false;
      }
    },
    [getEthereum, updateState]
  );

  const isCorrectNetwork = useCallback(
    (targetChainId: number): boolean => {
      return state.chainId === targetChainId;
    },
    [state.chainId]
  );

  const formatBalance = useCallback(
    (decimals: number = 4): string => {
      if (!state.balance) return "0";
      const num = parseFloat(state.balance);
      return num.toFixed(decimals);
    },
    [state.balance]
  );

  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[];
      if (accs.length === 0) {
        disconnect();
      } else if (accs[0] !== state.account) {
        updateState({ account: accs[0] });
        refreshBalance();
      }
    };

    const handleChainChanged = (chainIdHex: unknown) => {
      const chainId = parseInt(chainIdHex as string, 16);
      updateState({ chainId });
      refreshBalance();
    };

    const handleDisconnect = () => {
      disconnect();
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);
    ethereum.on("disconnect", handleDisconnect);

    // Check for existing connection
    ethereum.request({ method: "eth_accounts" }).then((accounts: unknown) => {
      const accs = accounts as string[];
      if (accs.length > 0) {
        connect();
      }
    });

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
      ethereum.removeListener("disconnect", handleDisconnect);
    };
  }, [
    getEthereum,
    state.account,
    connect,
    disconnect,
    updateState,
    refreshBalance,
  ]);

  return {
    account: state.account,
    chainId: state.chainId,
    isConnecting: state.isConnecting,
    isConnected: state.isConnected,
    error: state.error,
    balance: state.balance,
    connect,
    disconnect,
    switchNetwork,
    refreshBalance,
    isCorrectNetwork,
    formatBalance,
  };
}
