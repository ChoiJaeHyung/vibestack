"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { listAllUsers } from "@/server/actions/admin";
import type { UserRole } from "@/types/database";

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  plan_type: string;
  role: string;
  is_banned: boolean;
  created_at: string;
}

interface AdminUserTableProps {
  initialUsers: UserItem[];
  initialTotal: number;
  initialPage: number;
  pageSize: number;
}

export function AdminUserTable({
  initialUsers,
  initialTotal,
  initialPage,
  pageSize,
}: AdminUserTableProps) {
  const [users, setUsers] = useState(initialUsers);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [planFilter, setPlanFilter] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.ceil(total / pageSize);

  function fetchUsers(newPage: number) {
    startTransition(async () => {
      const result = await listAllUsers(
        newPage,
        search || undefined,
        (roleFilter as UserRole) || undefined,
        (planFilter as "free" | "pro" | "team") || undefined,
      );
      if (result.success && result.data) {
        setUsers(result.data.items);
        setTotal(result.data.total);
        setPage(result.data.page);
      }
    });
  }

  function handleSearch() {
    fetchUsers(1);
  }

  const roleBadgeClass = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-red-500/10 text-red-300 border border-red-500/20";
      case "admin":
        return "bg-amber-500/10 text-amber-300 border border-amber-500/20";
      default:
        return "bg-zinc-500/10 text-text-muted border border-zinc-500/20";
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full rounded-xl border border-border-default bg-bg-input py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/40 transition-all duration-200"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); }}
          className="rounded-xl border border-border-default bg-bg-input px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        >
          <option value="" className="bg-bg-elevated">All Roles</option>
          <option value="user" className="bg-bg-elevated">User</option>
          <option value="admin" className="bg-bg-elevated">Admin</option>
          <option value="super_admin" className="bg-bg-elevated">Super Admin</option>
        </select>
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); }}
          className="rounded-xl border border-border-default bg-bg-input px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        >
          <option value="" className="bg-bg-elevated">All Plans</option>
          <option value="free" className="bg-bg-elevated">Free</option>
          <option value="pro" className="bg-bg-elevated">Pro</option>
          <option value="team" className="bg-bg-elevated">Team</option>
        </select>
        <button
          onClick={handleSearch}
          disabled={isPending}
          className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Loading..." : "Search"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-border-default">
        <table className="w-full text-sm">
          <thead className="border-b border-border-default bg-bg-surface">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-text-muted">User</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Role</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Plan</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Status</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-bg-surface">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="font-medium text-text-primary hover:text-violet-400 hover:underline"
                  >
                    {user.email}
                  </Link>
                  {user.name && (
                    <p className="text-xs text-text-muted">{user.name}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClass(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-text-tertiary">{user.plan_type}</span>
                </td>
                <td className="px-4 py-3">
                  {user.is_banned ? (
                    <span className="inline-block rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400 border border-red-500/20">
                      Banned
                    </span>
                  ) : (
                    <span className="inline-block rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400 border border-green-500/20">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                  No users found
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
            {total} user{total !== 1 ? "s" : ""} total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchUsers(page - 1)}
              disabled={page <= 1 || isPending}
              className="rounded-xl border border-border-default p-2 text-text-muted hover:bg-bg-input disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-text-muted">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => fetchUsers(page + 1)}
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
