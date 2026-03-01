import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "회원가입",
  description: "무료로 가입하고 AI 맞춤 학습을 시작하세요.",
};

export default function SignupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
