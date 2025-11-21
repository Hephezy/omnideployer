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
  Account,
  Ed25519PrivateKey,
  AccountAddress,
  U64,
  MoveString,
} from "@aptos-labs/ts-sdk";

// Petra wallet interface
interface AptosWallet {
  aptos?: {
    connect(): Promise<{ address: string; publicKey: string }>;
    disconnect(): Promise<void>;
    isConnected(): Promise<boolean>;
    account(): Promise<{ address: string; publicKey: string }>;
    signAndSubmitTransaction(payload: any): Promise<{ hash: string }>;
    signTransaction(payload: any): Promise<Uint8Array>;
    onAccountChange(
      callback: (account: { address: string } | null) => void
    ): void;
    onNetworkChange(callback: (network: { name: string }) => void): void;
  };
}

declare global {
  interface Window extends AptosWallet {}
}

export class AptosAdapter extends BaseChainAdapter {
  readonly chainType = "aptos" as const;
  readonly chainInfo: ChainInfo;

  private aptos: Aptos;

  constructor(network: "mainnet" | "testnet" | "devnet" = "testnet") {
    super();

    const networks = {
      mainnet: {
        id: "aptos-mainnet",
        name: "Aptos Mainnet",
        rpcUrl: "https://fullnode.mainnet.aptoslabs.com/v1",
        explorerUrl: "https://explorer.aptoslabs.com",
        isTestnet: false,
        network: Network.MAINNET,
      },
      testnet: {
        id: "aptos-testnet",
        name: "Aptos Testnet",
        rpcUrl: "https://fullnode.testnet.aptoslabs.com/v1",
        explorerUrl: "https://explorer.aptoslabs.com?network=testnet",
        isTestnet: true,
        network: Network.TESTNET,
      },
      devnet: {
        id: "aptos-devnet",
        name: "Aptos Devnet",
        rpcUrl: "https://fullnode.devnet.aptoslabs.com/v1",
        explorerUrl: "https://explorer.aptoslabs.com?network=devnet",
        isTestnet: true,
        network: Network.DEVNET,
      },
    };

    const config = networks[network];

    this.chainInfo = {
      id: config.id,
      name: config.name,
      type: "aptos",
      isTestnet: config.isTestnet,
      nativeCurrency: {
        name: "Aptos",
        symbol: "APT",
        decimals: 8,
      },
      explorerUrl: config.explorerUrl,
      rpcUrl: config.rpcUrl,
    };

    const aptosConfig = new AptosConfig({ network: config.network });
    this.aptos = new Aptos(aptosConfig);
  }

  async connect(): Promise<WalletInfo> {
    const petra = window.aptos;

    if (!petra) {
      throw new Error("Petra wallet not found. Please install Petra.");
    }

    try {
      const response = await petra.connect();

      this.wallet = {
        address: response.address,
        publicKey: response.publicKey,
        chainType: "aptos",
        chainId: this.chainInfo.id,
        isConnected: true,
        walletName: "Petra",
      };

      // Set up event listeners
      petra.onAccountChange((account) => {
        if (account) {
          this.wallet = { ...this.wallet!, address: account.address };
          this.emit("accountChange", account.address);
        } else {
          this.disconnect();
        }
      });

      petra.onNetworkChange((network) => {
        this.emit("chainChange", network.name);
      });

      return this.wallet;
    } catch (error) {
      throw new Error(`Failed to connect to Petra: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    const petra = window.aptos;
    if (petra) {
      await petra.disconnect();
    }
    this.wallet = null;
    this.emit("disconnect");
  }

  async getBalance(address?: string): Promise<TokenBalance> {
    const accountAddress = AccountAddress.from(
      address || this.wallet?.address || ""
    );

    try {
      const resources = await this.aptos.getAccountResources({
        accountAddress,
      });

      const aptResource = resources.find(
        (r) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
      );

      const balance = aptResource
        ? BigInt((aptResource.data as any).coin.value)
        : BigInt(0);

      return {
        raw: balance,
        formatted: (Number(balance) / 1e8).toFixed(4),
        symbol: "APT",
        decimals: 8,
      };
    } catch {
      return {
        raw: BigInt(0),
        formatted: "0",
        symbol: "APT",
        decimals: 8,
      };
    }
  }

  isValidAddress(address: string): boolean {
    try {
      // Aptos addresses are 64 hex characters with 0x prefix
      if (!address.startsWith("0x")) return false;
      if (address.length !== 66) return false;
      AccountAddress.from(address);
      return true;
    } catch {
      return false;
    }
  }

  async estimateDeploymentFee(params: TokenDeployParams): Promise<GasEstimate> {
    // Aptos coin deployment typically costs around 0.01-0.05 APT
    return {
      estimatedFee: "0.05",
      feeToken: "APT",
      gasUnits: BigInt(50000),
    };
  }

  async deployToken(params: TokenDeployParams): Promise<DeployResult> {
    if (!this.wallet || !window.aptos) {
      throw new Error("Wallet not connected");
    }

    try {
      // Note: Deploying a custom coin on Aptos requires publishing a Move module
      // This is a simplified example using the managed_coin module

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
          true, // monitor_supply
        ],
      };

      const response = await window.aptos.signAndSubmitTransaction(payload);

      // Wait for transaction
      await this.aptos.waitForTransaction({
        transactionHash: response.hash,
      });

      return {
        success: true,
        transactionHash: response.hash,
        coinType: `${this.wallet.address}::${params.symbol}::${params.symbol}`,
        explorerUrl: this.getExplorerUrl(response.hash, "tx"),
      };
    } catch (error) {
      return {
        success: false,
        transactionHash: "",
        explorerUrl: "",
        error: error instanceof Error ? error.message : "Deployment failed",
      };
    }
  }

  async waitForTransaction(hash: string): Promise<TransactionReceipt> {
    const result = await this.aptos.waitForTransaction({
      transactionHash: hash,
    });

    return {
      hash,
      status: result.success ? "success" : "failed",
      confirmations: 1,
      gasUsed: result.gas_used?.toString(),
    };
  }

  async getTransactionStatus(hash: string): Promise<TransactionReceipt> {
    try {
      const tx = await this.aptos.getTransactionByHash({
        transactionHash: hash,
      });

      return {
        hash,
        status: (tx as any).success ? "success" : "failed",
        confirmations: 1,
        gasUsed: (tx as any).gas_used?.toString(),
      };
    } catch {
      return {
        hash,
        status: "pending",
        confirmations: 0,
      };
    }
  }

  getExplorerUrl(hash: string, type: "tx" | "address" | "token"): string {
    const network = this.chainInfo.isTestnet ? "?network=testnet" : "";
    const paths = { tx: "/txn/", address: "/account/", token: "/account/" };
    return `https://explorer.aptoslabs.com${paths[type]}${hash}${network}`;
  }
}
