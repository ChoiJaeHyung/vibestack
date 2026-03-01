"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

const ERROR_MESSAGES: Record<string, string> = {
  auth_callback_error: "소셜 로그인에 실패했습니다. 다시 시도해주세요.",
  banned: "이 계정은 이용이 제한되었습니다. 관리자에게 문의하세요.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "true";
  const errorParam = searchParams.get("error");
  const paramErrorMessage = errorParam ? ERROR_MESSAGES[errorParam] ?? null : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
  };

  const handleOAuthLogin = async (provider: "google" | "github") => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/callback?next=/settings`,
      });

      if (error) {
        setResetError(error.message);
        return;
      }

      setResetSuccess(true);
    } catch {
      setResetError("요청 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background relative">
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

      <div className="w-full max-w-sm space-y-8 relative z-10">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-[38px] h-[38px] rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-base font-extrabold text-white">
              V
            </div>
            <span className="text-2xl font-bold text-text-primary">
              VibeUniv
            </span>
          </Link>
          <p className="mt-2 text-sm text-text-muted">
            계정에 로그인하세요
          </p>
        </div>

        {expired && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            세션이 만료되었습니다. 다시 로그인해 주세요.
          </div>
        )}

        {paramErrorMessage && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {paramErrorMessage}
          </div>
        )}

        {/* OAuth buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleOAuthLogin("github")}
            className="w-full py-2.5 rounded-xl bg-bg-surface border border-border-default text-sm font-medium text-text-tertiary hover:bg-bg-surface-hover hover:border-border-hover transition-all flex items-center justify-center gap-2"
          >
            <GitHubIcon />
            GitHub으로 로그인
          </button>
          <button
            onClick={() => handleOAuthLogin("google")}
            className="w-full py-2.5 rounded-xl bg-bg-surface border border-border-default text-sm font-medium text-text-tertiary hover:bg-bg-surface-hover hover:border-border-hover transition-all flex items-center justify-center gap-2"
          >
            <GoogleIcon />
            Google로 로그인
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-default" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-text-faint">or</span>
          </div>
        </div>

        {/* Email login form / Password reset form */}
        {showResetForm ? (
          <div className="space-y-4">
            {resetSuccess ? (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200 space-y-2">
                <p className="font-medium">비밀번호 재설정 링크를 보내드렸습니다.</p>
                <p>이메일을 확인해주세요.</p>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-sm text-text-muted">
                  가입한 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.
                </p>
                <Input
                  id="reset-email"
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
                {resetError && (
                  <p className="text-sm text-red-400">{resetError}</p>
                )}
                <Button type="submit" className="w-full" disabled={resetLoading}>
                  {resetLoading ? "전송 중..." : "재설정 링크 보내기"}
                </Button>
              </form>
            )}
            <button
              type="button"
              onClick={() => {
                setShowResetForm(false);
                setResetSuccess(false);
                setResetError(null);
              }}
              className="w-full text-center text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              로그인으로 돌아가기
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div>
              <Input
                id="password"
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="mt-1 text-right">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetForm(true);
                    setResetEmail(email);
                  }}
                  className="text-xs text-text-muted hover:text-violet-400 transition-colors"
                >
                  비밀번호를 잊으셨나요?
                </button>
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-text-muted">
          계정이 없으신가요?{" "}
          <Link
            href="/signup"
            className="font-medium text-text-primary hover:text-violet-400 hover:underline transition-colors"
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
