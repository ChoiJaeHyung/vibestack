"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@/server/actions/admin";

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  announcement_type: string;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("info");
  const [newExpires, setNewExpires] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function fetchAnnouncements() {
    startTransition(async () => {
      const result = await listAnnouncements();
      if (result.success && result.data) {
        setAnnouncements(result.data);
      }
    });
  }

  const fetchedRef = useRef(false);
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchAnnouncements();
  }, []);

  function handleCreate() {
    if (!newTitle.trim() || !newContent.trim()) return;
    startTransition(async () => {
      const result = await createAnnouncement(
        newTitle,
        newContent,
        newType as "info" | "warning" | "maintenance" | "update",
        newExpires || undefined,
      );
      if (result.success) {
        setMessage({ type: "success", text: "Announcement created" });
        setShowForm(false);
        setNewTitle("");
        setNewContent("");
        setNewType("info");
        setNewExpires("");
        fetchAnnouncements();
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed to create" });
      }
    });
  }

  function handleToggleActive(ann: AnnouncementItem) {
    startTransition(async () => {
      const result = await updateAnnouncement(ann.id, { is_active: !ann.is_active });
      if (result.success) {
        fetchAnnouncements();
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this announcement?")) return;
    startTransition(async () => {
      const result = await deleteAnnouncement(id);
      if (result.success) {
        setMessage({ type: "success", text: "Announcement deleted" });
        fetchAnnouncements();
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed to delete" });
      }
    });
  }

  const typeBadgeClass = (type: string) => {
    switch (type) {
      case "warning": return "bg-amber-500/10 text-amber-300 border border-amber-500/20";
      case "maintenance": return "bg-red-500/10 text-red-300 border border-red-500/20";
      case "update": return "bg-green-500/10 text-green-300 border border-green-500/20";
      default: return "bg-blue-500/10 text-blue-300 border border-blue-500/20";
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/settings"
          className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-violet-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">
            Announcements
          </h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="mb-6 rounded-2xl border border-border-default bg-bg-surface p-6">
          <h3 className="mb-4 text-base font-semibold text-text-primary">
            Create Announcement
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-xl border border-border-default bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
            <textarea
              placeholder="Content"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border-default bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
            <div className="flex gap-3">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="rounded-xl border border-border-default bg-bg-input px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="info" className="bg-bg-elevated">Info</option>
                <option value="warning" className="bg-bg-elevated">Warning</option>
                <option value="maintenance" className="bg-bg-elevated">Maintenance</option>
                <option value="update" className="bg-bg-elevated">Update</option>
              </select>
              <input
                type="datetime-local"
                value={newExpires}
                onChange={(e) => setNewExpires(e.target.value)}
                placeholder="Expires at (optional)"
                className="rounded-xl border border-border-default bg-bg-input px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={isPending || !newTitle.trim() || !newContent.trim()}
                className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50 transition-colors"
              >
                {isPending ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-border-default px-4 py-2 text-sm text-text-tertiary hover:bg-bg-input"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-3">
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className="rounded-2xl border border-border-default bg-bg-surface p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-text-primary">
                    {ann.title}
                  </h3>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(ann.announcement_type)}`}>
                    {ann.announcement_type}
                  </span>
                  {!ann.is_active && (
                    <span className="inline-block rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs font-medium text-text-muted border border-zinc-500/20">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-text-muted">
                  {ann.content}
                </p>
                <div className="mt-2 flex gap-4 text-xs text-text-faint">
                  <span>Created: {new Date(ann.created_at).toLocaleDateString()}</span>
                  {ann.expires_at && (
                    <span>Expires: {new Date(ann.expires_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(ann)}
                  disabled={isPending}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    ann.is_active
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-zinc-500/10 text-text-muted border border-zinc-500/20"
                  }`}
                >
                  {ann.is_active ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => handleDelete(ann.id)}
                  disabled={isPending}
                  className="rounded p-1.5 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {announcements.length === 0 && !isPending && (
          <div className="rounded-2xl border border-border-default bg-bg-surface p-8 text-center">
            <p className="text-text-muted">No announcements yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
