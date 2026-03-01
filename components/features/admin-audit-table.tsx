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
    if (action.includes("ban")) return "bg-red-500/10 text-red-300 border border-red-500/20";
    if (action.includes("delete")) return "bg-orange-500/10 text-orange-300 border border-orange-500/20";
    if (action.includes("role")) return "bg-purple-500/10 text-purple-300 border border-purple-500/20";
    return "bg-zinc-500/10 text-text-muted border border-zinc-500/20";
  };

  return (
    <div>
      {/* Filter */}
      <div className="mb-4 flex gap-3">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-xl border border-border-default bg-bg-input px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        >
          <option value="" className="bg-bg-elevated">All Actions</option>
          <option value="update_role" className="bg-bg-elevated">Role Changes</option>
          <option value="ban_user" className="bg-bg-elevated">Bans</option>
          <option value="unban_user" className="bg-bg-elevated">Unbans</option>
          <option value="override_plan" className="bg-bg-elevated">Plan Overrides</option>
          <option value="update_setting" className="bg-bg-elevated">Setting Updates</option>
          <option value="create_announcement" className="bg-bg-elevated">Announcements</option>
          <option value="delete_project" className="bg-bg-elevated">Project Deletions</option>
          <option value="delete_learning_path" className="bg-bg-elevated">Path Deletions</option>
        </select>
        <button
          onClick={() => fetchLogs(1)}
          disabled={isPending}
          className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Loading..." : "Filter"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-border-default">
        <table className="w-full text-sm">
          <thead className="border-b border-border-default bg-bg-surface">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Time</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Admin</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Action</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Target</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-bg-surface">
                <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                  {new Date(item.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-text-tertiary">
                  {item.admin_email ?? item.admin_id.slice(0, 8)}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${actionBadgeClass(item.action_type)}`}>
                    {item.action_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {item.target_type && (
                    <span className="text-text-tertiary">{item.target_type}: </span>
                  )}
                  {item.target_id ? item.target_id.slice(0, 8) + "..." : "-"}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="text-xs text-text-muted hover:text-violet-400"
                  >
                    {expandedId === item.id ? "Hide" : "View"}
                  </button>
                  {expandedId === item.id && (
                    <pre className="mt-2 max-w-xs overflow-x-auto rounded-xl bg-[rgba(0,0,0,0.3)] p-2 text-xs text-text-muted border border-border-default">
                      {JSON.stringify(item.details, null, 2)}
                    </pre>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
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
          <p className="text-sm text-text-muted">
            {total} entries total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1 || isPending}
              className="rounded-xl border border-border-default p-2 text-text-muted hover:bg-bg-input disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-text-muted">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= totalPages || isPending}
              className="rounded-xl border border-border-default p-2 text-text-muted hover:bg-bg-input disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
