"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Code2 } from "lucide-react";
import { MASTERY } from "@/server/actions/mastery-constants";

export type ConceptNodeData = {
  label: string;
  technologyName: string;
  masteryLevel: number; // 0-100
  conceptKey: string;
  relevanceScore?: number; // 0-1, from code matching
  matchedFileCount?: number;
};

export type ConceptNodeType = Node<ConceptNodeData, "concept">;

// Mastery states: mastered (80+) = green, available (1-79) = blue+pulse, locked (0) = gray
function getMasteryStyle(level: number) {
  if (level >= MASTERY.MASTERED_THRESHOLD) {
    return {
      bg: "bg-green-500/10",
      border: "border-green-500/40",
      text: "text-green-700 dark:text-green-300",
      ring: "ring-green-500/30",
      dot: "bg-green-500",
    };
  }
  if (level > 0) {
    return {
      bg: "bg-blue-500/10",
      border: "border-blue-500/40",
      text: "text-blue-700 dark:text-blue-300",
      ring: "ring-blue-500/30",
      dot: "bg-blue-500",
    };
  }
  return {
    bg: "bg-zinc-500/5",
    border: "border-border-default",
    text: "text-text-faint",
    ring: "",
    dot: "bg-zinc-500",
  };
}

function ConceptNodeComponent({ data }: NodeProps<ConceptNodeType>) {
  const style = getMasteryStyle(data.masteryLevel);
  const isAvailable = data.masteryLevel > 0 && data.masteryLevel < MASTERY.MASTERED_THRESHOLD;
  const hasRelevance = (data.relevanceScore ?? 0) > 0;

  return (
    <div
      className={`
        relative rounded-xl border px-4 py-2.5
        ${style.bg} ${style.border}
        ${hasRelevance ? "ring-1 ring-amber-500/40" : style.ring ? `ring-1 ${style.ring}` : ""}
        ${isAvailable ? "animate-pulse" : ""}
        transition-all hover:scale-105
        min-w-[140px] max-w-[200px] cursor-pointer
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-border-default !w-2 !h-2" />

      {/* Mastery indicator dot + relevance icon */}
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
        <span className={`text-xs font-medium truncate ${style.text}`}>
          {data.label}
        </span>
        {hasRelevance && (
          <span className="inline-flex items-center gap-0.5 shrink-0">
            <Code2 className="h-3 w-3 text-amber-400" />
            {(data.matchedFileCount ?? 0) > 0 && (
              <span className="text-[9px] text-amber-400 tabular-nums font-medium">
                {data.matchedFileCount}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Technology badge */}
      <span className="mt-1 block text-[10px] text-text-faint truncate">
        {data.technologyName}
      </span>

      {/* Mastery percentage */}
      {data.masteryLevel > 0 && (
        <div className="mt-1.5 h-1 w-full rounded-full bg-bg-surface-hover overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${data.masteryLevel >= MASTERY.MASTERED_THRESHOLD ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${data.masteryLevel}%` }}
          />
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-border-default !w-2 !h-2" />
    </div>
  );
}

export const ConceptNode = memo(ConceptNodeComponent);
