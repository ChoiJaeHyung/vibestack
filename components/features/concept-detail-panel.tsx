"use client";

import { useState, useEffect } from "react";
import { X, BookOpen, CheckCircle2, Lightbulb, GraduationCap } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateMastery, getModulesForConcept } from "@/server/actions/knowledge-graph";
import type { ConceptGraphNode } from "@/server/actions/knowledge-graph";
import { MASTERY } from "@/server/actions/mastery-constants";

interface RelatedModule {
  id: string;
  pathId: string;
  title: string;
  status: string;
}

interface ConceptDetailPanelProps {
  node: ConceptGraphNode;
  projectId?: string;
  onClose: () => void;
  onMasteryUpdate: (knowledgeId: string, level: number, conceptKey?: string) => void;
}

export function ConceptDetailPanel({
  node,
  projectId,
  onClose,
  onMasteryUpdate,
}: ConceptDetailPanelProps) {
  const t = useTranslations("Learning");
  const [toggling, setToggling] = useState(false);
  const [relatedModules, setRelatedModules] = useState<RelatedModule[]>([]);

  useEffect(() => {
    if (projectId && node.conceptKey) {
      getModulesForConcept(node.conceptKey, projectId).then((result) => {
        setRelatedModules(result.modules);
      });
    } else {
      setRelatedModules([]);
    }
  }, [projectId, node.conceptKey]);

  const isMastered = node.masteryLevel >= MASTERY.MASTERED_THRESHOLD;

  const handleToggleMastery = async () => {
    setToggling(true);
    try {
      const newLevel = isMastered ? 0 : MASTERY.MAX_LEVEL;
      const result = await updateMastery(node.knowledgeId, newLevel, node.conceptKey);
      if (result.success) {
        onMasteryUpdate(node.knowledgeId, newLevel, node.conceptKey);
      }
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="absolute right-0 top-0 z-10 h-full w-72 border-l border-border-default bg-bg-elevated shadow-lg overflow-y-auto">
      <Card className="border-0 rounded-none bg-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{node.conceptName}</CardTitle>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-text-faint hover:bg-bg-surface-hover hover:text-text-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <span className="text-[10px] text-text-faint">
            {node.technologyName}
          </span>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Mastery bar */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">
                {t("knowledgeMap.mastery")}
              </span>
              <span
                className={
                  node.masteryLevel >= MASTERY.MASTERED_THRESHOLD
                    ? "text-green-400"
                    : node.masteryLevel > 0
                      ? "text-blue-400"
                      : "text-text-faint"
                }
              >
                {node.masteryLevel}%
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-bg-surface-hover overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  node.masteryLevel >= MASTERY.MASTERED_THRESHOLD ? "bg-green-500" : "bg-blue-500"
                }`}
                style={{ width: `${node.masteryLevel}%` }}
              />
            </div>
          </div>

          {/* Key points */}
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
              <Lightbulb className="h-3 w-3" />
              {t("knowledgeMap.keyPoints")}
            </h4>
            <ul className="mt-2 space-y-1.5">
              {node.keyPoints.map((point, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-xs text-text-secondary leading-relaxed"
                >
                  <span className="shrink-0 text-text-faint">·</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Tags */}
          {node.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {node.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-bg-surface-hover px-2 py-0.5 text-[10px] text-text-faint"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <Button
              variant={isMastered ? "secondary" : "primary"}
              size="sm"
              className="w-full gap-1.5"
              onClick={handleToggleMastery}
              disabled={toggling}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isMastered
                ? t("knowledgeMap.markUnlearned")
                : t("knowledgeMap.markKnown")}
            </Button>

            {relatedModules.length > 0 ? (
              <div className="space-y-1.5">
                <h4 className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
                  <GraduationCap className="h-3 w-3" />
                  {t("knowledgeMap.learnConcept")}
                </h4>
                {relatedModules.map((mod) => (
                  <Link
                    key={mod.id}
                    href={`/learning/${mod.pathId}/${mod.id}`}
                    className="block"
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full justify-start gap-1.5 text-left"
                    >
                      {mod.status === "completed" ? (
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-green-400" />
                      ) : (
                        <BookOpen className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate text-xs">{mod.title}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            ) : (
              <Link href="/learning" className="block">
                <Button variant="secondary" size="sm" className="w-full gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  {t("knowledgeMap.goToLearning")}
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
