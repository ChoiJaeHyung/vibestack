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
import { Code2 } from "lucide-react";
import { ConceptNode, type ConceptNodeType } from "./concept-node";
import { ConceptDetailPanel } from "./concept-detail-panel";
import type {
  ConceptGraphData,
  ConceptGraphNode,
} from "@/server/actions/knowledge-graph";
import { MASTERY } from "@/server/actions/mastery-constants";

// ── Node type registry ──────────────────────────────────────────

const nodeTypes = { concept: ConceptNode };

// ── Layout ──────────────────────────────────────────────────────

const TECH_GAP_Y = 220; // vertical gap between technology groups
const NODE_GAP_X = 200; // horizontal gap between concepts
const NODE_GAP_Y = 90; // vertical gap within a tech group (for dep levels)
const PADDING = 60;

/**
 * Layout concepts grouped by technology, with dependency-based ordering.
 * Within each technology group, concepts are layered by prerequisite depth.
 */
function buildFlowNodes(
  graphNodes: ConceptGraphNode[],
  technologies: string[],
): ConceptNodeType[] {
  const flowNodes: ConceptNodeType[] = [];

  // Group nodes by technology
  const techGroups = new Map<string, ConceptGraphNode[]>();
  for (const node of graphNodes) {
    const group = techGroups.get(node.technologyName) || [];
    group.push(node);
    techGroups.set(node.technologyName, group);
  }

  // Order technologies by the provided list (preserves server ordering)
  const orderedTechs = technologies.filter((t) => techGroups.has(t));

  let techOffsetY = PADDING;

  for (const techName of orderedTechs) {
    const concepts = techGroups.get(techName) || [];
    if (concepts.length === 0) continue;

    // Layout concepts in a grid within each technology group
    // KB seed data is already topologically ordered, so array order works well
    const cols = Math.min(concepts.length, 4);
    const rows = Math.ceil(concepts.length / cols);

    for (let i = 0; i < concepts.length; i++) {
      const concept = concepts[i];
      const row = Math.floor(i / cols);
      const col = i % cols;

      const totalWidth = cols * NODE_GAP_X;
      const x = -totalWidth / 2 + col * NODE_GAP_X + NODE_GAP_X / 2;
      const y = techOffsetY + row * NODE_GAP_Y;

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
        },
      });
    }

    techOffsetY += rows * NODE_GAP_Y + TECH_GAP_Y;
  }

  return flowNodes;
}

function buildFlowEdges(
  graphEdges: ConceptGraphData["edges"],
): Edge[] {
  return graphEdges.map((e) => {
    const isRelated = e.edgeType === "related";
    const isCrossTech = e.edgeType === "cross_tech";
    const isDiffFlow = e.edgeType === "difficulty_flow";

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: "default",
      animated: isCrossTech,
      style: {
        stroke: isCrossTech
          ? "var(--accent-purple)"
          : isRelated
            ? "var(--accent-blue, #3b82f6)"
            : isDiffFlow
              ? "var(--accent-emerald, #10b981)"
              : "var(--border-default)",
        strokeWidth: isCrossTech ? 2 : isRelated ? 1.5 : 1,
        strokeDasharray: isRelated ? "6 3" : undefined,
        opacity: isRelated ? 0.6 : 1,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isCrossTech
          ? "var(--accent-purple)"
          : isRelated
            ? "var(--accent-blue, #3b82f6)"
            : isDiffFlow
              ? "var(--accent-emerald, #10b981)"
              : "var(--border-default)",
      },
    };
  });
}

// ── Component ───────────────────────────────────────────────────

interface KnowledgeGraphProps {
  initialData: ConceptGraphData;
  projectId?: string;
}

export function KnowledgeGraph({ initialData, projectId }: KnowledgeGraphProps) {
  const t = useTranslations("Learning");
  const [graphData, setGraphData] = useState(initialData);
  const [selectedNode, setSelectedNode] = useState<ConceptGraphNode | null>(
    null,
  );

  // Compute progress stats
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

  // Sync ReactFlow state when graphData changes (e.g., mastery update)
  useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes, setNodes]);

  useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      const conceptNode = graphData.nodes.find(
        (n) => n.conceptKey === node.id,
      );
      setSelectedNode(conceptNode || null);
    },
    [graphData.nodes],
  );

  const handleMasteryUpdate = useCallback(
    (knowledgeId: string, newLevel: number, conceptKey?: string) => {
      // Update the specific concept node, or all concepts of the technology if no conceptKey
      setGraphData((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => {
          if (n.knowledgeId !== knowledgeId) return n;
          if (conceptKey && n.conceptKey !== conceptKey) return n;
          return { ...n, masteryLevel: newLevel };
        }),
      }));

      // Update selected node if it matches
      setSelectedNode((prev) => {
        if (!prev || prev.knowledgeId !== knowledgeId) return prev;
        if (conceptKey && prev.conceptKey !== conceptKey) return prev;
        return { ...prev, masteryLevel: newLevel };
      });
    },
    [],
  );

  return (
    <div className="relative h-[600px] w-full overflow-hidden rounded-2xl border border-border-default bg-bg-surface">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
        className="[&_.react-flow__background]:!bg-transparent"
      >
        {/* Progress summary + guide */}
        <Panel position="top-left" className="!m-3">
          <div className="rounded-lg bg-bg-elevated/90 px-4 py-3 shadow-sm backdrop-blur-sm border border-border-default">
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-text-muted">{t("knowledgeMap.legend.mastered")}</span>
                <span className="font-semibold text-text-primary">{stats.mastered}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-text-muted">{t("knowledgeMap.legend.inProgress")}</span>
                <span className="font-semibold text-text-primary">{stats.inProgress}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-zinc-500" />
                <span className="text-text-muted">{t("knowledgeMap.legend.notStarted")}</span>
                <span className="font-semibold text-text-primary">{stats.notStarted}</span>
              </span>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="h-px w-4 bg-border-default" />
                <span className="text-text-muted">{t("knowledgeMap.legend.sameTechEdge")}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-px w-4 bg-violet-500 border-t border-dashed border-violet-500" />
                <span className="text-text-muted">{t("knowledgeMap.legend.crossTechEdge")}</span>
              </span>
              {stats.foundInProject > 0 && (
                <span className="flex items-center gap-1.5">
                  <Code2 className="h-3 w-3 text-amber-400" />
                  <span className="text-text-muted">
                    {t("knowledgeMap.legend.foundInProject", { count: stats.foundInProject })}
                  </span>
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-text-faint">
              {t("knowledgeMap.guide")}
            </p>
          </div>
        </Panel>

        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--border-default)"
        />
        <Controls
          showInteractive={false}
          className="!border-border-default !bg-bg-elevated [&>button]:!border-border-default [&>button]:!bg-bg-surface [&>button]:!fill-text-muted [&>button:hover]:!bg-bg-surface-hover"
        />
        <MiniMap
          nodeColor={(node: Node) => {
            const data = node.data as { masteryLevel?: number };
            const level = data?.masteryLevel ?? 0;
            if (level >= MASTERY.MASTERED_THRESHOLD) return "#22c55e";
            if (level > 0) return "#3b82f6";
            return "#71717a";
          }}
          className="!border-border-default !bg-bg-elevated"
          maskColor="rgba(0,0,0,0.1)"
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
