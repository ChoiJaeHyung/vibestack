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
  techColor?: string; // hex color for technology group
};

export type ConceptNodeType = Node<ConceptNodeData, "concept">;

// ── Donut ring SVG ──────────────────────────────────────────────

const RING_SIZE = 52;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function DonutRing({ level, color }: { level: number; color: string }) {
  const offset = RING_CIRCUMFERENCE - (level / 100) * RING_CIRCUMFERENCE;

  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      className="absolute -top-1 -left-1 pointer-events-none"
    >
      {/* Track */}
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke="var(--border-default)"
        strokeWidth={RING_STROKE}
        opacity={0.3}
      />
      {/* Progress arc */}
      {level > 0 && (
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={RING_STROKE}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          className="transition-all duration-700 ease-out"
        />
      )}
    </svg>
  );
}

// ── Mastery style ───────────────────────────────────────────────

function getMasteryConfig(level: number) {
  if (level >= MASTERY.MASTERED_THRESHOLD) {
    return {
      ringColor: "#22c55e",
      bgClass: "bg-green-500/8 dark:bg-green-500/12",
      borderClass: "border-green-500/30",
      textClass: "text-green-700 dark:text-green-300",
      labelClass: "text-green-600 dark:text-green-400",
      glowClass: "shadow-[0_0_16px_rgba(34,197,94,0.25)]",
      statusLabel: "Mastered",
      statusLabelKo: "완료",
    };
  }
  if (level > 0) {
    return {
      ringColor: "#3b82f6",
      bgClass: "bg-blue-500/8 dark:bg-blue-500/12",
      borderClass: "border-blue-500/30",
      textClass: "text-blue-700 dark:text-blue-300",
      labelClass: "text-blue-600 dark:text-blue-400",
      glowClass: "",
      statusLabel: "Learning",
      statusLabelKo: "학습중",
    };
  }
  return {
    ringColor: "#a1a1aa",
    bgClass: "bg-zinc-500/5 dark:bg-zinc-500/8",
    borderClass: "border-border-default",
    textClass: "text-text-faint",
    labelClass: "text-text-faint",
    glowClass: "",
    statusLabel: "New",
    statusLabelKo: "미학습",
  };
}

// ── Node Component ──────────────────────────────────────────────

function ConceptNodeComponent({ data }: NodeProps<ConceptNodeType>) {
  const config = getMasteryConfig(data.masteryLevel);
  const hasRelevance = (data.relevanceScore ?? 0) > 0;

  return (
    <div className="relative flex flex-col items-center group">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-transparent !border-0 !w-3 !h-3 !-top-1.5"
      />

      {/* Donut ring container */}
      <div
        className={`
          relative flex items-center justify-center
          w-[50px] h-[50px] rounded-full
          ${config.bgClass} border ${config.borderClass}
          ${config.glowClass}
          transition-all duration-300
          group-hover:scale-110 group-hover:shadow-lg
          cursor-pointer
        `}
      >
        <DonutRing level={data.masteryLevel} color={config.ringColor} />

        {/* Center: mastery % or icon */}
        {data.masteryLevel > 0 ? (
          <span className={`text-xs font-bold tabular-nums ${config.labelClass}`}>
            {data.masteryLevel}
          </span>
        ) : (
          <span className="text-[10px] text-text-faint font-medium">NEW</span>
        )}

        {/* Code match badge — top-right */}
        {hasRelevance && (
          <span className="absolute -top-1 -right-1 flex items-center gap-0.5 rounded-full bg-amber-500/90 px-1.5 py-0.5 shadow-sm">
            <Code2 className="h-2.5 w-2.5 text-white" />
            {(data.matchedFileCount ?? 0) > 0 && (
              <span className="text-[8px] text-white font-bold tabular-nums leading-none">
                {data.matchedFileCount}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Label below the circle */}
      <div className="mt-1.5 max-w-[120px] text-center">
        <span className={`text-[11px] font-medium leading-tight line-clamp-2 ${config.textClass}`}>
          {data.label}
        </span>
      </div>

      {/* Tech badge — only shown on hover */}
      <span className="mt-0.5 text-[9px] text-text-faint opacity-0 group-hover:opacity-100 transition-opacity">
        {data.technologyName}
      </span>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-transparent !border-0 !w-3 !h-3 !-bottom-1.5"
      />
    </div>
  );
}

export const ConceptNode = memo(ConceptNodeComponent);
