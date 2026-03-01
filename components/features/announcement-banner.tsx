"use client";

import { useState, useEffect, useRef } from "react";
import { X, Info, AlertTriangle, Wrench, Sparkles } from "lucide-react";
import { getActiveAnnouncements } from "@/server/actions/admin";

interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: string;
}

const typeConfig: Record<string, { icon: typeof Info; bg: string; border: string; text: string }> = {
  info: {
    icon: Info,
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-300",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-300",
  },
  maintenance: {
    icon: Wrench,
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-300",
  },
  update: {
    icon: Sparkles,
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    text: "text-green-300",
  },
};

function getDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem("dismissed_announcements");
    if (stored) return new Set(JSON.parse(stored) as string[]);
  } catch {
    // ignore
  }
  return new Set();
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => getDismissedIds());
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    getActiveAnnouncements().then((result) => {
      if (result.success && result.data) {
        setAnnouncements(result.data);
      }
    });
  }, []);

  function dismiss(id: string) {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem("dismissed_announcements", JSON.stringify([...next]));
  }

  const visible = announcements.filter((a) => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {visible.map((ann) => {
        const config = typeConfig[ann.announcement_type] ?? typeConfig.info;
        const Icon = config.icon;

        return (
          <div
            key={ann.id}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${config.bg} ${config.border}`}
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.text}`} />
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${config.text}`}>{ann.title}</p>
              <p className={`text-sm ${config.text} opacity-80`}>{ann.content}</p>
            </div>
            <button
              onClick={() => dismiss(ann.id)}
              className={`shrink-0 rounded p-1 ${config.text} opacity-60 hover:opacity-100`}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
