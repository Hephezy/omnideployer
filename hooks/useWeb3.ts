import { ChainConfig } from "@/config/constants";
import { useEffect, useState } from "react";

interface EthereumError extends Error {
  code?: number;
}

export function useWeb3() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    if (!window.ethereum) {
      setError("No wallet detected. Please install MetaMask.");
      return;
    }
    setIsConnecting(true);
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const chain = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string;
      setAccount(accounts[0]);
      setChainId(parseInt(chain, 16));
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const switchNetwork = async (chain: ChainConfig) => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chain.hexChainId }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask.
      const error = switchError as EthereumError;
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: chain.hexChainId,
                chainName: chain.name,
                rpcUrls: [chain.rpcUrl],
                blockExplorerUrls: [chain.blockExplorer],
                nativeCurrency: {
                  name: chain.currency,
                  symbol: chain.currency,
                  decimals: 18,
                },
              },
            ],
          });
        } catch (addError) {
          if (addError instanceof Error) {
            setError(addError.message);
          }
        }
      } else {
        setError(error.message);
      }
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (...args: unknown[]) => {
        const accounts = args[0] as string[];
        setAccount(accounts[0] || null);
      };

      const handleChainChanged = (...args: unknown[]) => {
        const chainId = args[0] as string;
        setChainId(parseInt(chainId, 16));
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      // Initial check
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accs: unknown) => {
          const accounts = accs as string[];
          if (accounts.length > 0) setAccount(accounts[0]);
        });
      window.ethereum.request({ method: "eth_chainId" }).then((id: unknown) => {
        setChainId(parseInt(id as string, 16));
      });

      return () => {
        window.ethereum?.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum?.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  return { account, chainId, isConnecting, error, connect, switchNetwork };
}
