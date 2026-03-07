import React from "react";
import Link from "next/link";
import { LandingNav } from "@/components/features/landing-nav";
import { createClient } from "@/lib/supabase/server";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userEmail: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  } catch {
    // 비로그인 상태
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingNav userEmail={userEmail} />
      <main className="flex-1 pt-16">{children}</main>
      <footer className="border-t border-border-default bg-bg-primary/50 py-8">
        <div className="max-w-[1120px] mx-auto px-8 max-md:px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <span>&copy; {new Date().getFullYear()} VibeUniv. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/about" className="hover:text-text-primary transition-colors">About</Link>
            <Link href="/guide" className="hover:text-text-primary transition-colors">Guide</Link>
            <Link href="/blog" className="hover:text-text-primary transition-colors">Blog</Link>
            <Link href="/terms" className="hover:text-text-primary transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-text-primary transition-colors">Privacy</Link>
            <Link href="/contact" className="hover:text-text-primary transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
