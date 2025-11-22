import {
  BaseChainAdapter,
  ChainInfo,
  TokenBalance,
  TokenDeployParams,
  DeployResult,
  GasEstimate,
  TransactionReceipt,
  WalletInfo,
} from "../../interfaces/IChainAdapter";

import {
  Aptos,
  AptosConfig,
  Network,
  AccountAddress,
} from "@aptos-labs/ts-sdk";

// Correctly extend the global window interface for Petra/Martian
declare global {
  interface Window {
    aptos?: {
      connect(): Promise<{ address: string; publicKey: string }>;
      disconnect(): Promise<void>;
      isConnected(): Promise<boolean>;
      account(): Promise<{ address: string; publicKey: string }>;
      signAndSubmitTransaction(payload: any): Promise<{ hash: string }>;
      onAccountChange(
        callback: (account: { address: string } | null) => void
      ): void;
      onNetworkChange(callback: (network: { name: string }) => void): void;
    };
  }
}

export class AptosAdapter extends BaseChainAdapter {
  readonly chainType = "aptos" as const;
  readonly chainInfo: ChainInfo;
  private aptos: Aptos;

  constructor(network: "mainnet" | "testnet" | "devnet" = "testnet") {
    super();

    const networkConfig = {
      mainnet: {
        url: "https://fullnode.mainnet.aptoslabs.com/v1",
        enum: Network.MAINNET,
      },
      testnet: {
        url: "https://fullnode.testnet.aptoslabs.com/v1",
        enum: Network.TESTNET,
      },
      devnet: {
        url: "https://fullnode.devnet.aptoslabs.com/v1",
        enum: Network.DEVNET,
      },
    };

    const config = networkConfig[network];

    this.chainInfo = {
      id: `aptos-${network}`,
      name: `Aptos ${network.charAt(0).toUpperCase() + network.slice(1)}`,
      type: "aptos",
      isTestnet: network !== "mainnet",
      nativeCurrency: { name: "Aptos", symbol: "APT", decimals: 8 },
      explorerUrl: `https://explorer.aptoslabs.com`,
      rpcUrl: config.url,
    };

    this.aptos = new Aptos(new AptosConfig({ network: config.enum }));
  }

  async connect(): Promise<WalletInfo> {
    if (!window.aptos) throw new Error("Petra wallet not found");

    try {
      const response = await window.aptos.connect();
      this.wallet = {
        address: response.address,
        publicKey: response.publicKey,
        chainType: "aptos",
        chainId: this.chainInfo.id,
        isConnected: true,
        walletName: "Petra",
      };

      window.aptos.onAccountChange((account) => {
        if (account) {
          this.wallet = { ...this.wallet!, address: account.address };
          this.emit("accountChange", account.address);
        } else {
          this.disconnect();
        }
      });

      return this.wallet;
    } catch (error) {
      throw new Error("Connection failed");
    }
  }

  async disconnect(): Promise<void> {
    if (window.aptos) await window.aptos.disconnect();
    this.wallet = null;
    this.emit("disconnect");
  }

  async getBalance(address?: string): Promise<TokenBalance> {
    const addr = address || this.wallet?.address;
    if (!addr) return { raw: "0", formatted: "0", symbol: "APT", decimals: 8 };

    try {
      const resource = await this.aptos.getAccountCoinAmount({
        accountAddress: addr,
        coinType: "0x1::aptos_coin::AptosCoin",
      });

      return {
        raw: BigInt(resource),
        formatted: (resource / 1e8).toFixed(4),
        symbol: "APT",
        decimals: 8,
      };
    } catch {
      return { raw: "0", formatted: "0", symbol: "APT", decimals: 8 };
    }
  }

  async deployToken(params: TokenDeployParams): Promise<DeployResult> {
    if (!this.wallet || !window.aptos) throw new Error("Wallet not connected");

    try {
      // Note: True asset creation on Aptos uses 0x1::managed_coin (if published)
      // or requires publishing a package.
      // This payload attempts to initialize a managed coin.
      const payload = {
        type: "entry_function_payload",
        function: "0x1::managed_coin::initialize",
        type_arguments: [
          `${this.wallet.address}::${params.symbol}::${params.symbol}`,
        ],
        arguments: [
          params.name,
          params.symbol,
          params.decimals || 8,
          false, // monitor_supply
        ],
      };

      const response = await window.aptos.signAndSubmitTransaction(payload);
      await this.aptos.waitForTransaction({ transactionHash: response.hash });

      return {
        success: true,
        transactionHash: response.hash,
        explorerUrl: `${this.chainInfo.explorerUrl}/txn/${
          response.hash
        }?network=${this.chainInfo.id.split("-")[1]}`,
      };
    } catch (error: any) {
      return {
        success: false,
        transactionHash: "",
        explorerUrl: "",
        error: error.message,
      };
    }
  }

  async estimateDeploymentFee(params: TokenDeployParams): Promise<GasEstimate> {
    return { estimatedFee: "0.005", feeToken: "APT" };
  }

  isValidAddress(address: string): boolean {
    try {
      return AccountAddress.isValid({ input: address }).valid;
    } catch {
      return false;
    }
  }

  formatAddress(address: string): string {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  async waitForTransaction(hash: string): Promise<TransactionReceipt> {
    await this.aptos.waitForTransaction({ transactionHash: hash });
    return { hash, status: "success", confirmations: 1 };
  }

  async getTransactionStatus(hash: string): Promise<TransactionReceipt> {
    try {
      const tx = await this.aptos.getTransactionByHash({
        transactionHash: hash,
      });
      return { hash, status: "success", confirmations: 1 };
    } catch {
      return { hash, status: "pending", confirmations: 0 };
    }
  }
}
