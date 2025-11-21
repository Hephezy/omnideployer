"use client";

import { TerminalLog } from "@/components/TerminalLog";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Slider } from "@/components/ui/Slider";
import { GasEstimationCard } from "@/components/GasEstimationCard";
import { NetworkStatusBadge, NetworkStatusIndicator } from "@/components/NetworkStatusBadge";
import { DeploymentHistory } from "@/components/DeploymentHistory";
import { WalletSelector, WalletButton } from "@/components/WalletSelector";
import { ChainConfig, CHAINS, TOKEN_ABI } from "@/config/constants";
import { ERC20_BYTECODE } from "@/config/contracts/erc20";
import { ChainSelector } from "@/features/ChainSelector";
import { SuccessView } from "@/features/SuccessView";
import { useMultiWallet } from "@/hooks/useMultiWallet";
import { useGasEstimation } from "@/hooks/useGasEstimation";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useDeploymentHistory } from "@/hooks/useDeploymentHistory";
import { ethers } from "ethers";
import { Rocket, Settings, ShieldCheck, History, Fuel } from "lucide-react";
import { useEffect, useState } from "react";

export default function OmniDeployer() {
  // Multi-wallet support
  const {
    account,
    chainId,
    isConnecting,
    isConnected,
    activeWallet,
    error: walletError,
    balance,
    availableWallets,
    connect,
    disconnect,
    switchNetwork,
  } = useMultiWallet();

  // State
  const [selectedChain, setSelectedChain] = useState<ChainConfig | null>(null);
  const [config, setConfig] = useState({
    name: "",
    symbol: "",
    supply: 1000000,
    devAllocation: 100,
  });
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [deployedTxHash, setDeployedTxHash] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Gas estimation
  const {
    estimation: gasEstimation,
    isEstimating: isEstimatingGas,
    error: gasError,
    lastUpdated: gasLastUpdated,
    refresh: refreshGas,
  } = useGasEstimation(selectedChain, account, config);

  // Network status
  const { status: networkStatus, isChecking: isCheckingNetwork, checkNow: checkNetwork } = useNetworkStatus(selectedChain);

  // Deployment history
  const {
    history,
    addDeployment,
    removeDeployment,
    clearHistory,
    markVerified,
  } = useDeploymentHistory();

  const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  const handleDeploy = async () => {
    if (!selectedChain || !account || !window.ethereum) return;

    if (chainId !== selectedChain.chainId) {
      addLog(`Switching to ${selectedChain.name}...`);
      const switched = await switchNetwork(selectedChain.hexChainId, {
        chainId: selectedChain.hexChainId,
        chainName: selectedChain.name,
        rpcUrls: [selectedChain.rpcUrl],
        blockExplorerUrls: [selectedChain.blockExplorer],
        nativeCurrency: { name: selectedChain.currency, symbol: selectedChain.currency, decimals: 18 },
      });
      if (!switched) {
        addLog("ERROR: Failed to switch network");
        return;
      }
    }

    setIsDeploying(true);
    setLogs([]);
    setDeployedTxHash(null);

    try {
      addLog(`Initiating deployment on ${selectedChain.name}...`);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      addLog(`Compiling Contract Factory...`);
      const factory = new ethers.ContractFactory(TOKEN_ABI, ERC20_BYTECODE, signer);

      addLog(`Estimating gas...`);
      const deployTx = await factory.getDeployTransaction(config.name, config.symbol, config.supply);
      const estimatedGas = await provider.estimateGas({ ...deployTx, from: account });
      addLog(`Estimated gas: ${estimatedGas.toString()}`);

      addLog(`Requesting signature...`);
      const contract = await factory.deploy(config.name, config.symbol, config.supply, {
        gasLimit: (estimatedGas * BigInt(120)) / BigInt(100),
      });

      const txHash = contract.deploymentTransaction()?.hash;
      if (txHash) {
        setDeployedTxHash(txHash);
        addLog(`Transaction broadcasted! Hash: ${txHash}`);
      }

      addLog(`Waiting for confirmations...`);

      await Promise.race([
        contract.waitForDeployment(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 120000)),
      ]);

      const address = await contract.getAddress();
      addLog(`SUCCESS! Contract deployed at: ${address}`);
      setDeployedAddress(address);

      // Add to history
      addDeployment({
        chainId: selectedChain.chainId,
        chainName: selectedChain.name,
        tokenName: config.name,
        tokenSymbol: config.symbol,
        totalSupply: config.supply,
        contractAddress: address,
        txHash: txHash || "",
        deployer: account,
        explorerUrl: `${selectedChain.blockExplorer}/address/${address}`,
        verified: false,
        status: "success",
      });
    } catch (err) {
      console.error("Deployment error:", err);
      let errorMessage = "Deployment failed";
      if (err instanceof Error) {
        if (err.message.includes("user rejected")) errorMessage = "Transaction rejected";
        else if (err.message.includes("insufficient funds")) errorMessage = `Insufficient ${selectedChain.currency}`;
        else if (err.message.includes("nonce")) errorMessage = "Nonce error - try again";
        else errorMessage = err.message;
      }
      addLog(`ERROR: ${errorMessage}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const reset = () => {
    setDeployedAddress(null);
    setDeployedTxHash(null);
    setLogs([]);
    setConfig({ name: "", symbol: "", supply: 1000000, devAllocation: 100 });
  };

  useEffect(() => {
    if (chainId && !selectedChain) {
      const match = CHAINS.find((c) => c.chainId === chainId);
      if (match) setSelectedChain(match);
    }
  }, [chainId, selectedChain]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/60 bg-slate-950/50 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={reset}>
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              OD
            </div>
            <span className="text-lg font-bold">
              Omni<span className="text-cyan-400">Deployer</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {selectedChain && <NetworkStatusIndicator status={networkStatus} />}
            <WalletButton
              account={account}
              activeWallet={activeWallet}
              balance={balance}
              onConnect={() => setShowWalletModal(true)}
              onDisconnect={disconnect}
              isConnecting={isConnecting}
            />
          </div>
        </div>
      </header>

      {/* Wallet Modal */}
      {showWalletModal && !account && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 m-4 bg-slate-900 border-slate-700">
            <h2 className="text-xl font-bold mb-4">Connect Wallet</h2>
            <WalletSelector
              wallets={availableWallets}
              activeWallet={activeWallet}
              isConnecting={isConnecting}
              error={walletError}
              onConnect={(type) => {
                connect(type);
                if (!walletError) setShowWalletModal(false);
              }}
            />
            <button
              onClick={() => setShowWalletModal(false)}
              className="mt-4 w-full py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {!account ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Welcome to OmniDeployer</h2>
              <p className="text-slate-400">Connect your wallet to deploy tokens</p>
            </div>
            <Button onClick={() => setShowWalletModal(true)} className="px-8 py-3 text-lg">
              Connect Wallet
            </Button>
          </div>
        ) : deployedAddress ? (
          <SuccessView
            config={config}
            chain={selectedChain}
            contractAddress={deployedAddress}
            txHash={deployedTxHash ?? undefined}
            onReset={reset}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-7 space-y-6">
              <ChainSelector
                selected={selectedChain}
                currentChainId={chainId}
                onSelect={setSelectedChain}
                onSwitch={(chain) =>
                  switchNetwork(chain.hexChainId, {
                    chainId: chain.hexChainId,
                    chainName: chain.name,
                    rpcUrls: [chain.rpcUrl],
                    blockExplorerUrls: [chain.blockExplorer],
                    nativeCurrency: { name: chain.currency, symbol: chain.currency, decimals: 18 },
                  })
                }
              />

              {/* Network Status */}
              {selectedChain && (
                <NetworkStatusBadge
                  status={networkStatus}
                  isChecking={isCheckingNetwork}
                  onRefresh={checkNetwork}
                  showDetails
                />
              )}

              {/* Token Config */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-purple-400 mt-6">
                  <Settings className="w-4 h-4" />
                  <span className="text-xs font-bold tracking-widest uppercase">Token Configuration</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Token Name"
                    placeholder="e.g. Galactic Credits"
                    value={config.name}
                    onChange={(v) => setConfig({ ...config, name: v })}
                    disabled={isDeploying}
                  />
                  <Input
                    label="Symbol"
                    placeholder="e.g. CRED"
                    value={config.symbol}
                    onChange={(v) => setConfig({ ...config, symbol: v.toUpperCase() })}
                    disabled={isDeploying}
                  />
                </div>

                <Input
                  label="Total Supply"
                  type="number"
                  placeholder="1000000"
                  value={config.supply}
                  onChange={(v) => setConfig({ ...config, supply: parseInt(v) || 0 })}
                  disabled={isDeploying}
                />

                <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/30 space-y-4">
                  <Slider
                    label="Dev Allocation"
                    value={config.devAllocation}
                    onChange={(v) => setConfig({ ...config, devAllocation: v })}
                    disabled={isDeploying}
                  />
                  <p className="text-xs text-slate-500 italic">
                    Minting {((config.supply * config.devAllocation) / 100).toLocaleString()}{" "}
                    {config.symbol || "TOKENS"} to your wallet.
                  </p>
                </div>
              </section>

              {/* Gas Estimation */}
              <GasEstimationCard
                estimation={gasEstimation}
                isEstimating={isEstimatingGas}
                error={gasError}
                lastUpdated={gasLastUpdated}
                onRefresh={refreshGas}
                currency={selectedChain?.currency || "ETH"}
              />

              {/* Deploy Button */}
              <Button
                onClick={handleDeploy}
                disabled={!selectedChain || !config.name || !config.symbol || isDeploying}
                isLoading={isDeploying}
                className="w-full py-4 text-base"
              >
                <Rocket className="w-5 h-5 mr-2" />
                {isDeploying ? "Deploying..." : "Deploy Token"}
              </Button>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-5 space-y-6">
              {/* Preview Card */}
              <Card className="p-6 bg-slate-950 border-slate-800">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-1">Preview</h3>
                    <div className="text-2xl font-bold text-white">{config.name || "Token Name"}</div>
                    <div className="text-sm text-cyan-400 font-mono mt-1">${config.symbol || "SYMB"}</div>
                  </div>
                  <ShieldCheck className="w-8 h-8 text-slate-600" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chain</span>
                    <span className="text-slate-300">{selectedChain?.name || "Not Selected"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Supply</span>
                    <span className="text-slate-300 font-mono">{config.supply.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Standard</span>
                    <span className="text-slate-300">ERC-20</span>
                  </div>
                </div>
              </Card>

              <TerminalLog logs={logs} />

              <DeploymentHistory
                history={history}
                onRemove={removeDeployment}
                onClear={clearHistory}
              />
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-10 text-center py-8 text-slate-600 text-xs">
        OmniDeployer v3.0 • Testnet Only
      </footer>
    </div>
  );
}