"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateUserRole,
  banUser,
  unbanUser,
  overrideUserPlan,
} from "@/server/actions/admin";
import type { UserRole } from "@/types/database";

interface UserDetailData {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  plan_type: string;
  role: string;
  is_banned: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  created_at: string;
  updated_at: string;
  projectCount: number;
  learningPathCount: number;
  conversationCount: number;
}

interface AdminUserDetailProps {
  user: UserDetailData;
  currentUserRole: UserRole;
}

export function AdminUserDetail({ user, currentUserRole }: AdminUserDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [banReason, setBanReason] = useState("");
  const [showBanForm, setShowBanForm] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isSuperAdmin = currentUserRole === "super_admin";

  function handleRoleChange(newRole: UserRole) {
    startTransition(async () => {
      const result = await updateUserRole(user.id, newRole);
      if (result.success) {
        setMessage({ type: "success", text: "Role updated successfully" });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed to update role" });
      }
    });
  }

  function handleBan() {
    if (!banReason.trim()) return;
    startTransition(async () => {
      const result = await banUser(user.id, banReason);
      if (result.success) {
        setMessage({ type: "success", text: "User banned successfully" });
        setShowBanForm(false);
        setBanReason("");
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed to ban user" });
      }
    });
  }

  function handleUnban() {
    startTransition(async () => {
      const result = await unbanUser(user.id);
      if (result.success) {
        setMessage({ type: "success", text: "User unbanned successfully" });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed to unban user" });
      }
    });
  }

  function handlePlanChange(planType: "free" | "pro" | "team") {
    startTransition(async () => {
      const result = await overrideUserPlan(user.id, planType);
      if (result.success) {
        setMessage({ type: "success", text: "Plan updated successfully" });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed to update plan" });
      }
    });
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* User Info */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          User Information
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Email</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Name</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {user.name ?? "Not set"}
            </p>
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Joined</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Last Updated</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {new Date(user.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <div className="text-center">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {user.projectCount}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Projects</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {user.learningPathCount}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Learning Paths</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {user.conversationCount}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Conversations</p>
          </div>
        </div>
      </div>

      {/* Role Management */}
      {isSuperAdmin && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Role
          </h2>
          <div className="flex gap-2">
            {(["user", "admin", "super_admin"] as const).map((role) => (
              <button
                key={role}
                onClick={() => handleRoleChange(role)}
                disabled={isPending || user.role === role}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                  user.role === role
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Plan Management */}
      {isSuperAdmin && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Plan
          </h2>
          <div className="flex gap-2">
            {(["free", "pro", "team"] as const).map((plan) => (
              <button
                key={plan}
                onClick={() => handlePlanChange(plan)}
                disabled={isPending || user.plan_type === plan}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                  user.plan_type === plan
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                }`}
              >
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ban Management */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Account Status
        </h2>

        {user.is_banned ? (
          <div>
            <div className="mb-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
              <p className="font-medium text-red-700 dark:text-red-400">
                This user is banned
              </p>
              {user.ban_reason && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                  Reason: {user.ban_reason}
                </p>
              )}
              {user.banned_at && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                  Banned at: {new Date(user.banned_at).toLocaleString()}
                </p>
              )}
            </div>
            <button
              onClick={handleUnban}
              disabled={isPending}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isPending ? "Processing..." : "Unban User"}
            </button>
          </div>
        ) : (
          <div>
            {showBanForm ? (
              <div className="space-y-3">
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Enter ban reason..."
                  className="w-full rounded-lg border border-zinc-200 p-3 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleBan}
                    disabled={isPending || !banReason.trim()}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {isPending ? "Processing..." : "Confirm Ban"}
                  </button>
                  <button
                    onClick={() => { setShowBanForm(false); setBanReason(""); }}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowBanForm(true)}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Ban User
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
