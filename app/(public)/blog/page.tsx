import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { getAllPosts } from "@/lib/blog/posts";
import { getLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "바이브 코딩, AI 학습, 기술 스택 분석에 대한 인사이트와 가이드. VibeUniv 블로그에서 최신 정보를 확인하세요.",
  openGraph: {
    title: "VibeUniv Blog",
    description: "바이브 코딩과 AI 학습에 대한 인사이트와 가이드",
  },
};

export default async function BlogPage() {
  const posts = getAllPosts();
  const locale = await getLocale();
  const isKo = locale === "ko";

  return (
    <div className="max-w-[960px] mx-auto px-8 max-md:px-4 py-12">
      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">Blog</h1>
        <p className="text-text-muted">
          {isKo
            ? "바이브 코딩, AI 학습, 기술 스택에 대한 인사이트와 가이드"
            : "Insights and guides about vibe coding, AI learning, and tech stacks"}
        </p>
      </div>

      <div className="space-y-6">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block rounded-2xl border border-border-default bg-bg-primary hover:border-violet-500/40 transition-all p-6 group"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-2.5 py-0.5">
                {post.category}
              </span>
              <span className="text-xs text-text-muted">{post.date}</span>
              <span className="flex items-center gap-1 text-xs text-text-muted">
                <Clock className="h-3 w-3" />
                {post.readTime}{isKo ? "분" : "min"}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-text-primary group-hover:text-violet-400 transition-colors mb-2">
              {isKo ? post.title : post.titleEn}
            </h2>
            <p className="text-sm text-text-muted line-clamp-2 mb-3">
              {isKo ? post.description : post.descriptionEn}
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-400 group-hover:gap-2 transition-all">
              {isKo ? "읽어보기" : "Read more"}
              <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
