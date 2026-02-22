import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/features/project-card";
import { TechChart } from "@/components/features/tech-chart";
import {
  FolderOpen,
  Code,
  GraduationCap,
  MessageCircle,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { getDashboardStats } from "@/server/actions/dashboard";

export default async function DashboardPage() {
  let userEmail = "User";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      userEmail = user.email ?? "User";
    }
  } catch {
    // Supabase not configured
  }

  const result = await getDashboardStats();
  const stats = result.data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          안녕하세요, {userEmail}님!
        </p>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FolderOpen}
          label="총 프로젝트"
          value={String(stats?.totalProjects ?? 0)}
        />
        <StatCard
          icon={Code}
          label="감지된 기술"
          value={String(stats?.uniqueTechnologies ?? 0)}
        />
        <StatCard
          icon={GraduationCap}
          label="학습 진행률"
          value={`${stats?.learningProgress.percentage ?? 0}%`}
          progress={stats?.learningProgress.percentage ?? 0}
        />
        <StatCard
          icon={MessageCircle}
          label="AI 대화 (이번 달)"
          value={String(stats?.monthlyChats ?? 0)}
        />
      </div>

      {/* Recent Projects */}
      {stats && stats.recentProjects.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              최근 프로젝트
            </h2>
            <Link href="/projects">
              <Button variant="ghost" size="sm">
                전체 보기
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-4">
            {stats.recentProjects.map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                description={null}
                status={
                  project.status as
                    | "created"
                    | "uploaded"
                    | "analyzing"
                    | "analyzed"
                    | "error"
                }
                updatedAt={project.updated_at}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>시작하기</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              MCP 서버를 연결하거나 프로젝트를 직접 업로드하여 기술 스택 분석을
              시작하세요. AI가 프로젝트를 분석하고 맞춤 학습 로드맵을 생성해
              드립니다.
            </p>
            <div className="flex gap-2">
              <Link href="/settings">
                <Button variant="secondary" size="sm">
                  API 키 설정
                </Button>
              </Link>
              <Link href="/projects">
                <Button variant="secondary" size="sm">
                  프로젝트 관리
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tech Distribution Chart */}
      {stats && stats.techDistribution.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            기술 분포
          </h2>
          <Card>
            <CardContent>
              <TechChart data={stats.techDistribution} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Learning Activity */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          학습 현황
        </h2>
        {stats?.currentLearning ? (
          <Card>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <BookOpen className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {stats.currentLearning.pathTitle}
                  </p>
                  <h3 className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100">
                    {stats.currentLearning.moduleTitle}
                  </h3>
                  <Link
                    href={`/learning/${stats.currentLearning.pathId}/modules/${stats.currentLearning.moduleId}`}
                  >
                    <Button variant="primary" size="sm" className="mt-3">
                      이어서 학습하기
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <GraduationCap className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    아직 진행 중인 학습이 없습니다. 프로젝트를 분석한 후 학습
                    로드맵을 생성해보세요.
                  </p>
                  <Link href="/learning">
                    <Button variant="ghost" size="sm" className="mt-2">
                      학습 시작하기
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  progress,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  progress?: number;
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <Icon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {value}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
            {progress !== undefined && (
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-zinc-600 transition-all dark:bg-zinc-400"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
