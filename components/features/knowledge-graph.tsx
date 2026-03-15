"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTranslations } from "next-intl";
import { Code2, ArrowRight, Sparkles, RotateCcw } from "lucide-react";
import { ConceptNode, type ConceptNodeType } from "./concept-node";
import { ConceptDetailPanel } from "./concept-detail-panel";
import type {
  ConceptGraphData,
  ConceptGraphNode,
} from "@/server/actions/knowledge-graph";
import { MASTERY } from "@/server/actions/mastery-constants";

// ── Node type registry ──────────────────────────────────────────

const nodeTypes = { concept: ConceptNode };

// ── Tech group colors (rotating palette) ────────────────────────

const TECH_COLORS = [
  { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.15)", accent: "#3b82f6" },   // blue
  { bg: "rgba(168,85,247,0.06)", border: "rgba(168,85,247,0.15)", accent: "#a855f7" },   // purple
  { bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.15)", accent: "#22c55e" },     // green
  { bg: "rgba(249,115,22,0.06)", border: "rgba(249,115,22,0.15)", accent: "#f97316" },   // orange
  { bg: "rgba(236,72,153,0.06)", border: "rgba(236,72,153,0.15)", accent: "#ec4899" },   // pink
  { bg: "rgba(14,165,233,0.06)", border: "rgba(14,165,233,0.15)", accent: "#0ea5e9" },   // sky
  { bg: "rgba(234,179,8,0.06)", border: "rgba(234,179,8,0.15)", accent: "#eab308" },     // yellow
  { bg: "rgba(20,184,166,0.06)", border: "rgba(20,184,166,0.15)", accent: "#14b8a6" },   // teal
];

function getTechColor(index: number) {
  return TECH_COLORS[index % TECH_COLORS.length];
}

// ── Layout ──────────────────────────────────────────────────────

const GROUP_MARGIN_Y = 50; // gap between tech groups
const NODE_GAP_X = 140;
const NODE_GAP_Y = 110;
const PADDING = 80;
const LABEL_HEIGHT = 40;

/**
 * Build ReactFlow nodes: tech group labels + concept donut nodes.
 */
function buildFlowNodes(
  graphNodes: ConceptGraphNode[],
  technologies: string[],
): Node[] {
  const flowNodes: Node[] = [];

  const techGroups = new Map<string, ConceptGraphNode[]>();
  for (const node of graphNodes) {
    const group = techGroups.get(node.technologyName) || [];
    group.push(node);
    techGroups.set(node.technologyName, group);
  }

  const orderedTechs = technologies.filter((t) => techGroups.has(t));
  let techOffsetY = PADDING;

  for (let ti = 0; ti < orderedTechs.length; ti++) {
    const techName = orderedTechs[ti];
    const concepts = techGroups.get(techName) || [];
    if (concepts.length === 0) continue;

    const color = getTechColor(ti);
    const cols = Math.min(concepts.length, 5);
    const rows = Math.ceil(concepts.length / cols);
    const groupWidth = cols * NODE_GAP_X + 40;
    const groupHeight = rows * NODE_GAP_Y + LABEL_HEIGHT + 30;

    // Tech group background node (non-interactive, rendered as a plain div)
    flowNodes.push({
      id: `tech-group-${techName}`,
      type: "default",
      position: { x: -groupWidth / 2 - 20, y: techOffsetY - 20 },
      data: { label: "" },
      selectable: false,
      draggable: false,
      connectable: false,
      style: {
        width: groupWidth + 40,
        height: groupHeight,
        background: color.bg,
        border: `1px solid ${color.border}`,
        borderRadius: "16px",
        pointerEvents: "none" as const,
        zIndex: -1,
        padding: 0,
        boxShadow: "none",
      },
      className: "!shadow-none !p-0",
    });

    // Tech label node (text only, no box)
    flowNodes.push({
      id: `tech-label-${techName}`,
      type: "default",
      position: { x: -groupWidth / 2 - 8, y: techOffsetY - 14 },
      data: {
        label: techName,
      },
      selectable: false,
      draggable: false,
      connectable: false,
      style: {
        background: "transparent",
        border: "none",
        borderRadius: 0,
        boxShadow: "none",
        fontSize: "13px",
        fontWeight: 700,
        color: color.accent,
        letterSpacing: "0.02em",
        padding: "2px 12px",
        pointerEvents: "none" as const,
        width: "auto",
      },
      className: "!shadow-none !border-0 !bg-transparent !p-0",
    });

    // Concept nodes within group
    for (let i = 0; i < concepts.length; i++) {
      const concept = concepts[i];
      const row = Math.floor(i / cols);
      const col = i % cols;

      const totalWidth = cols * NODE_GAP_X;
      const x = -totalWidth / 2 + col * NODE_GAP_X + NODE_GAP_X / 2;
      const y = techOffsetY + LABEL_HEIGHT + row * NODE_GAP_Y;

      flowNodes.push({
        id: concept.conceptKey,
        type: "concept",
        position: { x, y },
        data: {
          label: concept.conceptName,
          technologyName: concept.technologyName,
          masteryLevel: concept.masteryLevel,
          conceptKey: concept.conceptKey,
          relevanceScore: concept.relevanceScore,
          matchedFileCount: concept.matchedFiles?.length,
          techColor: color.accent,
        },
      });
    }

    techOffsetY += groupHeight + GROUP_MARGIN_Y;
  }

  return flowNodes;
}

