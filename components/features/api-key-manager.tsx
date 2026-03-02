"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Check, Plus, Trash2, Ban, Key, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  deleteApiKey,
} from "@/server/actions/api-keys";

interface ApiKeyItem {
  id: string;
  key_prefix: string;
  name: string;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
}

export function ApiKeyManager() {
  const t = useTranslations("Settings");
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setListLoading(true);
    const result = await listApiKeys();
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

  async function handleCreate() {
    setError(null);
    setLoading(true);

    const result = await createApiKey(newKeyName || "default");

    if (result.success && result.data) {
      setCreatedKey(result.data.key);
      setNewKeyName("");
      await fetchKeys();
    } else {
      setError(result.error ?? "Failed to create key");
    }
    setLoading(false);
  }

  async function handleCopy() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRevoke(keyId: string) {
    const result = await revokeApiKey(keyId);
    if (result.success) {
      await fetchKeys();
    }
  }

  async function handleDelete(keyId: string) {
    const result = await deleteApiKey(keyId);
    if (result.success) {
      await fetchKeys();
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-text-muted" />
          <CardTitle>{t("apiKey.title")}</CardTitle>
        </div>
        <CardDescription>
          {t("apiKey.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create new key */}
        <div className="flex gap-2">
          <Input
            placeholder={t("apiKey.inputPlaceholder")}
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
          <Button onClick={handleCreate} disabled={loading} className="shrink-0">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {t("apiKey.create")}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {/* Show newly created key */}
        {createdKey && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
            <p className="mb-2 text-sm font-medium text-green-300">
              {t("apiKey.createdMessage")}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-[rgba(0,0,0,0.3)] px-3 py-2 font-mono text-sm text-green-200 border border-border-default">
                {createdKey}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <button
              onClick={() => setCreatedKey(null)}
              className="mt-2 text-xs text-green-400 underline hover:text-green-300 transition-colors"
            >
              {t("apiKey.close")}
            </button>
          </div>
        )}

        {/* Key list */}
        {listLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : keys.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">
            {t("apiKey.noKeys")}
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
                    <span className="font-medium text-sm text-text-primary">
                      {key.name}
                    </span>
                    {!key.is_active && (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400 border border-red-500/20">
                        {t("apiKey.inactive")}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-text-faint">
                    <code className="font-mono">{key.key_prefix}...****</code>
                    <span>
                      {t("apiKey.created")} {new Date(key.created_at).toLocaleDateString()}
                    </span>
                    {key.last_used_at && (
                      <span>
                        {t("apiKey.lastUsed")}{" "}
                        {new Date(key.last_used_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {key.is_active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(key.id)}
                      title={t("apiKey.deactivate")}
                    >
                      <Ban className="h-4 w-4 text-text-faint" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(key.id)}
                    title={t("apiKey.delete")}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
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
