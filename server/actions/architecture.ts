"use server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import type { EducationalAnalysis } from "@/types/educational-analysis";
import { awardPoints } from "@/server/actions/points";
import { POINT_AWARDS } from "@/server/actions/point-constants";

// ── Exported Types ──────────────────────────────────────────────────

export type DiagramType = "tech_stack" | "file_dependency" | "data_flow";

export interface ArchNode {
  id: string;
  label: string;
  category: string;
  layer: string;
  importance: string;
  version: string | null;
  description: string | null;
}

export interface ArchEdge {
  id: string;
  source: string;
  target: string;
  edgeType: "depends_on" | "used_with";
  label?: string;
}

export interface LayerGroup {
  name: string;
  description: string;
  nodeIds: string[];
}

export interface ArchitectureData {
  nodes: ArchNode[];
  edges: ArchEdge[];
  layers: LayerGroup[];
  hasEducationalAnalysis: boolean;
}

export interface QuizQuestion {
  questionId: string;
  type: "missing_node" | "missing_edge";
  prompt: string;
  options: string[];
  correctAnswer: string;
  context: {
    nodeId?: string;
    layer?: string;
    source?: string;
    target?: string;
  };
}

export interface QuizData {
  diagramType: DiagramType;
  partialNodes: ArchNode[];
  partialEdges: ArchEdge[];
  layers: LayerGroup[];
  questions: QuizQuestion[];
  totalQuestions: number;
}

export interface ChallengeFeedback {
  correct: string[];
  incorrect: {
    questionId: string;
    userAnswer: string;
    correctAnswer: string;
    explanation: string;
  }[];
  totalCorrect: number;
  totalQuestions: number;
}

export interface ChallengeRecord {
  id: string;
  challenge_type: string;
  diagram_type: string;
  score: number | null;
  completed_at: string | null;
  created_at: string;
}

// ── Constants ───────────────────────────────────────────────────────

const CATEGORY_TO_LAYER: Record<string, { name: string; description: string }> = {
  framework: { name: "Application", description: "Core application frameworks" },
  language: { name: "Foundation", description: "Programming languages" },
  database: { name: "Data", description: "Data storage and management" },
  auth: { name: "Security", description: "Authentication and authorization" },
  deploy: { name: "Infrastructure", description: "Deployment and hosting" },
  styling: { name: "Presentation", description: "UI styling and design" },
  testing: { name: "Quality", description: "Testing and quality assurance" },
  build_tool: { name: "Build", description: "Build tools and bundlers" },
  library: { name: "Application", description: "Core application frameworks" },
  other: { name: "Other", description: "Other technologies" },
};

// ── Helpers ─────────────────────────────────────────────────────────

