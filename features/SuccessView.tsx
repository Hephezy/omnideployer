import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChainConfig } from "@/config/constants";
import { shortenAddress } from "@/utils";
import { CheckCircle2, Copy } from "lucide-react";

interface SuccessViewProps {
  config: {
    name: string;
    symbol: string;
    supply: number;
    devAllocation: number;
  };
  chain: ChainConfig | null;
  contractAddress: string;
  onReset: () => void;
}

export const SuccessView = ({ config, chain, contractAddress, onReset }: SuccessViewProps) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-6 animate-in fade-in zoom-in duration-500">
    <div className="relative">
      <div className="absolute -inset-4 bg-green-500/20 rounded-full blur-xl"></div>
      <div className="bg-slate-900 p-6 rounded-full border border-green-500/30 shadow-2xl relative">
        <CheckCircle2 className="w-16 h-16 text-green-400" />
      </div>
    </div>

    <div className="text-center space-y-1">
      <h2 className="text-3xl font-bold text-white tracking-tight">Token Deployed!</h2>
      <p className="text-slate-400">{config.name} ({config.symbol}) is live on {chain?.name}.</p>
    </div>

    <Card className="w-full max-w-md p-4 space-y-3 bg-slate-900/80 border-green-900/30">
      <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
        <span className="text-slate-500 text-sm">Contract Address</span>
        <span className="font-mono text-cyan-400 text-sm flex items-center gap-2 cursor-pointer hover:text-cyan-300" onClick={() => navigator.clipboard.writeText(contractAddress)}>
          {shortenAddress(contractAddress)}
          <Copy className="w-3 h-3" />
        </span>
      </div>
      <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
        <span className="text-slate-500 text-sm">Total Supply</span>
        <span className="font-mono text-white text-sm">{config.supply.toLocaleString()}</span>
      </div>
      <div className="flex justify-between items-center py-2">
        <span className="text-slate-500 text-sm">Your Allocation</span>
        <span className="font-mono text-purple-400 text-sm">{config.devAllocation}%</span>
      </div>
    </Card>

    <div className="flex gap-3">
      <Button onClick={onReset} variant="outline">
        Deploy Another
      </Button>
      <Button onClick={() => window.open(`${chain?.blockExplorer}/address/${contractAddress}`, '_blank')}>
        View on {chain?.name.split(' ')[1]}Scan
      </Button>
    </div>
  </div>
);