import { Code2, Layers, Zap, Hexagon, Circle, Triangle } from "lucide-react";

// Simple ERC20 ABI for deployment
export const TOKEN_ABI = [
  "constructor(string memory name, string memory symbol, uint256 initialSupply)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
];

export type ChainConfig = {
  id: string;
  chainId: number;
  hexChainId: string;
  name: string;
  shortName: string;
  rpcUrl: string;
  rpcUrls: string[]; // Fallback RPCs
  blockExplorer: string;
  currency: string;
  color: string;
  icon: React.ReactNode;
  isTestnet: boolean;
  faucetUrl?: string;
  avgBlockTime: number; // in seconds
  confirmationsRequired: number;
};

export const CHAINS: ChainConfig[] = [
  {
    id: "eth-sepolia",
    chainId: 11155111,
    hexChainId: "0xaa36a7",
    name: "Ethereum Sepolia",
    shortName: "Sepolia",
    rpcUrl: "https://rpc.sepolia.org",
    rpcUrls: [
      "https://rpc.sepolia.org",
      "https://ethereum-sepolia.blockpi.network/v1/rpc/public",
      "https://sepolia.gateway.tenderly.co",
    ],
    blockExplorer: "https://sepolia.etherscan.io",
    currency: "ETH",
    color: "from-blue-500 to-indigo-600",
    icon: <Code2 className="w-5 h-5" />,
    isTestnet: true,
    faucetUrl: "https://sepoliafaucet.com",
    avgBlockTime: 12,
    confirmationsRequired: 2,
  },
  {
    id: "poly-amoy",
    chainId: 80002,
    hexChainId: "0x13882",
    name: "Polygon Amoy",
    shortName: "Amoy",
    rpcUrl: "https://rpc-amoy.polygon.technology/",
    rpcUrls: [
      "https://rpc-amoy.polygon.technology/",
      "https://polygon-amoy.drpc.org",
    ],
    blockExplorer: "https://www.oklink.com/amoy",
    currency: "MATIC",
    color: "from-purple-500 to-pink-600",
    icon: <Layers className="w-5 h-5" />,
    isTestnet: true,
    faucetUrl: "https://faucet.polygon.technology",
    avgBlockTime: 2,
    confirmationsRequired: 5,
  },
  {
    id: "base-sepolia",
    chainId: 84532,
    hexChainId: "0x14a34",
    name: "Base Sepolia",
    shortName: "Base",
    rpcUrl: "https://sepolia.base.org",
    rpcUrls: [
      "https://sepolia.base.org",
      "https://base-sepolia.blockpi.network/v1/rpc/public",
    ],
    blockExplorer: "https://sepolia.basescan.org",
    currency: "ETH",
    color: "from-blue-400 to-cyan-500",
    icon: <Zap className="w-5 h-5" />,
    isTestnet: true,
    faucetUrl: "https://www.coinbase.com/faucets/base-ethereum-goerli-faucet",
    avgBlockTime: 2,
    confirmationsRequired: 3,
  },
  {
    id: "arb-sepolia",
    chainId: 421614,
    hexChainId: "0x66eee",
    name: "Arbitrum Sepolia",
    shortName: "Arb",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    rpcUrls: [
      "https://sepolia-rollup.arbitrum.io/rpc",
      "https://arbitrum-sepolia.blockpi.network/v1/rpc/public",
    ],
    blockExplorer: "https://sepolia.arbiscan.io",
    currency: "ETH",
    color: "from-blue-600 to-sky-400",
    icon: <Hexagon className="w-5 h-5" />,
    isTestnet: true,
    faucetUrl: "https://faucet.quicknode.com/arbitrum/sepolia",
    avgBlockTime: 0.25,
    confirmationsRequired: 10,
  },
  {
    id: "op-sepolia",
    chainId: 11155420,
    hexChainId: "0xaa37dc",
    name: "Optimism Sepolia",
    shortName: "OP",
    rpcUrl: "https://sepolia.optimism.io",
    rpcUrls: [
      "https://sepolia.optimism.io",
      "https://optimism-sepolia.blockpi.network/v1/rpc/public",
    ],
    blockExplorer: "https://sepolia-optimism.etherscan.io",
    currency: "ETH",
    color: "from-red-500 to-rose-600",
    icon: <Circle className="w-5 h-5" />,
    isTestnet: true,
    faucetUrl: "https://app.optimism.io/faucet",
    avgBlockTime: 2,
    confirmationsRequired: 5,
  },
  {
    id: "avax-fuji",
    chainId: 43113,
    hexChainId: "0xa869",
    name: "Avalanche Fuji",
    shortName: "Fuji",
    rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
    rpcUrls: [
      "https://api.avax-test.network/ext/bc/C/rpc",
      "https://avalanche-fuji-c-chain.publicnode.com",
    ],
    blockExplorer: "https://testnet.snowtrace.io",
    currency: "AVAX",
    color: "from-red-600 to-red-400",
    icon: <Triangle className="w-5 h-5" />,
    isTestnet: true,
    faucetUrl: "https://faucet.avax.network",
    avgBlockTime: 2,
    confirmationsRequired: 3,
  },
];

// Helper functions
export const getChainById = (id: string): ChainConfig | undefined => {
  return CHAINS.find((chain) => chain.id === id);
};

export const getChainByChainId = (chainId: number): ChainConfig | undefined => {
  return CHAINS.find((chain) => chain.chainId === chainId);
};

export const getChainByHexId = (hexChainId: string): ChainConfig | undefined => {
  return CHAINS.find(
    (chain) => chain.hexChainId.toLowerCase() === hexChainId.toLowerCase()
  );
};

// Chain categories
export const CHAIN_CATEGORIES = {
  ethereum: CHAINS.filter((c) => c.id.includes("eth")),
  layer2: CHAINS.filter((c) =>
    c.id.includes("arb") || c.id.includes("op") || c.id.includes("base")
  ),
  other: CHAINS.filter((c) =>
    c.id.includes("poly") || c.id.includes("avax")
  ),
};

// Default chain
export const DEFAULT_CHAIN = CHAINS[0]; // Ethereum Sepolia

// Supported currency symbols for gas estimation
export const SUPPORTED_CURRENCIES = [...new Set(CHAINS.map((c) => c.currency))];

// Contract deployment constants
export const DEPLOYMENT_CONSTANTS = {
  MIN_TOKEN_NAME_LENGTH: 1,
  MAX_TOKEN_NAME_LENGTH: 64,
  MIN_SYMBOL_LENGTH: 1,
  MAX_SYMBOL_LENGTH: 11,
  MIN_SUPPLY: 1,
  MAX_SUPPLY: Number.MAX_SAFE_INTEGER,
  DEFAULT_DECIMALS: 18,
  GAS_LIMIT_BUFFER: 1.2, // 20% buffer
  DEFAULT_TIMEOUT_MS: 120000, // 2 minutes
};