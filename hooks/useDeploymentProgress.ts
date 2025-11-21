import { DeploymentStep } from "@/types";
import { useState } from "react";

export function useDeploymentProgress() {
  const [step, setStep] = useState<DeploymentStep>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [confirmations, setConfirmations] = useState(0);
  const [gasEstimate, setGasEstimate] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const reset = () => {
    setStep("idle");
    setTxHash(null);
    setConfirmations(0);
    setGasEstimate(undefined);
    setErrorMessage(undefined);
  };

  const setError = (message: string) => {
    setStep("error");
    setErrorMessage(message);
  };

  return {
    step,
    setStep,
    txHash,
    setTxHash,
    confirmations,
    setConfirmations,
    gasEstimate,
    setGasEstimate,
    errorMessage,
    setError,
    reset,
  };
}
