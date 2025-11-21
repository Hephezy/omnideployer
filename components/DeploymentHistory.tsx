import { useState } from "react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import {
  DeploymentRecord,
  formatRelativeTime,
} from "@/hooks/useDeploymentHistory";
import {
  History,
  ExternalLink,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  Shield,
} from "lucide-react";
import { cn, shortenAddress } from "@/utils";

interface DeploymentHistoryProps {
  history: DeploymentRecord[];
  onRemove: (id: string) => void;
  onClear: () => void;
  maxVisible?: number;
}

export const DeploymentHistory = ({
  history,
  onRemove,
  onClear,
  maxVisible = 5,
}: DeploymentHistoryProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const visibleHistory = isExpanded ? history : history.slice(0, maxVisible);

  const copyAddress = async (address: string, id: string) => {
    await navigator.clipboard.writeText(address);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusIcon = (status: DeploymentRecord["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />;
    }
  };

  if (history.length === 0) {
    return (
      <Card className="p-4 bg-slate-900/30 border-slate-800">
        <div className="flex items-center gap-2 text-slate-500 mb-3">
          <History className="w-4 h-4" />
          <span className="text-xs font-bold tracking-widest uppercase">
            Deployment History
          </span>
        </div>
        <p className="text-sm text-slate-500 text-center py-4 italic">
          No deployments yet. Your deployed tokens will appear here.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-slate-900/30 border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-slate-400">
          <History className="w-4 h-4" />
          <span className="text-xs font-bold tracking-widest uppercase">
            Deployment History
          </span>
          <span className="text-xs text-slate-600">({history.length})</span>
        </div>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* History List */}
      <div className="space-y-2">
        {visibleHistory.map((record) => (
          <div
            key={record.id}
            className="p-3 bg-slate-800/30 rounded-lg border border-slate-800/50 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              {/* Left side */}
              <div className="flex items-start gap-2 min-w-0 flex-1">
                {getStatusIcon(record.status)}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white text-sm truncate">
                      {record.tokenName}
                    </span>
                    <span className="text-xs text-cyan-400 font-mono">
                      ${record.tokenSymbol}
                    </span>
                    {record.verified && (
                      <span className="flex items-center gap-0.5 text-xs text-green-400">
                        <Shield className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span>{record.chainName}</span>
                    <span>•</span>
                    <span>{formatRelativeTime(record.timestamp)}</span>
                  </div>
                </div>
              </div>

              {/* Right side actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copyAddress(record.contractAddress, record.id)}
                  className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                  title="Copy address"
                >
                  {copiedId === record.id ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
                <a
                  href={record.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                  title="View on explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
                <button
                  onClick={() => onRemove(record.id)}
                  className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-red-400" />
                </button>
              </div>
            </div>

            {/* Contract address */}
            <div className="mt-2 pt-2 border-t border-slate-700/50">
              <p className="text-xs font-mono text-slate-400">
                {shortenAddress(record.contractAddress)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Expand/Collapse Button */}
      {history.length > maxVisible && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 py-2 flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-300 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show {history.length - maxVisible} More
            </>
          )}
        </button>
      )}
    </Card>
  );
};