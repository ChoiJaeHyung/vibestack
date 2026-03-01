import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ui/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://vibeuniv.com"),
  title: {
    default: "VibeUniv | AI로 만든 앱, 내 코드로 제대로 배우기",
    template: "%s | VibeUniv",
  },
  description:
    "Cursor, Claude Code로 앱은 만들었는데 코드가 이해 안 되나요? 프로젝트만 연결하면 AI가 기술 스택을 분석하고, 내 실제 코드가 교재가 되는 맞춤 학습을 시작할 수 있어요. 무료로 5분이면 시작.",
  keywords: [
    "바이브 코딩",
    "바이브 코딩 학습",
    "vibe coding",
    "AI 코딩 학습",
    "코딩 교육",
    "기술 스택 분석",
    "AI 튜터",
    "Claude Code",
    "Cursor",
    "Bolt",
    "Windsurf",
    "MCP",
    "프로젝트 기반 학습",
    "코딩 독학",
    "AI 코딩 도구",
  ],
  openGraph: {
    title: "만들었으면 반은 왔어요. 나머지 반, 여기서 채워요 | VibeUniv",
    description:
      "AI 코딩 도구로 앱을 만들었다면, 이제 내 코드를 진짜 이해할 차례. 프로젝트를 연결하면 AI가 기술 스택을 분석하고, 내 코드가 교재가 되는 1:1 맞춤 학습이 시작됩니다.",
    url: "https://vibeuniv.com",
    siteName: "VibeUniv",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI로 앱 만들었다면? 내 코드로 배우는 맞춤 학습 | VibeUniv",
    description:
      "Cursor, Claude Code로 만든 프로젝트를 연결하면 AI가 기술 스택을 분석하고, 내 코드를 교재로 학습 로드맵을 만들어 드려요.",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    other: {
      "naver-site-verification": ["e5cfa55974fbafcb8750304a2fc2abb9f2a44241"],
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "VibeUniv",
              url: "https://vibeuniv.com",
              logo: "https://vibeuniv.com/icon.png",
              description:
                "AI 코딩 도구로 만든 프로젝트의 기술 스택을 분석하고, 내 코드를 교재로 맞춤 학습 로드맵을 제공하는 바이브 코더 전용 학습 플랫폼",
              applicationCategory: "EducationalApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "KRW",
                description: "무료 플랜으로 시작 가능",
              },
            }),
          }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
