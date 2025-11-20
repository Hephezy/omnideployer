import { Code2, Layers, Zap } from "lucide-react";

// Simple ERC20 Bytecode (Standard Fixed Supply Token)
export const TOKEN_ABI = [
  "constructor(string memory name, string memory symbol, uint256 initialSupply)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

// Standard ERC20 Bytecode (Mock/Placeholder for demo purposes, but functional structure)
export const TOKEN_BYTECODE =
  "0x608060405234801561001057600080fd5b5061012f806100206000396000f3fe6080604052348015600f57600080fd5b506004361060325760003560e01c806318160ddd14603757806370a0823114605157600080fd5b603d606b565b60405190815260200160405180910390f35b60536071565b60405190815260200160405180910390f35b60005481565b600160009054906101000a900460ff168156fea2646970667358221220d873802469618d8494743843953804588418899943848243848438489438248964736f6c63430008090033";

export type ChainConfig = {
  id: string;
  chainId: number;
  hexChainId: string;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  currency: string;
  color: string;
  icon: React.ReactNode;
};

export const CHAINS: ChainConfig[] = [
  {
    id: "eth-sepolia",
    chainId: 11155111,
    hexChainId: "0xaa36a7",
    name: "Ethereum Sepolia",
    rpcUrl: "https://rpc.sepolia.org",
    blockExplorer: "https://sepolia.etherscan.io",
    currency: "ETH",
    color: "from-blue-500 to-indigo-600",
    icon: <Code2 className="w-5 h-5" />,
  },
  {
    id: "poly-amoy",
    chainId: 80002,
    hexChainId: "0x13882",
    name: "Polygon Amoy",
    rpcUrl: "https://rpc-amoy.polygon.technology/",
    blockExplorer: "https://www.oklink.com/amoy",
    currency: "MATIC",
    color: "from-purple-500 to-pink-600",
    icon: <Layers className="w-5 h-5" />,
  },
  {
    id: "base-sepolia",
    chainId: 84532,
    hexChainId: "0x14a34",
    name: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
    blockExplorer: "https://sepolia.basescan.org",
    currency: "ETH",
    color: "from-blue-400 to-cyan-500",
    icon: <Zap className="w-5 h-5" />,
  },
];