function makeNodeId(techName: string): string {
  return techName.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ── getArchitectureData ─────────────────────────────────────────────

export async function getArchitectureData(
  projectId: string,
): Promise<{ success: boolean; data?: ArchitectureData; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return { success: false, error: "Project not found" };
    }

    // Fetch tech_stacks and educational_analyses in parallel
    const [techResult, eduResult] = await Promise.all([
      supabase
        .from("tech_stacks")
        .select(
          "id, technology_name, category, subcategory, version, confidence_score, importance, description, relationships, detected_from",
        )
        .eq("project_id", projectId)
        .order("confidence_score", { ascending: false }),
      supabase
        .from("educational_analyses")
        .select("analysis_data")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (techResult.error) {
      return { success: false, error: "Failed to load tech stacks" };
    }

    const techStacks = techResult.data || [];
    if (techStacks.length === 0) {
      return { success: false, error: "No tech stacks found for this project" };
    }

    const eduAnalysis = eduResult.data
      ?.analysis_data as unknown as EducationalAnalysis | null;
    const hasEducationalAnalysis = !!eduAnalysis;

    // Build nodes from tech_stacks
    const nodeMap = new Map<string, ArchNode>();
    const nameToId = new Map<string, string>();

    for (const tech of techStacks) {
      const nodeId = makeNodeId(tech.technology_name);
      const layerInfo =
        CATEGORY_TO_LAYER[tech.category] || CATEGORY_TO_LAYER.other;

      nodeMap.set(nodeId, {
        id: nodeId,
        label: tech.technology_name,
        category: tech.category,
        layer: layerInfo.name,
        importance: tech.importance,
        version: tech.version,
        description: tech.description,
      });
      nameToId.set(tech.technology_name.toLowerCase(), nodeId);
    }

    // If educational_analyses has layers, use those for grouping
    if (
      eduAnalysis?.architecture?.layers &&
      eduAnalysis.architecture.layers.length > 0
    ) {
      for (const layer of eduAnalysis.architecture.layers) {
        // Map files in this layer back to tech nodes via detected_from
        for (const tech of techStacks) {
          const detectedFrom = tech.detected_from || [];
          const overlaps = detectedFrom.some((f) =>
            layer.files.some(
              (lf) => f.includes(lf) || lf.includes(f),
            ),
          );
          if (overlaps) {
            const nodeId = makeNodeId(tech.technology_name);
            const node = nodeMap.get(nodeId);
            if (node) {
              node.layer = layer.name;
            }
          }
        }
      }
    }

    // Build edges from relationships
    const edges: ArchEdge[] = [];
    const edgeSet = new Set<string>();

    for (const tech of techStacks) {
      const sourceId = makeNodeId(tech.technology_name);
      const rels = tech.relationships as {
        depends_on?: string[];
        used_with?: string[];
      } | null;

      if (!rels) continue;

      if (rels.depends_on) {
        for (const dep of rels.depends_on) {
          const targetId = nameToId.get(dep.toLowerCase());
          if (targetId && targetId !== sourceId) {
            const edgeKey = `${sourceId}-depends_on-${targetId}`;
            if (!edgeSet.has(edgeKey)) {
              edgeSet.add(edgeKey);
              edges.push({
                id: edgeKey,
                source: sourceId,
                target: targetId,
                edgeType: "depends_on",
                label: "depends on",
              });
            }
          }
        }
      }

      if (rels.used_with) {
        for (const companion of rels.used_with) {
          const targetId = nameToId.get(companion.toLowerCase());
          if (targetId && targetId !== sourceId) {
            const edgeKey1 = `${sourceId}-used_with-${targetId}`;
            const edgeKey2 = `${targetId}-used_with-${sourceId}`;
            if (!edgeSet.has(edgeKey1) && !edgeSet.has(edgeKey2)) {
              edgeSet.add(edgeKey1);
              edges.push({
                id: edgeKey1,
                source: sourceId,
                target: targetId,
                edgeType: "used_with",
                label: "used with",
              });
            }
          }
        }
      }
    }

    // Build layer groups
    const layerMap = new Map<string, LayerGroup>();

    for (const [, node] of nodeMap) {
      const layerName = node.layer;
      if (!layerMap.has(layerName)) {
        const layerInfo = Object.values(CATEGORY_TO_LAYER).find(
          (l) => l.name === layerName,
        );
        layerMap.set(layerName, {
          name: layerName,
          description: layerInfo?.description || layerName,
          nodeIds: [],
        });
      }
      layerMap.get(layerName)!.nodeIds.push(node.id);
    }

    // If we have educational analysis layers that are unused, add them
    if (eduAnalysis?.architecture?.layers) {
      for (const layer of eduAnalysis.architecture.layers) {
        if (!layerMap.has(layer.name)) {
          const nodesInLayer = Array.from(nodeMap.values())
            .filter((n) => n.layer === layer.name)
            .map((n) => n.id);
          if (nodesInLayer.length > 0) {
            layerMap.set(layer.name, {
              name: layer.name,
              description: layer.description,
              nodeIds: nodesInLayer,
            });
          }
        }
      }
    }

    const layers = Array.from(layerMap.values()).filter(
      (l) => l.nodeIds.length > 0,
    );

    return {
      success: true,
      data: {
        nodes: Array.from(nodeMap.values()),
        edges,
        layers,
        hasEducationalAnalysis,
      },
    };
  } catch (error) {
    console.error("[getArchitectureData]", error);
    return { success: false, error: "Failed to load architecture data" };
  }
}

// ── generateQuiz ────────────────────────────────────────────────────

export async function generateQuiz(
  projectId: string,
  diagramType: DiagramType = "tech_stack",
): Promise<{ success: boolean; data?: QuizData; error?: string }> {
  try {
    const archResult = await getArchitectureData(projectId);
    if (!archResult.success || !archResult.data) {
      return {
        success: false,
        error: archResult.error || "Failed to load architecture",
      };
    }

    const { nodes, edges, layers, hasEducationalAnalysis } = archResult.data;

    if (
      (diagramType === "file_dependency" || diagramType === "data_flow") &&
      !hasEducationalAnalysis
    ) {
      return {
        success: false,
        error: "Educational analysis required for this diagram type",
      };
    }

    if (nodes.length < 3) {
      return {
        success: false,
        error: "Not enough technologies for a quiz (minimum 3)",
      };
    }

    // Determine how many nodes to remove (30%, min 2, max 5)
    const questionCount = Math.min(
      Math.max(2, Math.floor(nodes.length * 0.3)),
      5,
    );

    // Prefer removing non-core nodes
    const removable = nodes.filter((n) => n.importance !== "core");
    const candidates = removable.length >= questionCount ? removable : nodes;
    const nodesToRemove = shuffleArray(candidates).slice(0, questionCount);
    const removedIds = new Set(nodesToRemove.map((n) => n.id));

    const partialNodes = nodes.filter((n) => !removedIds.has(n.id));
    const partialEdges = edges.filter(
      (e) => !removedIds.has(e.source) && !removedIds.has(e.target),
    );

    // Generate node questions
    const questions: QuizQuestion[] = nodesToRemove.map((node, idx) => {
      const distractors = shuffleArray(
        nodes
          .filter((n) => n.id !== node.id && !removedIds.has(n.id))
          .map((n) => n.label),
      ).slice(0, 3);

      const options = shuffleArray([node.label, ...distractors]);

      const connectedEdges = edges.filter(
        (e) => e.source === node.id || e.target === node.id,
      );

      let prompt: string;
      if (connectedEdges.length > 0) {
        const connections = connectedEdges
          .map((e) => {
            const otherId = e.source === node.id ? e.target : e.source;
            return nodes.find((n) => n.id === otherId)?.label;
          })
          .filter(Boolean);
        prompt = `Which technology in the "${node.layer}" layer connects to ${connections.slice(0, 2).join(", ")}?`;
      } else {
        prompt = `Which ${node.category} technology belongs in the "${node.layer}" layer?`;
      }

      return {
        questionId: `q_node_${idx}`,
        type: "missing_node" as const,
        prompt,
        options,
        correctAnswer: node.label,
        context: {
          nodeId: node.id,
          layer: node.layer,
        },
      };
    });

    // Add 1-2 edge questions if enough edges remain
    const remainingEdges = [...partialEdges];
    if (remainingEdges.length >= 3) {
      const edgesToQuiz = shuffleArray(remainingEdges).slice(0, 2);
      for (const [idx, edge] of edgesToQuiz.entries()) {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (!sourceNode || !targetNode) continue;

        // Remove this edge from partial diagram
        const edgeIdx = partialEdges.findIndex((e) => e.id === edge.id);
        if (edgeIdx !== -1) partialEdges.splice(edgeIdx, 1);

        const distractors = shuffleArray(
          partialNodes
            .filter(
              (n) => n.id !== edge.target && n.id !== edge.source,
            )
            .map((n) => n.label),
        ).slice(0, 3);

        questions.push({
          questionId: `q_edge_${idx}`,
          type: "missing_edge",
          prompt: `What does "${sourceNode.label}" ${edge.edgeType === "depends_on" ? "depend on" : "work with"}?`,
          options: shuffleArray([targetNode.label, ...distractors]),
          correctAnswer: targetNode.label,
          context: {
            source: edge.source,
            target: edge.target,
          },
        });
      }
    }

    return {
      success: true,
      data: {
        diagramType,
        partialNodes,
        partialEdges,
        layers: layers.map((l) => ({
          ...l,
          nodeIds: l.nodeIds.filter((id) => !removedIds.has(id)),
        })),
        questions,
        totalQuestions: questions.length,
      },
    };
  } catch (error) {
    console.error("[generateQuiz]", error);
    return { success: false, error: "Failed to generate quiz" };
  }
}

// ── submitChallenge ─────────────────────────────────────────────────

export async function submitChallenge(
  projectId: string,
  diagramType: DiagramType,
  challengeType: "guided" | "freeform",
  userAnswers: Record<string, string>,
  quizQuestions: QuizQuestion[],
): Promise<{
  success: boolean;
  data?: { id: string; score: number; feedback: ChallengeFeedback };
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Score the answers
    const correct: string[] = [];
    const incorrect: ChallengeFeedback["incorrect"] = [];

    for (const question of quizQuestions) {
      const userAnswer = userAnswers[question.questionId];
      if (userAnswer === question.correctAnswer) {
        correct.push(question.questionId);
      } else {
        incorrect.push({
          questionId: question.questionId,
          userAnswer: userAnswer || "(no answer)",
          correctAnswer: question.correctAnswer,
          explanation:
            question.type === "missing_node"
              ? `${question.correctAnswer} belongs in the "${question.context.layer}" layer.`
              : `${question.correctAnswer} is connected as a ${question.context.source ? "dependency" : "companion"}.`,
        });
      }
    }

    const totalQuestions = quizQuestions.length;
    const score =
      totalQuestions > 0
        ? Math.round((correct.length / totalQuestions) * 100)
        : 0;

    const feedback: ChallengeFeedback = {
      correct,
      incorrect,
      totalCorrect: correct.length,
      totalQuestions,
    };

    const correctAnswerJson = Object.fromEntries(
      quizQuestions.map((q) => [q.questionId, q.correctAnswer]),
    );

    // Save to DB
    const { data: challenge, error: insertError } = await supabase
      .from("architecture_challenges")
      .insert({
        user_id: user.id,
        project_id: projectId,
        challenge_type: challengeType,
        diagram_type: diagramType,
        user_answer: userAnswers as unknown as Json,
        correct_answer: correctAnswerJson as unknown as Json,
        score,
        feedback: feedback as unknown as Json,
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[submitChallenge] insert error:", insertError);
      return { success: false, error: "Failed to save challenge" };
    }

    // Award points for architecture challenge completion
    try {
      await awardPoints(user.id, POINT_AWARDS.ARCH_CHALLENGE, "arch_challenge", challenge.id, "architecture_challenge");
    } catch {
      // Point award failure should not block challenge submission
    }

    return {
      success: true,
      data: { id: challenge.id, score, feedback },
    };
  } catch (error) {
    console.error("[submitChallenge]", error);
    return { success: false, error: "Failed to submit challenge" };
  }
}

// ── getChallengeHistory ─────────────────────────────────────────────

export async function getChallengeHistory(
  projectId: string,
): Promise<{
  success: boolean;
  data?: ChallengeRecord[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("architecture_challenges")
      .select(
        "id, challenge_type, diagram_type, score, completed_at, created_at",
      )
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return { success: false, error: "Failed to load challenge history" };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("[getChallengeHistory]", error);
    return { success: false, error: "Failed to load challenge history" };
  }
}
