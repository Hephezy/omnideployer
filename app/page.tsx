"use client";

import { useState, useEffect, useCallback } from "react";
import { TerminalLog } from "@/components/TerminalLog";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, NumberInput, Textarea } from "@/components/ui/Input";
import { Slider } from "@/components/ui/Slider";
import { DeploymentProgress } from "@/components/DeploymentProgress";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TokenValidation, useTokenValidation } from "@/components/TokenValidation";
import { UnifiedWalletConnect } from "@/features/UnifiedWalletConnect";
import { SuccessView } from "@/features/SuccessView";
import { useMultiChain } from "@/contexts/MultiChainContext";
import { DeploymentStep } from "@/types";
import { Rocket, Settings, ShieldCheck, Coins, ArrowLeft } from "lucide-react";
import { formatCompact } from "@/utils";

export default function OmniDeployer() {
  // Use the Multi-Chain Context instead of EVM-specific hooks
  const {
    activeChainType,
    wallet,
    balance,
    activeAdapter,
    disconnect,
    deployToken,
    estimateDeployFee,
    isDeploying: isAdapterDeploying,
    error: adapterError,
    clearError
  } = useMultiChain();

  // State
  const [config, setConfig] = useState({
    name: "",
    symbol: "",
    supply: 1000000,
    decimals: 9, // Default varies by chain, handled in effect
    description: "",
    devAllocation: 100,
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [deploymentState, setDeploymentState] = useState<{
    step: DeploymentStep;
    txHash: string | null;
    contractAddress: string | null;
    error: string | null;
  }>({
    step: "idle",
    txHash: null,
    contractAddress: null,
    error: null
  });

  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [isFeeLoading, setIsFeeLoading] = useState(false);

  // Token validation
  const { errors: validationErrors, isValid, validate } = useTokenValidation();

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Update decimals based on chain type
  useEffect(() => {
    if (!activeChainType) return;
    const defaults = {
      evm: 18,
      solana: 9,
      aptos: 8,
      sui: 9
    };
    setConfig(prev => ({ ...prev, decimals: defaults[activeChainType] }));
  }, [activeChainType]);

  // Estimate fees when config changes
  useEffect(() => {
    const estimate = async () => {
      if (!isValid || !activeAdapter || !wallet) return;

      setIsFeeLoading(true);
      try {
        const estimate = await estimateDeployFee({
          name: config.name,
          symbol: config.symbol,
          decimals: config.decimals,
          initialSupply: config.supply,
          description: config.description
        });
        setEstimatedFee(`${estimate.estimatedFee} ${estimate.feeToken}`);
      } catch (e) {
        console.error("Fee estimation failed", e);
      } finally {
        setIsFeeLoading(false);
      }
    };

    const debounce = setTimeout(estimate, 800);
    return () => clearTimeout(debounce);
  }, [config, activeAdapter, wallet, isValid, estimateDeployFee]);

  const handleDeploy = async () => {
    if (!activeAdapter || !wallet) return;

    // Validate
    const validationResult = validate(config);
    if (!validationResult.isValid) {
      addLog(`ERROR: ${validationResult.errors[0].message}`);
      return;
    }

    setDeploymentState({ step: "preparing", txHash: null, contractAddress: null, error: null });
    setLogs([]);

    addLog(`Initiating deployment on ${activeChainType}...`);
    addLog(`Token: ${config.name} (${config.symbol})`);

    try {
      setDeploymentState(prev => ({ ...prev, step: "signing" }));
      addLog("Please confirm transaction in wallet...");

      const result = await deployToken({
        name: config.name,
        symbol: config.symbol,
        decimals: config.decimals,
        initialSupply: config.supply,
        description: config.description
      });

      if (result.success) {
        setDeploymentState({
          step: "success",
          txHash: result.transactionHash,
          contractAddress: result.contractAddress || result.tokenMint || result.packageId || "",
          error: null
        });
        addLog("✅ Deployment Successful!");
        addLog(`Hash: ${result.transactionHash}`);
      } else {
        throw new Error(result.error || "Unknown deployment error");
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Deployment failed";
      setDeploymentState(prev => ({ ...prev, step: "error", error: msg }));
      addLog(`❌ ERROR: ${msg}`);
    }
  };

  const reset = () => {
    setDeploymentState({ step: "idle", txHash: null, contractAddress: null, error: null });
    setConfig({ name: "", symbol: "", supply: 1000000, decimals: 9, description: "", devAllocation: 100 });
    setLogs([]);
    clearError();
  };

  // Validate on config change
  useEffect(() => {
    if (config.name || config.symbol) validate(config);
  }, [config, validate]);

  const canDeploy = isValid && !isAdapterDeploying && wallet && activeChainType;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 relative overflow-hidden">
        {/* Background */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/10 blur-[120px]" />
        </div>

        {/* Header */}
        <header className="relative z-10 border-b border-slate-800/60 bg-slate-950/50 backdrop-blur-md sticky top-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
              <div className="w-8 h-8 bg-linear-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">OD</div>
              <span className="text-lg font-bold hidden sm:inline">Omni<span className="text-cyan-400">Check</span></span>
            </div>

            {wallet && (
              <div className="flex items-center gap-4">
                <div className="hidden sm:block text-right">
                  <p className="text-xs text-slate-500">Connected to {activeChainType?.toUpperCase()}</p>
                  <p className="text-sm font-mono text-cyan-400">{balance?.formatted || "0.00"} {balance?.symbol}</p>
                </div>
                <Button variant="outline" onClick={disconnect} className="text-xs">Disconnect</Button>
              </div>
            )}
          </div>
        </header>

        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Wallet Connection / Chain Selection View */}
          {!wallet ? (
            <UnifiedWalletConnect />
          ) : deploymentState.contractAddress ? (
            // Success View
            <SuccessView
              config={config}
              chain={null} // We can adapt SuccessView to accept generic chain info later
              contractAddress={deploymentState.contractAddress}
              txHash={deploymentState.txHash || undefined}
              onReset={reset}
            />
          ) : (
            // Deployment Form
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-cyan-400" />
                    Token Configuration
                  </h2>
                  <span className="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-400 border border-slate-700 uppercase tracking-wider">
                    {activeChainType} Network
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Token Name"
                      placeholder="e.g. Omni Token"
                      value={config.name}
                      onChange={(v) => setConfig({ ...config, name: v })}
                      disabled={isAdapterDeploying}
                    />
                    <Input
                      label="Symbol"
                      placeholder="e.g. OMNI"
                      value={config.symbol}
                      onChange={(v) => setConfig({ ...config, symbol: v.toUpperCase().slice(0, 10) })}
                      disabled={isAdapterDeploying}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <NumberInput
                      label="Total Supply"
                      value={config.supply}
                      onChange={(v) => setConfig({ ...config, supply: Number(v) })}
                      min={1}
                      disabled={isAdapterDeploying}
                    />
                    <Input
                      label="Decimals"
                      type="number"
                      value={config.decimals}
                      onChange={(v) => setConfig({ ...config, decimals: Number(v) })}
                      disabled={true} // Typically fixed per chain standard, but can be editable
                      hint={`Standard for ${activeChainType}`}
                    />
                  </div>

                  {/* Non-EVM chains often support description/metadata on-chain */}
                  {activeChainType !== 'evm' && (
                    <Textarea
                      label="Description"
                      placeholder="Describe your token..."
                      value={config.description}
                      onChange={(v) => setConfig({ ...config, description: v })}
                      maxLength={200}
                    />
                  )}

                  <TokenValidation errors={validationErrors} />

                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/30 space-y-4">
                    <Slider
                      label="Dev Allocation"
                      value={config.devAllocation}
                      onChange={(v) => setConfig({ ...config, devAllocation: v })}
                      disabled={isAdapterDeploying}
                    />
                    <p className="text-xs text-slate-500 italic">
                      Minting <span className="text-cyan-400 font-mono">{((config.supply * config.devAllocation) / 100).toLocaleString()}</span> {config.symbol || "TOKENS"} to your wallet.
                    </p>
                  </div>
                </div>

                {/* Fees & Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 bg-slate-900/50 border-slate-800 flex flex-col justify-center">
                    <span className="text-xs text-slate-500 uppercase tracking-wider mb-1">Estimated Network Fee</span>
                    {isFeeLoading ? (
                      <span className="text-sm text-slate-400 animate-pulse">Calculating...</span>
                    ) : (
                      <span className="text-lg font-mono text-white">{estimatedFee || "---"}</span>
                    )}
                  </Card>

                  <Button
                    onClick={handleDeploy}
                    disabled={!canDeploy}
                    isLoading={isAdapterDeploying}
                    className="h-full min-h-[60px] text-base"
                  >
                    <Rocket className="w-5 h-5 mr-2" />
                    {isAdapterDeploying ? "Deploying..." : "Deploy Token"}
                  </Button>
                </div>

                {/* Progress */}
                <DeploymentProgress
                  currentStep={deploymentState.step}
                  txHash={deploymentState.txHash}
                  errorMessage={deploymentState.error || adapterError || undefined}
                />
              </div>

              {/* Preview Column */}
              <div className="lg:col-span-5 space-y-6">
                <Card className="p-6 bg-slate-950 border-slate-800 sticky top-24">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase mb-1">Preview</h3>
                      <div className="text-2xl font-bold text-white">{config.name || "Token Name"}</div>
                      <div className="text-sm text-cyan-400 font-mono mt-1">${config.symbol || "SYMB"}</div>
                    </div>
                    <Coins className="w-8 h-8 text-slate-700" />
                  </div>
                  <div className="space-y-3 text-sm border-t border-slate-800/50 pt-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ecosystem</span>
                      <span className="text-slate-300 capitalize">{activeChainType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Supply</span>
                      <span className="text-slate-300 font-mono">{formatCompact(config.supply)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Decimals</span>
                      <span className="text-slate-300">{config.decimals}</span>
                    </div>
                  </div>
                </Card>

                <TerminalLog logs={logs} />
              </div>
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}