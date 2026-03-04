"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateNickname } from "@/server/actions/points";

interface NicknameSetupProps {
  onComplete?: (nickname: string) => void;
}

export function NicknameSetup({ onComplete }: NicknameSetupProps) {
  const t = useTranslations("Dashboard");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!nickname.trim()) return;

    setSaving(true);
    setError(null);

    const result = await updateNickname(nickname.trim());
    if (result.success) {
      onComplete?.(nickname.trim());
    } else {
      setError(result.error ?? t("points.nicknameFailed"));
    }
    setSaving(false);
  };

  return (
    <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
      <div className="flex items-center gap-2 mb-3">
        <User className="h-4 w-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-text-primary">
          {t("points.nicknameTitle")}
        </h3>
      </div>
      <p className="text-xs text-text-faint mb-3">
        {t("points.nicknameDescription")}
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={t("points.nicknamePlaceholder")}
          maxLength={30}
          className="flex-1 rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:border-violet-500 focus:outline-none"
        />
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={!nickname.trim() || saving}
        >
          {saving ? t("points.saving") : t("points.save")}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
