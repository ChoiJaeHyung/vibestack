"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Brain,
  Plus,
  Trash2,
  Loader2,
  Star,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  saveLlmKey,
  listLlmKeys,
  deleteLlmKey,
  validateLlmKey,
  setDefaultLlmKey,
} from "@/server/actions/llm-keys";

type LlmProvider =
  | "anthropic"
  | "openai"
  | "google"
  | "groq"
  | "mistral"
  | "deepseek"
  | "cohere"
  | "together"
  | "fireworks"
  | "xai"
  | "openrouter";

interface LlmKeyItem {
  id: string;
  provider: LlmProvider;
  display_hint: string | null;
  is_valid: boolean;
  is_default: boolean;
  last_verified_at: string | null;
  created_at: string;
}

const PROVIDER_OPTIONS: Array<{ value: LlmProvider; label: string }> = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "google", label: "Google (Gemini)" },
  { value: "groq", label: "Groq" },
  { value: "mistral", label: "Mistral" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "cohere", label: "Cohere" },
  { value: "together", label: "Together AI" },
  { value: "fireworks", label: "Fireworks AI" },
  { value: "xai", label: "xAI (Grok)" },
  { value: "openrouter", label: "OpenRouter" },
];

function getProviderLabel(provider: LlmProvider): string {
  return (
    PROVIDER_OPTIONS.find((p) => p.value === provider)?.label ?? provider
  );
}

function getProviderColor(provider: LlmProvider): string {
  const colors: Record<LlmProvider, string> = {
    anthropic:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    openai:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    google:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    groq: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    mistral:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    deepseek:
      "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
    cohere:
      "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
    together:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    fireworks:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    xai: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
    openrouter:
      "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  };
  return colors[provider];
}

export function LlmKeyManager() {
  const [keys, setKeys] = useState<LlmKeyItem[]>([]);
  const [selectedProvider, setSelectedProvider] =
    useState<LlmProvider>("anthropic");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setListLoading(true);
    const result = await listLlmKeys();
    if (result.success && result.data) {
      setKeys(result.data);
    }
    setListLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchKeys();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [fetchKeys]);

  async function handleValidate() {
    if (!apiKeyInput.trim()) {
      setError("API 키를 입력해주세요");
      return;
    }

    setError(null);
    setValidationResult(null);
    setValidating(true);

    const result = await validateLlmKey(selectedProvider, apiKeyInput);

    if (result.success && result.valid !== undefined) {
      setValidationResult({
        valid: result.valid,
        message: result.valid
          ? "API 키가 유효합니다"
          : result.error ?? "API 키가 유효하지 않습니다",
      });
    } else {
      setError(result.error ?? "검증 중 오류가 발생했습니다");
    }
    setValidating(false);
  }

  async function handleSave() {
    if (!apiKeyInput.trim()) {
      setError("API 키를 입력해주세요");
      return;
    }

    setError(null);
    setLoading(true);

    const result = await saveLlmKey(selectedProvider, apiKeyInput);

    if (result.success) {
      setApiKeyInput("");
      setShowApiKey(false);
      setValidationResult(null);
      await fetchKeys();
    } else {
      setError(result.error ?? "저장 중 오류가 발생했습니다");
    }
    setLoading(false);
  }

  async function handleDelete(keyId: string) {
    setDeletingId(keyId);
    const result = await deleteLlmKey(keyId);
    if (result.success) {
      await fetchKeys();
    } else {
      setError(result.error ?? "삭제 중 오류가 발생했습니다");
    }
    setDeletingId(null);
  }

  async function handleSetDefault(keyId: string) {
    setSettingDefaultId(keyId);
    const result = await setDefaultLlmKey(keyId);
    if (result.success) {
      await fetchKeys();
    } else {
      setError(result.error ?? "기본 설정 중 오류가 발생했습니다");
    }
    setSettingDefaultId(null);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          <CardTitle>LLM API Keys</CardTitle>
        </div>
        <CardDescription>
          AI 분석에 사용할 LLM 프로바이더의 API 키를 등록합니다 (BYOK)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider selector + API key input */}
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative shrink-0 sm:w-48">
              <select
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value as LlmProvider);
                  setValidationResult(null);
                  setError(null);
                }}
                className="flex h-10 w-full appearance-none rounded-lg border border-zinc-200 bg-white px-3 py-2 pr-8 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-300"
              >
                {PROVIDER_OPTIONS.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            </div>
            <div className="relative flex-1">
              <Input
                type={showApiKey ? "text" : "password"}
                placeholder="API 키를 입력하세요"
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setValidationResult(null);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleValidate}
              disabled={validating || !apiKeyInput.trim()}
              className="shrink-0"
            >
              {validating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              검증
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !apiKeyInput.trim()}
              className="shrink-0"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              저장
            </Button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {/* Validation result */}
        {validationResult && (
          <div
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
              validationResult.valid
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
            }`}
          >
            {validationResult.valid ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            {validationResult.message}
          </div>
        )}

        {/* Key list */}
        {listLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : keys.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            등록된 LLM API 키가 없습니다
          </p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getProviderColor(key.provider)}`}
                    >
                      {getProviderLabel(key.provider)}
                    </span>
                    {key.is_valid ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Valid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        <XCircle className="h-3 w-3" />
                        Invalid
                      </span>
                    )}
                    {key.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                        <Star className="h-3 w-3" />
                        기본
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <code>****{key.display_hint ?? "***"}</code>
                    <span>
                      등록: {new Date(key.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!key.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(key.id)}
                      disabled={settingDefaultId === key.id}
                      title="기본 설정"
                    >
                      {settingDefaultId === key.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                      ) : (
                        <Star className="h-4 w-4 text-zinc-400" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(key.id)}
                    disabled={deletingId === key.id}
                    title="삭제"
                  >
                    {deletingId === key.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-500" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
