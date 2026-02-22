import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { User, CreditCard } from "lucide-react";
import { ApiKeyManager } from "@/components/features/api-key-manager";
import { LlmKeyManager } from "@/components/features/llm-key-manager";
import { getCurrentPlan } from "@/server/actions/billing";

export default async function SettingsPage() {
  const planResult = await getCurrentPlan();
  const planType = planResult.data?.plan_type ?? "free";
  const planLabel = planType.charAt(0).toUpperCase() + planType.slice(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          계정 설정 및 API 키를 관리하세요
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              <CardTitle>프로필</CardTitle>
            </div>
            <CardDescription>계정 정보를 관리합니다</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              프로필 설정은 추후 구현됩니다.
            </p>
          </CardContent>
        </Card>

        <ApiKeyManager />

        <LlmKeyManager />

        <Link href="/settings/billing">
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                <CardTitle>구독 플랜</CardTitle>
              </div>
              <CardDescription>
                현재 플랜: {planLabel} — 클릭하여 관리
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
