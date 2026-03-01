"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Brain, Send, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/features/upgrade-modal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  sendTutorMessage,
  getChatHistory,
} from "@/server/actions/learning";
import { invalidateCache } from "@/lib/hooks/use-cached-fetch";
import type { UsageData } from "@/server/actions/usage";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface TutorChatProps {
  projectId: string;
  learningPathId?: string;
  conversationId?: string;
}

export function TutorChat({
  projectId,
  learningPathId,
  conversationId: initialConversationId,
}: TutorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId,
  );
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [remainingChats, setRemainingChats] = useState<number | null>(null);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load existing conversation history
  useEffect(() => {
    if (!initialConversationId) return;

    async function loadHistory() {
      setLoadingHistory(true);
      try {
        const result = await getChatHistory(initialConversationId as string);
        if (result.success && result.data) {
          const chatMessages = result.data.filter(
            (m): m is ChatMessage =>
              m.role === "user" || m.role === "assistant",
          );
          setMessages(chatMessages);
        }
      } catch {
        // Ignore load errors
      } finally {
        setLoadingHistory(false);
      }
    }

    loadHistory();
  }, [initialConversationId]);

  // Fetch usage data on mount
  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch("/api/usage");
        const json = await res.json();
        if (json.success && json.data) {
          const data = json.data as UsageData;
          if (data.aiChats.limit === null) {
            setIsUnlimited(true);
          } else {
            setRemainingChats(Math.max(data.aiChats.limit - data.aiChats.used, 0));
          }
        }
      } catch {
        // Ignore fetch errors
      }
    }
    fetchUsage();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [input]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setLoading(true);

    try {
      const result = await sendTutorMessage(
        projectId,
        trimmed,
        conversationId,
        learningPathId,
      );

      if (result.success && result.data) {
        // Invalidate dashboard cache when a new conversation is created
        if (!conversationId) {
          invalidateCache("/api/dashboard");
        }
        setConversationId(result.data.conversation_id);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.data!.response },
        ]);
        // Update remaining count after successful send
        if (remainingChats !== null) {
          setRemainingChats((prev) => (prev !== null ? Math.max(prev - 1, 0) : null));
        }
      } else {
        const errMsg = result.error ?? "메시지 전송에 실패했습니다";
        if (errMsg.toLowerCase().includes("limit") || errMsg.includes("한도")) {
          setShowUpgradeModal(true);
        }
        setError(errMsg);
      }
    } catch {
      setError("알 수 없는 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border-default bg-bg-surface">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border-default px-4 py-3">
        <Brain className="h-4 w-4 text-violet-400" />
        <span className="text-sm font-medium text-text-primary">
          AI 튜터
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : messages.length === 0 ? (
          <div className="space-y-5 py-6">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20">
                <Brain className="h-6 w-6 text-violet-400" />
              </div>
              <h3 className="mt-3 text-sm font-medium text-text-secondary">AI 튜터에게 질문하세요</h3>
              <p className="mt-1 text-xs text-text-faint">프로젝트 코드를 이해하고 맥락에 맞게 답변합니다</p>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-widest text-text-dim">추천 질문</p>
              {[
                "이 모듈에서 배운 개념을 실제 프로젝트에 어떻게 적용하나요?",
                "이 코드가 왜 이렇게 작성되었는지 설명해 주세요",
                "이 기술의 장단점을 알려주세요",
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(prompt);
                  }}
                  className="block w-full rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-left text-sm text-text-muted hover:border-border-hover hover:text-text-secondary transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/10">
                    <Brain className="h-3.5 w-3.5 text-violet-400" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 ${
                    msg.role === "user"
                      ? "bg-violet-500/20 text-text-primary"
                      : "bg-bg-input text-text-primary"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500">
                    <User className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/10">
                  <Brain className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <div className="rounded-xl bg-bg-input px-3 py-3">
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-text-faint animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-text-faint animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-text-faint animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border-default p-3">
        {!isUnlimited && remainingChats !== null && (
          <p className="mb-1.5 text-xs text-text-faint">
            남은 대화: {remainingChats}회
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="질문을 입력하세요... (Shift+Enter: 줄바꿈)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border-default bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/40 transition-all duration-200"
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="sm"
            className="shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="chat"
      />
    </div>
  );
}
