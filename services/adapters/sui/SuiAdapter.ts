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

import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";

// Sui wallet interface
interface SuiWalletStandard {
  suiWallet?: {
    hasPermissions(): Promise<boolean>;
    requestPermissions(): Promise<boolean>;
    getAccounts(): Promise<{ address: string }[]>;
    signAndExecuteTransactionBlock(input: {
      transactionBlock: TransactionBlock;
      options?: { showEffects: boolean };
    }): Promise<{ digest: string; effects: any }>;
    on(event: string, callback: Function): void;
    off(event: string, callback: Function): void;
  };
}

declare global {
  interface Window extends SuiWalletStandard {}
}

export class SuiAdapter extends BaseChainAdapter {
  readonly chainType = "sui" as const;
  readonly chainInfo: ChainInfo;

  private client: SuiClient;

  constructor(network: "mainnet" | "testnet" | "devnet" = "testnet") {
    super();

    const networks = {
      mainnet: {
        id: "sui-mainnet",
        name: "Sui Mainnet",
        rpcUrl: getFullnodeUrl("mainnet"),
        explorerUrl: "https://suiexplorer.com",
        isTestnet: false,
      },
      testnet: {
        id: "sui-testnet",
        name: "Sui Testnet",
        rpcUrl: getFullnodeUrl("testnet"),
        explorerUrl: "https://suiexplorer.com/?network=testnet",
        isTestnet: true,
      },
      devnet: {
        id: "sui-devnet",
        name: "Sui Devnet",
        rpcUrl: getFullnodeUrl("devnet"),
        explorerUrl: "https://suiexplorer.com/?network=devnet",
        isTestnet: true,
      },
    };

    const config = networks[network];

    this.chainInfo = {
      id: config.id,
      name: config.name,
      type: "sui",
      isTestnet: config.isTestnet,
      nativeCurrency: {
        name: "Sui",
        symbol: "SUI",
        decimals: 9,
      },
      explorerUrl: config.explorerUrl,
      rpcUrl: config.rpcUrl,
    };

    this.client = new SuiClient({ url: config.rpcUrl });
  }

  async connect(): Promise<WalletInfo> {
    const wallet = window.suiWallet;

    if (!wallet) {
      throw new Error(
        "Sui Wallet not found. Please install Sui Wallet or Suiet."
      );
    }

    try {
      const hasPermissions = await wallet.hasPermissions();

      if (!hasPermissions) {
        await wallet.requestPermissions();
      }

      const accounts = await wallet.getAccounts();

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      this.wallet = {
        address: accounts[0].address,
        chainType: "sui",
        chainId: this.chainInfo.id,
        isConnected: true,
        walletName: "Sui Wallet",
      };

      return this.wallet;
    } catch (error) {
      throw new Error(`Failed to connect to Sui Wallet: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.wallet = null;
    this.emit("disconnect");
  }

  async getBalance(address?: string): Promise<TokenBalance> {
    const addr = address || this.wallet?.address;

    if (!addr) {
      return { raw: BigInt(0), formatted: "0", symbol: "SUI", decimals: 9 };
    }

    try {
      const balance = await this.client.getBalance({
        owner: addr,
      });

      const rawBalance = BigInt(balance.totalBalance);

      return {
        raw: rawBalance,
        formatted: (Number(rawBalance) / 1e9).toFixed(4),
        symbol: "SUI",
        decimals: 9,
      };
    } catch {
      return { raw: BigInt(0), formatted: "0", symbol: "SUI", decimals: 9 };
    }
  }

  isValidAddress(address: string): boolean {
    // Sui addresses are 64 hex characters with 0x prefix
    if (!address.startsWith("0x")) return false;
    if (address.length !== 66) return false;
    return /^0x[a-fA-F0-9]{64}$/.test(address);
  }

  async estimateDeploymentFee(params: TokenDeployParams): Promise<GasEstimate> {
    // Sui coin deployment typically costs around 0.01-0.1 SUI
    return {
      estimatedFee: "0.1",
      feeToken: "SUI",
      gasUnits: BigInt(100000000), // 0.1 SUI in MIST
    };
  }

  async deployToken(params: TokenDeployParams): Promise<DeployResult> {
    if (!this.wallet || !window.suiWallet) {
      throw new Error("Wallet not connected");
    }

    try {
      // Note: Deploying a custom coin on Sui requires publishing a Move package
      // This is a simplified example - in production, you'd need to:
      // 1. Compile the Move module
      // 2. Publish the package
      // 3. Call the init function

      // For demonstration, we'll create a transaction that would deploy a coin
      // In reality, you'd need the compiled bytecode of your coin module

      const tx = new TransactionBlock();

      // This is a placeholder - actual coin deployment requires:
      // - A Move module with coin::create_currency
      // - Publishing the module via tx.publish()

      // Example structure for publishing a module:
      // const [upgradeCap] = tx.publish({
      //   modules: [compiledModuleBytecode],
      //   dependencies: [/* framework packages */],
      // });

      // For now, return an error indicating this requires a pre-deployed module
      return {
        success: false,
        transactionHash: "",
        explorerUrl: "",
        error:
          "Sui coin deployment requires publishing a Move module. Please use a pre-compiled coin module.",
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
    try {
      const result = await this.client.waitForTransactionBlock({
        digest: hash,
        options: {
          showEffects: true,
        },
      });

      const status = result.effects?.status?.status;

      return {
        hash,
        status: status === "success" ? "success" : "failed",
        confirmations: 1,
      };
    } catch {
      return {
        hash,
        status: "pending",
        confirmations: 0,
      };
    }
  }

  async getTransactionStatus(hash: string): Promise<TransactionReceipt> {
    try {
      const tx = await this.client.getTransactionBlock({
        digest: hash,
        options: {
          showEffects: true,
        },
      });

      const status = tx.effects?.status?.status;

      return {
        hash,
        status:
          status === "success"
            ? "success"
            : status === "failure"
            ? "failed"
            : "pending",
        confirmations: 1,
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
    const paths = { tx: "/txblock/", address: "/address/", token: "/object/" };
    return `https://suiexplorer.com${paths[type]}${hash}${network}`;
  }
}
