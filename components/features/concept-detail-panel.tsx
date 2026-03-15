"use client";

import { useState, useEffect } from "react";
import { X, BookOpen, CheckCircle2, Lightbulb, GraduationCap, Code2, FileCode } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { updateMastery, getModulesForConcept } from "@/server/actions/knowledge-graph";
import type { ConceptGraphNode } from "@/server/actions/knowledge-graph";
import { MASTERY } from "@/server/actions/mastery-constants";

interface RelatedModule {
  id: string;
  pathId: string;
  title: string;
  status: string;
}

// ── Mastery Donut ───────────────────────────────────────────────

function MasteryDonut({ level }: { level: number }) {
  const size = 80;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (level / 100) * circumference;

  const color =
    level >= MASTERY.MASTERED_THRESHOLD ? "#22c55e" : level > 0 ? "#3b82f6" : "#a1a1aa";
  const bgColor =
    level >= MASTERY.MASTERED_THRESHOLD
      ? "rgba(34,197,94,0.1)"
      : level > 0
        ? "rgba(59,130,246,0.1)"
        : "rgba(161,161,170,0.05)";

  const statusText =
    level >= MASTERY.MASTERED_THRESHOLD ? "Mastered" : level > 0 ? "Learning" : "New";

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill={bgColor}
            stroke="var(--border-default)"
            strokeWidth={stroke}
            opacity={0.2}
          />
          {level > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="transition-all duration-700 ease-out"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-text-primary tabular-nums">
            {level}%
          </span>
        </div>
      </div>
      <span
        className="mt-1 text-[10px] font-medium"
        style={{ color }}
      >
        {statusText}
      </span>
    </div>
  );
}

// ── Panel ───────────────────────────────────────────────────────

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
    <div className="absolute right-0 top-0 z-10 h-full w-80 border-l border-border-default/50 bg-bg-elevated/90 backdrop-blur-xl shadow-2xl overflow-y-auto animate-in slide-in-from-right-5 duration-200">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-elevated/80 backdrop-blur-sm border-b border-border-default/30 px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-text-primary leading-snug">
              {node.conceptName}
            </h3>
            <span className="text-[11px] text-text-faint mt-0.5 block">
              {node.technologyName}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-faint hover:bg-bg-surface-hover hover:text-text-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* Mastery donut — centered */}
        <div className="flex justify-center">
          <MasteryDonut level={node.masteryLevel} />
        </div>

        {/* Key points */}
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-text-muted mb-2">
            <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
            {t("knowledgeMap.keyPoints")}
          </h4>
          <ul className="space-y-2">
            {node.keyPoints.map((point, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-xs text-text-secondary leading-relaxed"
              >
                <span className="shrink-0 mt-1 h-1 w-1 rounded-full bg-text-faint/50" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Tags */}
        {node.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {node.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-bg-surface-hover/80 px-2.5 py-0.5 text-[10px] text-text-faint border border-border-default/30"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Matched files from project */}
        {node.matchedFiles && node.matchedFiles.length > 0 && (
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 p-3">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">
              <Code2 className="h-3.5 w-3.5" />
              {t("knowledgeMap.matchedFiles")}
              <span className="ml-auto text-[10px] tabular-nums opacity-80">
                {Math.round((node.relevanceScore ?? 0) * 100)}%
              </span>
            </h4>
            <ul className="space-y-1.5">
              {node.matchedFiles.slice(0, 5).map((filePath) => {
                const fileName = filePath.split("/").pop() ?? filePath;
                return (
                  <li
                    key={filePath}
                    className="flex items-center gap-1.5 text-[11px] text-text-secondary"
                    title={filePath}
                  >
                    <FileCode className="h-3 w-3 shrink-0 text-amber-500/60" />
                    <span className="truncate">{fileName}</span>
                  </li>
                );
              })}
              {node.matchedFiles.length > 5 && (
                <li className="text-[10px] text-text-faint pl-[18px]">
                  +{node.matchedFiles.length - 5} {t("knowledgeMap.moreFiles")}
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2.5 pt-1">
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
            <div className="space-y-2">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                <GraduationCap className="h-3.5 w-3.5" />
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
      </div>
    </div>
  );
}
