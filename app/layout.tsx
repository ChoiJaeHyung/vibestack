import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ui/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://vibeuniv.com"),
  title: {
    default: "VibeUniv - AI로 만든 프로젝트, 이제 이해하기",
    template: "%s | VibeUniv",
  },
  description:
    "바이브 코딩으로 만든 프로젝트의 기술 스택을 AI가 분석하고 맞춤 학습 로드맵을 제공합니다",
  keywords: [
    "vibe coding",
    "AI 학습",
    "기술 스택 분석",
    "MCP",
    "바이브 코딩",
    "Claude Code",
    "Cursor",
  ],
  openGraph: {
    title: "VibeUniv - AI로 만든 프로젝트, 이제 이해하기",
    description:
      "바이브 코딩으로 만든 프로젝트의 기술 스택을 AI가 분석하고 맞춤 학습 로드맵을 제공합니다",
    url: "https://vibeuniv.com",
    siteName: "VibeUniv",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "VibeUniv - AI로 만든 프로젝트, 이제 이해하기",
    description:
      "바이브 코딩으로 만든 프로젝트의 기술 스택을 AI가 분석하고 맞춤 학습 로드맵을 제공합니다",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "VibeUniv",
              url: "https://vibeuniv.com",
              logo: "https://vibeuniv.com/icon.png",
              description:
                "바이브 코딩으로 만든 프로젝트의 기술 스택을 AI가 분석하고 맞춤 학습 로드맵을 제공합니다",
            }),
          }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
