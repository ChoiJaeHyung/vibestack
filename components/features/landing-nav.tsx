"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface LandingNavProps {
  userEmail: string | null;
}

export function LandingNav({ userEmail }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        scrolled
          ? "glass-nav border-b border-border-default"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-[1120px] mx-auto flex items-center justify-between h-16 px-8 max-md:px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm font-extrabold text-white">
            V
          </div>
          <span className="text-[17px] font-bold text-text-primary tracking-[-0.3px]">
            VibeUniv
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#how" className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors tracking-[0.2px]">
            작동 방식
          </a>
          <a href="#features" className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors tracking-[0.2px]">
            기능
          </a>
          <a href="#pricing" className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors tracking-[0.2px]">
            가격
          </a>
          <a href="#faq" className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors tracking-[0.2px]">
            FAQ
          </a>
        </nav>

        {/* Right buttons */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {userEmail ? (
            <Link
              href="/dashboard"
              className="px-5 py-2 rounded-[10px] bg-gradient-to-br from-violet-500 to-cyan-500 text-[13px] font-semibold text-white shadow-glow-purple-sm hover:opacity-90 transition-all"
            >
              대시보드
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2 rounded-[10px] bg-gradient-to-br from-violet-500 to-cyan-500 text-[13px] font-semibold text-white shadow-glow-purple-sm hover:opacity-90 transition-all"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-text-muted hover:text-text-primary transition-colors"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass-nav border-t border-border-default px-4 py-4 space-y-3">
          <a href="#how" onClick={() => setMobileOpen(false)} className="block text-sm text-text-muted hover:text-text-primary py-2">
            작동 방식
          </a>
          <a href="#features" onClick={() => setMobileOpen(false)} className="block text-sm text-text-muted hover:text-text-primary py-2">
            기능
          </a>
          <a href="#pricing" onClick={() => setMobileOpen(false)} className="block text-sm text-text-muted hover:text-text-primary py-2">
            가격
          </a>
          <a href="#faq" onClick={() => setMobileOpen(false)} className="block text-sm text-text-muted hover:text-text-primary py-2">
            FAQ
          </a>
          <div className="pt-2 border-t border-border-default space-y-2">
            {userEmail ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center px-5 py-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-sm font-semibold text-white"
              >
                대시보드
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center px-5 py-2.5 rounded-xl text-sm text-text-tertiary border border-border-default"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center px-5 py-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-sm font-semibold text-white"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
