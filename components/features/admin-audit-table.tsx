"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getAuditLog } from "@/server/actions/admin";
import type { Json } from "@/types/database";

interface AuditItem {
  id: string;
  admin_id: string;
  admin_email?: string;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  details: Json;
  created_at: string;
}

interface AdminAuditTableProps {
  initialItems: AuditItem[];
  initialTotal: number;
  initialPage: number;
  pageSize: number;
}

export function AdminAuditTable({
  initialItems,
  initialTotal,
  initialPage,
  pageSize,
}: AdminAuditTableProps) {
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [actionFilter, setActionFilter] = useState("");
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalPages = Math.ceil(total / pageSize);

  function fetchLogs(newPage: number) {
    startTransition(async () => {
      const result = await getAuditLog(newPage, actionFilter || undefined);
      if (result.success && result.data) {
        setItems(result.data.items);
        setTotal(result.data.total);
        setPage(result.data.page);
      }
    });
  }

  const actionBadgeClass = (action: string) => {
    if (action.includes("ban")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    if (action.includes("delete")) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    if (action.includes("role")) return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  };

  return (
    <div>
      {/* Filter */}
      <div className="mb-4 flex gap-3">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="">All Actions</option>
          <option value="update_role">Role Changes</option>
          <option value="ban_user">Bans</option>
          <option value="unban_user">Unbans</option>
          <option value="override_plan">Plan Overrides</option>
          <option value="update_setting">Setting Updates</option>
          <option value="create_announcement">Announcements</option>
          <option value="delete_project">Project Deletions</option>
          <option value="delete_learning_path">Path Deletions</option>
        </select>
        <button
          onClick={() => fetchLogs(1)}
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending ? "Loading..." : "Filter"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Time</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Admin</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Action</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Target</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                  {new Date(item.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  {item.admin_email ?? item.admin_id.slice(0, 8)}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${actionBadgeClass(item.action_type)}`}>
                    {item.action_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                  {item.target_type && (
                    <span className="text-zinc-700 dark:text-zinc-300">{item.target_type}: </span>
                  )}
                  {item.target_id ? item.target_id.slice(0, 8) + "..." : "-"}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                  >
                    {expandedId === item.id ? "Hide" : "View"}
                  </button>
                  {expandedId === item.id && (
                    <pre className="mt-2 max-w-xs overflow-x-auto rounded bg-zinc-50 p-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                      {JSON.stringify(item.details, null, 2)}
                    </pre>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No audit log entries found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {total} entries total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1 || isPending}
              className="rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => fetchLogs(page + 1)}
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
