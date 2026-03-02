"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const t = useTranslations("Auth");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (name.trim().length < 2) {
      setError(t("signupError.nameTooShort"));
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError(t("signupError.passwordTooShort"));
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
        data: {
          full_name: name.trim(),
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
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

  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendEmail = useCallback(async () => {
    if (resendCooldown > 0) return;

    setResendError(null);
    setResendSuccess(false);
    setResendCooldown(60);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        setResendError(error.message);
        return;
      }

      setResendSuccess(true);
    } catch {
      setResendError(t("signupError.resendFailed"));
    }
  }, [email, resendCooldown, t]);

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background relative">
        <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />
        <div className="w-full max-w-sm space-y-4 text-center relative z-10">
          <div className="mx-auto w-[48px] h-[48px] rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xl font-extrabold text-white">
            V
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            {t("verification.title")}
          </h1>
          <p className="text-sm text-text-muted">
            <span className="font-medium text-text-primary">
              {email}
            </span>
            {t("verification.sentTo", { email: "" })}
          </p>
          <p className="text-xs text-text-faint">
            {t("verification.timeNote")}
          </p>
          <div className="pt-2 space-y-3">
            {resendSuccess && (
              <p className="text-sm text-green-400">
                {t("verification.resent")}
              </p>
            )}
            {resendError && (
              <p className="text-sm text-red-400">{resendError}</p>
            )}
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleResendEmail}
              disabled={resendCooldown > 0}
            >
              {resendCooldown > 0
                ? t("verification.resendCooldown", { count: resendCooldown })
                : t("verification.resendButton")}
            </Button>
            <Link href="/login">
              <Button variant="ghost" className="w-full mt-2">
                {t("verification.backToLogin")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            {t("signup.subtitle")}
          </p>
        </div>

        {/* OAuth buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleOAuthLogin("github")}
            className="w-full py-2.5 rounded-xl bg-bg-surface border border-border-default text-sm font-medium text-text-tertiary hover:bg-bg-surface-hover hover:border-border-hover transition-all flex items-center justify-center gap-2"
          >
            <GitHubIcon />
            {t("signup.github")}
          </button>
          <button
            onClick={() => handleOAuthLogin("google")}
            className="w-full py-2.5 rounded-xl bg-bg-surface border border-border-default text-sm font-medium text-text-tertiary hover:bg-bg-surface-hover hover:border-border-hover transition-all flex items-center justify-center gap-2"
          >
            <GoogleIcon />
            {t("signup.google")}
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-default" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-text-faint">{t("signup.divider")}</span>
          </div>
        </div>

        {/* Email signup form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            id="name"
            label={t("signup.nameLabel")}
            type="text"
            placeholder={t("signup.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="password"
            label="Password"
            type="password"
            placeholder={t("signup.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("signup.submitting") : t("signup.submit")}
          </Button>
        </form>

        <p className="text-center text-sm text-text-muted">
          {t("signup.hasAccount")}{" "}
          <Link
            href="/login"
            className="font-medium text-text-primary hover:text-violet-400 hover:underline transition-colors"
          >
            {t("signup.loginLink")}
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
