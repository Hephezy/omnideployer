import { ethers } from "ethers";
import { ChainConfig } from "@/config/constants";

export interface VerificationParams {
  contractAddress: string;
  contractName: string;
  sourceCode: string;
  constructorArgs: string; // ABI-encoded
  compilerVersion: string;
  optimizationUsed: boolean;
  runs: number;
}

export interface VerificationResult {
  success: boolean;
  guid?: string;
  message: string;
  explorerUrl?: string;
}

export interface VerificationStatus {
  status: "pending" | "pass" | "fail" | "unknown";
  message: string;
}

// Etherscan-compatible API endpoints
const EXPLORER_APIS: Record<number, { apiUrl: string; apiKeyEnvVar: string }> =
  {
    11155111: {
      apiUrl: "https://api-sepolia.etherscan.io/api",
      apiKeyEnvVar: "ETHERSCAN_API_KEY",
    },
    80002: {
      apiUrl: "https://api-amoy.polygonscan.com/api",
      apiKeyEnvVar: "POLYGONSCAN_API_KEY",
    },
    84532: {
      apiUrl: "https://api-sepolia.basescan.org/api",
      apiKeyEnvVar: "BASESCAN_API_KEY",
    },
  };

// Simple ERC-20 source code for verification
export const ERC20_SOURCE_CODE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory name_, string memory symbol_, uint256 initialSupply_) {
        name = name_;
        symbol = symbol_;
        totalSupply = initialSupply_ * 10**decimals;
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        unchecked {
            balanceOf[msg.sender] -= amount;
            balanceOf[to] += amount;
        }
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        unchecked {
            allowance[from][msg.sender] -= amount;
            balanceOf[from] -= amount;
            balanceOf[to] += amount;
        }
        emit Transfer(from, to, amount);
        return true;
    }
}`;

export class ContractVerifier {
  private chainId: number;
  private apiUrl: string;
  private apiKey: string;

  constructor(chain: ChainConfig, apiKey?: string) {
    this.chainId = chain.chainId;
    const config = EXPLORER_APIS[chain.chainId];

    if (!config) {
      throw new Error(`Verification not supported for chain ${chain.name}`);
    }

    this.apiUrl = config.apiUrl;
    this.apiKey = apiKey || process.env[config.apiKeyEnvVar] || "";
  }

  /**
   * Encode constructor arguments for verification
   */
  static encodeConstructorArgs(
    name: string,
    symbol: string,
    initialSupply: number
  ): string {
    const abiCoder = new ethers.AbiCoder();
    return abiCoder
      .encode(["string", "string", "uint256"], [name, symbol, initialSupply])
      .slice(2); // Remove 0x prefix
  }

  /**
   * Submit contract for verification
   */
  async verify(params: VerificationParams): Promise<VerificationResult> {
    if (!this.apiKey) {
      return {
        success: false,
        message: "API key not configured. Please add your explorer API key.",
      };
    }

    try {
      const formData = new URLSearchParams({
        apikey: this.apiKey,
        module: "contract",
        action: "verifysourcecode",
        contractaddress: params.contractAddress,
        sourceCode: params.sourceCode,
        codeformat: "solidity-single-file",
        contractname: params.contractName,
        compilerversion: params.compilerVersion,
        optimizationUsed: params.optimizationUsed ? "1" : "0",
        runs: params.runs.toString(),
        constructorArguements: params.constructorArgs,
        licenseType: "3", // MIT
      });

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data = await response.json();

      if (data.status === "1") {
        return {
          success: true,
          guid: data.result,
          message: "Verification submitted successfully",
        };
      } else {
        return {
          success: false,
          message: data.result || "Verification submission failed",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check verification status
   */
  async checkStatus(guid: string): Promise<VerificationStatus> {
    if (!this.apiKey) {
      return { status: "unknown", message: "API key not configured" };
    }

    try {
      const url = `${this.apiUrl}?apikey=${this.apiKey}&module=contract&action=checkverifystatus&guid=${guid}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.result === "Pending in queue") {
        return { status: "pending", message: "Verification pending" };
      } else if (data.result === "Pass - Verified") {
        return { status: "pass", message: "Contract verified successfully" };
      } else if (data.result.includes("Fail")) {
        return { status: "fail", message: data.result };
      } else {
        return { status: "unknown", message: data.result };
      }
    } catch (error) {
      return {
        status: "unknown",
        message: error instanceof Error ? error.message : "Status check failed",
      };
    }
  }

  /**
   * Verify with polling until complete
   */
  async verifyAndWait(
    params: VerificationParams,
    onStatusUpdate?: (status: VerificationStatus) => void,
    maxAttempts: number = 10,
    intervalMs: number = 5000
  ): Promise<VerificationResult> {
    const submitResult = await this.verify(params);

    if (!submitResult.success || !submitResult.guid) {
      return submitResult;
    }

    onStatusUpdate?.({ status: "pending", message: "Verification submitted" });

    // Poll for status
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));

      const status = await this.checkStatus(submitResult.guid);
      onStatusUpdate?.(status);

      if (status.status === "pass") {
        return {
          success: true,
          guid: submitResult.guid,
          message: "Contract verified successfully",
          explorerUrl: `${this.getExplorerBaseUrl()}/address/${
            params.contractAddress
          }#code`,
        };
      } else if (status.status === "fail") {
        return {
          success: false,
          guid: submitResult.guid,
          message: status.message,
        };
      }
    }

    return {
      success: false,
      guid: submitResult.guid,
      message: "Verification timed out. Check explorer manually.",
    };
  }

  private getExplorerBaseUrl(): string {
    const baseUrls: Record<number, string> = {
      11155111: "https://sepolia.etherscan.io",
      80002: "https://amoy.polygonscan.com",
      84532: "https://sepolia.basescan.org",
    };
    return baseUrls[this.chainId] || "";
  }
}

// Hook for using verification in components
import { useState, useCallback } from "react";

export function useContractVerification(chain: ChainConfig | null) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus | null>(null);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);

  const verify = useCallback(
    async (
      contractAddress: string,
      tokenName: string,
      tokenSymbol: string,
      initialSupply: number,
      apiKey?: string
    ) => {
      if (!chain) {
        setVerificationResult({ success: false, message: "No chain selected" });
        return;
      }

      setIsVerifying(true);
      setVerificationStatus(null);
      setVerificationResult(null);

      try {
        const verifier = new ContractVerifier(chain, apiKey);
        const constructorArgs = ContractVerifier.encodeConstructorArgs(
          tokenName,
          tokenSymbol,
          initialSupply
        );

        const result = await verifier.verifyAndWait(
          {
            contractAddress,
            contractName: "SimpleToken",
            sourceCode: ERC20_SOURCE_CODE,
            constructorArgs,
            compilerVersion: "v0.8.20+commit.a1b79de6",
            optimizationUsed: true,
            runs: 200,
          },
          setVerificationStatus
        );

        setVerificationResult(result);
        return result;
      } catch (error) {
        const result: VerificationResult = {
          success: false,
          message:
            error instanceof Error ? error.message : "Verification failed",
        };
        setVerificationResult(result);
        return result;
      } finally {
        setIsVerifying(false);
      }
    },
    [chain]
  );

  const reset = useCallback(() => {
    setIsVerifying(false);
    setVerificationStatus(null);
    setVerificationResult(null);
  }, []);

  return {
    verify,
    reset,
    isVerifying,
    verificationStatus,
    verificationResult,
  };
}
