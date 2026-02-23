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
      case "warning": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "maintenance": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "update": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      default: return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/settings"
          className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Announcements
          </h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        </div>
      </div>

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

      {/* Create Form */}
      {showForm && (
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Create Announcement
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <textarea
              placeholder="Content"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <div className="flex gap-3">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="maintenance">Maintenance</option>
                <option value="update">Update</option>
              </select>
              <input
                type="datetime-local"
                value={newExpires}
                onChange={(e) => setNewExpires(e.target.value)}
                placeholder="Expires at (optional)"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={isPending || !newTitle.trim() || !newContent.trim()}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {isPending ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
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
            className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                    {ann.title}
                  </h3>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(ann.announcement_type)}`}>
                    {ann.announcement_type}
                  </span>
                  {!ann.is_active && (
                    <span className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {ann.content}
                </p>
                <div className="mt-2 flex gap-4 text-xs text-zinc-400 dark:text-zinc-500">
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
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    ann.is_active
                      ? "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {ann.is_active ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => handleDelete(ann.id)}
                  disabled={isPending}
                  className="rounded p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {announcements.length === 0 && !isPending && (
          <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-zinc-500 dark:text-zinc-400">No announcements yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
