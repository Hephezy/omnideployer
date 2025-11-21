import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import {
  IChainAdapter,
  ChainType,
  WalletInfo,
  TokenBalance,
  TokenDeployParams,
  DeployResult,
  GasEstimate,
} from '@/services/interfaces/IChainAdapter';

// Import adapters
import { EVMAdapter } from '@/services/adapters/evm/EVMAdapter';
import { SolanaAdapter } from '@/services/adapters/solana/SolanaAdapter';
import { AptosAdapter } from '@/services/adapters/aptos/AptosAdapter';
import { SuiAdapter } from '@/services/adapters/sui/SuiAdapter';

// Import chain configs
import { EVM_CHAINS } from '@/config/chains/evm-chains';

interface MultiChainContextValue {
  // Current state
  activeChainType: ChainType | null;
  activeAdapter: IChainAdapter | null;
  wallet: WalletInfo | null;
  balance: TokenBalance | null;
  isConnecting: boolean;
  isDeploying: boolean;
  error: string | null;

  // Available chains
  availableChains: {
    type: ChainType;
    name: string;
    chains: { id: string; name: string; isTestnet: boolean }[];
  }[];

  // Actions
  selectChain: (type: ChainType, chainId: string) => void;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  deployToken: (params: TokenDeployParams) => Promise<DeployResult>;
  estimateDeployFee: (params: TokenDeployParams) => Promise<GasEstimate>;
  clearError: () => void;
}

const MultiChainContext = createContext<MultiChainContextValue | null>(null);

export function MultiChainProvider({ children }: { children: React.ReactNode }) {
  const [activeChainType, setActiveChainType] = useState<ChainType | null>(null);
  const [activeAdapter, setActiveAdapter] = useState<IChainAdapter | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available chains configuration
  const availableChains = useMemo(() => [
    {
      type: 'evm' as ChainType,
      name: 'EVM Chains',
      chains: EVM_CHAINS.map(c => ({ id: c.id, name: c.name, isTestnet: c.isTestnet })),
    },
    {
      type: 'solana' as ChainType,
      name: 'Solana',
      chains: [
        { id: 'solana-devnet', name: 'Solana Devnet', isTestnet: true },
        { id: 'solana-testnet', name: 'Solana Testnet', isTestnet: true },
        { id: 'solana-mainnet', name: 'Solana Mainnet', isTestnet: false },
      ],
    },
    {
      type: 'aptos' as ChainType,
      name: 'Aptos',
      chains: [
        { id: 'aptos-devnet', name: 'Aptos Devnet', isTestnet: true },
        { id: 'aptos-testnet', name: 'Aptos Testnet', isTestnet: true },
        { id: 'aptos-mainnet', name: 'Aptos Mainnet', isTestnet: false },
      ],
    },
    {
      type: 'sui' as ChainType,
      name: 'Sui',
      chains: [
        { id: 'sui-devnet', name: 'Sui Devnet', isTestnet: true },
        { id: 'sui-testnet', name: 'Sui Testnet', isTestnet: true },
        { id: 'sui-mainnet', name: 'Sui Mainnet', isTestnet: false },
      ],
    },
  ], []);

  // Create adapter based on chain type and ID
  const createAdapter = useCallback((type: ChainType, chainId: string): IChainAdapter => {
    switch (type) {
      case 'evm': {
        const chainConfig = EVM_CHAINS.find(c => c.id === chainId);
        if (!chainConfig) throw new Error(`Unknown EVM chain: ${chainId}`);
        return new EVMAdapter(chainConfig);
      }
      case 'solana': {
        const network = chainId.replace('solana-', '') as 'mainnet' | 'testnet' | 'devnet';
        return new SolanaAdapter(network);
      }
      case 'aptos': {
        const network = chainId.replace('aptos-', '') as 'mainnet' | 'testnet' | 'devnet';
        return new AptosAdapter(network);
      }
      case 'sui': {
        const network = chainId.replace('sui-', '') as 'mainnet' | 'testnet' | 'devnet';
        return new SuiAdapter(network);
      }
      default:
        throw new Error(`Unsupported chain type: ${type}`);
    }
  }, []);

  // Select a chain
  const selectChain = useCallback((type: ChainType, chainId: string) => {
    try {
      // Disconnect from current chain if connected
      if (activeAdapter?.isConnected()) {
        activeAdapter.disconnect();
      }

      const adapter = createAdapter(type, chainId);
      setActiveChainType(type);
      setActiveAdapter(adapter);
      setWallet(null);
      setBalance(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select chain');
    }
  }, [activeAdapter, createAdapter]);

  // Connect wallet
  const connect = useCallback(async () => {
    if (!activeAdapter) {
      setError('No chain selected');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const walletInfo = await activeAdapter.connect();
      setWallet(walletInfo);

      // Fetch balance
      const bal = await activeAdapter.getBalance();
      setBalance(bal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  }, [activeAdapter]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    if (activeAdapter) {
      await activeAdapter.disconnect();
    }
    setWallet(null);
    setBalance(null);
  }, [activeAdapter]);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!activeAdapter || !wallet) return;

    try {
      const bal = await activeAdapter.getBalance();
      setBalance(bal);
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    }
  }, [activeAdapter, wallet]);

  // Deploy token
  const deployToken = useCallback(async (params: TokenDeployParams): Promise<DeployResult> => {
    if (!activeAdapter || !wallet) {
      return {
        success: false,
        transactionHash: '',
        explorerUrl: '',
        error: 'Wallet not connected',
      };
    }

    setIsDeploying(true);
    setError(null);

    try {
      const result = await activeAdapter.deployToken(params);

      if (!result.success) {
        setError(result.error || 'Deployment failed');
      }

      // Refresh balance after deployment
      await refreshBalance();

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Deployment failed';
      setError(errorMsg);
      return {
        success: false,
        transactionHash: '',
        explorerUrl: '',
        error: errorMsg,
      };
    } finally {
      setIsDeploying(false);
    }
  }, [activeAdapter, wallet, refreshBalance]);

  // Estimate deployment fee
  const estimateDeployFee = useCallback(async (params: TokenDeployParams): Promise<GasEstimate> => {
    if (!activeAdapter) {
      throw new Error('No chain selected');
    }
    return activeAdapter.estimateDeploymentFee(params);
  }, [activeAdapter]);

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  // Set up event listeners when adapter changes
  useEffect(() => {
    if (!activeAdapter) return;

    const unsubAccount = activeAdapter.onAccountChange((address) => {
      if (address) {
        setWallet(prev => prev ? { ...prev, address } : null);
        refreshBalance();
      } else {
        setWallet(null);
        setBalance(null);
      }
    });

    const unsubDisconnect = activeAdapter.onDisconnect(() => {
      setWallet(null);
      setBalance(null);
    });

    return () => {
      unsubAccount();
      unsubDisconnect();
    };
  }, [activeAdapter, refreshBalance]);

  const value: MultiChainContextValue = {
    activeChainType,
    activeAdapter,
    wallet,
    balance,
    isConnecting,
    isDeploying,
    error,
    availableChains,
    selectChain,
    connect,
    disconnect,
    refreshBalance,
    deployToken,
    estimateDeployFee,
    clearError,
  };

  return (
    <MultiChainContext.Provider value={value}>
      {children}
    </MultiChainContext.Provider>
  );
}

export function useMultiChain() {
  const context = useContext(MultiChainContext);
  if (!context) {
    throw new Error('useMultiChain must be used within a MultiChainProvider');
  }
  return context;
}