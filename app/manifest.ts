import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VibeUniv",
    short_name: "VibeUniv",
    description:
      "AI 코딩 도구로 만든 앱, 내 코드로 제대로 배우기. 프로젝트를 연결하면 AI가 기술 스택을 분석하고 맞춤 학습 로드맵을 만들어 드려요.",
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
