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
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {Object.entries(grouped).map(([category, items]) => (
        <div
          key={category}
          className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {categoryLabels[category] ?? category}
            </h3>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {items.map((setting) => (
              <div key={setting.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {setting.setting_key}
                    </p>
                    {setting.description && (
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {setting.description}
                      </p>
                    )}
                    {editingKey === setting.setting_key ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          rows={5}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(setting)}
                            disabled={isPending}
                            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                          >
                            {isPending ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        {JSON.stringify(setting.setting_value, null, 2)}
                      </pre>
                    )}
                  </div>
                  {editingKey !== setting.setting_key && (
                    <button
                      onClick={() => startEdit(setting)}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
                    >
                      Edit
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                  Last updated: {new Date(setting.updated_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {settings.length === 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-zinc-500 dark:text-zinc-400">No system settings found</p>
        </div>
      )}
    </div>
  );
}
