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
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* User Info */}
      <div className="rounded-2xl border border-border-default bg-bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">
          User Information
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-text-muted">Email</p>
            <p className="font-medium text-text-primary">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-text-muted">Name</p>
            <p className="font-medium text-text-primary">
              {user.name ?? "Not set"}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-muted">Joined</p>
            <p className="font-medium text-text-primary">
              {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-muted">Last Updated</p>
            <p className="font-medium text-text-primary">
              {new Date(user.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border-default pt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-text-primary">
              {user.projectCount}
            </p>
            <p className="text-xs text-text-muted">Projects</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-text-primary">
              {user.learningPathCount}
            </p>
            <p className="text-xs text-text-muted">Learning Paths</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-text-primary">
              {user.conversationCount}
            </p>
            <p className="text-xs text-text-muted">Conversations</p>
          </div>
        </div>
      </div>

      {/* Role Management */}
      {isSuperAdmin && (
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">
            Role
          </h2>
          <div className="flex gap-2">
            {(["user", "admin", "super_admin"] as const).map((role) => (
              <button
                key={role}
                onClick={() => handleRoleChange(role)}
                disabled={isPending || user.role === role}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                  user.role === role
                    ? "bg-violet-500 text-white"
                    : "border border-border-default text-text-tertiary hover:bg-bg-input"
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
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">
            Plan
          </h2>
          <div className="flex gap-2">
            {(["free", "pro", "team"] as const).map((plan) => (
              <button
                key={plan}
                onClick={() => handlePlanChange(plan)}
                disabled={isPending || user.plan_type === plan}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                  user.plan_type === plan
                    ? "bg-violet-500 text-white"
                    : "border border-border-default text-text-tertiary hover:bg-bg-input"
                }`}
              >
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ban Management */}
      <div className="rounded-2xl border border-border-default bg-bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">
          Account Status
        </h2>

        {user.is_banned ? (
          <div>
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="font-medium text-red-400">
                This user is banned
              </p>
              {user.ban_reason && (
                <p className="mt-1 text-sm text-red-400/80">
                  Reason: {user.ban_reason}
                </p>
              )}
              {user.banned_at && (
                <p className="mt-1 text-sm text-red-400/80">
                  Banned at: {new Date(user.banned_at).toLocaleString()}
                </p>
              )}
            </div>
            <button
              onClick={handleUnban}
              disabled={isPending}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
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
                  className="w-full rounded-xl border border-border-default bg-bg-input p-3 text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleBan}
                    disabled={isPending || !banReason.trim()}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {isPending ? "Processing..." : "Confirm Ban"}
                  </button>
                  <button
                    onClick={() => { setShowBanForm(false); setBanReason(""); }}
                    className="rounded-xl border border-border-default px-4 py-2 text-sm font-medium text-text-tertiary hover:bg-bg-input"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowBanForm(true)}
                className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10"
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
