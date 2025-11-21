import { NetworkStatus, getStatusColor, getStatusBgColor } from "@/hooks/useNetworkStatus";
import { Wifi, WifiOff, Activity, RefreshCw } from "lucide-react";
import { cn } from "@/utils";

interface NetworkStatusBadgeProps {
  status: NetworkStatus;
  isChecking: boolean;
  onRefresh?: () => void;
  showDetails?: boolean;
  className?: string;
}

export const NetworkStatusBadge = ({
  status,
  isChecking,
  onRefresh,
  showDetails = false,
  className,
}: NetworkStatusBadgeProps) => {
  const statusColor = getStatusColor(status.health);
  const bgColor = getStatusBgColor(status.health);

  if (!showDetails) {
    // Compact badge
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
          "bg-slate-900 border border-slate-800",
          className
        )}
        title={`${status.health} - ${status.latency}ms`}
      >
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            bgColor,
            status.isOnline && "animate-pulse"
          )}
        />
        <span className={statusColor}>
          {status.isOnline ? `${status.latency}ms` : "Offline"}
        </span>
      </div>
    );
  }

  // Detailed view
  return (
    <div
      className={cn(
        "p-3 rounded-lg bg-slate-900/50 border border-slate-800 space-y-2",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status.isOnline ? (
            <Wifi className={cn("w-4 h-4", statusColor)} />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
          <span className="text-xs font-medium text-slate-300">
            Network Status
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isChecking}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
          >
            <RefreshCw
              className={cn(
                "w-3 h-3 text-slate-400",
                isChecking && "animate-spin"
              )}
            />
          </button>
        )}
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-slate-500">Status</p>
          <p className={cn("font-medium capitalize", statusColor)}>
            {status.health}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Latency</p>
          <p className="text-slate-300">
            {status.latency !== null ? `${status.latency}ms` : "-"}
          </p>
        </div>
        {status.blockNumber && (
          <div>
            <p className="text-slate-500">Block</p>
            <p className="text-slate-300 font-mono">
              #{status.blockNumber.toLocaleString()}
            </p>
          </div>
        )}
        {status.gasPrice && (
          <div>
            <p className="text-slate-500">Gas Price</p>
            <p className="text-slate-300">{status.gasPrice}</p>
          </div>
        )}
      </div>

      {/* Health Bar */}
      <div className="flex items-center gap-1 pt-1">
        {["excellent", "good", "slow", "offline"].map((level) => (
          <div
            key={level}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              status.health === level ? bgColor : "bg-slate-700"
            )}
          />
        ))}
      </div>
    </div>
  );
};

// Inline status indicator for headers
export const NetworkStatusIndicator = ({
  status,
}: {
  status: NetworkStatus;
}) => {
  const bgColor = getStatusBgColor(status.health);

  return (
    <div className="flex items-center gap-1.5" title={`Network: ${status.health}`}>
      <div
        className={cn(
          "w-2 h-2 rounded-full",
          bgColor,
          status.isOnline && "animate-pulse"
        )}
      />
      {status.latency !== null && (
        <span className="text-xs text-slate-500 font-mono">
          {status.latency}ms
        </span>
      )}
    </div>
  );
};