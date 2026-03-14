import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Clock } from "lucide-react";
import { getPostBySlug, getAllPosts, getRelatedPosts } from "@/lib/blog/posts";
import { getLocale, getTranslations } from "next-intl/server";
import { Breadcrumb } from "@/components/ui/breadcrumb";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Not Found" };
  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `https://vibeuniv.com/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const locale = await getLocale();
  const t = await getTranslations("Public");
  const tc = await getTranslations("Common");

  const title = locale === "ko" ? post.title : post.titleEn;
  const body = locale === "ko" ? post.body : post.bodyEn;
  const relatedPosts = getRelatedPosts(slug, 3);

  return (
    <div className="max-w-[720px] mx-auto px-8 max-md:px-4 py-12">
      <Breadcrumb
        items={[
          { label: tc("breadcrumb.home"), href: "/" },
          { label: tc("breadcrumb.blog"), href: "/blog" },
          { label: title },
        ]}
      />

      <article>
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-2.5 py-0.5">
              {post.category}
            </span>
            <span className="text-xs text-text-muted">{post.date}</span>
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Clock className="h-3 w-3" />
              {post.readTime}{t("blog.readTime")}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary leading-tight">
            {title}
          </h1>
        </header>

        <div className="prose prose-sm max-w-none text-text-secondary prose-headings:text-text-primary prose-strong:text-text-secondary prose-a:text-violet-400 prose-code:text-violet-400 prose-code:bg-bg-code prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-xs prose-pre:bg-[#1e1e2e] prose-pre:border prose-pre:border-border-default prose-blockquote:border-violet-500/30 prose-blockquote:text-text-muted prose-table:text-sm prose-th:text-text-primary prose-td:text-text-secondary">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="mt-12 mb-4">
          <h2 className="text-lg font-bold text-text-primary mb-4">
            {t("blog.relatedPosts")}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {relatedPosts.map((rp) => (
              <Link
                key={rp.slug}
                href={`/blog/${rp.slug}`}
                className="rounded-xl border border-border-default bg-bg-primary hover:border-violet-500/40 transition-all p-4 group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-2 py-0.5">
                    {rp.category}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-text-muted">
                    <Clock className="h-2.5 w-2.5" />
                    {rp.readTime}{t("blog.readTime")}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-text-primary group-hover:text-violet-400 transition-colors line-clamp-2">
                  {locale === "ko" ? rp.title : rp.titleEn}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <div className="mt-12 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 p-8 text-center">
        <h3 className="text-lg font-bold text-text-primary mb-2">
          {t("blog.ctaTitle")}
        </h3>
        <p className="text-sm text-text-muted mb-6 max-w-md mx-auto">
          {t("blog.ctaDesc")}
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          {t("blog.ctaButton")}
        </Link>
      </div>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: title,
            description: locale === "ko" ? post.description : post.descriptionEn,
            datePublished: post.date,
            author: { "@type": "Organization", name: "VibeUniv" },
            publisher: { "@type": "Organization", name: "VibeUniv", url: "https://vibeuniv.com" },
          }),
        }}
      />
    </div>
  );
}
