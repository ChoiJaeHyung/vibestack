"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { RefreshCw, X, Database, BookOpen, Code, AlertTriangle, Loader2 } from "lucide-react";
import {
  getKBList,
  regenerateKB,
  getRegenerationImpact,
  type KBListItem,
  type RegenerationResult,
  type RegenerationImpact,
} from "@/server/actions/admin-knowledge";

type LocaleFilter = "all" | "ko" | "en";

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function coverageColor(pct: number): string {
  if (pct >= 80) return "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400";
  if (pct >= 50) return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400";
}

function statusDot(status: string) {
  if (status === "ready") {
    return <span className="inline-block h-2 w-2 rounded-full bg-green-400" />;
  }
  if (status === "generating") {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
        <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
      </span>
    );
  }
  return <span className="inline-block h-2 w-2 rounded-full bg-red-400" />;
}

export default function AdminKnowledgePage() {
  const [items, setItems] = useState<KBListItem[]>([]);
  const [localeFilter, setLocaleFilter] = useState<LocaleFilter>("all");
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Regeneration modal state
  const [modalTarget, setModalTarget] = useState<KBListItem | null>(null);
  const [impact, setImpact] = useState<RegenerationImpact | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null); // kb id being regenerated
  const [regenResult, setRegenResult] = useState<RegenerationResult | null>(null);

  const fetchedRef = useRef(false);

  const fetchData = useCallback(() => {
    startTransition(async () => {
      const result = await getKBList();
      if (result.success && result.data) {
        setItems(result.data);
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchData();
  }, [fetchData]);

  const filtered = localeFilter === "all"
    ? items
    : items.filter((item) => item.locale === localeFilter);

  // Summary stats
  const totalKBs = items.length;
  const totalConcepts = items.reduce((sum, i) => sum + i.conceptCount, 0);
  const totalSigs = items.reduce((sum, i) => sum + i.codeSignatureCount, 0);
  const totalSigsTotal = items.reduce((sum, i) => sum + i.codeSignatureTotal, 0);
  const overallCoverage = totalSigsTotal > 0 ? Math.round((totalSigs / totalSigsTotal) * 100) : 0;

  async function openRegenModal(item: KBListItem) {
    setModalTarget(item);
    setImpact(null);
    setRegenResult(null);
    setImpactLoading(true);
    const result = await getRegenerationImpact(item.id);
    if (result.success && result.data) {
      setImpact(result.data);
    } else {
      setMessage({ type: "error", text: result.error ?? "Failed to load impact" });
      setModalTarget(null);
    }
    setImpactLoading(false);
  }

  async function confirmRegenerate() {
    if (!modalTarget) return;
    setRegenerating(modalTarget.id);
    try {
      const result = await regenerateKB(modalTarget.id);
      if (result.success && result.data) {
        setRegenResult(result.data);
        setMessage({ type: "success", text: `Regenerated KB for ${modalTarget.technologyName}` });
        fetchData();
      } else {
        setMessage({ type: "error", text: result.error ?? "Regeneration failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Unexpected error during regeneration" });
    }
    setRegenerating(null);
  }

  function closeModal() {
    setModalTarget(null);
    setImpact(null);
    setRegenResult(null);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-primary">Knowledge Base Management</h1>

      {message && (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
              : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
          }`}
        >
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-2 text-xs opacity-70 hover:opacity-100">
            dismiss
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border-default bg-bg-surface p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <Database className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Total KBs</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-text-primary">{totalKBs}</p>
        </div>
        <div className="rounded-2xl border border-border-default bg-bg-surface p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <BookOpen className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Total Concepts</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-text-primary">{totalConcepts}</p>
        </div>
        <div className="rounded-2xl border border-border-default bg-bg-surface p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <Code className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Code Signature Coverage</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-text-primary">{overallCoverage}%</p>
        </div>
      </div>

      {/* Locale Filter */}
      <div className="mb-4 flex gap-1 rounded-xl bg-bg-input p-1 border border-border-default w-fit">
        {(["all", "ko", "en"] as const).map((locale) => (
          <button
            key={locale}
            onClick={() => setLocaleFilter(locale)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              localeFilter === locale
                ? "bg-violet-500/10 text-violet-700 dark:text-violet-300"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {locale === "all" ? "All" : locale.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-border-default">
        <table className="w-full text-sm">
          <thead className="border-b border-border-default bg-bg-surface">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Technology</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Locale</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Concepts</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Code Signatures</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Source</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Status</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Generated At</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {filtered.map((item) => {
              const pct = item.codeSignatureTotal > 0
                ? Math.round((item.codeSignatureCount / item.codeSignatureTotal) * 100)
                : 0;
              return (
                <tr key={item.id} className="hover:bg-bg-surface">
                  <td className="px-4 py-3 font-semibold text-text-primary">
                    {item.technologyName}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full border border-border-default bg-bg-input px-2 py-0.5 text-xs font-medium text-text-muted">
                      {item.locale.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{item.conceptCount}</td>
                  <td className="px-4 py-3">
                    <span className="text-text-muted">
                      {item.codeSignatureCount} / {item.codeSignatureTotal}
                    </span>
                    <span
                      className={`ml-2 inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${coverageColor(pct)}`}
                    >
                      {pct}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs font-medium text-text-muted border border-zinc-500/20">
                      {item.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-text-muted">
                      {statusDot(item.generationStatus)}
                      <span className="text-xs">{item.generationStatus}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {item.generatedAt ? formatRelativeTime(item.generatedAt) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openRegenModal(item)}
                      disabled={regenerating !== null || isPending}
                      className="inline-flex items-center gap-1 rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-bg-input hover:text-text-primary disabled:opacity-50 transition-colors"
                    >
                      {regenerating === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Regenerate
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && loaded && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-text-muted">
                  No knowledge bases found
                </td>
              </tr>
            )}
            {!loaded && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-text-muted">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Regeneration Confirmation Modal */}
      {modalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-2xl border border-border-default bg-bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">
                Regenerate KB: {modalTarget.technologyName} ({modalTarget.locale.toUpperCase()})
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1 text-text-muted hover:bg-bg-input hover:text-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {impactLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
              </div>
            )}

            {impact && !regenResult && (
              <>
                <div className="mb-4 space-y-2 rounded-xl border border-border-default bg-bg-surface p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Concepts</span>
                    <span className="font-medium text-text-primary">{impact.conceptCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Code Signatures</span>
                    <span className="font-medium text-text-primary">{impact.codeSignatureCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Linked Mastery Records</span>
                    <span className="font-medium text-text-primary">{impact.linkedMasteryRecords}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Linked Projects</span>
                    <span className="font-medium text-text-primary">{impact.linkedProjects}</span>
                  </div>
                </div>

                {impact.linkedMasteryRecords > 0 && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{impact.linkedMasteryRecords} mastery records may be affected</span>
                  </div>
                )}

                <p className="mb-4 text-xs text-text-muted">
                  Regeneration will update concepts with new LLM output. Existing concept keys will be preserved where possible.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 rounded-xl border border-border-default px-4 py-2 text-sm font-medium text-text-muted hover:bg-bg-input transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRegenerate}
                    disabled={regenerating !== null}
                    className="flex-1 rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    {regenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      "Confirm Regenerate"
                    )}
                  </button>
                </div>
              </>
            )}

            {regenResult && (
              <>
                <div className="mb-4 space-y-2 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm">
                  <p className="mb-2 font-medium text-green-700 dark:text-green-400">Regeneration Complete</p>
                  <div className="flex justify-between">
                    <span className="text-green-700/70 dark:text-green-400/70">Kept</span>
                    <span className="font-medium text-green-700 dark:text-green-400">{regenResult.kept}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700/70 dark:text-green-400/70">Added</span>
                    <span className="font-medium text-green-700 dark:text-green-400">{regenResult.added}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700/70 dark:text-green-400/70">Removed</span>
                    <span className="font-medium text-green-700 dark:text-green-400">{regenResult.removed}</span>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-full rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 transition-colors"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
