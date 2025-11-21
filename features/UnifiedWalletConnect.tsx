import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useMultiChain } from '@/contexts/MultiChainContext';
import { ChainType } from '@/services/interfaces/IChainAdapter';
import {
  Wallet,
  AlertCircle,
  ChevronRight,
  Check,
  Loader2,
  Coins,
  Link2
} from 'lucide-react';
import { cn } from '@/utils';

// Chain type icons and colors
const CHAIN_TYPE_CONFIG: Record<ChainType, {
  name: string;
  color: string;
  gradient: string;
  wallets: string[];
}> = {
  evm: {
    name: 'EVM Chains',
    color: 'text-blue-400',
    gradient: 'from-blue-500 to-indigo-600',
    wallets: ['MetaMask', 'WalletConnect', 'Coinbase'],
  },
  solana: {
    name: 'Solana',
    color: 'text-purple-400',
    gradient: 'from-purple-500 to-pink-500',
    wallets: ['Phantom', 'Solflare', 'Backpack'],
  },
  aptos: {
    name: 'Aptos',
    color: 'text-teal-400',
    gradient: 'from-teal-500 to-cyan-500',
    wallets: ['Petra', 'Martian', 'Pontem'],
  },
  sui: {
    name: 'Sui',
    color: 'text-sky-400',
    gradient: 'from-sky-500 to-blue-500',
    wallets: ['Sui Wallet', 'Suiet', 'Ethos'],
  },
};

interface UnifiedWalletConnectProps {
  onConnected?: () => void;
}

export const UnifiedWalletConnect = ({ onConnected }: UnifiedWalletConnectProps) => {
  const {
    availableChains,
    activeChainType,
    wallet,
    balance,
    isConnecting,
    error,
    selectChain,
    connect,
    clearError,
  } = useMultiChain();

  const [selectedChainType, setSelectedChainType] = useState<ChainType | null>(null);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [step, setStep] = useState<'type' | 'chain' | 'connect'>('type');

  const handleSelectChainType = (type: ChainType) => {
    setSelectedChainType(type);
    setStep('chain');
  };

  const handleSelectChain = (chainId: string) => {
    if (!selectedChainType) return;
    setSelectedChainId(chainId);
    selectChain(selectedChainType, chainId);
    setStep('connect');
  };

  const handleConnect = async () => {
    clearError();
    await connect();
    if (!error) {
      onConnected?.();
    }
  };

  const handleBack = () => {
    if (step === 'connect') {
      setStep('chain');
    } else if (step === 'chain') {
      setStep('type');
      setSelectedChainType(null);
    }
  };

  // Already connected view
  if (wallet) {
    return (
      <Card className="p-6 bg-slate-900/80 border-green-500/30">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="w-6 h-6 text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-400">Connected to {wallet.walletName}</p>
            <p className="font-mono text-white">{wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}</p>
            {balance && (
              <p className="text-sm text-cyan-400 mt-1">
                Balance: {balance.formatted}
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="relative">
        <div className="absolute -inset-4 bg-cyan-500/20 rounded-full blur-xl animate-pulse"></div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl relative">
          <Wallet className="w-12 h-12 text-cyan-400" />
        </div>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          {step === 'type' && 'Select Blockchain'}
          {step === 'chain' && 'Select Network'}
          {step === 'connect' && 'Connect Wallet'}
        </h2>
        <p className="text-slate-400 max-w-xs">
          {step === 'type' && 'Choose the blockchain ecosystem for your token deployment'}
          {step === 'chain' && 'Select the specific network to deploy on'}
          {step === 'connect' && 'Connect your wallet to continue'}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-950/30 p-3 rounded-lg text-sm max-w-md border border-red-900/50">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Select Chain Type */}
      {step === 'type' && (
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          {(Object.keys(CHAIN_TYPE_CONFIG) as ChainType[]).map((type) => {
            const config = CHAIN_TYPE_CONFIG[type];
            return (
              <button
                key={type}
                onClick={() => handleSelectChainType(type)}
                className={cn(
                  "p-4 rounded-xl border transition-all duration-200 text-left",
                  "bg-slate-900/50 border-slate-800 hover:border-slate-600",
                  "hover:shadow-lg group"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                  `bg-linear-to-br ${config.gradient}`
                )}>
                  <Coins className="w-5 h-5 text-white" />
                </div>
                <div className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                  {config.name}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {config.wallets.slice(0, 2).join(', ')}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Step 2: Select Specific Chain */}
      {step === 'chain' && selectedChainType && (
        <div className="w-full max-w-md space-y-3">
          <button
            onClick={handleBack}
            className="text-sm text-slate-400 hover:text-white transition-colors mb-4"
          >
            ← Back to ecosystems
          </button>

          {availableChains
            .find(c => c.type === selectedChainType)
            ?.chains.map((chain) => (
              <button
                key={chain.id}
                onClick={() => handleSelectChain(chain.id)}
                className={cn(
                  "w-full p-4 rounded-xl border transition-all duration-200",
                  "bg-slate-900/50 border-slate-800 hover:border-cyan-500/50",
                  "flex items-center justify-between group"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    chain.isTestnet ? "bg-yellow-500" : "bg-green-500"
                  )} />
                  <span className="text-white">{chain.name}</span>
                  {chain.isTestnet && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                      Testnet
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              </button>
            ))}
        </div>
      )}

      {/* Step 3: Connect Wallet */}
      {step === 'connect' && selectedChainType && (
        <div className="w-full max-w-md space-y-4">
          <button
            onClick={handleBack}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            ← Back to networks
          </button>

          <Card className="p-4 bg-slate-900/80 border-slate-800">
            <p className="text-sm text-slate-400 mb-2">Supported wallets:</p>
            <div className="flex flex-wrap gap-2">
              {CHAIN_TYPE_CONFIG[selectedChainType].wallets.map((wallet) => (
                <span
                  key={wallet}
                  className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full"
                >
                  {wallet}
                </span>
              ))}
            </div>
          </Card>

          <Button
            onClick={handleConnect}
            isLoading={isConnecting}
            className="w-full py-4 text-lg"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Connecting...
              </>
            ) : (
              <>
                <Link2 className="w-5 h-5 mr-2" />
                Connect Wallet
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};