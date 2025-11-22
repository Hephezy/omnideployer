"use client";

import { useEffect, useState } from "react";
import { Card } from "./ui/Card";
import { cn } from "@/utils";
import {
  Check,
  Loader2,
  FileCode,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Wallet,
  Fuel,
  Radio,
} from "lucide-react";
import { DeploymentStep } from "@/types";

interface StepConfig {
  label: string;
  description: string;
  icon: React.ReactNode;
}

const STEP_CONFIG: Record<DeploymentStep, StepConfig> = {
  idle: {
    label: "Ready",
    description: "Configure your token and click deploy",
    icon: <FileCode className="w-5 h-5" />,
  },
  preparing: {
    label: "Preparing",
    description: "Setting up contract factory...",
    icon: <Loader2 className="w-5 h-5 animate-spin" />,
  },
  estimating: {
    label: "Estimating Gas",
    description: "Calculating deployment cost...",
    icon: <Fuel className="w-5 h-5 animate-pulse" />,
  },
  signing: {
    label: "Awaiting Signature",
    description: "Please confirm in your wallet",
    icon: <Wallet className="w-5 h-5 animate-pulse" />,
  },
  broadcasting: {
    label: "Broadcasting",
    description: "Sending transaction to network...",
    icon: <Radio className="w-5 h-5 animate-pulse" />,
  },
  confirming: {
    label: "Confirming",
    description: "Waiting for block confirmation...",
    icon: <Loader2 className="w-5 h-5 animate-spin" />,
  },
  success: {
    label: "Complete",
    description: "Token deployed successfully!",
    icon: <CheckCircle2 className="w-5 h-5" />,
  },
  error: {
    label: "Failed",
    description: "Deployment encountered an error",
    icon: <XCircle className="w-5 h-5" />,
  },
};

const STEP_ORDER: DeploymentStep[] = [
  "preparing",
  "estimating",
  "signing",
  "broadcasting",
  "confirming",
  "success",
];

interface DeploymentProgressProps {
  currentStep: DeploymentStep;
  txHash?: string | null;
  confirmations?: number;
  requiredConfirmations?: number;
  gasEstimate?: string;
  errorMessage?: string;
  explorerUrl?: string;
}

