import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VibeUniv",
    short_name: "VibeUniv",
    description:
      "바이브 코딩으로 만든 프로젝트의 기술 스택을 AI가 분석하고 맞춤 학습 로드맵을 제공합니다",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      { src: "/icon.png", sizes: "1024x1024", type: "image/png" },
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    ],
  };
}