function buildFlowEdges(graphEdges: ConceptGraphData["edges"]): Edge[] {
  return graphEdges.map((e) => {
    const isCrossTech = e.edgeType === "cross_tech";
    const isRelated = e.edgeType === "related";
    const isDiffFlow = e.edgeType === "difficulty_flow";

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: "default",
      animated: isCrossTech,
      style: {
        stroke: isCrossTech
          ? "var(--accent-purple, #a855f7)"
          : isRelated
            ? "var(--accent-blue, #3b82f6)"
            : isDiffFlow
              ? "var(--accent-emerald, #10b981)"
              : "var(--border-default)",
        strokeWidth: isCrossTech ? 2.5 : isRelated ? 1.5 : 1,
        strokeDasharray: isRelated ? "6 3" : isCrossTech ? "8 4" : undefined,
        opacity: isRelated ? 0.5 : isCrossTech ? 0.7 : 0.6,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isCrossTech
          ? "var(--accent-purple, #a855f7)"
          : isRelated
            ? "var(--accent-blue, #3b82f6)"
            : isDiffFlow
              ? "var(--accent-emerald, #10b981)"
              : "var(--border-default)",
        width: 16,
        height: 16,
      },
    };
  });
}

// ── Stats Donut SVG ─────────────────────────────────────────────

