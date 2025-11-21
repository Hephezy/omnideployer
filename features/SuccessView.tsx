import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChainConfig } from "@/config/constants";
import { shortenAddress } from "@/utils";
import { CheckCircle2, Copy, ExternalLink, Clock } from "lucide-react";
import { useState, useEffect } from "react";

interface SuccessViewProps {
  config: {
    name: string;
    symbol: string;
    supply: number;
    devAllocation: number;
  };
  chain: ChainConfig | null;
  contractAddress: string;
  txHash?: string;
  onReset: () => void;
}

export const SuccessView = ({
  config,
  chain,
  contractAddress,
  txHash,
  onReset
}: SuccessViewProps) => {
  const [copied, setCopied] = useState<'address' | 'tx' | null>(null);
  const [indexingCountdown, setIndexingCountdown] = useState(15);

  // Countdown for explorer indexing
  useEffect(() => {
    if (indexingCountdown > 0) {
      const timer = setTimeout(() => setIndexingCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [indexingCountdown]);

  const copyToClipboard = async (text: string, type: 'address' | 'tx') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Generate correct explorer URL
  const getExplorerUrl = (type: 'address' | 'tx', value: string): string => {
    if (!chain?.blockExplorer) return '#';
    const path = type === 'address' ? '/address/' : '/tx/';
    return `${chain.blockExplorer}${path}${value}`;
  };

  // Get display name for explorer button
  const getExplorerName = (): string => {
    if (!chain?.name) return 'Explorer';
    // Handle various naming conventions
    const nameParts = chain.name.split(' ');
    if (nameParts.length > 1) {
      return `${nameParts[1]}Scan`;
    }
    return `${nameParts[0]} Explorer`;
  };

  const handleViewOnExplorer = () => {
    const url = getExplorerUrl('address', contractAddress);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="relative">
        <div className="absolute -inset-4 bg-green-500/20 rounded-full blur-xl"></div>
        <div className="bg-slate-900 p-6 rounded-full border border-green-500/30 shadow-2xl relative">
          <CheckCircle2 className="w-16 h-16 text-green-400" />
        </div>
      </div>

      <div className="text-center space-y-1">
        <h2 className="text-3xl font-bold text-white tracking-tight">Token Deployed!</h2>
        <p className="text-slate-400">
          {config.name} ({config.symbol}) is live on {chain?.name ?? 'the network'}.
        </p>
      </div>

      <Card className="w-full max-w-md p-4 space-y-3 bg-slate-900/80 border-green-900/30">
        {/* Contract Address */}
        <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
          <span className="text-slate-500 text-sm">Contract Address</span>
          <span
            className="font-mono text-cyan-400 text-sm flex items-center gap-2 cursor-pointer hover:text-cyan-300 transition-colors"
            onClick={() => copyToClipboard(contractAddress, 'address')}
          >
            {shortenAddress(contractAddress)}
            <Copy className={`w-3 h-3 ${copied === 'address' ? 'text-green-400' : ''}`} />
          </span>
        </div>

        {/* Transaction Hash (if available) */}
        {txHash && (
          <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
            <span className="text-slate-500 text-sm">Transaction Hash</span>
            <span
              className="font-mono text-cyan-400 text-sm flex items-center gap-2 cursor-pointer hover:text-cyan-300 transition-colors"
              onClick={() => copyToClipboard(txHash, 'tx')}
            >
              {shortenAddress(txHash)}
              <Copy className={`w-3 h-3 ${copied === 'tx' ? 'text-green-400' : ''}`} />
            </span>
          </div>
        )}

        {/* Total Supply */}
        <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
          <span className="text-slate-500 text-sm">Total Supply</span>
          <span className="font-mono text-white text-sm">
            {config.supply.toLocaleString()}
          </span>
        </div>

        {/* Your Allocation */}
        <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
          <span className="text-slate-500 text-sm">Your Allocation</span>
          <span className="font-mono text-purple-400 text-sm">
            {config.devAllocation}%
          </span>
        </div>

        {/* Network */}
        <div className="flex justify-between items-center py-2">
          <span className="text-slate-500 text-sm">Network</span>
          <span className="text-white text-sm flex items-center gap-2">
            {chain && (
              <div className={`w-2 h-2 rounded-full bg-linear-to-br ${chain.color}`}></div>
            )}
            {chain?.name ?? 'Unknown'}
          </span>
        </div>
      </Card>

      {/* Indexing Notice */}
      {indexingCountdown > 0 && (
        <div className="flex items-center gap-2 text-yellow-400 text-sm bg-yellow-500/10 px-4 py-2 rounded-lg border border-yellow-500/20">
          <Clock className="w-4 h-4 animate-pulse" />
          <span>Explorer indexing in progress... ({indexingCountdown}s)</span>
        </div>
      )}

      <div className="flex gap-3 flex-wrap justify-center">
        <Button onClick={onReset} variant="outline">
          Deploy Another
        </Button>

        <Button
          onClick={handleViewOnExplorer}
          disabled={!chain?.blockExplorer}
          className="flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          View on {getExplorerName()}
        </Button>

        {txHash && (
          <Button
            onClick={() => window.open(getExplorerUrl('tx', txHash), '_blank', 'noopener,noreferrer')}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            View Transaction
          </Button>
        )}
      </div>
    </div>
  );
};