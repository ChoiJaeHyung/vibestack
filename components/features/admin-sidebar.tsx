"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BookOpen,
  Settings,
  Shield,
  ArrowLeft,
  Menu,
  X,
  GraduationCap,
} from "lucide-react";
import type { UserRole } from "@/types/database";

interface AdminSidebarProps {
  userEmail?: string;
  userRole: UserRole;
}

const adminNavItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { href: "/admin/content", icon: BookOpen, label: "Content" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
  { href: "/admin/audit-log", icon: Shield, label: "Audit Log" },
];

export function AdminSidebar({ userEmail, userRole }: AdminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href) && href !== "/admin";
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 rounded-xl border border-border-default bg-bg-surface p-2 shadow-sm lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-text-muted" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border-default bg-bg-elevated transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-violet-400" />
            <span className="text-lg font-bold text-text-primary">
              Admin
            </span>
            <span className="rounded-lg bg-violet-500/10 px-1.5 py-0.5 text-xs font-medium text-violet-300">
              {userRole === "super_admin" ? "Super" : "Admin"}
            </span>
          </div>
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
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-violet-500/10 text-violet-300"
                    : "text-text-muted hover:bg-bg-input hover:text-text-primary"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Back to dashboard + user */}
        <div className="border-t border-border-default p-4">
          <Link
            href="/dashboard"
            className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-text-muted hover:bg-bg-input hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3 px-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-sm font-medium text-white">
              {userEmail?.charAt(0).toUpperCase() ?? "A"}
            </div>
            <p className="truncate text-sm font-medium text-text-primary">
              {userEmail ?? "Admin"}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
