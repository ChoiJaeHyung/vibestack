import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard/", "/projects/", "/learning/", "/settings/", "/admin/", "/callback"],
    },
    sitemap: "https://vibeuniv.com/sitemap.xml",
  };
}
