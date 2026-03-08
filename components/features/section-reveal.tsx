"use client";

import { useRef, useCallback, useState, type ReactNode } from "react";

interface SectionRevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function SectionReveal({ children, delay = 0, className = "" }: SectionRevealProps) {
  // 콘텐츠는 항상 보임 (Google 크롤러 호환)
  // 스크롤 시 미세한 강조 애니메이션만 적용
  const [revealed, setRevealed] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const callbackRef = useCallback((el: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!el) return;

    // 이미 뷰포트 안이면 즉시 revealed
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    observerRef.current = observer;
  }, []);

  return (
    <div
      ref={callbackRef}
      className={className}
      style={{
        opacity: revealed ? 1 : 0.85,
        transform: revealed ? "translateY(0)" : "translateY(12px)",
        transition: `opacity 600ms cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms, transform 600ms cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
