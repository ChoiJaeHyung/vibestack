import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: {
    default: "VibeStack - AI로 만든 프로젝트, 이제 이해하기",
    template: "%s | VibeStack",
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
    title: "VibeStack - AI로 만든 프로젝트, 이제 이해하기",
    description:
      "바이브 코딩으로 만든 프로젝트의 기술 스택을 AI가 분석하고 맞춤 학습 로드맵을 제공합니다",
    url: "https://vibestack.dev",
    siteName: "VibeStack",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "VibeStack - AI로 만든 프로젝트, 이제 이해하기",
    description:
      "바이브 코딩으로 만든 프로젝트의 기술 스택을 AI가 분석하고 맞춤 학습 로드맵을 제공합니다",
  },
  robots: {
    index: true,
    follow: true,
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
        {children}
      </body>
    </html>
  );
}
