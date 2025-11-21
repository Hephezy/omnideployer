export enum ErrorCode {
  // Wallet Errors
  WALLET_NOT_FOUND = "WALLET_NOT_FOUND",
  WALLET_NOT_CONNECTED = "WALLET_NOT_CONNECTED",
  WALLET_REJECTED = "WALLET_REJECTED",
  WALLET_DISCONNECTED = "WALLET_DISCONNECTED",

  // Network Errors
  WRONG_NETWORK = "WRONG_NETWORK",
  NETWORK_SWITCH_FAILED = "NETWORK_SWITCH_FAILED",
  RPC_ERROR = "RPC_ERROR",
  RPC_TIMEOUT = "RPC_TIMEOUT",

  // Transaction Errors
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  GAS_ESTIMATION_FAILED = "GAS_ESTIMATION_FAILED",
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
  TRANSACTION_REVERTED = "TRANSACTION_REVERTED",
  TRANSACTION_TIMEOUT = "TRANSACTION_TIMEOUT",
  NONCE_ERROR = "NONCE_ERROR",

  // Deployment Errors
  DEPLOYMENT_FAILED = "DEPLOYMENT_FAILED",
  INVALID_CONTRACT = "INVALID_CONTRACT",
  CONTRACT_ALREADY_EXISTS = "CONTRACT_ALREADY_EXISTS",

  // Validation Errors
  INVALID_ADDRESS = "INVALID_ADDRESS",
  INVALID_AMOUNT = "INVALID_AMOUNT",
  INVALID_TOKEN_NAME = "INVALID_TOKEN_NAME",
  INVALID_TOKEN_SYMBOL = "INVALID_TOKEN_SYMBOL",

  // Generic Errors
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  CHAIN_NOT_SUPPORTED = "CHAIN_NOT_SUPPORTED",
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  userMessage: string;
  suggestion?: string;
  recoverable: boolean;
  originalError?: unknown;
}

export class DeployerError extends Error {
  public readonly code: ErrorCode;
  public readonly userMessage: string;
  public readonly suggestion?: string;
  public readonly recoverable: boolean;
  public readonly originalError?: unknown;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = "DeployerError";
    this.code = details.code;
    this.userMessage = details.userMessage;
    this.suggestion = details.suggestion;
    this.recoverable = details.recoverable;
    this.originalError = details.originalError;
  }

  static fromError(error: unknown, chainType?: string): DeployerError {
    // Parse common wallet errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (
        message.includes("user rejected") ||
        message.includes("user denied")
      ) {
        return new DeployerError({
          code: ErrorCode.WALLET_REJECTED,
          message: "User rejected the transaction",
          userMessage: "You cancelled the transaction",
          suggestion: "Try again when ready to confirm",
          recoverable: true,
          originalError: error,
        });
      }

      if (
        message.includes("insufficient funds") ||
        message.includes("insufficient balance")
      ) {
        return new DeployerError({
          code: ErrorCode.INSUFFICIENT_FUNDS,
          message: "Insufficient funds for transaction",
          userMessage: "Not enough funds for gas fees",
          suggestion:
            "Add more tokens to your wallet or use a faucet for testnet",
          recoverable: true,
          originalError: error,
        });
      }

      if (message.includes("nonce")) {
        return new DeployerError({
          code: ErrorCode.NONCE_ERROR,
          message: "Nonce error",
          userMessage: "Transaction ordering issue detected",
          suggestion: "Wait a moment and try again, or reset your wallet",
          recoverable: true,
          originalError: error,
        });
      }

      if (message.includes("timeout")) {
        return new DeployerError({
          code: ErrorCode.RPC_TIMEOUT,
          message: "RPC timeout",
          userMessage: "Network request timed out",
          suggestion: "Check your internet connection and try again",
          recoverable: true,
          originalError: error,
        });
      }

      if (message.includes("not found") && message.includes("wallet")) {
        return new DeployerError({
          code: ErrorCode.WALLET_NOT_FOUND,
          message: "Wallet not found",
          userMessage: "No compatible wallet detected",
          suggestion: `Install a supported wallet for ${
            chainType || "this chain"
          }`,
          recoverable: false,
          originalError: error,
        });
      }
    }

    // Generic fallback
    return new DeployerError({
      code: ErrorCode.UNKNOWN_ERROR,
      message: error instanceof Error ? error.message : "Unknown error",
      userMessage: "An unexpected error occurred",
      suggestion: "Please try again or contact support",
      recoverable: true,
      originalError: error,
    });
  }
}

// Error display component
export const getErrorDisplay = (
  error: DeployerError | Error | string
): {
  title: string;
  message: string;
  suggestion?: string;
  type: "error" | "warning" | "info";
} => {
  if (error instanceof DeployerError) {
    return {
      title: error.code.replace(/_/g, " "),
      message: error.userMessage,
      suggestion: error.suggestion,
      type: error.recoverable ? "warning" : "error",
    };
  }

  if (error instanceof Error) {
    return {
      title: "Error",
      message: error.message,
      type: "error",
    };
  }

  return {
    title: "Error",
    message: error,
    type: "error",
  };
};

// Validation helpers
export const validateTokenParams = (params: {
  name: string;
  symbol: string;
  supply: number;
}): DeployerError | null => {
  if (!params.name || params.name.length < 1 || params.name.length > 64) {
    return new DeployerError({
      code: ErrorCode.INVALID_TOKEN_NAME,
      message: "Invalid token name",
      userMessage: "Token name must be 1-64 characters",
      recoverable: true,
    });
  }

  if (!params.symbol || params.symbol.length < 1 || params.symbol.length > 11) {
    return new DeployerError({
      code: ErrorCode.INVALID_TOKEN_SYMBOL,
      message: "Invalid token symbol",
      userMessage: "Token symbol must be 1-11 characters",
      recoverable: true,
    });
  }

  if (params.supply <= 0 || params.supply > Number.MAX_SAFE_INTEGER) {
    return new DeployerError({
      code: ErrorCode.INVALID_AMOUNT,
      message: "Invalid supply amount",
      userMessage: "Supply must be a positive number",
      recoverable: true,
    });
  }

  return null;
};
