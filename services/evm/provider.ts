import { ethers } from "ethers";
import { ChainConfig } from "@/config/chains";

export class EVMProviderService {
  private providerCache: Map<number, ethers.JsonRpcProvider> = new Map();
  private healthyRpcCache: Map<number, string> = new Map();

  async getProvider(chain: ChainConfig): Promise<ethers.JsonRpcProvider> {
    const cached = this.providerCache.get(chain.chainId);
    if (cached) {
      try {
        await cached.getBlockNumber();
        return cached;
      } catch {
        this.providerCache.delete(chain.chainId);
        this.healthyRpcCache.delete(chain.chainId);
      }
    }

    for (const rpcUrl of chain.rpcUrls) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl, {
          chainId: chain.chainId,
          name: chain.name,
        });

        const blockNumber = await Promise.race([
          provider.getBlockNumber(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("RPC timeout")), 5000)
          ),
        ]);

        if (blockNumber > 0) {
          this.providerCache.set(chain.chainId, provider);
          this.healthyRpcCache.set(chain.chainId, rpcUrl);
          return provider;
        }
      } catch (err) {
        console.warn(`RPC ${rpcUrl} failed:`, err);
        continue;
      }
    }

    throw new Error(`All RPC endpoints failed for ${chain.name}`);
  }

  async getBrowserProvider(): Promise<ethers.BrowserProvider> {
    if (!window.ethereum) {
      throw new Error("No wallet detected. Please install MetaMask.");
    }
    return new ethers.BrowserProvider(window.ethereum);
  }

  async getSigner(): Promise<ethers.JsonRpcSigner> {
    const provider = await this.getBrowserProvider();
    return provider.getSigner();
  }

  async estimateGas(
    chain: ChainConfig,
    tx: ethers.TransactionRequest
  ): Promise<{
    gasLimit: bigint;
    gasPrice: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
    estimatedCost: bigint;
    formattedCost: string;
  }> {
    const provider = await this.getProvider(chain);

    const [gasLimit, feeData] = await Promise.all([
      provider.estimateGas(tx),
      provider.getFeeData(),
    ]);

    const gasLimitWithBuffer = (gasLimit * BigInt(120)) / BigInt(100);

    let estimatedCost: bigint;
    if (feeData.maxFeePerGas) {
      estimatedCost = gasLimitWithBuffer * feeData.maxFeePerGas;
    } else if (feeData.gasPrice) {
      estimatedCost = gasLimitWithBuffer * feeData.gasPrice;
    } else {
      throw new Error("Unable to get gas price");
    }

    return {
      gasLimit: gasLimitWithBuffer,
      gasPrice: feeData.gasPrice ?? BigInt(0),
      maxFeePerGas: feeData.maxFeePerGas ?? undefined,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined,
      estimatedCost,
      formattedCost: `${ethers.formatUnits(
        estimatedCost,
        chain.nativeCurrency.decimals
      )} ${chain.nativeCurrency.symbol}`,
    };
  }

  async getBalance(
    chain: ChainConfig,
    address: string
  ): Promise<{ raw: bigint; formatted: string }> {
    const provider = await this.getProvider(chain);
    const balance = await provider.getBalance(address);

    return {
      raw: balance,
      formatted: `${ethers.formatUnits(
        balance,
        chain.nativeCurrency.decimals
      )} ${chain.nativeCurrency.symbol}`,
    };
  }

  async waitForTransaction(
    chain: ChainConfig,
    txHash: string,
    onConfirmation?: (confirmations: number) => void
  ): Promise<ethers.TransactionReceipt> {
    const provider = await this.getProvider(chain);

    let lastConfirmations = 0;
    const checkConfirmations = async () => {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt) {
        const confirmations = await receipt.confirmations();
        if (confirmations !== lastConfirmations) {
          lastConfirmations = confirmations;
          onConfirmation?.(confirmations);
        }
      }
    };

    const interval = setInterval(checkConfirmations, chain.avgBlockTime * 1000);

    try {
      const receipt = await provider.waitForTransaction(
        txHash,
        chain.confirmations,
        120000
      );

      if (!receipt) {
        throw new Error("Transaction receipt not found");
      }

      return receipt;
    } finally {
      clearInterval(interval);
    }
  }

  clearCache(): void {
    this.providerCache.clear();
    this.healthyRpcCache.clear();
  }
}

export const evmProvider = new EVMProviderService();
