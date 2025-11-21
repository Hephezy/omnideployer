import { ethers } from "ethers";
import { ChainConfig } from "@/config/chains";

export class EVMProviderService {
  private providerCache: Map<number, ethers.JsonRpcProvider> = new Map();
  private healthyRpcCache: Map<number, string> = new Map();

  /**
   * Get a working provider for a chain with automatic fallback
   */
  async getProvider(chain: ChainConfig): Promise<ethers.JsonRpcProvider> {
    // Check cache first
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

    // Try each RPC URL
    for (const rpcUrl of chain.rpcUrls) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl, {
          chainId: chain.chainId,
          name: chain.name,
        });

        // Test the connection
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

  /**
   * Get browser provider (MetaMask, etc.)
   */
  async getBrowserProvider(): Promise<ethers.BrowserProvider> {
    if (!window.ethereum) {
      throw new Error("No wallet detected. Please install MetaMask.");
    }
    return new ethers.BrowserProvider(window.ethereum);
  }

  /**
   * Get signer from browser provider
   */
  async getSigner(): Promise<ethers.Signer> {
    const provider = await this.getBrowserProvider();
    return provider.getSigner();
  }

  /**
   * Estimate gas for a transaction
   */
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

  /**
   * Get native token balance
   */
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

  /**
   * Wait for transaction with proper confirmation count
   */
  async waitForTransaction(
    chain: ChainConfig,
    txHash: string,
    onConfirmation?: (confirmations: number) => void
  ): Promise<ethers.TransactionReceipt> {
    const provider = await this.getProvider(chain);

    let lastConfirmations = 0;
    const checkConfirmations = async () => {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt && receipt.confirmations !== lastConfirmations) {
        lastConfirmations = receipt.confirmations;
        onConfirmation?.(receipt.confirmations);
      }
    };

    // Poll for confirmations
    const interval = setInterval(checkConfirmations, chain.avgBlockTime * 1000);

    try {
      const receipt = await provider.waitForTransaction(
        txHash,
        chain.confirmations,
        120000 // 2 minute timeout
      );

      if (!receipt) {
        throw new Error("Transaction receipt not found");
      }

      return receipt;
    } finally {
      clearInterval(interval);
    }
  }

  /**
   * Clear provider cache
   */
  clearCache(): void {
    this.providerCache.clear();
    this.healthyRpcCache.clear();
  }
}

// Singleton instance
export const evmProvider = new EVMProviderService();
