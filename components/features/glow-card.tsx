"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";

interface GlowCardProps {
  children: ReactNode;
  glowColor?: "purple" | "cyan";
  delay?: number;
  className?: string;
}

export function GlowCard({ children, glowColor = "purple", delay = 0, className = "" }: GlowCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hoverShadow = glowColor === "cyan" ? "shadow-glow-card-cyan" : "shadow-glow-card-purple";

  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-border-default bg-bg-surface px-7 py-8 transition-all duration-[400ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:border-border-hover hover:${hoverShadow} ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(30px)",
        transition: `opacity 400ms cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms, transform 400ms cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms, border-color 400ms cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 400ms cubic-bezier(0.25,0.46,0.45,0.94)`,
      }}
      onMouseEnter={(e) => {
        const target = e.currentTarget;
        if (glowColor === "cyan") {
          target.style.boxShadow = "0 0 40px rgba(6,182,212,0.12)";
        } else {
          target.style.boxShadow = "0 0 40px rgba(139,92,246,0.15)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {children}
    </div>
  );
}
