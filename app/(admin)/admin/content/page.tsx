"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import {
  listAllProjects,
  listAllLearningPaths,
  deleteProjectAdmin,
  deleteLearningPathAdmin,
} from "@/server/actions/admin";

type Tab = "projects" | "learning";

interface ProjectItem {
  id: string;
  name: string;
  status: string;
  user_id: string;
  user_email?: string;
  created_at: string;
  updated_at: string;
}

interface LearningItem {
  id: string;
  title: string;
  status: string;
  user_id: string;
  user_email?: string;
  difficulty: string | null;
  total_modules: number;
  created_at: string;
}

export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState<Tab>("projects");
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  function fetchData(newPage: number, tab?: Tab) {
    const currentTab = tab ?? activeTab;
    startTransition(async () => {
      if (currentTab === "projects") {
        const result = await listAllProjects(newPage, search || undefined);
        if (result.success && result.data) {
          setProjects(result.data.items);
          setTotal(result.data.total);
          setPage(result.data.page);
        }
      } else {
        const result = await listAllLearningPaths(newPage, search || undefined);
        if (result.success && result.data) {
          setLearningPaths(result.data.items);
          setTotal(result.data.total);
          setPage(result.data.page);
        }
      }
      setLoaded(true);
    });
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setSearch("");
    setPage(1);
    setLoaded(false);
    fetchData(1, tab);
  }

  function handleDeleteProject(id: string) {
    if (!confirm("Are you sure you want to delete this project? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteProjectAdmin(id);
      if (result.success) {
        setMessage({ type: "success", text: "Project deleted" });
        fetchData(page);
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed to delete" });
      }
    });
  }

  function handleDeletePath(id: string) {
    if (!confirm("Are you sure you want to delete this learning path? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteLearningPathAdmin(id);
      if (result.success) {
        setMessage({ type: "success", text: "Learning path deleted" });
        fetchData(page);
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed to delete" });
      }
    });
  }

  // Load initial data
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchData(1);
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Content Management
      </h1>

      {message && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        {(["projects", "learning"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            {tab === "projects" ? "Projects" : "Learning Paths"}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab === "projects" ? "projects" : "learning paths"}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchData(1)}
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <button
          onClick={() => fetchData(1)}
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending ? "Loading..." : "Search"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                {activeTab === "projects" ? "Name" : "Title"}
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Owner</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Created</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {activeTab === "projects" ? (
              projects.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{p.name}</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {p.user_email ?? p.user_id.slice(0, 8) + "..."}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDeleteProject(p.id)}
                      disabled={isPending}
                      className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              learningPaths.map((lp) => (
                <tr key={lp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {lp.title}
                    <span className="ml-2 text-xs text-zinc-400">
                      ({lp.total_modules} modules)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {lp.user_email ?? lp.user_id.slice(0, 8) + "..."}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {lp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {new Date(lp.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDeletePath(lp.id)}
                      disabled={isPending}
                      className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
            {((activeTab === "projects" && projects.length === 0) ||
              (activeTab === "learning" && learningPaths.length === 0)) &&
              loaded && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    No {activeTab === "projects" ? "projects" : "learning paths"} found
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{total} total</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(page - 1)}
              disabled={page <= 1 || isPending}
              className="rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => fetchData(page + 1)}
              disabled={page >= totalPages || isPending}
              className="rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
