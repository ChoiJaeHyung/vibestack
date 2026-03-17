import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ArrowRight, Lightbulb, BookOpen, Compass, Cpu } from "lucide-react";
import { getAllPosts } from "@/lib/blog/posts";
import { getLocale, getTranslations } from "next-intl/server";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AdSlot } from "@/components/ui/ad-slot";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Public");
  return {
    title: "Blog",
    description: t("blog.metaDescription"),
    openGraph: { title: "VibeUniv Blog", description: t("blog.ogDescription") },
    twitter: { card: "summary_large_image", title: "VibeUniv Blog", description: t("blog.ogDescription") },
  };
}

export default async function BlogPage() {
  const posts = getAllPosts();
  const locale = await getLocale();
  const t = await getTranslations("Public");
  const tc = await getTranslations("Common");

  return (
    <div className="max-w-[960px] mx-auto px-8 max-md:px-4 py-12">
      <Breadcrumb
        items={[
          { label: tc("breadcrumb.home"), href: "/" },
          { label: tc("nav.blog") },
        ]}
      />
      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">{tc("nav.blog")}</h1>
        <p className="text-text-muted">
          {t("blog.subtitle")}
        </p>
      </div>

      <div className="space-y-6">
        {posts.map((post) => {
          const categoryIcon: Record<string, { icon: typeof Lightbulb; gradient: string }> = {
            "개념": { icon: Lightbulb, gradient: "from-violet-500 to-purple-600" },
            "학습": { icon: BookOpen, gradient: "from-cyan-500 to-blue-600" },
            "가이드": { icon: Compass, gradient: "from-emerald-500 to-teal-600" },
            "기술": { icon: Cpu, gradient: "from-amber-500 to-orange-600" },
          };
          const { icon: CatIcon, gradient } = categoryIcon[post.category] ?? categoryIcon["개념"];
          return (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="flex gap-5 rounded-2xl border border-border-default bg-bg-primary hover:border-violet-500/40 transition-all p-6 group"
            >
              <div className={`hidden sm:flex w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} items-center justify-center shrink-0`}>
                <CatIcon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-2.5 py-0.5">
                    {post.category}
                  </span>
                  <span className="text-xs text-text-muted">{post.date}</span>
                  <span className="flex items-center gap-1 text-xs text-text-muted">
                    <Clock className="h-3 w-3" />
                    {post.readTime}{t("blog.readTime")}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-text-primary group-hover:text-violet-400 transition-colors mb-2">
                  {locale === "ko" ? post.title : post.titleEn}
                </h2>
                <p className="text-sm text-text-muted line-clamp-2 mb-3">
                  {locale === "ko" ? post.description : post.descriptionEn}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-400 group-hover:gap-2 transition-all">
                  {t("blog.readMore")}
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Ad */}
      <AdSlot className="mt-8" />
    </div>
  );
}
