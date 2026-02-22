"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Check, Plus, Trash2, Ban, Key, Loader2 } from "lucide-react";
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
          <Key className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          <CardTitle>API Keys</CardTitle>
        </div>
        <CardDescription>
          MCP 서버 및 CLI에서 사용할 API 키를 관리합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create new key */}
        <div className="flex gap-2">
          <Input
            placeholder="키 이름 (예: my-mcp-server)"
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
            생성
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {/* Show newly created key */}
        {createdKey && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
            <p className="mb-2 text-sm font-medium text-green-800 dark:text-green-200">
              API 키가 생성되었습니다. 이 키는 다시 표시되지 않으니 안전한 곳에 저장하세요.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-green-100 px-3 py-2 font-mono text-sm text-green-900 dark:bg-green-900 dark:text-green-100">
                {createdKey}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <button
              onClick={() => setCreatedKey(null)}
              className="mt-2 text-xs text-green-700 underline dark:text-green-300"
            >
              닫기
            </button>
          </div>
        )}

        {/* Key list */}
        {listLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : keys.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            생성된 API 키가 없습니다
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
                    <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                      {key.name}
                    </span>
                    {!key.is_active && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900 dark:text-red-300">
                        비활성
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <code>{key.key_prefix}...****</code>
                    <span>
                      생성: {new Date(key.created_at).toLocaleDateString()}
                    </span>
                    {key.last_used_at && (
                      <span>
                        마지막 사용:{" "}
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
                      title="비활성화"
                    >
                      <Ban className="h-4 w-4 text-zinc-500" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(key.id)}
                    title="삭제"
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
