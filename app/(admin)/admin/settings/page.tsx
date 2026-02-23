import Link from "next/link";
import { Megaphone } from "lucide-react";
import { getSystemSettings } from "@/server/actions/admin";
import { AdminSettingsForm } from "@/components/features/admin-settings-form";

export default async function AdminSettingsPage() {
  const result = await getSystemSettings();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          System Settings
        </h1>
        <Link
          href="/admin/settings/announcements"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <Megaphone className="h-4 w-4" />
          Announcements
        </Link>
      </div>

      <AdminSettingsForm
        settings={result.success && result.data ? result.data : []}
      />
    </div>
  );
}
