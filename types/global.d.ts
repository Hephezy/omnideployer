import { Eip1193Provider } from "ethers";

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      isMetaMask?: boolean;
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
  }
}

export {};
