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
import { updateLearningProgress, generateModuleContent } from "@/server/actions/learning";
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
    className: string;
  }
> = {
  concept: {
    icon: BookOpen,
    label: "Concept",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  practical: {
    icon: Code,
    label: "Practical",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  quiz: {
    icon: HelpCircle,
    label: "Quiz",
    className:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  },
  project_walkthrough: {
    icon: FolderOpen,
    label: "Walkthrough",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
};

// ─── Section Card Styles (color-coded by type) ──────────────────────

const SECTION_CARD_STYLES: Record<
  string,
  {
    border: string;
    bg: string;
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    label: string;
    labelColor: string;
    dot: string;
  }
> = {
  explanation: {
    border: "border-l-4 border-l-blue-400 dark:border-l-blue-500",
    bg: "bg-blue-50/60 dark:bg-blue-950/20",
    icon: BookOpen,
    iconColor: "text-blue-500",
    label: "설명",
    labelColor: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-400 dark:bg-blue-500",
  },
  code_example: {
    border: "border-l-4 border-l-emerald-400 dark:border-l-emerald-500",
    bg: "bg-emerald-50/60 dark:bg-emerald-950/20",
    icon: Code,
    iconColor: "text-emerald-500",
    label: "코드 예시",
    labelColor: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-400 dark:bg-emerald-500",
  },
  quiz_question: {
    border: "border-l-4 border-l-amber-400 dark:border-l-amber-500",
    bg: "bg-amber-50/60 dark:bg-amber-950/20",
    icon: HelpCircle,
    iconColor: "text-amber-500",
    label: "퀴즈",
    labelColor: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-400 dark:bg-amber-500",
  },
  challenge: {
    border: "border-l-4 border-l-purple-400 dark:border-l-purple-500",
    bg: "bg-purple-50/60 dark:bg-purple-950/20",
    icon: Target,
    iconColor: "text-purple-500",
    label: "챌린지",
    labelColor: "text-purple-600 dark:text-purple-400",
    dot: "bg-purple-400 dark:bg-purple-500",
  },
  reflection: {
    border: "border-l-4 border-l-violet-400 dark:border-l-violet-500",
    bg: "bg-violet-50/60 dark:bg-violet-950/20",
    icon: BookOpen,
    iconColor: "text-violet-500",
    label: "생각해보기",
    labelColor: "text-violet-600 dark:text-violet-400",
    dot: "bg-violet-400 dark:bg-violet-500",
  },
};

const DEFAULT_SECTION_STYLE = SECTION_CARD_STYLES.explanation;

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
  const [isGenerating, setIsGenerating] = useState(
    !!(needsGeneration && (!sections || sections.length === 0)),
  );
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Section refs for scroll-to navigation
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  // Elapsed time counter for generation loading UX
  useEffect(() => {
    if (!isGenerating || localSections.length > 0) {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isGenerating, localSections.length]);

  useEffect(() => {
    if (!needsGeneration || localSections.length > 0 || isGenerating || generationError) return;

    let cancelled = false;

    async function generate() {
      setIsGenerating(true);
      setGenerationError(null);

      try {
        const result = await generateModuleContent(moduleId);

        if (cancelled) return;

        if (result.generating) {
          setTimeout(() => {
            if (!cancelled) {
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
        setIsGenerating(false);
      }
    }

    generate();

    return () => {
      cancelled = true;
    };
  }, [needsGeneration, localSections.length, isGenerating, generationError, moduleId, pollCount]);

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

  function scrollToSection(idx: number) {
    sectionRefs.current[idx]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
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
            <span
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${typeConfig.className}`}
            >
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
      {isGenerating && localSections.length === 0 && (
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
      {localSections.length === 0 && !isGenerating && !generationError && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 py-12 dark:border-zinc-800 dark:bg-zinc-900/50">
          <BookOpen className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            아직 학습 콘텐츠가 준비되지 않았습니다.
          </p>
        </div>
      )}

      {localSections.length > 0 && (
        <>
          {/* Section dot indicators */}
          <div className="flex flex-wrap gap-1.5">
            {localSections.map((s, i) => {
              const style = SECTION_CARD_STYLES[s.type] ?? DEFAULT_SECTION_STYLE;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => scrollToSection(i)}
                  title={`${style.label}: ${s.title || `섹션 ${i + 1}`}`}
                  className={`h-2.5 w-2.5 rounded-full transition-transform hover:scale-125 ${style.dot}`}
                />
              );
            })}
          </div>

          {/* All sections — scroll view */}
          <div className="space-y-5">
            {localSections.map((section, idx) => {
              const style = SECTION_CARD_STYLES[section.type] ?? DEFAULT_SECTION_STYLE;
              const SectionIcon = style.icon;

              return (
                <div
                  key={idx}
                  ref={(el) => { sectionRefs.current[idx] = el; }}
                  className={`scroll-mt-4 rounded-xl ${style.border} ${style.bg} p-5 md:p-6`}
                >
                  {/* Section type header */}
                  <div className="mb-4 flex items-center gap-2">
                    <SectionIcon className={`h-4 w-4 ${style.iconColor}`} />
                    <span
                      className={`text-xs font-semibold uppercase tracking-wide ${style.labelColor}`}
                    >
                      {style.label}
                    </span>
                  </div>

                  {/* Section title */}
                  {section.title && (
                    <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {section.title}
                    </h2>
                  )}

                  {/* Section content */}
                  {renderSectionContent(section)}
                </div>
              );
            })}
          </div>
        </>
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
