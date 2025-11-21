import { useState } from "react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { WalletOption, WalletType } from "@/hooks/useMultiWallet";
import {
  Wallet,
  ChevronDown,
  Check,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/utils";

interface WalletSelectorProps {
  wallets: WalletOption[];
  activeWallet: WalletType | null;
  isConnecting: boolean;
  error: string | null;
  onConnect: (walletType: WalletType) => void;
}

export const WalletSelector = ({
  wallets,
  activeWallet,
  isConnecting,
  error,
  onConnect,
}: WalletSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const installedWallets = wallets.filter((w) => w.installed);
  const notInstalledWallets = wallets.filter((w) => !w.installed);

  const getInstallUrl = (walletId: WalletType): string => {
    const urls: Record<WalletType, string> = {
      metamask: "https://metamask.io/download/",
      coinbase: "https://www.coinbase.com/wallet/downloads",
      walletconnect: "",
      injected: "",
    };
    return urls[walletId] || "";
  };

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Installed Wallets */}
      <div className="space-y-2">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">
          Available Wallets
        </p>
        {installedWallets.map((wallet) => (
          <button
            key={wallet.id}
            onClick={() => onConnect(wallet.id)}
            disabled={isConnecting}
            className={cn(
              "w-full p-4 rounded-xl border transition-all duration-200",
              "bg-slate-900/50 hover:bg-slate-800/50",
              "flex items-center justify-between group",
              activeWallet === wallet.id
                ? "border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.1)]"
                : "border-slate-800 hover:border-slate-700"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{wallet.icon}</span>
              <div className="text-left">
                <p className="font-medium text-white group-hover:text-cyan-400 transition-colors">
                  {wallet.name}
                </p>
                <p className="text-xs text-slate-500">{wallet.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnecting && activeWallet === wallet.id ? (
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              ) : activeWallet === wallet.id ? (
                <div className="flex items-center gap-1 text-green-400">
                  <Check className="w-4 h-4" />
                  <span className="text-xs">Connected</span>
                </div>
              ) : (
                <span className="text-xs text-slate-500 group-hover:text-slate-400">
                  Click to connect
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Not Installed Wallets */}
      {notInstalledWallets.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-600 font-medium uppercase tracking-wider mb-2">
            Not Installed
          </p>
          {notInstalledWallets.map((wallet) => (
            <div
              key={wallet.id}
              className={cn(
                "w-full p-4 rounded-xl border border-slate-800/50",
                "bg-slate-900/20 flex items-center justify-between"
              )}
            >
              <div className="flex items-center gap-3 opacity-50">
                <span className="text-2xl grayscale">{wallet.icon}</span>
                <div className="text-left">
                  <p className="font-medium text-slate-400">{wallet.name}</p>
                  <p className="text-xs text-slate-600">Not detected</p>
                </div>
              </div>
              {getInstallUrl(wallet.id) && (
                <a
                  href={getInstallUrl(wallet.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Install
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-slate-600 text-center pt-2">
        Don&apos;t have a wallet?{" "}
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:underline"
        >
          Get MetaMask
        </a>
      </p>
    </div>
  );
};

// Compact wallet button for header
interface WalletButtonProps {
  account: string | null;
  activeWallet: WalletType | null;
  balance: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting: boolean;
}

export const WalletButton = ({
  account,
  activeWallet,
  balance,
  onConnect,
  onDisconnect,
  isConnecting,
}: WalletButtonProps) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const walletIcons: Record<WalletType, string> = {
    metamask: "🦊",
    coinbase: "💰",
    walletconnect: "📱",
    injected: "🔗",
  };

  if (!account) {
    return (
      <Button onClick={onConnect} isLoading={isConnecting} className="text-xs">
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5",
          "bg-slate-900 border border-slate-800 rounded-full",
          "hover:border-slate-700 transition-colors"
        )}
      >
        <span className="text-sm">
          {activeWallet ? walletIcons[activeWallet] : "🔗"}
        </span>
        <div className="text-left">
          <p className="text-xs font-mono text-slate-300">
            {account.slice(0, 6)}...{account.slice(-4)}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-400 transition-transform",
            showDropdown && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-64 z-50 p-3 bg-slate-900 border border-slate-800 rounded-xl shadow-xl">
            <div className="space-y-3">
              <div className="pb-2 border-b border-slate-800">
                <p className="text-xs text-slate-500">Connected with</p>
                <p className="text-sm font-medium text-white capitalize">
                  {activeWallet || "Wallet"}
                </p>
              </div>
              {balance && (
                <div>
                  <p className="text-xs text-slate-500">Balance</p>
                  <p className="text-sm font-mono text-white">
                    {parseFloat(balance).toFixed(4)} ETH
                  </p>
                </div>
              )}
              <Button
                variant="danger"
                onClick={() => {
                  onDisconnect();
                  setShowDropdown(false);
                }}
                className="w-full text-xs"
              >
                Disconnect
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};