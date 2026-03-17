"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Clock,
  BookOpen,
  Code,
  HelpCircle,
  FolderOpen,
  Target,
  RefreshCw,
  RotateCcw,
  Brain,
  Sparkles,
  AlertTriangle,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CelebrationModal } from "@/components/features/celebration-modal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { updateLearningProgress, generateModuleContent, prefetchNextModuleContent } from "@/server/actions/learning";
import { regenerateModuleContent } from "@/server/actions/curriculum";
import type { RegenerationReason } from "@/server/actions/curriculum";
import { getWeakConceptRecommendations, getConceptMatchesForModule, type WeakConceptRecommendation, type ModuleConceptMatch } from "@/server/actions/knowledge-graph";
import { useTutorPanel } from "@/components/features/tutor-panel-context";
import { translateError } from "@/lib/utils/translate-error";
import { analytics } from "@/lib/utils/analytics";
// ─── Types ──────────────────────────────────────────────────────────

interface ContentSection {
  type: string;
  title: string;
  body: string;
  code?: string;
  quiz_options?: string[];
  quiz_answer?: number;
  challenge_starter_code?: string;
  challenge_answer_code?: string;
  quiz_explanation?: string;
}

interface ModuleProgress {
  status: string;
  score: number | null;
  time_spent: number | null;
  attempts: number;
  completed_at: string | null;
}

interface ModuleContentProps {
  moduleId: string;
  title: string;
  description: string | null;
  moduleType: string | null;
  estimatedMinutes: number | null;
  sections: ContentSection[];
  progress: ModuleProgress | undefined;
  learningPathId: string;
  projectId: string;
  projectName?: string;
  prevModuleId: string | null;
  nextModuleId: string | null;
  conceptKeys?: string[];
  needsGeneration?: boolean;
  planType?: "free" | "pro" | "team";
  regenerationCount?: number;
  maxRegenerationCount?: number;
}

// ─── Regeneration Reasons ───────────────────────────────────────────

const REGENERATION_REASONS: RegenerationReason[] = [
  "too_difficult",
  "too_easy",
  "need_more_code",
  "not_relevant",
];

// ─── Module Type Config ─────────────────────────────────────────────

const MODULE_TYPE_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }
> = {
  concept: { icon: BookOpen, label: "Concept" },
  practical: { icon: Code, label: "Practical" },
  quiz: { icon: HelpCircle, label: "Quiz" },
  project_walkthrough: { icon: FolderOpen, label: "Walkthrough" },
};

// ─── Section Config (Notion-style) ──────────────────────────────────

const SECTION_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    callout?: boolean;
  }
> = {
  explanation: { icon: BookOpen },
  code_example: { icon: Code },
  quiz_question: { icon: HelpCircle, callout: true },
  challenge: { icon: Target, callout: true },
  reflection: { icon: BookOpen, callout: true },
};

const DEFAULT_SECTION_CONFIG = SECTION_CONFIG.explanation;

// ─── Quiz Section Component ─────────────────────────────────────────

