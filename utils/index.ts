/**
 * Utility functions for OmniDeployer
 */

/**
 * Combines class names, filtering out falsy values
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Shortens an address for display
 */
export function shortenAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (!address) return "";
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Validates an Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Checksums an Ethereum address
 */
export function checksumAddress(address: string): string {
  if (!isValidAddress(address)) return address;
  // Simple checksum - for full implementation use ethers.getAddress()
  return address;
}

/**
 * Formats a number with commas
 */
export function formatNumber(num: number | string): string {
  const n = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(n)) return "0";
  return n.toLocaleString("en-US");
}

/**
 * Formats a number with specified decimal places
 */
export function formatDecimals(
  num: number | string,
  decimals: number = 4
): string {
  const n = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(n)) return "0";
  return n.toFixed(decimals);
}

/**
 * Formats a large number with suffix (K, M, B, T)
 */
export function formatCompact(num: number): string {
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toString();
}

/**
 * Formats wei to a human-readable string
 */
export function formatWei(
  wei: bigint | string,
  decimals: number = 18,
  displayDecimals: number = 4
): string {
  const value = typeof wei === "string" ? BigInt(wei) : wei;
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  const fraction = value % divisor;

  const fractionStr = fraction.toString().padStart(decimals, "0");
  const displayFraction = fractionStr.slice(0, displayDecimals);

  return `${whole}.${displayFraction}`;
}

/**
 * Formats a timestamp to relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months}mo ago`;
  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  if (seconds > 10) return `${seconds}s ago`;
  return "Just now";
}

/**
 * Formats seconds to mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Formats a timestamp to a readable date
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Delays execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: Error = new Error("Unknown error");
  let currentDelay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        throw lastError;
      }

      onRetry?.(attempt, lastError);

      await delay(currentDelay);
      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Creates a timeout promise
 */
export function timeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage: string = "Operation timed out"
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    ),
  ]);
}

/**
 * Validates token name
 */
export function validateTokenName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name) return { valid: false, error: "Token name is required" };
  if (name.length < 1) return { valid: false, error: "Name too short" };
  if (name.length > 64)
    return { valid: false, error: "Name too long (max 64 chars)" };
  return { valid: true };
}

/**
 * Validates token symbol
 */
export function validateTokenSymbol(symbol: string): {
  valid: boolean;
  error?: string;
} {
  if (!symbol) return { valid: false, error: "Token symbol is required" };
  if (symbol.length < 1) return { valid: false, error: "Symbol too short" };
  if (symbol.length > 11)
    return { valid: false, error: "Symbol too long (max 11 chars)" };
  if (!/^[A-Z0-9]+$/.test(symbol)) {
    return {
      valid: false,
      error: "Symbol must be uppercase letters/numbers only",
    };
  }
  return { valid: true };
}

/**
 * Validates token supply
 */
export function validateTokenSupply(supply: number): {
  valid: boolean;
  error?: string;
} {
  if (supply <= 0)
    return { valid: false, error: "Supply must be greater than 0" };
  if (supply > Number.MAX_SAFE_INTEGER) {
    return { valid: false, error: "Supply exceeds maximum safe value" };
  }
  return { valid: true };
}

/**
 * Copies text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Builds an explorer URL
 */
export function buildExplorerUrl(
  baseUrl: string,
  hash: string,
  type: "tx" | "address" | "token" | "block"
): string {
  const paths = {
    tx: "/tx/",
    address: "/address/",
    token: "/token/",
    block: "/block/",
  };
  return `${baseUrl}${paths[type]}${hash}`;
}

/**
 * Opens URL in new tab
 */
export function openInNewTab(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Safe localStorage getter
 */
export function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;

  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Safe localStorage setter
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") return false;

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe localStorage remover
 */
export function removeStorageItem(key: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Checks if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Checks if value is a positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && value > 0 && !isNaN(value);
}
