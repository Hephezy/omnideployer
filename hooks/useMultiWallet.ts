import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";

export type WalletType = "metamask" | "coinbase" | "walletconnect" | "injected";

export interface WalletOption {
  id: WalletType;
  name: string;
  icon: string;
  installed: boolean;
  description: string;
}

export interface MultiWalletState {
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  activeWallet: WalletType | null;
  error: string | null;
  balance: string | null;
}

interface EthereumProvider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  providers?: EthereumProvider[];
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (
    event: string,
    handler: (...args: unknown[]) => void
  ) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
    coinbaseWalletExtension?: EthereumProvider;
  }
}

// Detect available wallets
function detectWallets(): WalletOption[] {
  const wallets: WalletOption[] = [];

  if (typeof window === "undefined") return wallets;

  const ethereum = window.ethereum;

  // Check for MetaMask
  const hasMetaMask = ethereum?.isMetaMask && !ethereum?.isCoinbaseWallet;
  wallets.push({
    id: "metamask",
    name: "MetaMask",
    icon: "🦊",
    installed: !!hasMetaMask,
    description: "Connect using MetaMask browser extension",
  });

  // Check for Coinbase Wallet
  const hasCoinbase =
    ethereum?.isCoinbaseWallet ||
    !!window.coinbaseWalletExtension ||
    ethereum?.providers?.some((p) => p.isCoinbaseWallet);
  wallets.push({
    id: "coinbase",
    name: "Coinbase Wallet",
    icon: "💰",
    installed: !!hasCoinbase,
    description: "Connect using Coinbase Wallet",
  });

  // Generic injected wallet
  if (ethereum && !hasMetaMask && !hasCoinbase) {
    wallets.push({
      id: "injected",
      name: "Browser Wallet",
      icon: "🔗",
      installed: true,
      description: "Connect using your browser wallet",
    });
  }

  // WalletConnect (always available as it uses QR)
  wallets.push({
    id: "walletconnect",
    name: "WalletConnect",
    icon: "📱",
    installed: true,
    description: "Scan QR code with mobile wallet",
  });

  return wallets;
}

// Get the correct provider for a wallet type
function getProvider(walletType: WalletType): EthereumProvider | null {
  if (typeof window === "undefined") return null;

  const ethereum = window.ethereum;
  if (!ethereum) return null;

  switch (walletType) {
    case "metamask":
      // Handle case where multiple wallets are injected
      if (ethereum.providers) {
        return (
          ethereum.providers.find((p) => p.isMetaMask && !p.isCoinbaseWallet) ||
          null
        );
      }
      return ethereum.isMetaMask ? ethereum : null;

    case "coinbase":
      if (window.coinbaseWalletExtension) {
        return window.coinbaseWalletExtension;
      }
      if (ethereum.providers) {
        return ethereum.providers.find((p) => p.isCoinbaseWallet) || null;
      }
      return ethereum.isCoinbaseWallet ? ethereum : null;

    case "injected":
      return ethereum;

    case "walletconnect":
      // WalletConnect would need additional setup with @walletconnect/client
      // For now, return null and show instructions
      return null;

    default:
      return null;
  }
}

