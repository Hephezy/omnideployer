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
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  getMint,
} from "@solana/spl-token";

// Solana wallet adapter types
interface SolanaWalletAdapter {
  publicKey: PublicKey | null;
  connected: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  signTransaction<T extends Transaction>(transaction: T): Promise<T>;
  signAllTransactions<T extends Transaction>(transactions: T[]): Promise<T[]>;
}

// Phantom wallet interface
interface PhantomWallet {
  solana?: {
    isPhantom: boolean;
    publicKey: PublicKey;
    isConnected: boolean;
    connect(): Promise<{ publicKey: PublicKey }>;
    disconnect(): Promise<void>;
    signTransaction(tx: Transaction): Promise<Transaction>;
    signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
    on(event: string, callback: Function): void;
    off(event: string, callback: Function): void;
  };
}

declare global {
  interface Window extends PhantomWallet {}
}

export class SolanaAdapter extends BaseChainAdapter {
  readonly chainType = "solana" as const;
  readonly chainInfo: ChainInfo;

  private connection: Connection;
  private walletAdapter: SolanaWalletAdapter | null = null;

  constructor(network: "mainnet" | "devnet" | "testnet" = "devnet") {
    super();

    const networks = {
      mainnet: {
        id: "solana-mainnet",
        name: "Solana Mainnet",
        rpcUrl: "https://api.mainnet-beta.solana.com",
        explorerUrl: "https://explorer.solana.com",
        isTestnet: false,
      },
      devnet: {
        id: "solana-devnet",
        name: "Solana Devnet",
        rpcUrl: "https://api.devnet.solana.com",
        explorerUrl: "https://explorer.solana.com?cluster=devnet",
        isTestnet: true,
      },
      testnet: {
        id: "solana-testnet",
        name: "Solana Testnet",
        rpcUrl: "https://api.testnet.solana.com",
        explorerUrl: "https://explorer.solana.com?cluster=testnet",
        isTestnet: true,
      },
    };

    const config = networks[network];

    this.chainInfo = {
      ...config,
      type: "solana",
      nativeCurrency: {
        name: "Solana",
        symbol: "SOL",
        decimals: 9,
      },
    };

    this.connection = new Connection(config.rpcUrl, "confirmed");
  }

  async connect(): Promise<WalletInfo> {
    const phantom = window.solana;

    if (!phantom?.isPhantom) {
      throw new Error("Phantom wallet not found. Please install Phantom.");
    }

    try {
      const response = await phantom.connect();

      this.wallet = {
        address: response.publicKey.toString(),
        publicKey: response.publicKey.toString(),
        chainType: "solana",
        chainId: this.chainInfo.id,
        isConnected: true,
        walletName: "Phantom",
      };

      // Set up event listeners
      phantom.on("accountChanged", (publicKey: PublicKey | null) => {
        if (publicKey) {
          this.wallet = { ...this.wallet!, address: publicKey.toString() };
          this.emit("accountChange", publicKey.toString());
        } else {
          this.disconnect();
        }
      });

      phantom.on("disconnect", () => {
        this.emit("disconnect");
      });

      return this.wallet;
    } catch (error) {
      throw new Error(`Failed to connect to Phantom: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    const phantom = window.solana;
    if (phantom) {
      await phantom.disconnect();
    }
    this.wallet = null;
    this.emit("disconnect");
  }

  async getBalance(address?: string): Promise<TokenBalance> {
    const pubkey = new PublicKey(address || this.wallet?.address || "");
    const balance = await this.connection.getBalance(pubkey);

    return {
      raw: BigInt(balance),
      formatted: (balance / LAMPORTS_PER_SOL).toFixed(4),
      symbol: "SOL",
      decimals: 9,
    };
  }

  isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  async estimateDeploymentFee(params: TokenDeployParams): Promise<GasEstimate> {
    // SPL Token creation costs approximately:
    // - Mint account rent: ~0.00144 SOL
    // - Associated token account: ~0.00203 SOL
    // - Transaction fees: ~0.00001 SOL
    const estimatedLamports = 0.005 * LAMPORTS_PER_SOL;

    return {
      estimatedFee: (estimatedLamports / LAMPORTS_PER_SOL).toFixed(6),
      feeToken: "SOL",
      gasUnits: BigInt(estimatedLamports),
    };
  }

  async deployToken(params: TokenDeployParams): Promise<DeployResult> {
    if (!this.wallet || !window.solana) {
      throw new Error("Wallet not connected");
    }

    try {
      const payer = new PublicKey(this.wallet.address);

      // Generate a new keypair for the mint
      const mintKeypair = Keypair.generate();

      // Create the mint
      const mint = await createMint(
        this.connection,
        {
          publicKey: payer,
          secretKey: new Uint8Array(), // Will use wallet to sign
          signTransaction: async (tx) => {
            return await window.solana!.signTransaction(tx);
          },
          signAllTransactions: async (txs) => {
            return await window.solana!.signAllTransactions(txs);
          },
        } as any,
        payer, // Mint authority
        payer, // Freeze authority (null for no freeze)
        params.decimals || 9,
        mintKeypair,
        undefined,
        TOKEN_PROGRAM_ID
      );

      // Create associated token account for the payer
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        {
          publicKey: payer,
          secretKey: new Uint8Array(),
          signTransaction: async (tx) => window.solana!.signTransaction(tx),
          signAllTransactions: async (txs) =>
            window.solana!.signAllTransactions(txs),
        } as any,
        mint,
        payer
      );

      // Mint initial supply to the token account
      const initialSupply =
        BigInt(params.initialSupply) * BigInt(10 ** (params.decimals || 9));

      await mintTo(
        this.connection,
        {
          publicKey: payer,
          secretKey: new Uint8Array(),
          signTransaction: async (tx) => window.solana!.signTransaction(tx),
          signAllTransactions: async (txs) =>
            window.solana!.signAllTransactions(txs),
        } as any,
        mint,
        tokenAccount.address,
        payer,
        initialSupply
      );

      return {
        success: true,
        transactionHash: mint.toString(), // Use mint address as reference
        tokenMint: mint.toString(),
        explorerUrl: `${this.chainInfo.explorerUrl}/address/${mint.toString()}`,
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
    const latestBlockhash = await this.connection.getLatestBlockhash();

    const confirmation = await this.connection.confirmTransaction({
      signature: hash,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    return {
      hash,
      status: confirmation.value.err ? "failed" : "success",
      confirmations: 1,
    };
  }

  async getTransactionStatus(hash: string): Promise<TransactionReceipt> {
    const status = await this.connection.getSignatureStatus(hash);

    return {
      hash,
      status: status.value?.err
        ? "failed"
        : status.value?.confirmationStatus === "finalized"
        ? "success"
        : "pending",
      confirmations: status.value?.confirmations || 0,
    };
  }

  getExplorerUrl(hash: string, type: "tx" | "address" | "token"): string {
    const cluster = this.chainInfo.isTestnet ? "?cluster=devnet" : "";
    const paths = { tx: "/tx/", address: "/address/", token: "/address/" };
    return `https://explorer.solana.com${paths[type]}${hash}${cluster}`;
  }
}
