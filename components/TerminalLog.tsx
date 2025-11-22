"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "./ui/Card";
import { Terminal, Copy, Check, Trash2, Download, ChevronDown } from "lucide-react";
import { cn } from "@/utils";

interface TerminalLogProps {
  logs: string[];
  maxHeight?: string;
  className?: string;
  onClear?: () => void;
  showTimestamps?: boolean;
}

export const TerminalLog = ({
  logs,
  maxHeight = "h-64",
  className,
  onClear,
  showTimestamps = true,
}: TerminalLogProps) => {
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  // Detect scroll position
  const handleScroll = () => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(atBottom);
    setAutoScroll(atBottom);
  };

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    setAutoScroll(true);
  };

  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(logs.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy logs:", err);
    }
  };

  const downloadLogs = () => {
    const content = logs.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deployment-logs-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogType = (log: string): "success" | "error" | "warning" | "info" => {
    const lowerLog = log.toLowerCase();
    if (lowerLog.includes("success") || lowerLog.includes("✅")) return "success";
    if (lowerLog.includes("error") || lowerLog.includes("❌") || lowerLog.includes("fail")) return "error";
    if (lowerLog.includes("warning") || lowerLog.includes("⚠")) return "warning";
    return "info";
  };

  const getLogColor = (type: ReturnType<typeof getLogType>) => {
    switch (type) {
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "warning":
        return "text-yellow-400";
      default:
        return "text-slate-300";
    }
  };

  const getPromptColor = (type: ReturnType<typeof getLogType>) => {
    switch (type) {
      case "success":
        return "text-green-500";
      case "error":
        return "text-red-500";
      case "warning":
        return "text-yellow-500";
      default:
        return "text-cyan-500";
    }
  };

  return (
    <Card
      className={cn(
        maxHeight,
        "flex flex-col bg-black/80 border-slate-800/80 font-mono text-xs p-0 overflow-hidden shadow-inner shadow-black/50",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-3 h-3 text-slate-500" />
          <span className="text-slate-500">System Logs</span>
          {logs.length > 0 && (
            <span className="text-xs text-slate-600">({logs.length})</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {logs.length > 0 && (
            <>
              <button
                onClick={copyLogs}
                className="p-1.5 hover:bg-slate-800 rounded transition-colors"
                title="Copy logs"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400" />
                )}
              </button>
              <button
                onClick={downloadLogs}
                className="p-1.5 hover:bg-slate-800 rounded transition-colors"
                title="Download logs"
              >
                <Download className="w-3 h-3 text-slate-400" />
              </button>
              {onClear && (
                <button
                  onClick={onClear}
                  className="p-1.5 hover:bg-slate-800 rounded transition-colors"
                  title="Clear logs"
                >
                  <Trash2 className="w-3 h-3 text-slate-400" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Log Content */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 p-4 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800"
      >
        {logs.length === 0 ? (
          <div className="text-slate-600 italic opacity-50 mt-10 text-center flex flex-col items-center gap-2">
            <Terminal className="w-8 h-8" />
            <span>Waiting for interactions...</span>
          </div>
        ) : (
          logs.map((log, i) => {
            const logType = getLogType(log);
            return (
              <div
                key={i}
                className={cn(
                  "animate-in slide-in-from-left-2 duration-300 wrap-break-word",
                  getLogColor(logType)
                )}
                style={{ animationDelay: `${Math.min(i * 50, 500)}ms` }}
              >
                <span className={cn("mr-2", getPromptColor(logType))}>
                  {logType === "success" ? "✓" : logType === "error" ? "✗" : "➜"}
                </span>
                {log}
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {!isAtBottom && logs.length > 5 && (
        <button
          onClick={scrollToBottom}
          className={cn(
            "absolute bottom-16 right-4 p-2",
            "bg-slate-800 hover:bg-slate-700 rounded-full",
            "shadow-lg transition-all duration-200",
            "flex items-center gap-1 text-xs text-slate-300"
          )}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Status Bar */}
      {logs.length > 0 && (
        <div className="px-4 py-1.5 bg-slate-900/30 border-t border-slate-800/50 text-[10px] text-slate-600 flex items-center justify-between">
          <span>
            {logs.filter((l) => getLogType(l) === "error").length > 0 && (
              <span className="text-red-500 mr-2">
                {logs.filter((l) => getLogType(l) === "error").length} error(s)
              </span>
            )}
            {logs.filter((l) => getLogType(l) === "success").length > 0 && (
              <span className="text-green-500">
                {logs.filter((l) => getLogType(l) === "success").length} success
              </span>
            )}
          </span>
          <span>
            {autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
          </span>
        </div>
      )}
    </Card>
  );
};

// Inline log display for compact views
interface InlineLogProps {
  message: string;
  type?: "info" | "success" | "error" | "warning";
  className?: string;
}

export const InlineLog = ({
  message,
  type = "info",
  className,
}: InlineLogProps) => {
  const colors = {
    info: "text-slate-400 bg-slate-800/50",
    success: "text-green-400 bg-green-500/10",
    error: "text-red-400 bg-red-500/10",
    warning: "text-yellow-400 bg-yellow-500/10",
  };

  return (
    <div
      className={cn(
        "font-mono text-xs px-3 py-2 rounded-lg",
        colors[type],
        className
      )}
    >
      {message}
    </div>
  );
};