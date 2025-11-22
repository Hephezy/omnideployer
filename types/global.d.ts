import { Eip1193Provider } from "ethers";

// Solana types (inline to avoid import issues)
interface SolanaPublicKey {
  toString(): string;
  toBase58(): string;
  toBytes(): Uint8Array;
}

interface SolanaTransaction {
  serialize(): Uint8Array;
  recentBlockhash: string;
  feePayer: SolanaPublicKey | null;
  partialSign(...signers: unknown[]): void;
}

declare global {
  interface Window {
    // ===================
    // EVM Wallets
    // ===================
    ethereum?: Eip1193Provider & {
      isMetaMask?: boolean;
      isCoinbaseWallet?: boolean;
      providers?: Array<
        Eip1193Provider & {
          isMetaMask?: boolean;
          isCoinbaseWallet?: boolean;
          request: <T = unknown>(args: {
            method: string;
            params?: unknown[];
          }) => Promise<T>;
          on: (event: string, listener: (...args: unknown[]) => void) => void;
          removeListener: (
            event: string,
            listener: (...args: unknown[]) => void
          ) => void;
        }
      >;
      request: <T = unknown>(args: {
        method: string;
        params?: unknown[];
      }) => Promise<T>;
      on: (event: string, listener: (...args: unknown[]) => void) => void;
      removeListener: (
        event: string,
        listener: (...args: unknown[]) => void
      ) => void;
      selectedAddress?: string | null;
      chainId?: string;
      networkVersion?: string;
    };

    // Coinbase Wallet Extension (separate from ethereum)
    coinbaseWalletExtension?: Eip1193Provider & {
      isCoinbaseWallet: boolean;
      request: <T = unknown>(args: {
        method: string;
        params?: unknown[];
      }) => Promise<T>;
      on: (event: string, listener: (...args: unknown[]) => void) => void;
      removeListener: (
        event: string,
        listener: (...args: unknown[]) => void
      ) => void;
    };

    // ===================
    // Solana Wallets (Phantom, Solflare, etc.)
    // ===================
    solana?: {
      isPhantom?: boolean;
      isSolflare?: boolean;
      publicKey: SolanaPublicKey | null;
      isConnected: boolean;
      connect(options?: {
        onlyIfTrusted?: boolean;
      }): Promise<{ publicKey: SolanaPublicKey }>;
      disconnect(): Promise<void>;
      signTransaction<T extends SolanaTransaction>(transaction: T): Promise<T>;
      signAllTransactions<T extends SolanaTransaction>(
        transactions: T[]
      ): Promise<T[]>;
      signMessage(
        message: Uint8Array,
        display?: "utf8" | "hex"
      ): Promise<{ signature: Uint8Array }>;
      on(
        event: "connect",
        callback: (publicKey: SolanaPublicKey) => void
      ): void;
      on(event: "disconnect", callback: () => void): void;
      on(
        event: "accountChanged",
        callback: (publicKey: SolanaPublicKey | null) => void
      ): void;
      off(event: string, callback: (...args: unknown[]) => void): void;
    };

    // ===================
    // Aptos Wallets (Petra, Martian, Pontem)
    // ===================
    aptos?: {
      connect(): Promise<{ address: string; publicKey: string }>;
      disconnect(): Promise<void>;
      isConnected(): Promise<boolean>;
      account(): Promise<{ address: string; publicKey: string }>;
      network(): Promise<{ name: string; chainId?: string }>;
      signAndSubmitTransaction(payload: {
        type: string;
        function: string;
        type_arguments: string[];
        arguments: unknown[];
      }): Promise<{ hash: string }>;
      signTransaction(payload: unknown): Promise<Uint8Array>;
      signMessage(message: {
        message: string;
        nonce: string;
      }): Promise<{ signature: string; fullMessage: string }>;
      onAccountChange(
        callback: (
          account: { address: string; publicKey?: string } | null
        ) => void
      ): void;
      onNetworkChange(callback: (network: { name: string }) => void): void;
    };

    // Petra-specific (alias)
    petra?: Window["aptos"];

    // Martian wallet
    martian?: Window["aptos"] & {
      isMartian?: boolean;
    };

    // ===================
    // Sui Wallets
    // ===================
    suiWallet?: {
      hasPermissions(): Promise<boolean>;
      requestPermissions(): Promise<boolean>;
      getAccounts(): Promise<{ address: string; publicKey?: string }[]>;
      signAndExecuteTransactionBlock(input: {
        transactionBlock: unknown;
        options?: {
          showEffects?: boolean;
          showObjectChanges?: boolean;
          showBalanceChanges?: boolean;
        };
      }): Promise<{
        digest: string;
        effects?: {
          status: { status: string };
          gasUsed?: { computationCost: string; storageCost: string };
        };
        objectChanges?: unknown[];
        balanceChanges?: unknown[];
      }>;
      signTransactionBlock(input: {
        transactionBlock: unknown;
      }): Promise<{ signature: string; transactionBlockBytes: string }>;
      signMessage(input: {
        message: Uint8Array;
      }): Promise<{ signature: string }>;
      on(
        event: "change",
        callback: (changes: { accounts?: unknown[] }) => void
      ): void;
      off(event: string, callback: (...args: unknown[]) => void): void;
    };

    // Suiet wallet
    suiet?: Window["suiWallet"] & {
      isSuiet?: boolean;
    };

    // Ethos wallet
    ethos?: Window["suiWallet"] & {
      isEthos?: boolean;
    };
  }
}

export {};

// ===================
// Re-export common types for use in components
// ===================
export type EVMProvider = NonNullable<Window["ethereum"]>;
export type SolanaWallet = NonNullable<Window["solana"]>;
export type AptosWallet = NonNullable<Window["aptos"]>;
export type SuiWallet = NonNullable<Window["suiWallet"]>;
