"use client";

import { ChainConfig } from "@/config/constants";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { ArrowRight, AlertTriangle, X } from "lucide-react";
import { cn } from "@/utils";

interface NetworkSwitchModalProps {
  isOpen: boolean;
  currentChain: ChainConfig | null;
  targetChain: ChainConfig | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const NetworkSwitchModal = ({
  isOpen,
  currentChain,
  targetChain,
  onConfirm,
  onCancel,
  isLoading = false,
}: NetworkSwitchModalProps) => {
  if (!isOpen || !targetChain) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 bg-slate-900 border-slate-700 relative animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>

        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-center mb-2">Switch Network?</h2>
        <p className="text-slate-400 text-center text-sm mb-6">
          You&apos;re about to switch to a different blockchain network
        </p>

        {/* Network Comparison */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {/* Current Network */}
          {currentChain && (
            <div className="flex-1 p-4 bg-slate-800/50 rounded-xl border border-slate-700 text-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center text-white bg-linear-to-br",
                  currentChain.color
                )}
              >
                {currentChain.icon}
              </div>
              <p className="text-xs text-slate-500 mb-1">Current</p>
              <p className="text-sm font-medium text-white truncate">
                {currentChain.name}
              </p>
            </div>
          )}

          {/* Arrow */}
          <div className="shrink-0">
            <ArrowRight className="w-6 h-6 text-cyan-400" />
          </div>

          {/* Target Network */}
          <div className="flex-1 p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/30 text-center">
            <div
              className={cn(
                "w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center text-white bg-linear-to-br",
                targetChain.color
              )}
            >
              {targetChain.icon}
            </div>
            <p className="text-xs text-cyan-400 mb-1">New Network</p>
            <p className="text-sm font-medium text-white truncate">
              {targetChain.name}
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-3 bg-slate-800/50 rounded-lg mb-6">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-400">
              <p className="font-medium text-slate-300 mb-1">
                What this means:
              </p>
              <ul className="space-y-1">
                <li>• Your wallet will prompt you to approve the switch</li>
                <li>• Gas fees will be paid in {targetChain.currency}</li>
                <li>• Make sure you have {targetChain.currency} for fees</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            isLoading={isLoading}
            className="flex-1"
          >
            Switch Network
          </Button>
        </div>
      </Card>
    </div>
  );
};

// Confirmation modal for dangerous actions
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning",
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  const variants = {
    danger: {
      icon: <AlertTriangle className="w-6 h-6 text-red-400" />,
      bg: "bg-red-500/20",
      button: "bg-red-500 hover:bg-red-400",
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-yellow-400" />,
      bg: "bg-yellow-500/20",
      button: "bg-yellow-500 hover:bg-yellow-400 text-black",
    },
    info: {
      icon: <AlertTriangle className="w-6 h-6 text-cyan-400" />,
      bg: "bg-cyan-500/20",
      button: "bg-cyan-500 hover:bg-cyan-400 text-black",
    },
  };

  const config = variants[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-sm p-6 bg-slate-900 border-slate-700 animate-in fade-in zoom-in duration-200">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", config.bg)}>
            {config.icon}
          </div>
        </div>

        {/* Content */}
        <h2 className="text-lg font-bold text-center mb-2">{title}</h2>
        <p className="text-slate-400 text-center text-sm mb-6">{message}</p>

        {/* Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg font-medium transition-colors",
              config.button,
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading ? "Loading..." : confirmText}
          </button>
        </div>
      </Card>
    </div>
  );
};