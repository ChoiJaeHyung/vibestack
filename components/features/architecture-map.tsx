"use client";

import { useCallback, useMemo, useState } from "react";
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
import { Map, Puzzle, Monitor } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  generateQuiz,
  submitChallenge,
  type ArchitectureData,
  type ArchNode,
  type QuizData,
  type ChallengeFeedback,
} from "@/server/actions/architecture";
import { TechNode, type TechNodeType } from "./tech-node";
import { MapSidebar } from "./map-sidebar";
import { ArchQuizPanel } from "./arch-quiz-panel";
import { ArchFeedbackDiff } from "./arch-feedback-diff";

// ── Types ───────────────────────────────────────────────────────

type Mode = "view" | "guided";

interface ArchitectureMapProps {
  projectId: string;
  initialData: ArchitectureData;
}

// ── Node type registry ──────────────────────────────────────────

const nodeTypes = { tech: TechNode };

// ── Layout helpers ──────────────────────────────────────────────

const LAYER_GAP = 180;
const NODE_GAP = 200;
const LAYER_PADDING = 60;

function buildFlowNodes(
  archNodes: ArchNode[],
  layers: ArchitectureData["layers"],
): TechNodeType[] {
  // Group nodes by layer
  const layerOrder = layers.map((l) => l.name);
  const nodesByLayer: Record<string, ArchNode[]> = {};

  for (const node of archNodes) {
    const layerName = node.layer;
    if (!nodesByLayer[layerName]) {
      nodesByLayer[layerName] = [];
    }
    nodesByLayer[layerName].push(node);
  }

  const flowNodes: TechNodeType[] = [];
  let layerIndex = 0;

  for (const layerName of layerOrder) {
    const nodesInLayer = nodesByLayer[layerName] || [];
    if (nodesInLayer.length === 0) continue;

    const y = layerIndex * LAYER_GAP + LAYER_PADDING;
    const totalWidth = nodesInLayer.length * NODE_GAP;
    const startX = -totalWidth / 2 + NODE_GAP / 2;

    for (let i = 0; i < nodesInLayer.length; i++) {
      const node = nodesInLayer[i];
      flowNodes.push({
        id: node.id,
        type: "tech",
        position: { x: startX + i * NODE_GAP, y },
        data: {
          label: node.label,
          category: node.category,
          importance: node.importance,
          version: node.version,
          description: node.description,
          layer: node.layer,
        },
      });
    }

    layerIndex++;
  }

  // Handle nodes not in any known layer
  const assignedIds = new Set(flowNodes.map((n) => n.id));
  const unassigned = archNodes.filter((n) => !assignedIds.has(n.id));
  if (unassigned.length > 0) {
    const y = layerIndex * LAYER_GAP + LAYER_PADDING;
    const startX = -(unassigned.length * NODE_GAP) / 2 + NODE_GAP / 2;
    for (let i = 0; i < unassigned.length; i++) {
      const node = unassigned[i];
      flowNodes.push({
        id: node.id,
        type: "tech",
        position: { x: startX + i * NODE_GAP, y },
        data: {
          label: node.label,
          category: node.category,
          importance: node.importance,
          version: node.version,
          description: node.description,
          layer: node.layer,
        },
      });
    }
  }

  return flowNodes;
}

function buildFlowEdges(
  archEdges: ArchitectureData["edges"],
): Edge[] {
  return archEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: e.edgeType === "depends_on" ? "default" : "straight",
    animated: e.edgeType === "depends_on",
    label: e.label,
    style: {
      stroke: e.edgeType === "depends_on" ? "var(--accent-purple)" : "var(--border-default)",
      strokeWidth: e.edgeType === "depends_on" ? 2 : 1,
    },
    markerEnd:
      e.edgeType === "depends_on"
        ? { type: MarkerType.ArrowClosed, color: "var(--accent-purple)" }
        : undefined,
    labelStyle: { fill: "var(--text-muted)", fontSize: 10 },
  }));
}

// ── Component ───────────────────────────────────────────────────

