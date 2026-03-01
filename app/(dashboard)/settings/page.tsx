import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { User, CreditCard, Mail, Target } from "lucide-react";
import { ApiKeyManager } from "@/components/features/api-key-manager";
import { LlmKeyManager } from "@/components/features/llm-key-manager";
import { WeeklyTargetSetting } from "@/components/features/weekly-target-setting";
import { getCurrentPlan } from "@/server/actions/billing";
import { getStreak } from "@/server/actions/streak";
import { getAuthUser } from "@/lib/supabase/auth";

export default async function SettingsPage() {
  const [planResult, authUser] = await Promise.all([
    getCurrentPlan(),
    getAuthUser(),
  ]);
  const planType = planResult.data?.plan_type ?? "free";
  const planLabel = planType.charAt(0).toUpperCase() + planType.slice(1);
  const streakResult = authUser ? await getStreak(authUser.id) : null;
  const weeklyTarget = streakResult?.data?.weeklyTarget ?? 3;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Settings
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          계정 설정 및 API 키를 관리하세요
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-text-muted" />
              <CardTitle>프로필</CardTitle>
            </div>
            <CardDescription>계정 정보를 확인합니다</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/10 ring-1 ring-violet-500/20">
                <Mail className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-text-faint">이메일</p>
                <p className="text-sm font-medium text-text-primary">
                  {authUser?.email ?? "알 수 없음"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <ApiKeyManager />

        <LlmKeyManager />

        {authUser && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-text-muted" />
                <CardTitle>학습 목표</CardTitle>
              </div>
              <CardDescription>
                주간 학습 목표를 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WeeklyTargetSetting
                userId={authUser.id}
                currentTarget={weeklyTarget}
              />
            </CardContent>
          </Card>
        )}

        <Link href="/settings/billing">
          <Card className="hover:border-border-hover hover:shadow-glow-card-purple transition-all cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-text-muted" />
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
