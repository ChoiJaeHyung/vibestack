import Link from "next/link";
import { Megaphone } from "lucide-react";
import { getSystemSettings } from "@/server/actions/admin";
import { AdminSettingsForm } from "@/components/features/admin-settings-form";

export default async function AdminSettingsPage() {
  const result = await getSystemSettings();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          System Settings
        </h1>
        <Link
          href="/admin/settings/announcements"
          className="inline-flex items-center gap-2 rounded-xl border border-border-default px-4 py-2 text-sm font-medium text-text-tertiary hover:bg-bg-input"
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
