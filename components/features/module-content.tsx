"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  Clock,
  BookOpen,
  Code,
  HelpCircle,
  FolderOpen,
  Target,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { updateLearningProgress, generateModuleContent, prefetchNextModuleContent } from "@/server/actions/learning";
import { TutorChat } from "@/components/features/tutor-chat";

// ─── Types ──────────────────────────────────────────────────────────

interface ContentSection {
  type: string;
  title: string;
  body: string;
  code?: string;
  quiz_options?: string[];
  quiz_answer?: number;
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
}: {
  section: ContentSection;
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
      <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {section.body ?? ""}
        </ReactMarkdown>
      </div>

      {/* Options */}
      {options.length > 0 && (
        <div className="space-y-2">
          {options.map((option, optIdx) => {
            let optionStyle =
              "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700";

            if (showAnswer) {
              if (optIdx === correctAnswer) {
                optionStyle =
                  "border-green-500 bg-green-50 dark:border-green-500 dark:bg-green-900/20";
              } else if (optIdx === selectedOption && !isCorrect) {
                optionStyle =
                  "border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-900/20";
              }
            } else if (selectedOption === optIdx) {
              optionStyle =
                "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-900";
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
                className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${optionStyle}`}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-xs font-medium">
                  {String.fromCharCode(65 + optIdx)}
                </span>
                <span className="text-zinc-900 dark:text-zinc-100">
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
          onClick={() => setShowAnswer(true)}
          disabled={selectedOption === null}
          variant="secondary"
          size="sm"
        >
          정답 확인
        </Button>
      )}

      {/* Answer feedback */}
      {showAnswer && (
        <div
          className={`flex items-center gap-2 rounded-lg p-3 ${
            isCorrect
              ? "bg-green-50 dark:bg-green-900/20"
              : "bg-red-50 dark:bg-red-900/20"
          }`}
        >
          {isCorrect ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                정답입니다!
              </span>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                틀렸습니다. 정답은{" "}
                {String.fromCharCode(65 + correctAnswer)}번입니다.
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Challenge Section Component ────────────────────────────────────

function ChallengeSection({ section }: { section: ContentSection }) {
  const [completed, setCompleted] = useState(false);

  return (
    <div className="space-y-4">
      <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {section.body ?? ""}
        </ReactMarkdown>
      </div>
      {section.code && (
        <div className="overflow-x-auto rounded-lg bg-zinc-900 dark:bg-zinc-800">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {"```\n" + section.code + "\n```"}
          </ReactMarkdown>
        </div>
      )}
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={completed}
          onChange={(e) => setCompleted(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-600 dark:text-white dark:focus:ring-zinc-300"
        />
        <span className="text-sm text-zinc-700 dark:text-zinc-300">
          완료
        </span>
      </label>
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
  nextModuleId,
  needsGeneration,
}: ModuleContentProps) {
  const router = useRouter();
  const [completing, setCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(
    progress?.status === "completed",
  );
  const startTimeRef = useRef<number>(Date.now());
  const [showChat, setShowChat] = useState(false);

  // On-demand content generation state
  const [localSections, setLocalSections] = useState<ContentSection[]>(sections ?? []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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

    try {
      const result = await updateLearningProgress(
        moduleId,
        "completed",
        undefined,
        timeSpentSeconds,
      );
      if (result.success) {
        setIsCompleted(true);
      }
    } catch {
      // Ignore
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

  function handleNext() {
    if (nextModuleId) {
      router.push(`/learning/${learningPathId}/${nextModuleId}`);
    } else {
      router.push(`/learning/${learningPathId}`);
    }
  }

  function renderSectionContent(section: ContentSection) {
    if (section.type === "quiz_question") {
      return <QuizSection section={section} />;
    }
    if (section.type === "challenge") {
      return <ChallengeSection section={section} />;
    }
    return (
      <div className="space-y-4">
        <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {section.body ?? ""}
          </ReactMarkdown>
        </div>
        {section.code && (
          <div className="overflow-x-auto rounded-lg">
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
    <div className="space-y-6 pb-20">
      {/* Module header */}
      <div>
        <div className="flex items-center gap-2">
          {typeConfig && (
            <span className="flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">

              <TypeIcon className="h-3 w-3" />
              {typeConfig.label}
            </span>
          )}
          {estimatedMinutes !== null && (
            <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
              <Clock className="h-3 w-3" />
              {estimatedMinutes}분
            </span>
          )}
          {isCompleted && (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              완료됨
            </span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>

      {/* On-demand content generation states */}
      {(isGenerating || showGeneratingUI) && localSections.length === 0 && !generationError && (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-zinc-200 bg-zinc-50 py-12 dark:border-zinc-800 dark:bg-zinc-900/50">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          <div className="text-center">
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              학습 콘텐츠를 생성하고 있습니다...
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {elapsedSeconds < 10
                ? "프로젝트 코드를 분석하고 있어요"
                : elapsedSeconds < 25
                  ? "AI가 맞춤 콘텐츠를 작성하고 있어요"
                  : "거의 다 됐어요, 조금만 기다려 주세요"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
            <span>{elapsedSeconds}초 경과</span>
            <span>·</span>
            <span>보통 30~60초 소요</span>
          </div>
        </div>
      )}

      {generationError && localSections.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 py-12 dark:border-red-900/50 dark:bg-red-900/20">
          <XCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
          <div className="text-center">
            <p className="font-medium text-red-700 dark:text-red-300">
              콘텐츠 생성에 실패했습니다
            </p>
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
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
        <div className="flex flex-col items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 py-12 dark:border-zinc-800 dark:bg-zinc-900/50">
          <BookOpen className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            아직 학습 콘텐츠가 준비되지 않았습니다.
          </p>
        </div>
      )}

      {localSections.length > 0 && (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {localSections.map((section, idx) => {
            const config = SECTION_CONFIG[section.type] ?? DEFAULT_SECTION_CONFIG;
            const SectionIcon = config.icon;

            const sectionInner = (
              <>
                {/* Section type label */}
                <div className="mb-3 flex items-center gap-1.5">
                  <SectionIcon className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                  <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    {config.label}
                  </span>
                </div>

                {/* Section title */}
                {section.title && (
                  <h2 className="mb-2 text-[17px] font-semibold text-zinc-900 dark:text-zinc-100">
                    {section.title}
                  </h2>
                )}

                {/* Section content */}
                {renderSectionContent(section)}
              </>
            );

            return (
              <div
                key={idx}
                className="py-8 first:pt-0 last:pb-0"
              >
                {config.callout ? (
                  <div className="rounded-lg border border-zinc-200/70 bg-zinc-50 p-5 dark:border-zinc-700/50 dark:bg-zinc-800/50">
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

      {/* AI Tutor Chat Panel */}
      {showChat && (
        <div className="h-[500px]">
          <TutorChat
            projectId={projectId}
            learningPathId={learningPathId}
          />
        </div>
      )}

      {/* Sticky bottom action bar */}
      {localSections.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/80 backdrop-blur-sm lg:left-64 dark:border-zinc-800 dark:bg-zinc-950/80">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChat(!showChat)}
            >
              <MessageSquare className="mr-1.5 h-4 w-4" />
              {showChat ? "채팅 닫기" : "AI 튜터"}
            </Button>

            {!isCompleted ? (
              <Button onClick={handleComplete} disabled={completing} size="sm">
                {completing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    학습 완료
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext} size="sm">
                {nextModuleId ? (
                  <>
                    다음 모듈
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  "학습 경로로 돌아가기"
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
