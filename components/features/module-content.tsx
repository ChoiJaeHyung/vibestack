"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
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
  Eye,
  Brain,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CelebrationModal } from "@/components/features/celebration-modal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { updateLearningProgress, generateModuleContent, prefetchNextModuleContent } from "@/server/actions/learning";
import { useTutorPanel } from "@/components/features/tutor-panel-context";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import json from "highlight.js/lib/languages/json";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("json", json);

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
  needsGeneration?: boolean;
}

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
    label: string;
    callout?: boolean;
  }
> = {
  explanation: { icon: BookOpen, label: "설명" },
  code_example: { icon: Code, label: "코드 예시" },
  quiz_question: { icon: HelpCircle, label: "퀴즈", callout: true },
  challenge: { icon: Target, label: "챌린지", callout: true },
  reflection: { icon: BookOpen, label: "생각해보기", callout: true },
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
      <div className="prose dark:prose-invert max-w-none">
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
          정답 확인
        </Button>
      )}

      {/* Answer feedback */}
      {showAnswer && isCorrect && (
        <div className="flex items-center gap-3 rounded-xl bg-green-500/10 border border-green-500/20 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <span className="text-sm font-semibold text-green-300">정답입니다!</span>
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
                틀렸습니다. 정답은 {String.fromCharCode(65 + correctAnswer)}번입니다.
              </span>
            </div>
          </div>

          {section.quiz_explanation && (
            <div className="rounded-xl border border-border-default bg-bg-input p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-text-faint">
                해설
              </p>
              <div className="prose dark:prose-invert max-w-none">
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

// ─── Challenge Section Component ────────────────────────────────────

function highlightCode(code: string): string {
  try {
    const result = hljs.highlightAuto(code, [
      "javascript",
      "typescript",
      "xml",
      "css",
      "json",
    ]);
    return result.value;
  } catch {
    // hljs 실패 시 raw text (HTML 이스케이프)
    return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

const LazyEditor = dynamic(() => import("react-simple-code-editor"), {
  ssr: false,
  loading: () => (
    <pre className="min-h-[120px] bg-zinc-900 p-4 font-mono text-sm text-zinc-100" />
  ),
});

function ChallengeSection({
  section,
  moduleId,
  sectionIndex,
}: {
  section: ContentSection;
  moduleId: string;
  sectionIndex: number;
}) {
  const storageKey = `challenge-code-${moduleId}-${sectionIndex}`;
  const [completed, setCompleted] = useState(false);
  const [code, setCode] = useState(() => {
    if (typeof window === "undefined") return section.challenge_starter_code ?? "";
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ?? section.challenge_starter_code ?? "";
    } catch {
      return section.challenge_starter_code ?? "";
    }
  });
  const [showAnswer, setShowAnswer] = useState(false);
  const answerCode =
    section.challenge_answer_code ?? section.code ?? "";
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced localStorage save
  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, newCode);
        } catch {
          // Ignore localStorage errors (quota exceeded, etc.)
        }
      }, 500);
    },
    [storageKey],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="prose dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {section.body ?? ""}
        </ReactMarkdown>
      </div>

      {/* Code Editor */}
      <div className="overflow-hidden rounded-xl border border-zinc-700">
        <div className="flex items-center justify-between bg-zinc-800 px-4 py-2">
          <span className="text-xs font-medium text-zinc-400">
            코드 에디터
          </span>
          {answerCode && (
            <button
              type="button"
              onClick={() => setShowAnswer(!showAnswer)}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-600 hover:text-zinc-100"
            >
              <Eye className="h-3.5 w-3.5" />
              {showAnswer ? "답 숨기기" : "답 확인"}
            </button>
          )}
        </div>
        <LazyEditor
          value={code}
          onValueChange={handleCodeChange}
          highlight={(c: string) => highlightCode(c)}
          padding={16}
          className="min-h-[120px] bg-zinc-900 font-mono text-sm text-zinc-100"
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        />
      </div>

      {/* Answer panel */}
      {showAnswer && answerCode && (
        <div className="overflow-hidden rounded-xl border border-zinc-700">
          <div className="bg-zinc-800 px-4 py-2">
            <span className="text-xs font-medium text-zinc-400">
              정답 코드
            </span>
          </div>
          <div className="overflow-x-auto bg-zinc-900 p-4">
            <pre className="text-sm">
              <code
                className="hljs text-zinc-100"
                dangerouslySetInnerHTML={{
                  __html: highlightCode(answerCode),
                }}
              />
            </pre>
          </div>
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
          완료
        </span>
      </label>
    </div>
  );
}

// ─── 3-Step Generation Progress UI ──────────────────────────────────

const GENERATION_STEPS = [
  { icon: Code, label: "프로젝트 코드 분석 중...", threshold: 10 },
  { icon: Brain, label: "맞춤 콘텐츠 생성 중...", threshold: 25 },
  { icon: Sparkles, label: "최종 검수 및 최적화 중...", threshold: 40 },
];

function GeneratingStepsUI({ elapsedSeconds }: { elapsedSeconds: number }) {
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
        {GENERATION_STEPS[activeStep].label}
      </p>

      <div className="flex items-center gap-2 text-xs text-text-dim">
        <span className="tabular-nums">{elapsedSeconds}초 경과</span>
        <span>·</span>
        <span>보통 30~60초 소요</span>
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
  needsGeneration,
}: ModuleContentProps) {
  const router = useRouter();
  const { isOpen: isTutorOpen, toggle: toggleTutor, open: openTutor, setPanelProps } = useTutorPanel();
  const [completing, setCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(
    progress?.status === "completed",
  );
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationScore, setCelebrationScore] = useState<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const quizResultsRef = useRef<Map<number, boolean>>(new Map());
  const contentRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const handleQuizResult = useCallback((sectionIndex: number, correct: boolean) => {
    quizResultsRef.current.set(sectionIndex, correct);
  }, []);

  // Reset quiz results and start time when module changes
  useEffect(() => {
    quizResultsRef.current.clear();
    startTimeRef.current = Date.now();
  }, [moduleId]);

  // Set panel props when module changes
  useEffect(() => {
    setPanelProps({ projectId, projectName, learningPathId, moduleId, moduleName: title });
  }, [projectId, projectName, learningPathId, moduleId, title, setPanelProps]);

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
            result.error ?? "콘텐츠 생성에 실패했습니다.",
          );
        }
      } catch {
        if (!cancelled) {
          setGenerationError("콘텐츠 생성 중 오류가 발생했습니다.");
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
  }, [needsGeneration, localSections.length, generationError, moduleId, pollCount]);

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
        setIsCompleted(true);
        setCelebrationScore(score ?? null);
        setShowCelebration(true);
      } else {
        alert("학습 진행 상황 저장에 실패했습니다. 다시 시도해 주세요.");
      }
    } catch (err) {
      console.error("[learning] Progress save error:", err);
      alert("학습 진행 상황 저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setCompleting(false);
    }
  }, [moduleId]);

  const handleRetryGeneration = useCallback(() => {
    setGenerationError(null);
    setIsGenerating(false);
    setLocalSections([]);
    setPollCount(0);
  }, []);

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

    // Skip selections inside code editors (react-simple-code-editor)
    const anchorNode = selection.anchorNode;
    if (anchorNode) {
      let node: Node | null = anchorNode;
      while (node) {
        if (node instanceof HTMLElement && node.classList.contains("npm__react-simple-code-editor__textarea")) {
          setTooltip(null);
          return;
        }
        node = node.parentNode;
      }
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
    openTutor(`이 부분에 대해 더 설명해 주세요:\n\n"${tooltip.text}"`);
    setTooltip(null);
    window.getSelection()?.removeAllRanges();
  }, [tooltip, openTutor]);

  function renderSectionContent(section: ContentSection, sectionIndex: number) {
    if (section.type === "quiz_question") {
      return <QuizSection section={section} sectionIndex={sectionIndex} onResult={handleQuizResult} />;
    }
    if (section.type === "challenge") {
      return <ChallengeSection section={section} moduleId={moduleId} sectionIndex={sectionIndex} />;
    }
    return (
      <div className="space-y-4">
        <div className="prose dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {section.body ?? ""}
          </ReactMarkdown>
        </div>
        {section.code && (
          <div className="overflow-x-auto rounded-xl">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {"```\n" + section.code + "\n```"}
            </ReactMarkdown>
          </div>
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
            AI 튜터에게 물어보기
          </button>
        </div>
      )}

      {/* Module header */}
      <div>
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
              {estimatedMinutes}분
            </span>
          )}
          {isCompleted && (
            <span className="flex items-center gap-1 text-xs font-medium text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              완료됨
            </span>
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

      {/* On-demand content generation states — 3-step progress */}
      {(isGenerating || showGeneratingUI) && localSections.length === 0 && !generationError && (
        <GeneratingStepsUI elapsedSeconds={elapsedSeconds} />
      )}

      {generationError && localSections.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 py-12">
          <XCircle className="h-8 w-8 text-red-400" />
          <div className="text-center">
            <p className="font-medium text-red-300">
              콘텐츠 생성에 실패했습니다
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
            다시 시도
          </Button>
        </div>
      )}

      {/* Empty state: no sections, not generating, no error */}
      {localSections.length === 0 && !isGenerating && !showGeneratingUI && !generationError && (
        needsGeneration ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-violet-500/20 bg-gradient-to-b from-violet-500/[0.05] to-transparent py-12">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            <p className="text-sm font-medium text-text-tertiary">
              콘텐츠를 준비하고 있습니다...
            </p>
            {showManualGenerate && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleManualGenerate}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                콘텐츠 생성
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-default bg-bg-surface py-12">
            <BookOpen className="h-8 w-8 text-text-dim" />
            <p className="text-sm text-text-muted">
              아직 학습 콘텐츠가 준비되지 않았습니다.
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
                    {config.label}
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
                AI 튜터
              </Button>

              {/* Right: Prev / Complete / Next */}
              <div className="flex items-center gap-2">
                {prevModuleId && (
                  <Button onClick={handlePrev} variant="ghost" size="sm">
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                    이전 모듈
                  </Button>
                )}
                {!isCompleted ? (
                  <Button onClick={handleComplete} disabled={completing} size="sm">
                    {completing ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    완료
                  </Button>
                ) : (
                  <Button onClick={handleNext} size="sm">
                    {nextModuleId ? "다음 모듈" : "경로로 돌아가기"}
                    {nextModuleId && <ArrowRight className="ml-1.5 h-3.5 w-3.5" />}
                  </Button>
                )}
              </div>
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
