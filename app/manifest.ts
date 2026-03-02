import { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("Metadata");

  return {
    name: "VibeUniv",
    short_name: "VibeUniv",
    description: t("manifest.description"),
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon.png", sizes: "1024x1024", type: "image/png" },
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    ],
  };
}
