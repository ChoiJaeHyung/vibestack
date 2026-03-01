"use client";

import { useState, useCallback } from "react";
import { Search, ExternalLink, Clock, X } from "lucide-react";

interface TutorSearchProps {
  techName?: string;
  moduleName?: string;
}

const STORAGE_KEY = "vibeuniv-tutor-recent-searches";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === "string").slice(0, MAX_RECENT);
    return [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const recent = getRecentSearches().filter((s) => s !== query);
  recent.unshift(query);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function removeRecentSearch(query: string) {
  const recent = getRecentSearches().filter((s) => s !== query);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
}

function openGoogleSearch(query: string) {
  window.open(
    `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

export function TutorSearch({ techName, moduleName }: TutorSearchProps) {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());

  const handleSearch = useCallback(
    (searchQuery?: string) => {
      const q = (searchQuery ?? query).trim();
      if (!q) return;
      saveRecentSearch(q);
      setRecentSearches(getRecentSearches());
      openGoogleSearch(q);
      if (!searchQuery) setQuery("");
    },
    [query],
  );

  const handleRemoveRecent = useCallback((e: React.MouseEvent, q: string) => {
    e.stopPropagation();
    removeRecentSearch(q);
    setRecentSearches(getRecentSearches());
  }, []);

  const keyword = techName || moduleName;

  const suggestions = keyword
    ? [
        `${keyword} 기초 쉽게 설명`,
        `${keyword} 사용법 예제`,
        `${keyword} 공식 문서`,
        `${keyword} 초보자 튜토리얼`,
      ]
    : [];

  return (
    <div className="flex h-full flex-col">
      {/* Header info */}
      <div className="border-b border-border-default px-4 py-5 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
          <Search className="h-5 w-5 text-violet-400" />
        </div>
        <p className="text-sm font-medium text-text-primary">
          궁금한 걸 검색해보세요
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Google에서 새 탭으로 검색 결과를 확인할 수 있어요
        </p>
      </div>

      {/* Search input */}
      <div className="px-4 pt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="검색어를 입력하세요"
            className="flex-1 rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={!query.trim()}
            className="flex items-center justify-center rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Suggested searches */}
        {suggestions.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-xs font-medium text-text-muted">
              추천 검색어
            </p>
            <div className="flex flex-col gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSearch(s)}
                  className="group flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-bg-input hover:text-text-primary"
                >
                  <span className="truncate">{s}</span>
                  <ExternalLink className="ml-2 h-3.5 w-3.5 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent searches */}
        {recentSearches.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-text-muted">
              최근 검색어
            </p>
            <div className="flex flex-col gap-1">
              {recentSearches.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSearch(s)}
                  className="group flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-bg-input hover:text-text-primary"
                >
                  <Clock className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                  <span className="flex-1 truncate">{s}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handleRemoveRecent(e, s)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        removeRecentSearch(s);
                        setRecentSearches(getRecentSearches());
                      }
                    }}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-muted opacity-0 transition-opacity hover:text-text-primary group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
