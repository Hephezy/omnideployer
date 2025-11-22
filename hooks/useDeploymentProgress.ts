import { DeploymentStep } from "@/types";
import { useState, useCallback, useMemo } from "react";

export interface DeploymentProgressState {
  step: DeploymentStep;
  txHash: string | null;
  confirmations: number;
  gasEstimate: string | undefined;
  errorMessage: string | undefined;
  startTime: number | null;
  contractAddress: string | null;
}

export interface UseDeploymentProgressReturn extends DeploymentProgressState {
  // Setters
  setStep: (step: DeploymentStep) => void;
  setTxHash: (hash: string | null) => void;
  setConfirmations: (count: number) => void;
  setGasEstimate: (estimate: string | undefined) => void;
  setContractAddress: (address: string | null) => void;
  setError: (message: string) => void;

  // Actions
  reset: () => void;
  startDeployment: () => void;

  // Computed
  isDeploying: boolean;
  isComplete: boolean;
  isError: boolean;
  elapsedTime: number;
  currentStepIndex: number;
  totalSteps: number;
  progress: number;
}

const STEP_ORDER: DeploymentStep[] = [
  "preparing",
  "estimating",
  "signing",
  "broadcasting",
  "confirming",
  "success",
];

const initialState: DeploymentProgressState = {
  step: "idle",
  txHash: null,
  confirmations: 0,
  gasEstimate: undefined,
  errorMessage: undefined,
  startTime: null,
  contractAddress: null,
};

export function useDeploymentProgress(): UseDeploymentProgressReturn {
  const [state, setState] = useState<DeploymentProgressState>(initialState);

  // Setters
  const setStep = useCallback((step: DeploymentStep) => {
    setState((prev) => ({
      ...prev,
      step,
      // Clear error when moving to a new step (not error)
      errorMessage: step === "error" ? prev.errorMessage : undefined,
    }));
  }, []);

  const setTxHash = useCallback((txHash: string | null) => {
    setState((prev) => ({ ...prev, txHash }));
  }, []);

  const setConfirmations = useCallback((confirmations: number) => {
    setState((prev) => ({ ...prev, confirmations }));
  }, []);

  const setGasEstimate = useCallback((gasEstimate: string | undefined) => {
    setState((prev) => ({ ...prev, gasEstimate }));
  }, []);

  const setContractAddress = useCallback((contractAddress: string | null) => {
    setState((prev) => ({ ...prev, contractAddress }));
  }, []);

  const setError = useCallback((message: string) => {
    setState((prev) => ({
      ...prev,
      step: "error",
      errorMessage: message,
    }));
  }, []);

  // Actions
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const startDeployment = useCallback(() => {
    setState({
      ...initialState,
      step: "preparing",
      startTime: Date.now(),
    });
  }, []);

  // Computed values
  const isDeploying = useMemo(() => {
    return !["idle", "success", "error"].includes(state.step);
  }, [state.step]);

  const isComplete = useMemo(() => {
    return state.step === "success";
  }, [state.step]);

  const isError = useMemo(() => {
    return state.step === "error";
  }, [state.step]);

  const elapsedTime = useMemo(() => {
    if (!state.startTime) return 0;
    if (state.step === "success" || state.step === "error") {
      return Math.floor((Date.now() - state.startTime) / 1000);
    }
    return 0;
  }, [state.startTime, state.step]);

  const currentStepIndex = useMemo(() => {
    const index = STEP_ORDER.indexOf(state.step);
    return index >= 0 ? index : 0;
  }, [state.step]);

  const totalSteps = STEP_ORDER.length;

  const progress = useMemo(() => {
    if (state.step === "idle") return 0;
    if (state.step === "success") return 100;
    if (state.step === "error") return (currentStepIndex / totalSteps) * 100;
    return ((currentStepIndex + 1) / totalSteps) * 100;
  }, [state.step, currentStepIndex, totalSteps]);

  return {
    // State
    step: state.step,
    txHash: state.txHash,
    confirmations: state.confirmations,
    gasEstimate: state.gasEstimate,
    errorMessage: state.errorMessage,
    startTime: state.startTime,
    contractAddress: state.contractAddress,

    // Setters
    setStep,
    setTxHash,
    setConfirmations,
    setGasEstimate,
    setContractAddress,
    setError,

    // Actions
    reset,
    startDeployment,

    // Computed
    isDeploying,
    isComplete,
    isError,
    elapsedTime,
    currentStepIndex,
    totalSteps,
    progress,
  };
}

// Helper hook for deployment with automatic state management
export function useDeploymentState() {
  const progress = useDeploymentProgress();

  const executeDeployment = useCallback(
    async <T>(
      deployFn: () => Promise<T>,
      options?: {
        onPreparing?: () => void;
        onEstimating?: () => void;
        onSigning?: () => void;
        onBroadcasting?: (txHash: string) => void;
        onConfirming?: (confirmations: number) => void;
        onSuccess?: (result: T) => void;
        onError?: (error: Error) => void;
      }
    ): Promise<T | null> => {
      progress.startDeployment();

      try {
        options?.onPreparing?.();
        progress.setStep("preparing");

        // Execute deployment function
        const result = await deployFn();

        progress.setStep("success");
        options?.onSuccess?.(result);

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Deployment failed";
        progress.setError(errorMessage);
        options?.onError?.(
          error instanceof Error ? error : new Error(errorMessage)
        );
        return null;
      }
    },
    [progress]
  );

  return {
    ...progress,
    executeDeployment,
  };
}

// Export step order for use in components
export { STEP_ORDER };
