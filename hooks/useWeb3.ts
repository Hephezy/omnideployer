// hooks/useWeb3.ts - Enhanced version

import { ChainConfig } from "@/config/chains/types";
import { useCallback, useEffect, useState, useRef } from "react";
import { ethers } from "ethers";
import { DeployerError, ErrorCode } from "@/utils/errors";

interface Web3State {
  account: string | null;
  chainId: number | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: DeployerError | null;
  balance: string | null;
  provider: ethers.BrowserProvider | null;
}

interface UseWeb3Return extends Web3State {
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

  // Check if ethereum is available
  const getEthereum = useCallback(() => {
    if (typeof window === "undefined") return null;
    return window.ethereum ?? null;
  }, []);

  // Update state helper
  const updateState = useCallback((updates: Partial<Web3State>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Fetch balance
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

  // Connect wallet
  const connect = useCallback(async () => {
    const ethereum = getEthereum();

    if (!ethereum) {
      updateState({
        error: new DeployerError({
          code: ErrorCode.WALLET_NOT_FOUND,
          message: "No Ethereum provider found",
          userMessage: "No wallet detected. Please install MetaMask.",
          suggestion: "Install MetaMask from metamask.io",
          recoverable: false,
        }),
      });
      return;
    }

    updateState({ isConnecting: true, error: null });

    try {
      // Request accounts
      const accounts = (await ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned");
      }

      // Get chain ID
      const chainIdHex = (await ethereum.request({
        method: "eth_chainId",
      })) as string;

      const chainId = parseInt(chainIdHex, 16);

      // Create provider
      const provider = new ethers.BrowserProvider(ethereum);
      providerRef.current = provider;

      // Get balance
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
      const error = DeployerError.fromError(err, "EVM");
      updateState({ error });
    } finally {
      updateState({ isConnecting: false });
    }
  }, [getEthereum, updateState]);

  // Disconnect
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

  // Switch network
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

        // Chain not added - try to add it
        if (error.code === 4902) {
          try {
            await ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: chain.hexChainId,
                  chainName: chain.name,
                  rpcUrls: chain.rpcUrls,
                  blockExplorerUrls: chain.blockExplorers.map((e) => e.url),
                  nativeCurrency: {
                    name: chain.nativeCurrency.name,
                    symbol: chain.nativeCurrency.symbol,
                    decimals: chain.nativeCurrency.decimals,
                  },
                },
              ],
            });
            return true;
          } catch (addError) {
            updateState({
              error: new DeployerError({
                code: ErrorCode.NETWORK_SWITCH_FAILED,
                message: "Failed to add network",
                userMessage: `Could not add ${chain.name} to your wallet`,
                suggestion:
                  "Try adding the network manually in your wallet settings",
                recoverable: true,
                originalError: addError,
              }),
            });
            return false;
          }
        }

        updateState({
          error: new DeployerError({
            code: ErrorCode.NETWORK_SWITCH_FAILED,
            message: "Failed to switch network",
            userMessage: `Could not switch to ${chain.name}`,
            recoverable: true,
            originalError: switchError,
          }),
        });
        return false;
      }
    },
    [getEthereum, updateState]
  );

  // Check if on correct network
  const isCorrectNetwork = useCallback(
    (targetChainId: number): boolean => {
      return state.chainId === targetChainId;
    },
    [state.chainId]
  );

  // Format balance with decimals
  const formatBalance = useCallback(
    (decimals: number = 4): string => {
      if (!state.balance) return "0";
      const num = parseFloat(state.balance);
      return num.toFixed(decimals);
    },
    [state.balance]
  );

  // Set up event listeners
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
    ...state,
    connect,
    disconnect,
    switchNetwork,
    refreshBalance,
    isCorrectNetwork,
    formatBalance,
  };
}
