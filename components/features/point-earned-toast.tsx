"use client";

import { useEffect, useState } from "react";
import { Coins } from "lucide-react";

interface PointEarnedToastProps {
  amount: number;
  label?: string;
  onDone?: () => void;
}

export function PointEarnedToast({ amount, label, onDone }: PointEarnedToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-bg-elevated/95 px-4 py-3 shadow-lg backdrop-blur-sm">
        <Coins className="h-5 w-5 text-amber-400" />
        <span className="text-sm font-bold text-amber-400 tabular-nums">+{amount} VP</span>
        {label && <span className="text-xs text-text-faint">{label}</span>}
      </div>
    </div>
  );
}
