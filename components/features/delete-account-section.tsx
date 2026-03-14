"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2, AlertTriangle } from "lucide-react";
import { deleteAccount } from "@/server/actions/account";

export function DeleteAccountSection() {
  const t = useTranslations("Settings");
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (confirmText !== "DELETE") return;

    setDeleting(true);
    setError(null);

    const result = await deleteAccount();
    if (result.success) {
      router.push("/");
    } else {
      setError(result.error ?? "Unknown error");
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
      <div className="flex items-center gap-2 mb-2">
        <Trash2 className="h-5 w-5 text-red-400" />
        <h3 className="text-base font-semibold text-text-primary">
          {t("deleteAccount.title")}
        </h3>
      </div>
      <p className="text-sm text-text-muted mb-4">
        {t("deleteAccount.description")}
      </p>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
        >
          {t("deleteAccount.button")}
        </button>
      ) : (
        <div className="space-y-3 rounded-lg border border-red-500/30 bg-bg-secondary p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-400">
              {t("deleteAccount.warning")}
            </p>
          </div>
          <ul className="text-xs text-text-muted space-y-1 ml-6 list-disc">
            <li>{t("deleteAccount.data1")}</li>
            <li>{t("deleteAccount.data2")}</li>
            <li>{t("deleteAccount.data3")}</li>
            <li>{t("deleteAccount.data4")}</li>
          </ul>
          <div>
            <label
              htmlFor="delete-confirm"
              className="block text-xs text-text-muted mb-1"
            >
              {t("deleteAccount.confirmLabel")}
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:ring-1 focus:ring-red-500/50"
              aria-describedby={error ? "delete-error" : undefined}
            />
          </div>
          {error && (
            <p id="delete-error" className="text-xs text-red-400">
              {t("deleteAccount.error")}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={confirmText !== "DELETE" || deleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {deleting
                ? t("deleteAccount.deleting")
                : t("deleteAccount.confirmButton")}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setConfirmText("");
                setError(null);
              }}
              className="rounded-lg border border-border-default px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
            >
              {t("deleteAccount.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
