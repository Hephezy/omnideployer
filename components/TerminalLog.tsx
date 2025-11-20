import { useEffect, useRef } from "react";
import { Card } from "./ui/Card";
import { Terminal } from "lucide-react";

export const TerminalLog = ({ logs }: { logs: string[] }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <Card className="h-64 flex flex-col bg-black/80 border-slate-800/80 font-mono text-xs p-0 overflow-hidden shadow-inner shadow-black/50">
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 border-b border-slate-800">
        <Terminal className="w-3 h-3 text-slate-500" />
        <span className="text-slate-500">System Logs</span>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-1.5 text-slate-300 scrollbar-thin scrollbar-thumb-slate-800">
        {logs.length === 0 && (
          <div className="text-slate-600 italic opacity-50 mt-10 text-center">
            Waiting for interactions...
          </div>
        )}
        {logs.map((log, i) => (
          <div key={i} className="animate-in slide-in-from-left-2 duration-300 wrap-break-word">
            <span className="text-cyan-500 mr-2">➜</span>
            {log}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </Card>
  );
};