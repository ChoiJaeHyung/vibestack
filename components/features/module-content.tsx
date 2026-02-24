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
  ChevronLeft,
  ChevronRight,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
// Card components available but not currently used
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { updateLearningProgress } from "@/server/actions/learning";
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

// ─── Section Type Config (for step navigation badges) ───────────────

const SECTION_TYPE_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }
> = {
  explanation: { icon: BookOpen, label: "설명" },
  code_example: { icon: Code, label: "코드 예시" },
  quiz_question: { icon: HelpCircle, label: "퀴즈" },
  challenge: { icon: Target, label: "챌린지" },
  reflection: { icon: BookOpen, label: "생각해보기" },
};

// ─── Quiz Section Component ─────────────────────────────────────────

function QuizSection({
  section,
}: {
  section: ContentSection;
}) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const correctAnswer = section.quiz_answer ?? 0;
  const isCorrect = selectedOption === correctAnswer;

  return (
    <div className="space-y-4">
      {/* Quiz body */}
      <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {section.body}
        </ReactMarkdown>
      </div>

      {/* Options */}
      {section.quiz_options && (
        <div className="space-y-2">
          {section.quiz_options.map((option, optIdx) => {
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
          {section.body}
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
}: ModuleContentProps) {
  const router = useRouter();
  const [completing, setCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(
    progress?.status === "completed",
  );
  const startTimeRef = useRef<number>(Date.now());
  const [showChat, setShowChat] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = sections.length;

  const typeConfig = moduleType ? MODULE_TYPE_CONFIG[moduleType] : null;
  const TypeIcon = typeConfig?.icon ?? BookOpen;

  // Mark as in_progress on mount if not already completed
  useEffect(() => {
    if (progress?.status !== "completed" && progress?.status !== "in_progress") {
      updateLearningProgress(moduleId, "in_progress");
    }
  }, [moduleId, progress?.status]);

  // Keyboard navigation: ← → arrow keys
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft" && currentStep > 0) {
        setCurrentStep((prev) => prev - 1);
      } else if (e.key === "ArrowRight" && currentStep < totalSteps - 1) {
        setCurrentStep((prev) => prev + 1);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, totalSteps]);

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

  function handleNext() {
    if (nextModuleId) {
      router.push(`/learning/${learningPathId}/${nextModuleId}`);
    } else {
      router.push(`/learning/${learningPathId}`);
    }
  }

  return (
    <div className="space-y-6">
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

      {/* Progress bar + step counter */}
      <div className="space-y-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-1.5 rounded-full bg-zinc-900 transition-all duration-300 dark:bg-white"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          {(() => {
            const currentSection = sections[currentStep];
            const sectionConfig = currentSection
              ? SECTION_TYPE_CONFIG[currentSection.type]
              : null;
            const SectionIcon = sectionConfig?.icon ?? BookOpen;
            return (
              <span className="flex items-center gap-1">
                <SectionIcon className="h-3 w-3" />
                {sectionConfig?.label ?? "설명"}
              </span>
            );
          })()}
          <span>
            {currentStep + 1} / {totalSteps}
          </span>
        </div>
      </div>

      {/* Step cards: hidden/block toggle for state preservation */}
      <div>
        {sections.map((section, idx) => (
          <div key={idx} className={idx === currentStep ? "block" : "hidden"}>
            {section.title && (
              <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {section.title}
              </h2>
            )}

            {section.type === "quiz_question" ? (
              <QuizSection section={section} />
            ) : section.type === "challenge" ? (
              <ChallengeSection section={section} />
            ) : (
              <div className="space-y-4">
                <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {section.body}
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
            )}
          </div>
        ))}
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <Button
          variant="ghost"
          onClick={() => setCurrentStep((prev) => prev - 1)}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          이전
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowChat(!showChat)}
        >
          {showChat ? "채팅 닫기" : "AI 튜터"}
        </Button>

        {currentStep < totalSteps - 1 ? (
          <Button onClick={() => setCurrentStep((prev) => prev + 1)}>
            다음
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : !isCompleted ? (
          <Button onClick={handleComplete} disabled={completing}>
            {completing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                완료
              </>
            )}
          </Button>
        ) : (
          <Button onClick={handleNext}>
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

      {/* AI Tutor Chat Panel */}
      {showChat && (
        <div className="h-[500px]">
          <TutorChat
            projectId={projectId}
            learningPathId={learningPathId}
          />
        </div>
      )}
    </div>
  );
}