export function useMultiWallet() {
  const [state, setState] = useState<MultiWalletState>({
    account: null,
    chainId: null,
    isConnected: false,
    isConnecting: false,
    activeWallet: null,
    error: null,
    balance: null,
  });

  const [availableWallets, setAvailableWallets] = useState<WalletOption[]>([]);

  // Detect wallets on mount
  useEffect(() => {
    setAvailableWallets(detectWallets());
  }, []);

  const updateState = useCallback((updates: Partial<MultiWalletState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const refreshBalance = useCallback(
    async (provider: EthereumProvider, account: string) => {
      try {
        const ethersProvider = new ethers.BrowserProvider(
          provider as ethers.Eip1193Provider
        );
        const balance = await ethersProvider.getBalance(account);
        updateState({ balance: ethers.formatEther(balance) });
      } catch (err) {
        console.error("Failed to get balance:", err);
      }
    },
    [updateState]
  );

  const connect = useCallback(
    async (walletType: WalletType) => {
      updateState({ isConnecting: true, error: null });

      try {
        if (walletType === "walletconnect") {
          updateState({
            isConnecting: false,
            error:
              "WalletConnect requires additional setup. Please use MetaMask or Coinbase Wallet.",
          });
          return;
        }

        const provider = getProvider(walletType);
        if (!provider) {
          const walletName =
            availableWallets.find((w) => w.id === walletType)?.name ||
            walletType;
          throw new Error(
            `${walletName} is not installed. Please install it first.`
          );
        }

        // Request accounts
        const accounts = (await provider.request({
          method: "eth_requestAccounts",
        })) as string[];

        if (!accounts || accounts.length === 0) {
          throw new Error("No accounts found");
        }

        // Get chain ID
        const chainIdHex = (await provider.request({
          method: "eth_chainId",
        })) as string;

        const chainId = parseInt(chainIdHex, 16);

        updateState({
          account: accounts[0],
          chainId,
          isConnected: true,
          activeWallet: walletType,
          error: null,
        });

        // Get balance
        await refreshBalance(provider, accounts[0]);

        // Setup listeners
        const handleAccountsChanged = (accs: unknown) => {
          const accounts = accs as string[];
          if (accounts.length === 0) {
            disconnect();
          } else {
            updateState({ account: accounts[0] });
            refreshBalance(provider, accounts[0]);
          }
        };

        const handleChainChanged = (chainIdHex: unknown) => {
          const newChainId = parseInt(chainIdHex as string, 16);
          updateState({ chainId: newChainId });
        };

        provider.on("accountsChanged", handleAccountsChanged);
        provider.on("chainChanged", handleChainChanged);
      } catch (err) {
        let errorMessage = "Failed to connect";
        if (err instanceof Error) {
          if (err.message.includes("rejected")) {
            errorMessage = "Connection request was rejected";
          } else {
            errorMessage = err.message;
          }
        }
        updateState({ error: errorMessage });
      } finally {
        updateState({ isConnecting: false });
      }
    },
    [availableWallets, refreshBalance, updateState]
  );

  const disconnect = useCallback(() => {
    setState({
      account: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      activeWallet: null,
      error: null,
      balance: null,
    });
  }, []);

  const switchNetwork = useCallback(
    async (
      chainId: string,
      chainConfig?: {
        chainId: string;
        chainName: string;
        rpcUrls: string[];
        blockExplorerUrls: string[];
        nativeCurrency: { name: string; symbol: string; decimals: number };
      }
    ) => {
      if (!state.activeWallet) return false;

      const provider = getProvider(state.activeWallet);
      if (!provider) return false;

      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId }],
        });
        return true;
      } catch (switchError) {
        const err = switchError as { code?: number };
        if (err.code === 4902 && chainConfig) {
          try {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [chainConfig],
            });
            return true;
          } catch {
            return false;
          }
        }
        return false;
      }
    },
    [state.activeWallet]
  );

  // Check for existing connection on mount
  useEffect(() => {
    const checkExisting = async () => {
      const walletTypes: WalletType[] = ["metamask", "coinbase", "injected"];

      for (const walletType of walletTypes) {
        const provider = getProvider(walletType);
        if (!provider) continue;

        try {
          const accounts = (await provider.request({
            method: "eth_accounts",
          })) as string[];

          if (accounts && accounts.length > 0) {
            const chainIdHex = (await provider.request({
              method: "eth_chainId",
            })) as string;

            updateState({
              account: accounts[0],
              chainId: parseInt(chainIdHex, 16),
              isConnected: true,
              activeWallet: walletType,
            });

            refreshBalance(provider, accounts[0]);
            break;
          }
        } catch {
          continue;
        }
      }
    };

    checkExisting();
  }, [refreshBalance, updateState]);

  return {
    ...state,
    availableWallets,
    connect,
    disconnect,
    switchNetwork,
    refreshBalance: () => {
      if (state.activeWallet && state.account) {
        const provider = getProvider(state.activeWallet);
        if (provider) {
          refreshBalance(provider, state.account);
        }
      }
    },
  };
}
