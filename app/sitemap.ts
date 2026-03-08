import { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog/posts";
import { getPublicLearningPaths, getPublicLearningPathDetail } from "@/server/actions/public-learning";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = getAllPosts();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: "https://vibeuniv.com",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://vibeuniv.com/login",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: "https://vibeuniv.com/signup",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: "https://vibeuniv.com/guide",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://vibeuniv.com/about",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: "https://vibeuniv.com/contact",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: "https://vibeuniv.com/blog",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://vibeuniv.com/learn",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://vibeuniv.com/guide/features",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://vibeuniv.com/technology",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://vibeuniv.com/terms",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://vibeuniv.com/privacy",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `https://vibeuniv.com/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Dynamic learning path pages
  const learningPages: MetadataRoute.Sitemap = [];
  try {
    const paths = await getPublicLearningPaths();
    for (const path of paths) {
      learningPages.push({
        url: `https://vibeuniv.com/learn/${path.id}`,
        lastModified: new Date(path.created_at),
        changeFrequency: "weekly",
        priority: 0.7,
      });

      const detail = await getPublicLearningPathDetail(path.id);
      if (detail?.modules) {
        for (const mod of detail.modules) {
          learningPages.push({
            url: `https://vibeuniv.com/learn/${path.id}/${mod.id}`,
            lastModified: new Date(path.created_at),
            changeFrequency: "monthly",
            priority: 0.6,
          });
        }
      }
    }
  } catch {
    // If DB is unavailable, skip dynamic learning pages
  }

  return [...staticPages, ...blogPages, ...learningPages];
}