function StatsDonut({
  mastered,
  inProgress,
  notStarted,
}: {
  mastered: number;
  inProgress: number;
  notStarted: number;
}) {
  const total = mastered + inProgress + notStarted;
  if (total === 0) return null;

  const size = 64;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const masteredPct = mastered / total;
  const inProgressPct = inProgress / total;

  const masteredLen = masteredPct * circumference;
  const inProgressLen = inProgressPct * circumference;
  const masteredOffset = 0;
  const inProgressOffset = -(masteredLen);

  const overallPct = Math.round(((mastered + inProgress * 0.5) / total) * 100);

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-default)"
          strokeWidth={stroke}
          opacity={0.2}
        />
        {/* Mastered arc (green) */}
        {mastered > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#22c55e"
            strokeWidth={stroke}
            strokeDasharray={`${masteredLen} ${circumference - masteredLen}`}
            strokeDashoffset={masteredOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
        {/* In-progress arc (blue) */}
        {inProgress > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={stroke}
            strokeDasharray={`${inProgressLen} ${circumference - inProgressLen}`}
            strokeDashoffset={inProgressOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      {/* Center label */}
      <span className="absolute text-sm font-bold text-text-primary tabular-nums">
        {overallPct}%
      </span>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────

interface KnowledgeGraphProps {
  initialData: ConceptGraphData;
  projectId?: string;
}

export function KnowledgeGraph({ initialData, projectId }: KnowledgeGraphProps) {
  const t = useTranslations("Learning");
  const [graphData, setGraphData] = useState(initialData);
  const [selectedNode, setSelectedNode] = useState<ConceptGraphNode | null>(null);

  const stats = useMemo(() => {
    const total = graphData.nodes.length;
    const mastered = graphData.nodes.filter(
      (n) => n.masteryLevel >= MASTERY.MASTERED_THRESHOLD,
    ).length;
    const inProgress = graphData.nodes.filter(
      (n) => n.masteryLevel > 0 && n.masteryLevel < MASTERY.MASTERED_THRESHOLD,
    ).length;
    const notStarted = total - mastered - inProgress;
    const foundInProject = graphData.nodes.filter(
      (n) => (n.relevanceScore ?? 0) > 0,
    ).length;
    return { total, mastered, inProgress, notStarted, foundInProject };
  }, [graphData.nodes]);

  const flowNodes = useMemo(
    () => buildFlowNodes(graphData.nodes, graphData.technologies),
    [graphData],
  );
  const flowEdges = useMemo(
    () => buildFlowEdges(graphData.edges),
    [graphData],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes, setNodes]);

  useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      // Skip clicks on group/label nodes
      if (node.id.startsWith("tech-group-") || node.id.startsWith("tech-label-")) return;
      const conceptNode = graphData.nodes.find((n) => n.conceptKey === node.id);
      setSelectedNode(conceptNode || null);
    },
    [graphData.nodes],
  );

  const handleMasteryUpdate = useCallback(
    (knowledgeId: string, newLevel: number, conceptKey?: string) => {
      setGraphData((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => {
          if (n.knowledgeId !== knowledgeId) return n;
          if (conceptKey && n.conceptKey !== conceptKey) return n;
          return { ...n, masteryLevel: newLevel };
        }),
      }));
      setSelectedNode((prev) => {
        if (!prev || prev.knowledgeId !== knowledgeId) return prev;
        if (conceptKey && prev.conceptKey !== conceptKey) return prev;
        return { ...prev, masteryLevel: newLevel };
      });
    },
    [],
  );

  return (
    <div className="relative h-[calc(100vh-220px)] min-h-[500px] w-full overflow-hidden rounded-2xl border border-border-default bg-bg-surface">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        nodesDraggable
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
        className="[&_.react-flow__background]:!bg-transparent [&_.react-flow__node-default]:!rounded-none [&_.react-flow__node-default]:!shadow-none [&_.react-flow__node-default_.react-flow__handle]:!hidden"
      >
        {/* ── Stats Panel ── */}
        <Panel position="top-left" className="!m-3">
          <div className="rounded-xl bg-bg-elevated/80 backdrop-blur-md px-4 py-3 shadow-lg border border-border-default/50">
            <div className="flex items-center gap-4">
              {/* Donut chart */}
              <StatsDonut
                mastered={stats.mastered}
                inProgress={stats.inProgress}
                notStarted={stats.notStarted}
              />

              {/* Stats breakdown */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
                  <span className="text-text-muted">{t("knowledgeMap.legend.mastered")}</span>
                  <span className="ml-auto font-bold text-text-primary tabular-nums">{stats.mastered}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.4)]" />
                  <span className="text-text-muted">{t("knowledgeMap.legend.inProgress")}</span>
                  <span className="ml-auto font-bold text-text-primary tabular-nums">{stats.inProgress}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                  <span className="text-text-muted">{t("knowledgeMap.legend.notStarted")}</span>
                  <span className="ml-auto font-bold text-text-primary tabular-nums">{stats.notStarted}</span>
                </div>
              </div>
            </div>

            {/* Edge legend + code match — compact */}
            <div className="mt-3 pt-2.5 border-t border-border-default/50 space-y-1.5">
              <div className="flex items-center gap-3 text-[10px] text-text-faint flex-wrap">
                <span className="flex items-center gap-1">
                  <ArrowRight className="h-3 w-3 text-text-faint/60" />
                  {t("knowledgeMap.legend.sameTechEdge")}
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-violet-400" />
                  {t("knowledgeMap.legend.crossTechEdge")}
                </span>
                <span className="flex items-center gap-1">
                  <RotateCcw className="h-3 w-3 text-blue-400" />
                  Related
                </span>
              </div>
              {stats.foundInProject > 0 && (
                <div className="flex items-center gap-1 text-[10px]">
                  <Code2 className="h-3 w-3 text-amber-400" />
                  <span className="text-amber-500 dark:text-amber-400 font-medium">
                    {t("knowledgeMap.legend.foundInProject", { count: stats.foundInProject })}
                  </span>
                </div>
              )}
            </div>

            <p className="mt-2 text-[10px] text-text-faint leading-relaxed">
              {t("knowledgeMap.guide")}
            </p>
          </div>
        </Panel>

        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={0.8}
          color="var(--border-default)"
        />
        <Controls
          showInteractive={false}
          className="!border-border-default !bg-bg-elevated/80 !backdrop-blur-sm !rounded-xl [&>button]:!border-border-default [&>button]:!bg-bg-surface [&>button]:!fill-text-muted [&>button:hover]:!bg-bg-surface-hover [&>button]:!rounded-lg"
        />
        <MiniMap
          nodeColor={(node: Node) => {
            if (node.id.startsWith("tech-group-") || node.id.startsWith("tech-label-")) {
              return "transparent";
            }
            const data = node.data as { masteryLevel?: number };
            const level = data?.masteryLevel ?? 0;
            if (level >= MASTERY.MASTERED_THRESHOLD) return "#22c55e";
            if (level > 0) return "#3b82f6";
            return "#71717a";
          }}
          className="!border-border-default !bg-bg-elevated/80 !backdrop-blur-sm !rounded-xl"
          maskColor="rgba(0,0,0,0.08)"
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Detail panel */}
      {selectedNode && (
        <ConceptDetailPanel
          node={selectedNode}
          projectId={projectId}
          onClose={() => setSelectedNode(null)}
          onMasteryUpdate={handleMasteryUpdate}
        />
      )}
    </div>
  );
}
