"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  duration?: number;
}

export function AnimatedCounter({ target, suffix = "", duration = 2000 }: AnimatedCounterProps) {
  // SSR + 초기 클라이언트: target 값 표시 (Google 크롤러가 실제 숫자를 볼 수 있도록)
  const [count, setCount] = useState(target);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const wasInViewportRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const callbackRef = useCallback((el: HTMLSpanElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!el) return;

    // 이미 뷰포트 안이면 target 그대로 유지 (애니메이션 안 함)
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      wasInViewportRef.current = true;
      return;
    }

    // 뷰포트 밖: 스크롤해서 보일 때 애니메이션
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldAnimate(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    observerRef.current = observer;
  }, []);

  useEffect(() => {
    if (!shouldAnimate) return;

    let rafId: number;
    let startTime: number | null = null;

    const animate = (currentTime: number) => {
      if (startTime === null) {
        startTime = currentTime;
      }
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    // 첫 프레임에서 0부터 시작 (rAF 콜백 안에서 setState → 허용됨)
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [shouldAnimate, target, duration]);

  return (
    <span ref={callbackRef} className="gradient-text">
      {count.toLocaleString()}{suffix}
    </span>
  );
}