export const DeploymentProgress = ({
  currentStep,
  txHash,
  confirmations = 0,
  requiredConfirmations = 2,
  gasEstimate,
  errorMessage,
  explorerUrl,
}: DeploymentProgressProps) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const config = STEP_CONFIG[currentStep];

  // Reset timer when step changes from idle
  useEffect(() => {
    if (currentStep === "preparing" && !startTime) {
      setStartTime(Date.now());
      setElapsedTime(0);
    } else if (currentStep === "idle") {
      setStartTime(null);
      setElapsedTime(0);
    }
  }, [currentStep, startTime]);

  // Timer for active steps
  useEffect(() => {
    if (
      currentStep === "idle" ||
      currentStep === "success" ||
      currentStep === "error"
    ) {
      return;
    }

    const interval = setInterval(() => {
      if (startTime) {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentStep, startTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getStepStatus = (
    step: DeploymentStep
  ): "complete" | "active" | "pending" | "error" => {
    if (currentStep === "error") {
      const currentIndex = STEP_ORDER.indexOf(step);
      // Find where we were when error occurred (approximate)
      const errorStepIndex = STEP_ORDER.findIndex(
        (s) => STEP_CONFIG[s].label === "Broadcasting"
      );
      if (currentIndex < errorStepIndex) return "complete";
      return "error";
    }

    if (currentStep === "idle") return "pending";

    const currentIndex = STEP_ORDER.indexOf(currentStep);
    const stepIndex = STEP_ORDER.indexOf(step);

    if (stepIndex < currentIndex) return "complete";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  // Don't render anything when idle
  if (currentStep === "idle") {
    return null;
  }

  return (
    <Card className="p-4 bg-slate-900/80 border-slate-800 space-y-4 animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              currentStep === "success" && "bg-green-500/20 text-green-400",
              currentStep === "error" && "bg-red-500/20 text-red-400",
              currentStep !== "success" &&
              currentStep !== "error" &&
              "bg-cyan-500/20 text-cyan-400"
            )}
          >
            {config.icon}
          </div>
          <div>
            <h3 className="font-semibold text-white">{config.label}</h3>
            <p className="text-sm text-slate-400">{config.description}</p>
          </div>
        </div>

        {elapsedTime > 0 &&
          currentStep !== "success" &&
          currentStep !== "error" && (
            <div className="text-sm text-slate-500 font-mono">
              {formatTime(elapsedTime)}
            </div>
          )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-1 px-2">
        {STEP_ORDER.slice(0, -1).map((step, idx) => {
          const status = getStepStatus(step);
          return (
            <div key={step} className="flex items-center flex-1">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300",
                  status === "complete" && "bg-green-500 text-white",
                  status === "active" &&
                  "bg-cyan-500 text-white ring-4 ring-cyan-500/20 scale-110",
                  status === "pending" && "bg-slate-700 text-slate-400",
                  status === "error" && "bg-red-500 text-white"
                )}
              >
                {status === "complete" ? (
                  <Check className="w-3 h-3" />
                ) : status === "error" ? (
                  <XCircle className="w-3 h-3" />
                ) : status === "active" ? (
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                ) : (
                  idx + 1
                )}
              </div>
              {idx < STEP_ORDER.length - 2 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1 transition-all duration-500",
                    status === "complete" ? "bg-green-500" : "bg-slate-700"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Labels (Mobile Hidden) */}
      <div className="hidden sm:flex items-center justify-between px-2 text-xs text-slate-500">
        {STEP_ORDER.slice(0, -1).map((step) => (
          <span key={step} className="text-center flex-1 truncate">
            {STEP_CONFIG[step].label}
          </span>
        ))}
      </div>

      {/* Additional Info */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        {gasEstimate && currentStep !== "idle" && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Estimated Cost</span>
            <span className="text-white font-mono">{gasEstimate}</span>
          </div>
        )}

        {txHash && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Transaction</span>
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-xs">
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </span>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:underline"
                >
                  View →
                </a>
              )}
            </div>
          </div>
        )}

        {currentStep === "confirming" && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Confirmations</span>
            <span className="text-white">
              <span
                className={cn(
                  confirmations >= requiredConfirmations
                    ? "text-green-400"
                    : "text-cyan-400"
                )}
              >
                {confirmations}
              </span>
              <span className="text-slate-500"> / {requiredConfirmations}</span>
            </span>
          </div>
        )}

        {/* Success Message */}
        {currentStep === "success" && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-400">
                Deployment Successful!
              </p>
              <p className="text-xs text-green-400/70">
                Your token is now live on the blockchain
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {currentStep === "error" && errorMessage && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-400">
                Deployment Failed
              </p>
              <p className="text-xs text-red-400/70 mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Signing Hint */}
        {currentStep === "signing" && (
          <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <Wallet className="w-4 h-4 text-yellow-400 shrink-0" />
            <p className="text-xs text-yellow-400">
              Check your wallet for a signature request
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

// Compact progress indicator for header
export const DeploymentProgressCompact = ({
  currentStep,
}: {
  currentStep: DeploymentStep;
}) => {
  if (currentStep === "idle") return null;

  const stepIndex = STEP_ORDER.indexOf(currentStep);
  const progress =
    currentStep === "success"
      ? 100
      : currentStep === "error"
        ? 0
        : ((stepIndex + 1) / STEP_ORDER.length) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-500 rounded-full",
            currentStep === "success"
              ? "bg-green-500"
              : currentStep === "error"
                ? "bg-red-500"
                : "bg-cyan-500"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-slate-400">
        {STEP_CONFIG[currentStep].label}
      </span>
    </div>
  );
};