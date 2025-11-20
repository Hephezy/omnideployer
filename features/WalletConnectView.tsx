import { Button } from "@/components/ui/Button";
import { AlertCircle, Wallet } from "lucide-react";

interface WalletConnectViewProps {
  onConnect: () => void;
  isConnecting: boolean;
  error: string | null;
}

export const WalletConnectView = ({ onConnect, isConnecting, error }: WalletConnectViewProps) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-6 animate-in fade-in zoom-in duration-500">
    <div className="relative">
      <div className="absolute -inset-4 bg-cyan-500/20 rounded-full blur-xl animate-pulse"></div>
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl relative">
        <Wallet className="w-12 h-12 text-cyan-400" />
      </div>
    </div>
    <div className="text-center space-y-2">
      <h2 className="text-2xl font-bold text-white tracking-tight">OmniDeployer v3</h2>
      <p className="text-slate-400 max-w-xs">
        Connect your wallet to deploy smart contracts across testnets.
      </p>
      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-950/30 p-2 rounded-lg text-sm max-w-sm mx-auto border border-red-900/50">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
    <Button
      onClick={onConnect}
      isLoading={isConnecting}
      className="px-8 py-3 text-lg"
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  </div>
);