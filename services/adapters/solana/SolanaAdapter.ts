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
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
} from "@solana/web3.js";

import * as splToken from "@solana/spl-token";

declare global {
  interface Window {
    solana?: any;
  }
}

export class SolanaAdapter extends BaseChainAdapter {
  readonly chainType = "solana" as const;
  readonly chainInfo: ChainInfo;
  private connection: Connection;

  constructor(network: "mainnet" | "devnet" | "testnet" = "devnet") {
    super();
    const endpoints = {
      mainnet: "https://api.mainnet-beta.solana.com",
      devnet: "https://api.devnet.solana.com",
      testnet: "https://api.testnet.solana.com",
    };

    this.chainInfo = {
      id: `solana-${network}`,
      name: `Solana ${network.charAt(0).toUpperCase() + network.slice(1)}`,
      type: "solana",
      isTestnet: network !== "mainnet",
      nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
      explorerUrl: "https://explorer.solana.com",
      rpcUrl: endpoints[network],
    };

    this.connection = new Connection(endpoints[network], "confirmed");
  }

  async connect(): Promise<WalletInfo> {
    if (!window.solana || !window.solana.isPhantom) {
      throw new Error("Phantom wallet not found");
    }

    try {
      const resp = await window.solana.connect();
      const address = resp.publicKey.toString();

      this.wallet = {
        address,
        publicKey: address,
        chainType: "solana",
        chainId: this.chainInfo.id,
        isConnected: true,
        walletName: "Phantom",
      };

      window.solana.on("accountChanged", (key: any) => {
        if (key) {
          this.wallet = { ...this.wallet!, address: key.toString() };
          this.emit("accountChange", key.toString());
        } else {
          this.disconnect();
        }
      });

      return this.wallet;
    } catch (err) {
      throw new Error("User rejected connection");
    }
  }

  async disconnect(): Promise<void> {
    if (window.solana) await window.solana.disconnect();
    this.wallet = null;
    this.emit("disconnect");
  }

  async getBalance(address?: string): Promise<TokenBalance> {
    const addr = address || this.wallet?.address;
    if (!addr) return { raw: "0", formatted: "0", symbol: "SOL", decimals: 9 };

    try {
      const bal = await this.connection.getBalance(new PublicKey(addr));
      return {
        raw: BigInt(bal),
        formatted: (bal / LAMPORTS_PER_SOL).toFixed(4),
        symbol: "SOL",
        decimals: 9,
      };
    } catch {
      return { raw: "0", formatted: "0", symbol: "SOL", decimals: 9 };
    }
  }

  async deployToken(params: TokenDeployParams): Promise<DeployResult> {
    if (!this.wallet) throw new Error("Wallet not connected");

    try {
      const payer = new PublicKey(this.wallet.address);
      // Generate a new keypair for the Mint
      const mintKeypair = Keypair.generate();

      // 1. Calculate minimum lamports for rent exemption
      const lamports = await splToken.getMinimumBalanceForRentExemptMint(
        this.connection
      );

      const transaction = new Transaction();

      // 2. Create Mint Account
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: payer,
          newAccountPubkey: mintKeypair.publicKey,
          space: splToken.MINT_SIZE,
          lamports,
          programId: splToken.TOKEN_PROGRAM_ID,
        }),
        splToken.createInitializeMintInstruction(
          mintKeypair.publicKey,
          params.decimals,
          payer, // Mint Authority
          payer, // Freeze Authority
          splToken.TOKEN_PROGRAM_ID
        )
      );

      // 3. Create Associated Token Account (ATA) for the deployer
      const associatedToken = await splToken.getAssociatedTokenAddress(
        mintKeypair.publicKey,
        payer,
        false,
        splToken.TOKEN_PROGRAM_ID,
        splToken.ASSOCIATED_TOKEN_PROGRAM_ID
      );

      transaction.add(
        splToken.createAssociatedTokenAccountInstruction(
          payer,
          associatedToken,
          payer,
          mintKeypair.publicKey,
          splToken.TOKEN_PROGRAM_ID,
          splToken.ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );

      // 4. Mint initial supply to the deployer's ATA
      if (params.initialSupply > 0) {
        // Handle decimals for big integer math
        const amount =
          BigInt(params.initialSupply) * BigInt(10 ** params.decimals);

        transaction.add(
          splToken.createMintToInstruction(
            mintKeypair.publicKey,
            associatedToken,
            payer,
            amount,
            [],
            splToken.TOKEN_PROGRAM_ID
          )
        );
      }

      // Get latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = payer;

      // Mint Keypair must sign to create the account
      transaction.partialSign(mintKeypair);

      // Send to wallet for signature and submission
      const signedTx = await window.solana.signTransaction(transaction);
      const txHash = await this.connection.sendRawTransaction(
        signedTx.serialize()
      );

      // Wait for confirmation
      await this.connection.confirmTransaction(txHash);

      return {
        success: true,
        transactionHash: txHash,
        tokenMint: mintKeypair.publicKey.toString(),
        explorerUrl: `${this.chainInfo.explorerUrl}/tx/${txHash}?cluster=${
          this.chainInfo.isTestnet ? "devnet" : "mainnet"
        }`,
      };
    } catch (err: any) {
      console.error(err);
      return {
        success: false,
        transactionHash: "",
        explorerUrl: "",
        error: err.message || "Solana deployment failed",
      };
    }
  }

  async estimateDeploymentFee(params: TokenDeployParams): Promise<GasEstimate> {
    // Approx cost: Rent for Mint + ATA + Transaciton Fee
    // ~0.00146 SOL + ~0.00204 SOL + ~0.000005 SOL
    return {
      estimatedFee: "0.0035",
      feeToken: "SOL",
      gasUnits: BigInt(3500000),
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

  formatAddress(address: string, shorten = true): string {
    if (!address) return "";
    if (!shorten) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  async waitForTransaction(hash: string): Promise<TransactionReceipt> {
    await this.connection.confirmTransaction(hash);
    return { hash, status: "success", confirmations: 1 };
  }

  async getTransactionStatus(hash: string): Promise<TransactionReceipt> {
    const status = await this.connection.getSignatureStatus(hash);
    return {
      hash,
      status: status.value?.err ? "failed" : "success",
      confirmations: status.value?.confirmations || 0,
    };
  }
}
