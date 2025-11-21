import { useEffect, useState } from 'react';
import { Card } from './ui/Card';
import { cn } from '@/utils';
import {
  Check,
  Loader2,
  FileCode,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { DeploymentStep } from '@/types';

interface StepConfig {
  label: string;
  description: string;
  icon: React.ReactNode;
}

const STEP_CONFIG: Record<DeploymentStep, StepConfig> = {
  idle: {
    label: 'Ready',
    description: 'Configure your token and click deploy',
    icon: <FileCode className="w-5 h-5" />,
  },
  preparing: {
    label: 'Preparing',
    description: 'Setting up contract factory...',
    icon: <Loader2 className="w-5 h-5 animate-spin" />,
  },
  estimating: {
    label: 'Estimating Gas',
    description: 'Calculating deployment cost...',
    icon: <Loader2 className="w-5 h-5 animate-spin" />,
  },
  signing: {
    label: 'Awaiting Signature',
    description: 'Please confirm in your wallet',
    icon: <Clock className="w-5 h-5 animate-pulse" />,
  },
  broadcasting: {
    label: 'Broadcasting',
    description: 'Sending transaction to network...',
    icon: <Send className="w-5 h-5 animate-pulse" />,
  },
  confirming: {
    label: 'Confirming',
    description: 'Waiting for block confirmation...',
    icon: <Loader2 className="w-5 h-5 animate-spin" />,
  },
  success: {
    label: 'Complete',
    description: 'Token deployed successfully!',
    icon: <CheckCircle2 className="w-5 h-5" />,
  },
  error: {
    label: 'Failed',
    description: 'Deployment encountered an error',
    icon: <XCircle className="w-5 h-5" />,
  },
};

const STEP_ORDER: DeploymentStep[] = [
  'preparing',
  'estimating',
  'signing',
  'broadcasting',
  'confirming',
  'success',
];

interface DeploymentProgressProps {
  currentStep: DeploymentStep;
  txHash?: string | null;
  confirmations?: number;
  requiredConfirmations?: number;
  gasEstimate?: string;
  errorMessage?: string;
}

export const DeploymentProgress = ({
  currentStep,
  txHash,
  confirmations = 0,
  requiredConfirmations = 2,
  gasEstimate,
  errorMessage,
}: DeploymentProgressProps) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const config = STEP_CONFIG[currentStep];

  // Timer for active steps
  useEffect(() => {
    if (currentStep === 'idle' || currentStep === 'success' || currentStep === 'error') {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentStep]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getStepStatus = (step: DeploymentStep): 'complete' | 'active' | 'pending' | 'error' => {
    if (currentStep === 'error') {
      const currentIndex = STEP_ORDER.indexOf(step);
      const errorIndex = STEP_ORDER.findIndex(s => s === 'success'); // Use last step
      if (currentIndex < errorIndex) return 'complete';
      return 'error';
    }

    const currentIndex = STEP_ORDER.indexOf(currentStep);
    const stepIndex = STEP_ORDER.indexOf(step);

    if (stepIndex < currentIndex) return 'complete';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  if (currentStep === 'idle') {
    return null;
  }

  return (
    <Card className="p-4 bg-slate-900/80 border-slate-800 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            currentStep === 'success' && "bg-green-500/20 text-green-400",
            currentStep === 'error' && "bg-red-500/20 text-red-400",
            currentStep !== 'success' && currentStep !== 'error' && "bg-cyan-500/20 text-cyan-400"
          )}>
            {config.icon}
          </div>
          <div>
            <h3 className="font-semibold text-white">{config.label}</h3>
            <p className="text-sm text-slate-400">{config.description}</p>
          </div>
        </div>

        {elapsedTime > 0 && currentStep !== 'success' && currentStep !== 'error' && (
          <div className="text-sm text-slate-500">
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
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                status === 'complete' && "bg-green-500 text-white",
                status === 'active' && "bg-cyan-500 text-white ring-4 ring-cyan-500/20",
                status === 'pending' && "bg-slate-700 text-slate-400",
                status === 'error' && "bg-red-500 text-white"
              )}>
                {status === 'complete' ? (
                  <Check className="w-3 h-3" />
                ) : status === 'error' ? (
                  <XCircle className="w-3 h-3" />
                ) : (
                  idx + 1
                )}
              </div>
              {idx < STEP_ORDER.length - 2 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-1 transition-all",
                  status === 'complete' ? "bg-green-500" : "bg-slate-700"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Additional Info */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        {gasEstimate && currentStep !== 'idle' && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Estimated Cost</span>
            <span className="text-white font-mono">{gasEstimate}</span>
          </div>
        )}

        {txHash && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Transaction</span>
            <span className="text-cyan-400 font-mono text-xs">
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </span>
          </div>
        )}

        {currentStep === 'confirming' && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Confirmations</span>
            <span className="text-white">
              {confirmations} / {requiredConfirmations}
            </span>
          </div>
        )}

        {currentStep === 'error' && errorMessage && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-400">{errorMessage}</p>
          </div>
        )}
      </div>
    </Card>
  );
};