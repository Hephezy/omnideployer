"use client";

import { TerminalLog } from "@/components/TerminalLog";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Slider } from "@/components/ui/Slider";
import { ChainConfig, CHAINS, TOKEN_ABI, TOKEN_BYTECODE } from "@/config/constants";
import { ChainSelector } from "@/features/ChainSelector";
import { SuccessView } from "@/features/SuccessView";
import { WalletConnectView } from "@/features/WalletConnectView";
import { useWeb3 } from "@/hooks/useWeb3";
import { cn, shortenAddress } from "@/utils";
import { ethers } from "ethers";
import { Rocket, Settings, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

export default function OmniDeployer() {
  const { account, chainId, isConnecting, error: web3Error, connect, switchNetwork } = useWeb3();

  const [selectedChain, setSelectedChain] = useState<ChainConfig | null>(null);
  const [config, setConfig] = useState({
    name: '',
    symbol: '',
    supply: 1000000,
    devAllocation: 100 // Default 100% to dev for standard deploy
  });

  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [deployedTxHash, setDeployedTxHash] = useState<string | null>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const handleDeploy = async () => {
    if (!selectedChain || !account || !window.ethereum) return;

    // 1. Network Check
    if (chainId !== selectedChain.chainId) {
      addLog(`Error: Incorrect network. Switching to ${selectedChain.name}...`);
      await switchNetwork(selectedChain);
      return;
    }

    setIsDeploying(true);
    setLogs([]);
    setDeployedTxHash(null);

    try {
      addLog(`Initiating deployment on ${selectedChain.name}...`);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // 2. Factory Setup
      addLog(`Compiling Contract Factory...`);
      const factory = new ethers.ContractFactory(TOKEN_ABI, TOKEN_BYTECODE, signer);

      // 3. Estimate gas before deployment
      addLog(`Estimating gas...`);
      const deployTx = await factory.getDeployTransaction(
        config.name,
        config.symbol,
        config.supply
      );

      const estimatedGas = await provider.estimateGas({
        ...deployTx,
        from: account
      });

      addLog(`Estimated gas: ${estimatedGas.toString()}`);

      // 4. Deploy Transaction
      addLog(`Requesting signature...`);
      const contract = await factory.deploy(
        config.name,
        config.symbol,
        config.supply,
        {
          gasLimit: estimatedGas * BigInt(120) / BigInt(100) // 20% buffer
        }
      );

      const txHash = contract.deploymentTransaction()?.hash;
      if (txHash) {
        setDeployedTxHash(txHash);
        addLog(`Transaction broadcasted! Hash: ${txHash}`);
      }

      addLog(`Waiting for confirmations...`);

      // Wait for deployment with timeout
      const deploymentPromise = contract.waitForDeployment();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Deployment timeout after 120s')), 120000)
      );

      await Promise.race([deploymentPromise, timeoutPromise]);

      const address = await contract.getAddress();
      addLog(`SUCCESS! Contract deployed at: ${address}`);
      setDeployedAddress(address);

    } catch (err) {
      console.error('Deployment error:', err);

      let errorMessage = "Deployment failed";
      if (err instanceof Error) {
        // Parse common error types
        if (err.message.includes('user rejected')) {
          errorMessage = "Transaction rejected by user";
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = `Insufficient ${selectedChain.currency} for gas`;
        } else if (err.message.includes('nonce')) {
          errorMessage = "Nonce error - please reset your wallet or wait";
        } else {
          errorMessage = err.message;
        }
      } else if (typeof err === "object" && err !== null && "reason" in err) {
        errorMessage = (err as { reason: string }).reason;
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
    setConfig({ name: '', symbol: '', supply: 1000000, devAllocation: 100 });
  };

  // Sync initial chain selection with wallet
  useEffect(() => {
    if (chainId && !selectedChain) {
      const matchingChain = CHAINS.find(c => c.chainId === chainId);
      if (matchingChain) setSelectedChain(matchingChain);
    }
  }, [chainId, selectedChain]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 relative overflow-hidden">

      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/10 blur-[120px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[50px_50px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/60 bg-slate-950/50 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={reset}>
            <div className="w-8 h-8 bg-linear-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg group-hover:shadow-cyan-500/20 transition">
              OD
            </div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-slate-400">
              Omni<span className="text-cyan-400">Deployer</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {account ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-full text-xs font-mono text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                {shortenAddress(account)}
              </div>
            ) : (
              <Button variant="ghost" onClick={connect} className="text-xs">
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {!account ? (
          <WalletConnectView onConnect={connect} isConnecting={isConnecting} error={web3Error} />
        ) : deployedAddress ? (
          <SuccessView
            config={config}
            chain={selectedChain}
            contractAddress={deployedAddress}
            txHash={deployedTxHash ?? undefined}
            onReset={reset}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-500">

            {/* LEFT COLUMN: Config Form */}
            <div className="lg:col-span-7 space-y-6">
              <ChainSelector
                selected={selectedChain}
                currentChainId={chainId}
                onSelect={setSelectedChain}
                onSwitch={switchNetwork}
              />

              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2 text-purple-400 mt-6">
                  <Settings className="w-4 h-4" />
                  <span className="text-xs font-bold tracking-widest uppercase">Token Configuration</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Token Name"
                    placeholder="e.g. Galactic Credits"
                    value={config.name}
                    onChange={(v: string) => setConfig({ ...config, name: v })}
                    disabled={isDeploying}
                  />
                  <Input
                    label="Symbol"
                    placeholder="e.g. CRED"
                    value={config.symbol}
                    onChange={(v: string) => setConfig({ ...config, symbol: v.toUpperCase() })}
                    disabled={isDeploying}
                  />
                </div>

                <Input
                  label="Total Supply"
                  type="number"
                  placeholder="1000000"
                  value={config.supply}
                  onChange={(v: string) => setConfig({ ...config, supply: parseInt(v) || 0 })}
                  disabled={isDeploying}
                />

                <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/30 space-y-4 mt-2">
                  <Slider
                    label="Dev Allocation (To You)"
                    value={config.devAllocation}
                    onChange={(v) => setConfig({ ...config, devAllocation: v })}
                    disabled={isDeploying}
                  />
                  <p className="text-xs text-slate-500 italic">
                    Minting {((config.supply * config.devAllocation) / 100).toLocaleString()} {config.symbol || 'TOKENS'} to your wallet.
                  </p>
                </div>
              </section>

              <div className="pt-4">
                <Button
                  onClick={handleDeploy}
                  disabled={!selectedChain || !config.name || !config.symbol || isDeploying || (chainId !== selectedChain.chainId)}
                  isLoading={isDeploying}
                  className="w-full py-4 text-base relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Rocket className="w-5 h-5" />
                    {isDeploying ? 'Deploying...' : 'Initiate Deployment'}
                  </span>
                  <div className="absolute inset-0 bg-linear-to-r from-cyan-600 to-purple-600 opacity-0 group-hover:opacity-100 transition duration-300"></div>
                </Button>
              </div>
            </div>

            {/* RIGHT COLUMN: Preview & Logs */}
            <div className="lg:col-span-5 space-y-6">
              {/* Preview Card */}
              <div className="relative">
                <div className="absolute -inset-1 bg-linear-to-r from-cyan-500 to-purple-600 rounded-2xl blur opacity-20"></div>
                <Card className="p-6 bg-slate-950 border-slate-800">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Preview</h3>
                      <div className="text-2xl font-bold text-white">
                        {config.name || 'Token Name'}
                      </div>
                      <div className="text-sm text-cyan-400 font-mono mt-1">
                        ${config.symbol || 'SYMB'}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Chain</span>
                      <span className="text-slate-300 flex items-center gap-1.5">
                        {selectedChain ? (
                          <>
                            <div className={cn("w-2 h-2 rounded-full bg-linear-to-br", selectedChain.color)}></div>
                            {selectedChain.name}
                          </>
                        ) : 'Not Selected'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Supply</span>
                      <span className="text-slate-300 font-mono">{config.supply.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Standard</span>
                      <span className="text-slate-300">ERC-20 (Fixed)</span>
                    </div>
                  </div>
                </Card>
              </div>

              <TerminalLog logs={logs} />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-slate-600 text-xs">
        <p>OmniDeployer v3.0 • Testnet Only • Gas required for deployment</p>
      </footer>

    </div>
  );
}