import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인",
  description: "VibeUniv 계정으로 로그인하세요.",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
