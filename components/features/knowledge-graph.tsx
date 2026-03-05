"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
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
  return graphEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "default",
    animated: e.edgeType === "cross_tech",
    style: {
      stroke:
        e.edgeType === "cross_tech"
          ? "var(--accent-purple)"
          : "var(--border-default)",
      strokeWidth: e.edgeType === "cross_tech" ? 2 : 1,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color:
        e.edgeType === "cross_tech"
          ? "var(--accent-purple)"
          : "var(--border-default)",
    },
  }));
}

// ── Component ───────────────────────────────────────────────────

interface KnowledgeGraphProps {
  initialData: ConceptGraphData;
}

export function KnowledgeGraph({ initialData }: KnowledgeGraphProps) {
  const t = useTranslations("Learning");
  const [graphData, setGraphData] = useState(initialData);
  const [selectedNode, setSelectedNode] = useState<ConceptGraphNode | null>(
    null,
  );

  const flowNodes = useMemo(
    () => buildFlowNodes(graphData.nodes, graphData.technologies),
    [graphData],
  );
  const flowEdges = useMemo(
    () => buildFlowEdges(graphData.edges),
    [graphData],
  );

  const [nodes, , onNodesChange] = useNodesState(flowNodes);
  const [edges, , onEdgesChange] = useEdgesState(flowEdges);

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

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 flex gap-3 rounded-lg bg-bg-elevated/90 px-3 py-2 text-[10px] text-text-faint backdrop-blur-sm">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          {t("knowledgeMap.legend.mastered")}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          {t("knowledgeMap.legend.inProgress")}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-zinc-500" />
          {t("knowledgeMap.legend.notStarted")}
        </span>
      </div>

      {/* Detail panel */}
      {selectedNode && (
        <ConceptDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onMasteryUpdate={handleMasteryUpdate}
        />
      )}
    </div>
  );
}
