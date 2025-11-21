import { ethers } from "ethers";
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
import { ChainConfig } from "@/config/chains/types";
import { ERC20_ABI, ERC20_BYTECODE } from "@/config/contracts/erc20";

export class EVMAdapter extends BaseChainAdapter {
  readonly chainType = "evm" as const;
  readonly chainInfo: ChainInfo;

  private chainConfig: ChainConfig;
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  constructor(chainConfig: ChainConfig) {
    super();
    this.chainConfig = chainConfig;
    this.chainInfo = {
      id: chainConfig.id,
      name: chainConfig.name,
      type: "evm",
      isTestnet: chainConfig.isTestnet,
      nativeCurrency: chainConfig.nativeCurrency,
      explorerUrl: chainConfig.blockExplorers[0]?.url || "",
      rpcUrl: chainConfig.rpcUrls[0],
    };
  }

  async connect(): Promise<WalletInfo> {
    if (!window.ethereum) {
      throw new Error("No Ethereum wallet found. Please install MetaMask.");
    }

    try {
      this.provider = new ethers.BrowserProvider(window.ethereum);

      const accounts = await this.provider.send("eth_requestAccounts", []);

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      this.signer = await this.provider.getSigner();
      const address = await this.signer.getAddress();

      // Check if on correct network
      const network = await this.provider.getNetwork();
      if (Number(network.chainId) !== this.chainConfig.chainId) {
        await this.switchNetwork();
      }

      this.wallet = {
        address,
        chainType: "evm",
        chainId: this.chainConfig.chainId,
        isConnected: true,
        walletName: window.ethereum.isMetaMask ? "MetaMask" : "Web3 Wallet",
      };

      // Setup listeners
      this.setupEventListeners();

      return this.wallet;
    } catch (error) {
      throw new Error(
        `Failed to connect: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private setupEventListeners(): void {
    if (!window.ethereum) return;

    window.ethereum.on("accountsChanged", (accounts: unknown) => {
      const accs = accounts as string[];
      if (accs.length === 0) {
        this.disconnect();
      } else {
        this.wallet = { ...this.wallet!, address: accs[0] };
        this.emit("accountChange", accs[0]);
      }
    });

    window.ethereum.on("chainChanged", (chainId: unknown) => {
      this.emit("chainChange", chainId as string);
    });

    window.ethereum.on("disconnect", () => {
      this.emit("disconnect");
    });
  }

  private async switchNetwork(): Promise<void> {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: this.chainConfig.hexChainId }],
      });
    } catch (switchError: unknown) {
      const err = switchError as { code?: number };
      if (err.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: this.chainConfig.hexChainId,
              chainName: this.chainConfig.name,
              rpcUrls: this.chainConfig.rpcUrls,
              blockExplorerUrls: this.chainConfig.blockExplorers.map(
                (e) => e.url
              ),
              nativeCurrency: this.chainConfig.nativeCurrency,
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }

  async disconnect(): Promise<void> {
    this.provider = null;
    this.signer = null;
    this.wallet = null;
    this.emit("disconnect");
  }

  async getBalance(address?: string): Promise<TokenBalance> {
    if (!this.provider) {
      throw new Error("Not connected");
    }

    const addr = address || this.wallet?.address;
    if (!addr) {
      throw new Error("No address provided");
    }

    const balance = await this.provider.getBalance(addr);

    return {
      raw: balance,
      formatted: `${ethers.formatUnits(
        balance,
        this.chainConfig.nativeCurrency.decimals
      )} ${this.chainConfig.nativeCurrency.symbol}`,
      symbol: this.chainConfig.nativeCurrency.symbol,
      decimals: this.chainConfig.nativeCurrency.decimals,
    };
  }

  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  async estimateDeploymentFee(params: TokenDeployParams): Promise<GasEstimate> {
    if (!this.provider || !this.signer) {
      throw new Error("Not connected");
    }

    const factory = new ethers.ContractFactory(
      ERC20_ABI,
      ERC20_BYTECODE,
      this.signer
    );
    const deployTx = await factory.getDeployTransaction(
      params.name,
      params.symbol,
      params.initialSupply
    );

    const gasLimit = await this.provider.estimateGas({
      ...deployTx,
      from: this.wallet?.address,
    });

    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);
    const estimatedFee = gasLimit * gasPrice;

    return {
      estimatedFee: ethers.formatUnits(
        estimatedFee,
        this.chainConfig.nativeCurrency.decimals
      ),
      feeToken: this.chainConfig.nativeCurrency.symbol,
      gasUnits: gasLimit,
      gasPrice,
    };
  }

  async deployToken(params: TokenDeployParams): Promise<DeployResult> {
    if (!this.provider || !this.signer) {
      return {
        success: false,
        transactionHash: "",
        explorerUrl: "",
        error: "Wallet not connected",
      };
    }

    try {
      const factory = new ethers.ContractFactory(
        ERC20_ABI,
        ERC20_BYTECODE,
        this.signer
      );

      const deployTx = await factory.getDeployTransaction(
        params.name,
        params.symbol,
        params.initialSupply
      );

      const gasLimit = await this.provider.estimateGas({
        ...deployTx,
        from: this.wallet?.address,
      });

      const contract = await factory.deploy(
        params.name,
        params.symbol,
        params.initialSupply,
        { gasLimit: (gasLimit * BigInt(120)) / BigInt(100) }
      );

      const txHash = contract.deploymentTransaction()?.hash || "";

      await contract.waitForDeployment();
      const contractAddress = await contract.getAddress();

      return {
        success: true,
        transactionHash: txHash,
        contractAddress,
        explorerUrl: this.getExplorerUrl(contractAddress, "address"),
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
    if (!this.provider) {
      throw new Error("Not connected");
    }

    const receipt = await this.provider.waitForTransaction(
      hash,
      this.chainConfig.confirmations
    );

    if (!receipt) {
      return { hash, status: "pending", confirmations: 0 };
    }

    const confirmations = await receipt.confirmations();

    return {
      hash,
      status: receipt.status === 1 ? "success" : "failed",
      blockNumber: receipt.blockNumber,
      confirmations,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  async getTransactionStatus(hash: string): Promise<TransactionReceipt> {
    if (!this.provider) {
      throw new Error("Not connected");
    }

    const receipt = await this.provider.getTransactionReceipt(hash);

    if (!receipt) {
      return { hash, status: "pending", confirmations: 0 };
    }

    const confirmations = await receipt.confirmations();

    return {
      hash,
      status: receipt.status === 1 ? "success" : "failed",
      blockNumber: receipt.blockNumber,
      confirmations,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  getExplorerUrl(hash: string, type: "tx" | "address" | "token"): string {
    const baseUrl = this.chainConfig.blockExplorers[0]?.url || "";
    const paths = { tx: "/tx/", address: "/address/", token: "/token/" };
    return `${baseUrl}${paths[type]}${hash}`;
  }
}
