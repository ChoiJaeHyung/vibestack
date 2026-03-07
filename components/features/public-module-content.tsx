"use client";

import ReactMarkdown from "react-markdown";
import { Lock } from "lucide-react";

interface Section {
  type: string;
  title: string;
  body?: string;
  code?: string;
  quiz_options?: string[];
  quiz_answer?: number;
  quiz_explanation?: string;
  challenge_starter_code?: string;
  challenge_answer_code?: string;
}

interface Props {
  sections: unknown[];
  isKo: boolean;
}

export function PublicModuleContent({ sections, isKo }: Props) {
  const typedSections = sections as Section[];

  return (
    <div className="space-y-8">
      {typedSections.map((section, idx) => (
        <div key={idx} className="rounded-xl border border-border-default bg-bg-primary p-6">
          {section.type === "explanation" && (
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">{section.title}</h3>
              <div className="prose prose-sm max-w-none text-text-secondary prose-headings:text-text-primary prose-strong:text-text-secondary prose-a:text-violet-400 prose-code:text-violet-400 prose-code:bg-bg-code prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-xs">
                <ReactMarkdown>{section.body ?? ""}</ReactMarkdown>
              </div>
            </div>
          )}

          {section.type === "code_example" && (
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-3">{section.title}</h3>
              {section.body && (
                <div className="prose prose-sm max-w-none text-text-secondary mb-4">
                  <ReactMarkdown>{section.body}</ReactMarkdown>
                </div>
              )}
              {section.code && (
                <div className="rounded-lg bg-[#1e1e2e] border border-border-default overflow-hidden">
                  <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                  </div>
                  <pre className="p-4 text-xs leading-relaxed overflow-x-auto text-gray-300">
                    <code>{section.code}</code>
                  </pre>
                </div>
              )}
            </div>
          )}

          {section.type === "quiz_question" && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-0.5">
                  Quiz
                </span>
                <h3 className="text-lg font-semibold text-text-primary">{section.title}</h3>
              </div>
              <div className="prose prose-sm max-w-none text-text-secondary mb-4">
                <ReactMarkdown>{section.body ?? ""}</ReactMarkdown>
              </div>
              {section.quiz_options && (
                <div className="space-y-2 mb-4">
                  {section.quiz_options.map((opt, oi) => (
                    <div
                      key={oi}
                      className="flex items-center gap-3 rounded-lg border border-border-default bg-bg-input px-4 py-3 text-sm text-text-secondary"
                    >
                      <span className="shrink-0 w-6 h-6 rounded-full border border-border-default flex items-center justify-center text-xs font-medium">
                        {String.fromCharCode(65 + oi)}
                      </span>
                      {opt}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Lock className="h-3.5 w-3.5" />
                {isKo ? "로그인하면 퀴즈를 풀고 점수를 확인할 수 있어요" : "Log in to take the quiz and check your score"}
              </div>
            </div>
          )}

          {section.type === "challenge" && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2.5 py-0.5">
                  Challenge
                </span>
                <h3 className="text-lg font-semibold text-text-primary">{section.title}</h3>
              </div>
              <div className="prose prose-sm max-w-none text-text-secondary mb-4">
                <ReactMarkdown>{section.body ?? ""}</ReactMarkdown>
              </div>
              {section.challenge_starter_code && (
                <div className="rounded-lg bg-[#1e1e2e] border border-border-default overflow-hidden mb-3">
                  <div className="px-4 py-2 border-b border-white/5 text-xs text-gray-400">
                    {isKo ? "빈칸을 채워보세요" : "Fill in the blanks"}
                  </div>
                  <pre className="p-4 text-xs leading-relaxed overflow-x-auto text-gray-300">
                    <code>{section.challenge_starter_code}</code>
                  </pre>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Lock className="h-3.5 w-3.5" />
                {isKo ? "로그인하면 직접 코드를 작성하고 정답을 확인할 수 있어요" : "Log in to write code and check the answer"}
              </div>
            </div>
          )}

          {section.type === "reflection" && (
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
              <h3 className="text-lg font-semibold text-text-primary mb-3">{section.title}</h3>
              <div className="prose prose-sm max-w-none text-text-secondary">
                <ReactMarkdown>{section.body ?? ""}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
