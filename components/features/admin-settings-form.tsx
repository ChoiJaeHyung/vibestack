"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSystemSetting } from "@/server/actions/admin";
import type { Json } from "@/types/database";

interface SettingItem {
  id: string;
  setting_key: string;
  setting_value: Json;
  category: string;
  description: string | null;
  updated_at: string;
}

interface AdminSettingsFormProps {
  settings: SettingItem[];
}

export function AdminSettingsForm({ settings }: AdminSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function startEdit(setting: SettingItem) {
    setEditingKey(setting.setting_key);
    setEditValue(JSON.stringify(setting.setting_value, null, 2));
    setMessage(null);
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditValue("");
  }

  function handleSave(setting: SettingItem) {
    let parsed: Json;
    try {
      parsed = JSON.parse(editValue) as Json;
    } catch {
      setMessage({ type: "error", text: "Invalid JSON" });
      return;
    }

    startTransition(async () => {
      const result = await updateSystemSetting(
        setting.setting_key,
        parsed,
        setting.category as "llm_config" | "pricing" | "announcement" | "feature_toggle" | "general",
        setting.description ?? undefined,
      );
      if (result.success) {
        setMessage({ type: "success", text: `Setting "${setting.setting_key}" updated` });
        setEditingKey(null);
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed to update" });
      }
    });
  }

  const grouped = settings.reduce<Record<string, SettingItem[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    llm_config: "LLM Configuration",
    pricing: "Pricing & Limits",
    feature_toggle: "Feature Toggles",
    announcement: "Announcements",
    general: "General",
  };

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

      {Object.entries(grouped).map(([category, items]) => (
        <div
          key={category}
          className="rounded-2xl border border-border-default bg-bg-surface"
        >
          <div className="border-b border-border-default px-6 py-4">
            <h3 className="text-base font-semibold text-text-primary">
              {categoryLabels[category] ?? category}
            </h3>
          </div>
          <div className="divide-y divide-border-default">
            {items.map((setting) => (
              <div key={setting.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text-primary">
                      {setting.setting_key}
                    </p>
                    {setting.description && (
                      <p className="mt-1 text-sm text-text-muted">
                        {setting.description}
                      </p>
                    )}
                    {editingKey === setting.setting_key ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full rounded-xl border border-border-default bg-bg-input p-3 font-mono text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                          rows={5}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(setting)}
                            disabled={isPending}
                            className="rounded-xl bg-violet-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
                          >
                            {isPending ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded-xl border border-border-default px-3 py-1.5 text-sm text-text-tertiary hover:bg-bg-input"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <pre className="mt-2 overflow-x-auto rounded-xl bg-[rgba(0,0,0,0.3)] p-3 text-xs text-text-tertiary border border-border-default">
                        {JSON.stringify(setting.setting_value, null, 2)}
                      </pre>
                    )}
                  </div>
                  {editingKey !== setting.setting_key && (
                    <button
                      onClick={() => startEdit(setting)}
                      className="rounded-xl border border-border-default px-3 py-1.5 text-sm text-text-muted hover:bg-bg-input hover:text-text-primary"
                    >
                      Edit
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-text-faint">
                  Last updated: {new Date(setting.updated_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {settings.length === 0 && (
        <div className="rounded-2xl border border-border-default bg-bg-surface p-8 text-center">
          <p className="text-text-muted">No system settings found</p>
        </div>
      )}
    </div>
  );
}
