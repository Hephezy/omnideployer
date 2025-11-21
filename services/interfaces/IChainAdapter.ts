export type ChainType = "evm" | "solana" | "aptos" | "sui";

export interface WalletInfo {
  address: string;
  publicKey?: string;
  chainType: ChainType;
  chainId?: number | string;
  isConnected: boolean;
  walletName?: string;
}

export interface TokenBalance {
  raw: bigint | string;
  formatted: string;
  symbol: string;
  decimals: number;
}

export interface GasEstimate {
  estimatedFee: string;
  feeToken: string;
  gasUnits?: bigint;
  gasPrice?: bigint;
}

export interface TokenDeployParams {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: string | number;
  mintAuthority?: string; // For Solana
  freezeAuthority?: string; // For Solana
  description?: string; // For Aptos/Sui
  iconUrl?: string;
}

export interface DeployResult {
  success: boolean;
  transactionHash: string;
  contractAddress?: string; // EVM
  tokenMint?: string; // Solana
  coinType?: string; // Aptos
  packageId?: string; // Sui
  explorerUrl: string;
  error?: string;
}

export interface TransactionReceipt {
  hash: string;
  status: "success" | "failed" | "pending";
  blockNumber?: number;
  confirmations: number;
  gasUsed?: string;
  fee?: string;
  timestamp?: number;
}

export interface ChainInfo {
  id: string;
  name: string;
  type: ChainType;
  isTestnet: boolean;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  explorerUrl: string;
  rpcUrl: string;
}

/**
 * Universal Chain Adapter Interface
 * All chain-specific adapters must implement this interface
 */
export interface IChainAdapter {
  // Chain identification
  readonly chainType: ChainType;
  readonly chainInfo: ChainInfo;

  // Connection management
  connect(): Promise<WalletInfo>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getWalletInfo(): WalletInfo | null;

  // Account operations
  getBalance(address?: string): Promise<TokenBalance>;
  formatAddress(address: string, shorten?: boolean): string;
  isValidAddress(address: string): boolean;

  // Token deployment
  deployToken(params: TokenDeployParams): Promise<DeployResult>;
  estimateDeploymentFee(params: TokenDeployParams): Promise<GasEstimate>;

  // Transaction operations
  waitForTransaction(hash: string): Promise<TransactionReceipt>;
  getTransactionStatus(hash: string): Promise<TransactionReceipt>;
  getExplorerUrl(hash: string, type: "tx" | "address" | "token"): string;

  // Event handlers
  onAccountChange(callback: (address: string | null) => void): () => void;
  onChainChange(callback: (chainId: string) => void): () => void;
  onDisconnect(callback: () => void): () => void;
}

/**
 * Abstract base class providing common functionality
 */
export abstract class BaseChainAdapter implements IChainAdapter {
  abstract readonly chainType: ChainType;
  abstract readonly chainInfo: ChainInfo;

  protected wallet: WalletInfo | null = null;
  protected eventListeners: Map<string, Set<Function>> = new Map();

  abstract connect(): Promise<WalletInfo>;
  abstract disconnect(): Promise<void>;
  abstract getBalance(address?: string): Promise<TokenBalance>;
  abstract deployToken(params: TokenDeployParams): Promise<DeployResult>;
  abstract estimateDeploymentFee(
    params: TokenDeployParams
  ): Promise<GasEstimate>;
  abstract waitForTransaction(hash: string): Promise<TransactionReceipt>;
  abstract getTransactionStatus(hash: string): Promise<TransactionReceipt>;

  isConnected(): boolean {
    return this.wallet?.isConnected ?? false;
  }

  getWalletInfo(): WalletInfo | null {
    return this.wallet;
  }

  formatAddress(address: string, shorten: boolean = true): string {
    if (!address) return "";
    if (!shorten) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  abstract isValidAddress(address: string): boolean;

  getExplorerUrl(hash: string, type: "tx" | "address" | "token"): string {
    const paths = { tx: "/tx/", address: "/address/", token: "/token/" };
    return `${this.chainInfo.explorerUrl}${paths[type]}${hash}`;
  }

  onAccountChange(callback: (address: string | null) => void): () => void {
    return this.addEventListener("accountChange", callback);
  }

  onChainChange(callback: (chainId: string) => void): () => void {
    return this.addEventListener("chainChange", callback);
  }

  onDisconnect(callback: () => void): () => void {
    return this.addEventListener("disconnect", callback);
  }

  protected addEventListener(event: string, callback: Function): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    return () => this.eventListeners.get(event)?.delete(callback);
  }

  protected emit(event: string, ...args: unknown[]): void {
    this.eventListeners.get(event)?.forEach((cb) => cb(...args));
  }
}
