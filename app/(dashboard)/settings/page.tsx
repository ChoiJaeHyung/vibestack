import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { User, CreditCard, Mail, Target, Globe } from "lucide-react";
import { ApiKeyManager } from "@/components/features/api-key-manager";
import { LlmKeyManager } from "@/components/features/llm-key-manager";
import { WeeklyTargetSetting } from "@/components/features/weekly-target-setting";
import { LocaleSelector } from "@/components/features/locale-selector";
import { getCurrentPlan } from "@/server/actions/billing";
import { getStreak } from "@/server/actions/streak";
import { getAuthUserLocale } from "@/server/actions/learning";
import { getAuthUser } from "@/lib/supabase/auth";

export default async function SettingsPage() {
  const t = await getTranslations("Settings");
  const [planResult, authUser, userLocale] = await Promise.all([
    getCurrentPlan(),
    getAuthUser(),
    getAuthUserLocale(),
  ]);
  const planType = planResult.data?.plan_type ?? "free";
  const planLabel = planType.charAt(0).toUpperCase() + planType.slice(1);
  const streakResult = authUser ? await getStreak(authUser.id) : null;
  const weeklyTarget = streakResult?.data?.weeklyTarget ?? 3;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {t("subtitle")}
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-text-muted" />
              <CardTitle>{t("profile.title")}</CardTitle>
            </div>
            <CardDescription>{t("profile.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/10 ring-1 ring-violet-500/20">
                <Mail className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-text-faint">{t("profile.email")}</p>
                <p className="text-sm font-medium text-text-primary">
                  {authUser?.email ?? t("profile.unknown")}
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
                <CardTitle>{t("learningGoal.title")}</CardTitle>
              </div>
              <CardDescription>
                {t("learningGoal.description")}
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

        {authUser && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-text-muted" />
                <CardTitle>{t("locale.sectionTitle")}</CardTitle>
              </div>
              <CardDescription>
                {t("locale.sectionDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LocaleSelector currentLocale={userLocale} />
            </CardContent>
          </Card>
        )}

        <Link href="/settings/billing">
          <Card className="hover:border-border-hover hover:shadow-glow-card-purple transition-all cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-text-muted" />
                <CardTitle>{t("subscription.title")}</CardTitle>
              </div>
              <CardDescription>
                {t("subscription.description", { plan: planLabel })}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