function QuizSection({
  section,
  sectionIndex,
  onResult,
}: {
  section: ContentSection;
  sectionIndex: number;
  onResult: (sectionIndex: number, correct: boolean) => void;
}) {
  const t = useTranslations('Learning');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const options = section.quiz_options ?? [];
  const correctAnswer =
    typeof section.quiz_answer === "number" &&
    section.quiz_answer >= 0 &&
    section.quiz_answer < options.length
      ? section.quiz_answer
      : 0;
  const isCorrect = selectedOption === correctAnswer;

  return (
    <div className="space-y-4">
      {/* Quiz body */}
      <div className="prose max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {section.body ?? ""}
        </ReactMarkdown>
      </div>

      {/* Options */}
      {options.length > 0 && (
        <div className="space-y-2">
          {options.map((option, optIdx) => {
            let optionStyle =
              "border-border-default bg-bg-surface hover:border-border-hover";

            if (showAnswer) {
              if (optIdx === correctAnswer) {
                optionStyle =
                  "border-green-500/40 bg-green-500/10";
              } else if (optIdx === selectedOption && !isCorrect) {
                optionStyle =
                  "border-red-500/40 bg-red-500/10";
              }
            } else if (selectedOption === optIdx) {
              optionStyle =
                "border-violet-500/40 bg-violet-500/10";
            }

            return (
              <button
                key={optIdx}
                type="button"
                onClick={() => {
                  if (!showAnswer) {
                    setSelectedOption(optIdx);
                  }
                }}
                disabled={showAnswer}
                className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${optionStyle}`}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-xs font-medium">
                  {String.fromCharCode(65 + optIdx)}
                </span>
                <span className="text-text-primary">
                  {option}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Check answer button */}
      {!showAnswer && (
        <Button
          onClick={() => {
            setShowAnswer(true);
            onResult(sectionIndex, selectedOption === correctAnswer);
          }}
          disabled={selectedOption === null}
          variant="secondary"
          size="sm"
        >
          {t('quiz.checkAnswer')}
        </Button>
      )}

      {/* Answer feedback */}
      {showAnswer && isCorrect && (
        <div className="flex items-center gap-3 rounded-xl bg-green-500/10 border border-green-500/20 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <span className="text-sm font-semibold text-green-300">{t('quiz.correct')}</span>
            {section.quiz_explanation && (
              <p className="mt-1 text-sm text-text-muted">{section.quiz_explanation}</p>
            )}
          </div>
        </div>
      )}
      {showAnswer && !isCorrect && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/20">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-red-300">
                {t('quiz.incorrect', { answer: String.fromCharCode(65 + correctAnswer) })}
              </span>
            </div>
          </div>

          {section.quiz_explanation && (
            <div className="rounded-xl border border-border-default bg-bg-input p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-text-faint">
                {t('quiz.explanation')}
              </p>
              <div className="prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {section.quiz_explanation}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── IDE Code Window ────────────────────────────────────────────────

function IdeCodeWindow({ children, filename }: { children: React.ReactNode; filename?: string }) {
  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-900 overflow-hidden shadow-lg">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800/80 border-b border-zinc-700/50">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500/80" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <div className="h-3 w-3 rounded-full bg-green-500/80" />
        </div>
        {filename && (
          <span className="ml-2 text-xs text-zinc-400 font-mono">{filename}</span>
        )}
      </div>
      {/* Code content */}
      <div className="not-prose overflow-x-auto [&_pre]:!m-0 [&_pre]:!rounded-none [&_pre]:!border-0 [&_pre]:!bg-zinc-900 [&_pre]:!text-[#c9d1d9] [&_code]:!text-[#c9d1d9] [&_pre]:!p-4 [&_pre]:!text-sm [&_pre]:!leading-relaxed">
        {children}
      </div>
    </div>
  );
}

/** Extract filename hint from the first comment line of code (e.g. "// app/page.tsx") */
function extractFilename(code: string): string | undefined {
  const match = code.match(/^\/\/\s*(\S+\.\w+)/);
  if (match) return match[1];
  const match2 = code.match(/^\/\*\s*(\S+\.\w+)/);
  if (match2) return match2[1];
  return undefined;
}

/** Custom ReactMarkdown components with IDE-style code blocks */
const markdownComponents = {
  pre: ({ children, ...props }: React.ComponentPropsWithoutRef<"pre"> & { children?: React.ReactNode }) => {
    // Extract code text from children for filename detection
    let codeText = "";
    if (children && typeof children === "object" && "props" in (children as React.ReactElement)) {
      const childProps = (children as React.ReactElement).props as { children?: string };
      if (typeof childProps.children === "string") {
        codeText = childProps.children;
      }
    }
    const filename = extractFilename(codeText);
    return (
      <IdeCodeWindow filename={filename}>
        <pre {...props}>{children}</pre>
      </IdeCodeWindow>
    );
  },
};

// ─── Challenge Section Component ────────────────────────────────────

// ─── Fill-in-the-blank helpers ───────────────────────────────────

interface CodeSegment { type: "code"; text: string }
interface BlankSegment { type: "blank"; id: string }
type ChallengeSegment = CodeSegment | BlankSegment;

function parseChallengeParts(code: string): ChallengeSegment[] {
  const parts: ChallengeSegment[] = [];
  const pattern = /___BLANK_?(\d*)___/g;
  let lastIndex = 0;
  let blankCount = 0;
  let match;
  while ((match = pattern.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "code", text: code.slice(lastIndex, match.index) });
    }
    blankCount++;
    parts.push({ type: "blank", id: match[1] || String(blankCount) });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) {
    parts.push({ type: "code", text: code.slice(lastIndex) });
  }
  return parts;
}

function extractBlankAnswers(starter: string, answer: string): Record<string, string> {
  if (!starter || !answer) return {};
  const result: Record<string, string> = {};
  const sLines = starter.split("\n");
  const aLines = answer.split("\n");
  let blankCount = 0;

  for (let si = 0, ai = 0; si < sLines.length && ai < aLines.length; si++, ai++) {
    const match = sLines[si].match(/___BLANK_?(\d*)___/);
    if (!match || match.index === undefined) continue;
    blankCount++;
    const id = match[1] || String(blankCount);
    const before = sLines[si].substring(0, match.index);
    const after = sLines[si].substring(match.index + match[0].length);
    let extracted = aLines[ai];
    if (before && extracted.startsWith(before)) {
      extracted = extracted.substring(before.length);
    }
    if (after) {
      const idx = extracted.lastIndexOf(after);
      if (idx >= 0) extracted = extracted.substring(0, idx);
    }
    result[id] = extracted.trim();
  }
  return result;
}

// ─── Challenge Section Component (Fill-in-the-blank) ─────────────

function ChallengeSection({
  section,
  moduleId,
  sectionIndex,
}: {
  section: ContentSection;
  moduleId: string;
  sectionIndex: number;
}) {
  const t = useTranslations("Learning");
  const storageKey = `challenge-blanks-${moduleId}-${sectionIndex}`;
  const [completed, setCompleted] = useState(false);

  const starterCode = section.challenge_starter_code ?? "";
  const answerCode = section.challenge_answer_code ?? section.code ?? "";

  const parts = useMemo(() => parseChallengeParts(starterCode), [starterCode]);
  const correctAnswers = useMemo(
    () => extractBlankAnswers(starterCode, answerCode),
    [starterCode, answerCode],
  );

  const [blanks, setBlanks] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleBlankChange = useCallback(
    (id: string, value: string) => {
      setBlanks((prev) => {
        const next = { ...prev, [id]: value };
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch { /* ignore */ }
        }, 500);
        return next;
      });
    },
    [storageKey],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Count how many blanks the user got right
  const blankIds = parts.filter((p): p is BlankSegment => p.type === "blank").map((p) => p.id);
  const filledCorrectly = blankIds.filter(
    (id) => blanks[id] && correctAnswers[id] && blanks[id].trim() === correctAnswers[id],
  ).length;
  const allCorrect = blankIds.length > 0 && filledCorrectly === blankIds.length;

  return (
    <div className="space-y-4">
      <div className="prose max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {section.body ?? ""}
        </ReactMarkdown>
      </div>

      {/* Fill-in-the-blank code */}
      <div className="overflow-hidden rounded-xl border border-zinc-700">
        <div className="flex items-center justify-between bg-zinc-800 px-4 py-2">
          <span className="text-xs font-medium text-violet-300">
            {t("challenge.fillBlanks")}
          </span>
          {blankIds.length > 0 && (
            <span className={`text-[11px] font-medium ${allCorrect ? "text-green-400" : "text-zinc-500"}`}>
              {filledCorrectly}/{blankIds.length}
            </span>
          )}
        </div>
        <div className="overflow-x-auto bg-zinc-900 p-4">
          <pre className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
            {parts.map((part, i) => {
              if (part.type === "code") {
                return <span key={i} className="text-zinc-300">{part.text}</span>;
              }
              const value = blanks[part.id] ?? "";
              const answer = correctAnswers[part.id] ?? "";
              const isCorrect = value.trim() === answer && answer !== "";
              const charWidth = Math.max(answer.length, 8) + 2;
              return (
                <input
                  key={i}
                  type="text"
                  value={value}
                  onChange={(e) => handleBlankChange(part.id, e.target.value)}
                  placeholder={answer || `BLANK_${part.id}`}
                  className={`inline-block border-b-2 border-dashed font-mono text-sm outline-none transition-colors px-1 rounded-sm ${
                    isCorrect
                      ? "border-green-500/60 bg-green-500/15 text-green-300 placeholder:text-green-500/30"
                      : "border-violet-500/50 bg-violet-500/15 text-violet-200 placeholder:text-violet-400/30 focus:border-violet-400 focus:bg-violet-500/25"
                  }`}
                  style={{
                    width: `${charWidth}ch`,
                    fontFamily: "inherit",
                  }}
                />
              );
            })}
          </pre>
        </div>
      </div>

      {/* All correct feedback */}
      {allCorrect && (
        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
          <span className="text-xs text-green-300">{t("quiz.correct")}</span>
        </div>
      )}

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={completed}
          onChange={(e) => setCompleted(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-600 text-violet-500 focus:ring-violet-500/50"
        />
        <span className="text-sm text-text-tertiary">
          {t("challenge.completed")}
        </span>
      </label>
    </div>
  );
}

// ─── 3-Step Generation Progress UI ──────────────────────────────────

const GENERATION_STEPS = [
  { icon: Code, threshold: 10 },
  { icon: Brain, threshold: 25 },
  { icon: Sparkles, threshold: 40 },
];

function GeneratingStepsUI({ elapsedSeconds }: { elapsedSeconds: number }) {
  const t = useTranslations('Learning');
  const stepLabels = [t('generation.step1'), t('generation.step2'), t('generation.step3')];
  const currentStep = GENERATION_STEPS.findIndex((s) => elapsedSeconds < s.threshold);
  const activeStep = currentStep === -1 ? GENERATION_STEPS.length - 1 : currentStep;

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-violet-500/20 bg-gradient-to-b from-violet-500/[0.05] to-transparent py-16">
      {/* Steps */}
      <div className="flex items-center gap-6 sm:gap-8">
        {GENERATION_STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isActive = idx === activeStep;
          const isDone = idx < activeStep;

          return (
            <div key={idx} className="flex flex-col items-center gap-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                isDone
                  ? "bg-green-500/20 ring-2 ring-green-500/40"
                  : isActive
                    ? "bg-violet-500/20 ring-2 ring-violet-500/40 animate-pulse"
                    : "bg-bg-input ring-1 ring-border-strong"
              }`}>
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                ) : (
                  <StepIcon className={`h-5 w-5 ${isActive ? "text-violet-400" : "text-text-dim"}`} />
                )}
              </div>
              <span className={`text-xs ${isActive ? "text-text-tertiary" : "text-text-dim"}`}>
                Step {idx + 1}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-sm font-medium text-text-tertiary">
        {stepLabels[activeStep]}
      </p>

      <div className="flex items-center gap-2 text-xs text-text-dim">
        <span className="tabular-nums">{t('generation.elapsed', { seconds: elapsedSeconds })}</span>
        <span>·</span>
        <span>{t('generation.usualTime')}</span>
      </div>
    </div>
  );
}

// ─── Main Module Content Component ──────────────────────────────────

export function ModuleContent({
  moduleId,
  title,
  description,
  moduleType,
  estimatedMinutes,
  sections,
  progress,
  learningPathId,
  projectId,
  projectName,
  prevModuleId,
  nextModuleId,
  conceptKeys,
  needsGeneration,
  regenerationCount = 0,
  maxRegenerationCount = 1,
}: ModuleContentProps) {
  const router = useRouter();
  const t = useTranslations('Learning');
  const te = useTranslations('Errors');
  const { isOpen: isTutorOpen, toggle: toggleTutor, open: openTutor, setPanelProps } = useTutorPanel();
  const [completing, setCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(
    progress?.status === "completed",
  );
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationScore, setCelebrationScore] = useState<number | null>(null);
  const [weakConcepts, setWeakConcepts] = useState<WeakConceptRecommendation[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const quizResultsRef = useRef<Map<number, boolean>>(new Map());
  const contentRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [conceptMatches, setConceptMatches] = useState<ModuleConceptMatch[]>([]);

  // Fetch code matches for this module's concepts (non-blocking)
  useEffect(() => {
    if (!conceptKeys || conceptKeys.length === 0 || !projectId) return;
    getConceptMatchesForModule(projectId, conceptKeys)
      .then((r) => setConceptMatches(r.matches))
      .catch(() => {});
  }, [projectId, conceptKeys]);

  const handleQuizResult = useCallback((sectionIndex: number, correct: boolean) => {
    quizResultsRef.current.set(sectionIndex, correct);
  }, []);

  // Reset quiz results and start time when module changes
  useEffect(() => {
    quizResultsRef.current.clear();
    startTimeRef.current = Date.now();
  }, [moduleId]);

  // Set panel props and auto-open tutor when entering learning module page
  useEffect(() => {
    setPanelProps({ projectId, projectName, learningPathId, moduleId, moduleName: title });
    openTutor();
    return () => {
      setPanelProps(null);
    };
  }, [projectId, projectName, learningPathId, moduleId, title, setPanelProps, openTutor]);

  // On-demand content generation state
  const [localSections, setLocalSections] = useState<ContentSection[]>(sections ?? []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showManualGenerate, setShowManualGenerate] = useState(false);

  // Whether the module visually needs a loading state (before useEffect fires)
  const showGeneratingUI = needsGeneration && (!sections || sections.length === 0);

  const typeConfig = moduleType ? MODULE_TYPE_CONFIG[moduleType] : null;
  const TypeIcon = typeConfig?.icon ?? BookOpen;

  // Mark as in_progress on mount if not already completed
  useEffect(() => {
    if (progress?.status !== "completed" && progress?.status !== "in_progress") {
      updateLearningProgress(moduleId, "in_progress");
    }
  }, [moduleId, progress?.status]);

  // Regeneration state
  const [showRegenDialog, setShowRegenDialog] = useState(false);
  const [selectedReason, setSelectedReason] = useState<RegenerationReason | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [localRegenCount, setLocalRegenCount] = useState(regenerationCount);
  const canRegenerate = localRegenCount < maxRegenerationCount && localSections.length > 0;
  const remainingRegens = Math.max(0, maxRegenerationCount - localRegenCount);

  // On-demand content generation
  const [pollCount, setPollCount] = useState(0);
  const generationInFlightRef = useRef(false);

  // Elapsed time counter for generation loading UX
  useEffect(() => {
    if ((!isGenerating && !showGeneratingUI) || localSections.length > 0) {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isGenerating, showGeneratingUI, localSections.length]);

  // Show manual generation fallback if auto-generation doesn't start within 5 seconds
  useEffect(() => {
    if (!needsGeneration || localSections.length > 0 || isGenerating || generationError) {
      setShowManualGenerate(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowManualGenerate(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [needsGeneration, localSections.length, isGenerating, generationError]);

  useEffect(() => {
    if (!needsGeneration || localSections.length > 0 || generationError) return;
    if (generationInFlightRef.current) return;

    let cancelled = false;
    generationInFlightRef.current = true;

    async function generate() {
      setIsGenerating(true);
      setGenerationError(null);

      try {
        const result = await generateModuleContent(moduleId);

        if (cancelled) return;

        if (result.generating) {
          setTimeout(() => {
            if (!cancelled) {
              generationInFlightRef.current = false;
              setIsGenerating(false);
              setPollCount((c) => c + 1);
            }
          }, 5000);
          return;
        }

        if (result.success && result.data) {
          setLocalSections(result.data.sections);
        } else {
          setGenerationError(
            result.error ? translateError(result.error, te) : t('generation.defaultError'),
          );
        }
      } catch {
        if (!cancelled) {
          setGenerationError(t('generation.unknownError'));
        }
      }

      if (!cancelled) {
        generationInFlightRef.current = false;
        setIsGenerating(false);
      }
    }

    generate();

    return () => {
      cancelled = true;
      generationInFlightRef.current = false;
    };
  }, [needsGeneration, localSections.length, generationError, moduleId, pollCount, t, te]);

  // Prefetch next module content when current module's content is loaded
  useEffect(() => {
    if (!nextModuleId || localSections.length === 0) return;
    prefetchNextModuleContent(moduleId).catch(() => {});
  }, [nextModuleId, localSections.length, moduleId]);

  const handleComplete = useCallback(async () => {
    setCompleting(true);
    const timeSpentSeconds = Math.round(
      (Date.now() - startTimeRef.current) / 1000,
    );

    // Compute quiz score (0-100)
    let score: number | undefined;
    const quizResults = quizResultsRef.current;
    if (quizResults.size > 0) {
      const correct = [...quizResults.values()].filter(Boolean).length;
      score = Math.round((correct / quizResults.size) * 100);
    }

    try {
      const result = await updateLearningProgress(
        moduleId,
        "completed",
        score,
        timeSpentSeconds,
      );
      if (result.success) {
        analytics.moduleComplete(0);
        if (score !== undefined) analytics.quizSubmit(score);
        setIsCompleted(true);
        setCelebrationScore(score ?? null);
        setShowCelebration(true);
        // Fetch weak concept recommendations in background
        getWeakConceptRecommendations(projectId, 3)
          .then((r) => setWeakConcepts(r.recommendations))
          .catch(() => {});
      } else {
        alert(t('progress.saveError'));
      }
    } catch (err) {
      console.error("[learning] Progress save error:", err);
      alert(t('progress.saveError'));
    } finally {
      setCompleting(false);
    }
  }, [moduleId, projectId, t]);

  const handleRetryGeneration = useCallback(() => {
    setGenerationError(null);
    setIsGenerating(false);
    setLocalSections([]);
    setPollCount(0);
  }, []);

  const handleRegenerate = useCallback(async () => {
    if (!canRegenerate) return;

    setIsRegenerating(true);
    setShowRegenDialog(false);
    setLocalSections([]);
    setIsCompleted(false);
    setElapsedSeconds(0);

    try {
      const result = await regenerateModuleContent(moduleId, selectedReason ?? undefined);

      if (result.generating) {
        // Poll for completion
        setIsGenerating(true);
        setPollCount((c) => c + 1);
      } else if (result.success && result.data) {
        setLocalSections(result.data.sections);
        setLocalRegenCount((c) => c + 1);
        quizResultsRef.current.clear();
        startTimeRef.current = Date.now();
      } else {
        setGenerationError(
          result.error ? translateError(result.error, te) : t('generation.defaultError'),
        );
      }
    } catch {
      setGenerationError(t('generation.unknownError'));
    } finally {
      setIsRegenerating(false);
      setSelectedReason(null);
    }
  }, [canRegenerate, moduleId, selectedReason, t, te]);

  function handlePrev() {
    if (prevModuleId) {
      router.push(`/learning/${learningPathId}/${prevModuleId}`);
    }
  }

  function handleNext() {
    if (nextModuleId) {
      router.push(`/learning/${learningPathId}/${nextModuleId}`);
    } else {
      router.push(`/learning/${learningPathId}`);
    }
  }

  const handleManualGenerate = useCallback(() => {
    setShowManualGenerate(false);
    setGenerationError(null);
    setIsGenerating(false);
    setLocalSections([]);
    setPollCount((c) => c + 1);
  }, []);

  // Text selection → "Ask AI Tutor" tooltip
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setTooltip(null);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 5) {
      setTooltip(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      text,
    });
  }, []);

  const handleMouseDown = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleAskTutor = useCallback(() => {
    if (!tooltip) return;
    openTutor(t('askTutor.prompt', { text: tooltip.text }));
    setTooltip(null);
    window.getSelection()?.removeAllRanges();
  }, [tooltip, openTutor, t]);

  function renderSectionContent(section: ContentSection, sectionIndex: number) {
    if (section.type === "quiz_question") {
      return <QuizSection section={section} sectionIndex={sectionIndex} onResult={handleQuizResult} />;
    }
    if (section.type === "challenge") {
      return <ChallengeSection section={section} moduleId={moduleId} sectionIndex={sectionIndex} />;
    }
    return (
      <div className="space-y-4">
        <div className="prose max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={markdownComponents}
          >
            {section.body ?? ""}
          </ReactMarkdown>
        </div>
        {section.code && (
          <IdeCodeWindow filename={extractFilename(section.code)}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {"```\n" + section.code + "\n```"}
            </ReactMarkdown>
          </IdeCodeWindow>
        )}
      </div>
    );
  }

  return (
    <div
      className="space-y-6 pb-20"
      ref={contentRef}
      onMouseUp={handleMouseUp}
      onMouseDown={handleMouseDown}
    >
      {/* Floating "Ask AI Tutor" tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 -translate-x-1/2 -translate-y-full animate-in fade-in zoom-in-95 duration-150"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <button
            type="button"
            onClick={handleAskTutor}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg transition-colors hover:bg-violet-700"
          >
            <Brain className="h-3.5 w-3.5" />
            {t('askTutor.tooltip')}
          </button>
        </div>
      )}

      {/* Module header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {typeConfig && (
              <span className="flex items-center gap-1 rounded-lg bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-300">
                <TypeIcon className="h-3 w-3" />
                {typeConfig.label}
              </span>
            )}
            {estimatedMinutes !== null && (
              <span className="flex items-center gap-1 text-xs text-text-faint">
                <Clock className="h-3 w-3" />
                {t('module.minutes', { minutes: estimatedMinutes })}
              </span>
            )}
            {isCompleted && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                {t('module.completed')}
              </span>
            )}
          </div>
          {/* Regenerate button */}
          {localSections.length > 0 && !isGenerating && !isRegenerating && (
            <button
              type="button"
              onClick={() => canRegenerate ? setShowRegenDialog(true) : undefined}
              disabled={!canRegenerate}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                canRegenerate
                  ? "text-text-muted hover:text-text-primary hover:bg-bg-input"
                  : "text-text-dim cursor-not-allowed"
              }`}
              title={!canRegenerate ? t('regenerate.limitReachedPaid') : t('regenerate.button')}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('regenerate.button')}
            </button>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-bold text-text-primary">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-text-muted">
            {description}
          </p>
        )}
      </div>

      {/* Code match banner — shows which project files use concepts from this module */}
      {conceptMatches.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
          <div className="flex items-start gap-2.5">
            <FileCode className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-secondary">
                {t("codeMatch.title", { count: conceptMatches.reduce((sum, m) => sum + m.matchedFiles.length, 0) })}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {conceptMatches.flatMap((m) =>
                  m.matchedFiles.slice(0, 3).map((filePath) => {
                    const fileName = filePath.split("/").pop() ?? filePath;
                    return (
                      <span
                        key={`${m.conceptKey}:${filePath}`}
                        className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-400 font-mono"
                        title={filePath}
                      >
                        {fileName}
                      </span>
                    );
                  }),
                ).slice(0, 6)}
                {conceptMatches.reduce((sum, m) => sum + m.matchedFiles.length, 0) > 6 && (
                  <span className="text-[11px] text-text-dim self-center">
                    +{conceptMatches.reduce((sum, m) => sum + m.matchedFiles.length, 0) - 6}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regeneration dialog */}
      {showRegenDialog && (
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">
            {t('regenerate.title')}
          </h3>

          <div className="space-y-2">
            {REGENERATION_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => setSelectedReason(selectedReason === reason ? null : reason)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                  selectedReason === reason
                    ? "border-violet-500/40 bg-violet-500/10 text-text-primary"
                    : "border-border-default bg-bg-input text-text-muted hover:border-border-hover"
                }`}
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  selectedReason === reason
                    ? "border-violet-500 bg-violet-500"
                    : "border-text-dim"
                }`}>
                  {selectedReason === reason && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </span>
                {t(`regenerate.reason_${reason}` as Parameters<typeof t>[0])}
              </button>
            ))}
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div className="text-xs text-amber-300 space-y-1">
              <p>{t('regenerate.warning')}</p>
              <p className="text-text-dim">{t('regenerate.remaining', { count: remainingRegens })}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowRegenDialog(false); setSelectedReason(null); }}
            >
              {t('regenerate.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleRegenerate}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {t('regenerate.confirm')}
            </Button>
          </div>
        </div>
      )}

      {/* Regenerating state */}
      {isRegenerating && localSections.length === 0 && !generationError && (
        <GeneratingStepsUI elapsedSeconds={elapsedSeconds} />
      )}

      {/* On-demand content generation states — 3-step progress */}
      {(isGenerating || showGeneratingUI) && localSections.length === 0 && !generationError && (
        <GeneratingStepsUI elapsedSeconds={elapsedSeconds} />
      )}

      {generationError && localSections.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 py-12">
          <XCircle className="h-8 w-8 text-red-400" />
          <div className="text-center">
            <p className="font-medium text-red-300">
              {t('generation.failedTitle')}
            </p>
            <p className="mt-1 text-sm text-red-400">
              {generationError}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRetryGeneration}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('generation.retry')}
          </Button>
        </div>
      )}

      {/* Empty state: no sections, not generating, no error */}
      {localSections.length === 0 && !isGenerating && !showGeneratingUI && !generationError && (
        needsGeneration ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-violet-500/20 bg-gradient-to-b from-violet-500/[0.05] to-transparent py-12">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            <p className="text-sm font-medium text-text-tertiary">
              {t('generation.preparing')}
            </p>
            {showManualGenerate && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleManualGenerate}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {t('generation.generateButton')}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-default bg-bg-surface py-12">
            <BookOpen className="h-8 w-8 text-text-dim" />
            <p className="text-sm text-text-muted">
              {t('generation.notReady')}
            </p>
          </div>
        )
      )}

      {localSections.length > 0 && (
        <div className="divide-y divide-border-default">
          {localSections.map((section, idx) => {
            const config = SECTION_CONFIG[section.type] ?? DEFAULT_SECTION_CONFIG;
            const SectionIcon = config.icon;

            const sectionInner = (
              <>
                {/* Section type label */}
                <div className="mb-3 flex items-center gap-1.5">
                  <SectionIcon className="h-3.5 w-3.5 text-text-faint" />
                  <span className="text-[11px] font-medium uppercase tracking-widest text-text-faint">
                    {t(`sectionType.${section.type}` as Parameters<typeof t>[0])}
                  </span>
                </div>

                {/* Section title */}
                {section.title && (
                  <h2 className="mb-2 text-[17px] font-semibold text-text-primary">
                    {section.title}
                  </h2>
                )}

                {/* Section content */}
                {renderSectionContent(section, idx)}
              </>
            );

            return (
              <div
                key={idx}
                className="py-8 first:pt-0 last:pb-0"
              >
                {config.callout ? (
                  <div className="rounded-xl border border-border-default bg-bg-input p-5">
                    {sectionInner}
                  </div>
                ) : (
                  sectionInner
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky bottom action bar */}
      {localSections.length > 0 && (
        <div className={`fixed bottom-0 left-0 z-40 lg:left-64 transition-[right] duration-300 ${
          isTutorOpen ? "right-[420px]" : "right-0"
        }`}>
          <div className="border-t border-border-default bg-background/90 backdrop-blur-xl backdrop-saturate-150">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-2.5">
              {/* Left: AI Tutor */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTutor}
                className={isTutorOpen ? "text-violet-400" : ""}
              >
                <Brain className="mr-1.5 h-4 w-4" />
                {t('bottomBar.aiTutor')}
              </Button>

              {/* Right: Prev / Complete / Next */}
              <div className="flex items-center gap-2">
                {prevModuleId && (
                  <Button onClick={handlePrev} variant="ghost" size="sm">
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                    {t('bottomBar.prevModule')}
                  </Button>
                )}
                {!isCompleted ? (
                  <Button onClick={handleComplete} disabled={completing} size="sm">
                    {completing ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {t('bottomBar.complete')}
                  </Button>
                ) : (
                  <Button onClick={handleNext} size="sm">
                    {nextModuleId ? t('bottomBar.nextModule') : t('bottomBar.backToPath')}
                    {nextModuleId && <ArrowRight className="ml-1.5 h-3.5 w-3.5" />}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weak Concept Recommendations (shown after completion) */}
      {isCompleted && weakConcepts.length > 0 && (
        <div className="mx-auto max-w-3xl px-6 pb-6">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-400">
              <Target className="h-4 w-4" />
              {t('weakConcepts.title')}
            </h3>
            <p className="mt-1 text-xs text-text-muted">{t('weakConcepts.description')}</p>
            <div className="mt-3 space-y-2">
              {weakConcepts.map((wc) => (
                <div key={wc.conceptKey} className="flex items-center justify-between rounded-lg bg-bg-surface px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-text-primary">{wc.conceptName}</span>
                    <span className="ml-2 text-xs text-text-muted">{wc.techName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-bg-input">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${wc.level}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted">{wc.level}%</span>
                    {wc.relatedModules.length > 0 && wc.relatedModules[0].status !== "completed" && (
                      <Link
                        href={`/learning/${wc.relatedModules[0].pathId}/${wc.relatedModules[0].id}`}
                        className="text-xs text-violet-400 hover:text-violet-300"
                      >
                        {t('weakConcepts.study')}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Celebration Modal */}
      <CelebrationModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        moduleName={title}
        score={celebrationScore}
        nextModuleId={nextModuleId}
        learningPathId={learningPathId}
      />
    </div>
  );
}
