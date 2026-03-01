"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  GraduationCap,
  Settings,
  Menu,
  X,
  LogOut,
  Shield,
  Home,
  BookOpen,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { UserRole } from "@/types/database";

interface SidebarProps {
  userEmail?: string;
  userRole?: UserRole;
}

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/projects", icon: FolderOpen, label: "Projects" },
  { href: "/learning", icon: GraduationCap, label: "Learning" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar({ userEmail, userRole }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const isAdmin = userRole === "admin" || userRole === "super_admin";

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 rounded-xl border border-border-default bg-bg-elevated p-2 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-text-muted" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-bg-elevated/95 backdrop-blur-xl border-r border-border-default transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm font-extrabold text-white">
              V
            </div>
            <span className="text-[17px] font-bold text-text-primary tracking-[-0.3px]">
              VibeUniv
            </span>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-text-muted" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "text-text-primary bg-[rgba(139,92,246,0.12)] border border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.08)]"
                    : "text-text-muted hover:text-text-primary hover:bg-bg-input border border-transparent"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "text-violet-400" : "text-text-faint"}`} />
                {item.label}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="my-3 border-t border-border-default" />
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  pathname.startsWith("/admin")
                    ? "text-text-primary bg-[rgba(139,92,246,0.12)] border border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.08)]"
                    : "text-text-muted hover:text-text-primary hover:bg-bg-input border border-transparent"
                }`}
              >
                <Shield className={`h-5 w-5 ${pathname.startsWith("/admin") ? "text-violet-400" : "text-text-faint"}`} />
                Admin
              </Link>
            </>
          )}

          <div className="my-3 border-t border-border-default" />
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-muted hover:text-text-primary hover:bg-bg-input transition-all duration-200"
          >
            <Home className="h-5 w-5 text-text-faint" />
            Home
          </Link>
          <Link
            href="/guide"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-muted hover:text-text-primary hover:bg-bg-input transition-all duration-200"
          >
            <BookOpen className="h-5 w-5 text-text-faint" />
            Guide
          </Link>
        </nav>

        {/* User profile */}
        <div className="border-t border-border-default p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-sm font-semibold text-white">
              {userEmail?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium text-text-primary">
                {userEmail ?? "User"}
              </p>
            </div>
            <ThemeToggle />
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-lg p-1 text-text-faint hover:text-text-tertiary transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
