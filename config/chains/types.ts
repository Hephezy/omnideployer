export interface NativeCurrency {
  name: string;
  symbol: string;
  decimals: number;
}

export interface ChainConfig {
  id: string;
  chainId: number;
  hexChainId: string;
  name: string;
  shortName: string;
  network: "mainnet" | "testnet";
  rpcUrls: string[];
  blockExplorers: {
    name: string;
    url: string;
    apiUrl?: string;
  }[];
  nativeCurrency: NativeCurrency;
  color: string;
  iconUrl?: string;
  isTestnet: boolean;
  faucetUrl?: string;
  avgBlockTime: number;
  confirmations: number;
}

export type ChainType = "evm" | "solana" | "aptos" | "sui";

export interface MultiChainConfig extends ChainConfig {
  type: ChainType;
}
