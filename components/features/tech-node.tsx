"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

// ── Types ───────────────────────────────────────────────────────

export type TechNodeData = {
  label: string;
  category: string;
  importance: string;
  version: string | null;
  description: string | null;
  layer: string;
  isBlank?: boolean;
};

export type TechNodeType = Node<TechNodeData, "tech">;

// ── Category colors ─────────────────────────────────────────────

const CATEGORY_COLORS: Record<
  string,
  { bg: string; border: string; badge: string }
> = {
  framework: {
    bg: "bg-violet-500/10 dark:bg-violet-500/15",
    border: "border-violet-500/30",
    badge: "bg-violet-500/20 text-violet-700 dark:text-violet-300",
  },
  language: {
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    border: "border-blue-500/30",
    badge: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  },
  database: {
    bg: "bg-green-500/10 dark:bg-green-500/15",
    border: "border-green-500/30",
    badge: "bg-green-500/20 text-green-700 dark:text-green-300",
  },
  auth: {
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    border: "border-amber-500/30",
    badge: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  },
  deploy: {
    bg: "bg-cyan-500/10 dark:bg-cyan-500/15",
    border: "border-cyan-500/30",
    badge: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300",
  },
  styling: {
    bg: "bg-pink-500/10 dark:bg-pink-500/15",
    border: "border-pink-500/30",
    badge: "bg-pink-500/20 text-pink-700 dark:text-pink-300",
  },
  testing: {
    bg: "bg-orange-500/10 dark:bg-orange-500/15",
    border: "border-orange-500/30",
    badge: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  },
  build_tool: {
    bg: "bg-yellow-500/10 dark:bg-yellow-500/15",
    border: "border-yellow-500/30",
    badge: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  },
  library: {
    bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
    border: "border-indigo-500/30",
    badge: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300",
  },
  other: {
    bg: "bg-zinc-500/10 dark:bg-zinc-500/15",
    border: "border-zinc-500/30",
    badge: "bg-zinc-500/20 text-zinc-700 dark:text-zinc-300",
  },
};

const IMPORTANCE_RING: Record<string, string> = {
  core: "ring-2 ring-accent-purple/40",
  supporting: "",
  dev_dependency: "opacity-75",
};

// ── Component ───────────────────────────────────────────────────

function TechNodeComponent({ data }: NodeProps<TechNodeType>) {
  const colors = CATEGORY_COLORS[data.category] || CATEGORY_COLORS.other;
  const ring = IMPORTANCE_RING[data.importance] || "";

  if (data.isBlank) {
    return (
      <div
        className={`rounded-xl border-2 border-dashed border-accent-purple/40 bg-bg-surface px-4 py-3 text-center ${ring}`}
      >
        <Handle type="target" position={Position.Top} className="!bg-accent-purple" />
        <div className="text-sm font-medium text-text-faint">?</div>
        <Handle type="source" position={Position.Bottom} className="!bg-accent-purple" />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border ${colors.border} ${colors.bg} px-4 py-3 shadow-sm transition-shadow hover:shadow-md ${ring}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-accent-purple" />

      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-semibold text-text-primary">
          {data.label}
        </span>
        {data.version && (
          <span className="text-[10px] text-text-faint">{data.version}</span>
        )}
        <span
          className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${colors.badge}`}
        >
          {data.category}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-accent-purple" />
    </div>
  );
}

export const TechNode = memo(TechNodeComponent);