export function ArchitectureMap({
  projectId,
  initialData,
}: ArchitectureMapProps) {
  const t = useTranslations("Projects");

  // Mode state
  const [mode, setMode] = useState<Mode>("view");
  const [selectedNode, setSelectedNode] = useState<ArchNode | null>(null);

  // Quiz state
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<{
    score: number;
    feedback: ChallengeFeedback;
  } | null>(null);

  // Build initial React Flow data
  const initialFlowNodes = useMemo(
    () => buildFlowNodes(initialData.nodes, initialData.layers),
    [initialData],
  );
  const initialFlowEdges = useMemo(
    () => buildFlowEdges(initialData.edges),
    [initialData],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialFlowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlowEdges);

  // Node click handler
  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      if (mode !== "view") return;
      const archNode = initialData.nodes.find((n) => n.id === node.id);
      setSelectedNode(archNode || null);
    },
    [mode, initialData.nodes],
  );

  // Start quiz
  const handleStartQuiz = useCallback(async () => {
    setQuizLoading(true);
    setFeedbackResult(null);
    try {
      const result = await generateQuiz(projectId, "tech_stack");
      if (result.success && result.data) {
        setQuizData(result.data);
        setMode("guided");
        setSelectedNode(null);

        // Update flow with partial nodes (blanked nodes)
        const partialFlowNodes = buildFlowNodes(
          result.data.partialNodes,
          result.data.layers,
        );

        // Add blank placeholder nodes for removed ones
        const partialIds = new Set(result.data.partialNodes.map((n) => n.id));
        const blankNodes: TechNodeType[] = initialData.nodes
          .filter((n) => !partialIds.has(n.id))
          .map((n) => {
            const existing = initialFlowNodes.find((fn) => fn.id === n.id);
            return {
              id: n.id,
              type: "tech" as const,
              position: existing?.position || { x: 0, y: 0 },
              data: {
                label: "?",
                category: n.category,
                importance: n.importance,
                version: null,
                description: null,
                layer: n.layer,
                isBlank: true,
              },
            };
          });

        setNodes([...partialFlowNodes, ...blankNodes]);
        setEdges(
          buildFlowEdges(
            result.data.partialEdges.map((e) => ({
              ...e,
              edgeType: e.edgeType as "depends_on" | "used_with",
            })),
          ),
        );
      }
    } finally {
      setQuizLoading(false);
    }
  }, [projectId, initialData, initialFlowNodes, setNodes, setEdges]);

  // Submit quiz
  const handleSubmitQuiz = useCallback(
    async (answers: Record<string, string>) => {
      if (!quizData) return;
      setSubmitting(true);
      try {
        const result = await submitChallenge(
          projectId,
          "tech_stack",
          "guided",
          answers,
          quizData.questions,
        );
        if (result.success && result.data) {
          setFeedbackResult({
            score: result.data.score,
            feedback: result.data.feedback,
          });
          setMode("view");
          setQuizData(null);
          // Restore full graph
          setNodes(initialFlowNodes);
          setEdges(initialFlowEdges);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [quizData, projectId, initialFlowNodes, initialFlowEdges, setNodes, setEdges],
  );

  // Reset to view mode
  const handleReturnToView = useCallback(() => {
    setMode("view");
    setQuizData(null);
    setFeedbackResult(null);
    setNodes(initialFlowNodes);
    setEdges(initialFlowEdges);
  }, [initialFlowNodes, initialFlowEdges, setNodes, setEdges]);

  // Mobile check
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

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
        nodesDraggable={mode === "view"}
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
            const data = node.data as { category?: string };
            const category = data?.category || "other";
            const colorMap: Record<string, string> = {
              framework: "#8b5cf6",
              language: "#3b82f6",
              database: "#22c55e",
              auth: "#f59e0b",
              deploy: "#06b6d4",
              styling: "#ec4899",
              testing: "#f97316",
              build_tool: "#eab308",
              library: "#6366f1",
              other: "#71717a",
            };
            return colorMap[category] || "#71717a";
          }}
          className="!border-border-default !bg-bg-elevated"
          maskColor="rgba(0,0,0,0.1)"
        />

        {/* Layer labels */}
        {initialData.layers.map((layer, idx) => (
          <Panel
            key={layer.name}
            position="top-left"
            className="pointer-events-none !m-0"
            style={{
              transform: `translateY(${idx * LAYER_GAP + LAYER_PADDING - 30}px)`,
            }}
          >
            <span className="rounded-lg bg-bg-elevated/80 px-2 py-1 text-xs font-medium text-text-faint backdrop-blur-sm">
              {layer.name}
            </span>
          </Panel>
        ))}

        {/* Mode controls */}
        <Panel position="top-right" className="flex gap-2">
          <Button
            variant={mode === "view" ? "primary" : "secondary"}
            size="sm"
            className="gap-1.5"
            onClick={handleReturnToView}
          >
            <Map className="h-3.5 w-3.5" />
            {t("architecture.mode.view")}
          </Button>
          {!isMobile && (
            <Button
              variant={mode === "guided" ? "primary" : "secondary"}
              size="sm"
              className="gap-1.5"
              onClick={handleStartQuiz}
              disabled={quizLoading}
            >
              <Puzzle className="h-3.5 w-3.5" />
              {quizLoading
                ? t("architecture.mode.loading")
                : t("architecture.mode.guided")}
            </Button>
          )}
        </Panel>

        {/* Mobile notice */}
        {isMobile && (
          <Panel position="bottom-center">
            <div className="flex items-center gap-1.5 rounded-lg bg-bg-elevated/90 px-3 py-1.5 text-xs text-text-muted backdrop-blur-sm">
              <Monitor className="h-3.5 w-3.5" />
              {t("architecture.mobileNotice")}
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Sidebar */}
      {selectedNode && mode === "view" && (
        <MapSidebar
          node={selectedNode}
          projectId={projectId}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* Quiz panel */}
      {mode === "guided" && quizData && !feedbackResult && (
        <div className="absolute bottom-4 left-4 z-10 w-80">
          <ArchQuizPanel
            questions={quizData.questions}
            onSubmit={handleSubmitQuiz}
            isSubmitting={submitting}
          />
        </div>
      )}

      {/* Feedback */}
      {feedbackResult && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg-overlay/50 backdrop-blur-sm">
          <div className="w-96">
            <ArchFeedbackDiff
              score={feedbackResult.score}
              feedback={feedbackResult.feedback}
              onRetry={handleStartQuiz}
              onClose={() => setFeedbackResult(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
