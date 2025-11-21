import { useState } from "react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import {
  VerificationResult,
  VerificationStatus,
} from "@/services/verification/ContractVerifier";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Loader2,
  ExternalLink,
  Key,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/utils";

interface VerificationCardProps {
  contractAddress: string;
  tokenName: string;
  tokenSymbol: string;
  initialSupply: number;
  chainName: string;
  isVerifying: boolean;
  verificationStatus: VerificationStatus | null;
  verificationResult: VerificationResult | null;
  onVerify: (apiKey?: string) => void;
  onReset: () => void;
}

export const VerificationCard = ({
  contractAddress,
  tokenName,
  tokenSymbol,
  initialSupply,
  chainName,
  isVerifying,
  verificationStatus,
  verificationResult,
  onVerify,
  onReset,
}: VerificationCardProps) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");

  const getStatusIcon = () => {
    if (isVerifying) {
      return <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />;
    }
    if (verificationResult?.success) {
      return <ShieldCheck className="w-5 h-5 text-green-400" />;
    }
    if (verificationResult && !verificationResult.success) {
      return <ShieldX className="w-5 h-5 text-red-400" />;
    }
    return <Shield className="w-5 h-5 text-slate-400" />;
  };

  const getStatusMessage = () => {
    if (isVerifying && verificationStatus) {
      return verificationStatus.message;
    }
    if (verificationResult) {
      return verificationResult.message;
    }
    return "Verify your contract source code on the block explorer";
  };

  return (
    <Card className="p-4 bg-slate-900/50 border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium text-white">
            Contract Verification
          </span>
        </div>
        {verificationResult?.success && verificationResult.explorerUrl && (
          <a
            href={verificationResult.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
          >
            View on Explorer
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Status Message */}
      <p
        className={cn(
          "text-sm mb-4",
          verificationResult?.success
            ? "text-green-400"
            : verificationResult && !verificationResult.success
              ? "text-red-400"
              : "text-slate-400"
        )}
      >
        {getStatusMessage()}
      </p>

      {/* Progress Steps */}
      {isVerifying && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            <span className="text-slate-300">Submitted to explorer</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {verificationStatus?.status === "pending" ? (
              <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            ) : verificationStatus?.status === "pass" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-slate-600" />
            )}
            <span className="text-slate-400">Verifying bytecode match...</span>
          </div>
        </div>
      )}

      {/* API Key Section */}
      {!verificationResult?.success && (
        <div className="space-y-3">
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Explorer API Key (Optional)</span>
            {showApiKey ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showApiKey && (
            <div className="space-y-2">
              <Input
                label=""
                type="password"
                placeholder="Enter your Etherscan/Polygonscan API key"
                value={apiKey}
                onChange={setApiKey}
              />
              <p className="text-xs text-slate-500">
                Get a free API key from{" "}
                <a
                  href="https://etherscan.io/apis"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  Etherscan
                </a>
              </p>
            </div>
          )}

          {/* Verify Button */}
          <Button
            onClick={() => onVerify(apiKey || undefined)}
            disabled={isVerifying}
            isLoading={isVerifying}
            className="w-full"
          >
            {isVerifying ? "Verifying..." : "Verify Contract"}
          </Button>
        </div>
      )}

      {/* Success State */}
      {verificationResult?.success && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
            <div>
              <p className="text-sm text-green-400 font-medium">
                Verified Successfully
              </p>
              <p className="text-xs text-green-400/70 mt-1">
                Your contract source code is now public and verified on{" "}
                {chainName}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {verificationResult && !verificationResult.success && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-red-400">Verification Failed</p>
              <p className="text-xs text-red-400/70 mt-1">
                {verificationResult.message}
              </p>
              <button
                onClick={onReset}
                className="text-xs text-cyan-400 hover:underline mt-2"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 pt-3 border-t border-slate-800">
        <p className="text-xs text-slate-500">
          Verification allows users to read and verify your contract&apos;s source
          code directly on the block explorer.
        </p>
      </div>
    </Card>
  );
};