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
  ExternalLink,
} from "lucide-react";
import { useTranslations } from "next-intl";
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

const PROVIDER_KEY_URLS: Partial<Record<LlmProvider, string>> = {
  anthropic: "https://console.anthropic.com/settings/keys",
  openai: "https://platform.openai.com/api-keys",
  google: "https://aistudio.google.com/apikey",
  groq: "https://console.groq.com/keys",
  mistral: "https://console.mistral.ai/api-keys",
  deepseek: "https://platform.deepseek.com/api_keys",
};

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
    anthropic: "bg-orange-500/10 text-orange-300 border border-orange-500/20",
    openai: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20",
    google: "bg-blue-500/10 text-blue-300 border border-blue-500/20",
    groq: "bg-purple-500/10 text-purple-300 border border-purple-500/20",
    mistral: "bg-amber-500/10 text-amber-300 border border-amber-500/20",
    deepseek: "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20",
    cohere: "bg-rose-500/10 text-rose-300 border border-rose-500/20",
    together: "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20",
    fireworks: "bg-red-500/10 text-red-300 border border-red-500/20",
    xai: "bg-zinc-500/10 text-zinc-300 border border-zinc-500/20",
    openrouter: "bg-violet-500/10 text-violet-300 border border-violet-500/20",
  };
  return colors[provider];
}

export function LlmKeyManager() {
  const t = useTranslations("Settings");
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
      setError(t("llmKey.enterKey"));
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
          ? t("llmKey.validKey")
          : result.error ?? t("llmKey.invalidKey"),
      });
    } else {
      setError(result.error ?? t("llmKey.validationError"));
    }
    setValidating(false);
  }

  async function handleSave() {
    if (!apiKeyInput.trim()) {
      setError(t("llmKey.enterKey"));
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
      setError(result.error ?? t("llmKey.saveError"));
    }
    setLoading(false);
  }

  async function handleDelete(keyId: string) {
    setDeletingId(keyId);
    const result = await deleteLlmKey(keyId);
    if (result.success) {
      await fetchKeys();
    } else {
      setError(result.error ?? t("llmKey.deleteError"));
    }
    setDeletingId(null);
  }

  async function handleSetDefault(keyId: string) {
    setSettingDefaultId(keyId);
    const result = await setDefaultLlmKey(keyId);
    if (result.success) {
      await fetchKeys();
    } else {
      setError(result.error ?? t("llmKey.setDefaultError"));
    }
    setSettingDefaultId(null);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-text-muted" />
          <CardTitle>{t("llmKey.title")}</CardTitle>
        </div>
        <CardDescription>
          {t("llmKey.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* BYOK explanation */}
        <div className="rounded-xl border border-border-default bg-bg-input px-4 py-3 text-sm text-text-muted">
          <strong className="text-text-secondary">{t("llmKey.byokTitle")}</strong>{t("llmKey.byokDescription")}
        </div>

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
                className="flex h-10 w-full appearance-none rounded-xl border border-border-default bg-bg-input px-3 py-2 pr-8 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/40 transition-all duration-200"
              >
                {PROVIDER_OPTIONS.map((provider) => (
                  <option key={provider.value} value={provider.value} className="bg-bg-elevated">
                    {provider.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            </div>
            <div className="relative flex-1">
              <Input
                type={showApiKey ? "text" : "password"}
                placeholder={t("llmKey.inputPlaceholder")}
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          {PROVIDER_KEY_URLS[selectedProvider] && (
            <a
              href={PROVIDER_KEY_URLS[selectedProvider]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-text-faint transition-colors hover:text-violet-400"
            >
              {t("llmKey.getKey", { provider: getProviderLabel(selectedProvider) })}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {!PROVIDER_KEY_URLS[selectedProvider] && (
            <p className="text-xs text-text-faint">
              {t("llmKey.getKeyGeneric")}
            </p>
          )}
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
              {t("llmKey.validate")}
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
              {t("llmKey.save")}
            </Button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {/* Validation result */}
        {validationResult && (
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
              validationResult.valid
                ? "border-green-500/30 bg-green-500/10 text-green-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
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
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : keys.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">
            {t("llmKey.noKeys")}
          </p>
        ) : (
          <div className="divide-y divide-border-default">
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
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-300 border border-green-500/20">
                        <CheckCircle2 className="h-3 w-3" />
                        Valid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-300 border border-red-500/20">
                        <XCircle className="h-3 w-3" />
                        Invalid
                      </span>
                    )}
                    {key.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300 border border-amber-500/20">
                        <Star className="h-3 w-3" />
                        {t("llmKey.default")}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-text-faint">
                    <code className="font-mono">****{key.display_hint ?? "***"}</code>
                    <span>
                      {t("llmKey.registered")} {new Date(key.created_at).toLocaleDateString()}
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
                      title={t("llmKey.setDefault")}
                    >
                      {settingDefaultId === key.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-text-faint" />
                      ) : (
                        <Star className="h-4 w-4 text-text-muted" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(key.id)}
                    disabled={deletingId === key.id}
                    title={t("llmKey.delete")}
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
