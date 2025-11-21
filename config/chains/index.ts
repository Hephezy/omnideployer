import { ChainConfig } from "../constants";
import { EVM_CHAINS } from "./evm-chains";

// config/chains/index.ts
export * from "./types";
export * from "./evm-chains";

export const getChainById = (chainId: number): ChainConfig | undefined => {
  return EVM_CHAINS.find((c) => c.chainId === chainId);
};

export const getChainByStringId = (id: string): ChainConfig | undefined => {
  return EVM_CHAINS.find((c) => c.id === id);
};
