"use client";

import { useEffect, useRef, useState } from "react";

// ─── Config (replace with real IDs after service approval) ───────────
const ADSENSE_CLIENT = "ca-pub-4760760559027921";
const ADSENSE_SLOT = "REPLACE_WITH_AD_SLOT"; // TODO: Replace after AdSense approval
const KAKAO_AD_UNIT = "DAN-1YKRk1M8gzxH0E8v";

// ─── Types ───────────────────────────────────────────────────────────

declare global {
  interface Window {
    adfit?: { destroy: (adUnitId: string) => void };
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

interface GeoAdProps {
  /** User plan type — ads only render for "free" users */
  planType?: "free" | "pro" | "team";
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getCountryFromCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)country=([^;]*)/);
  return match?.[1] ?? "";
}

// ─── Kakao AdFit Banner ──────────────────────────────────────────────

function KakaoAdfitBanner({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous ad
    container.innerHTML = "";

    // Create <ins> element (728x90 leaderboard)
    const ins = document.createElement("ins");
    ins.className = "kakao_ad_area";
    ins.style.display = "none";
    ins.setAttribute("data-ad-unit", KAKAO_AD_UNIT);
    ins.setAttribute("data-ad-width", "728");
    ins.setAttribute("data-ad-height", "90");
    container.appendChild(ins);

    // Load script
    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/kas/static/ba.min.js";
    script.async = true;
    container.appendChild(script);

    return () => {
      // Cleanup on unmount (SPA navigation)
      if (window.adfit) {
        try {
          window.adfit.destroy(KAKAO_AD_UNIT);
        } catch {
          // Ignore if already destroyed
        }
      }
      container.innerHTML = "";
    };
  }, []);

  return (
    <div className={className}>
      <div className="flex items-center justify-center overflow-x-auto">
        <div
          ref={containerRef}
          style={{ minHeight: 90, minWidth: 728 }}
        />
      </div>
    </div>
  );
}

// ─── AdSense Banner ──────────────────────────────────────────────────

function AdSenseBanner({ className }: { className?: string }) {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current || !adRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not loaded yet
    }
  }, []);

  return (
    <div className={className}>
      <div className="flex items-center justify-center">
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: "block", minHeight: 90 }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={ADSENSE_SLOT}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}

// ─── GeoAd (main export) ────────────────────────────────────────────

export function GeoAd({ planType, className }: GeoAdProps) {
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    // Client-only: read country cookie after hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCountry(getCountryFromCookie());
  }, []);

  // Don't show ads for paid users
  if (planType && planType !== "free") return null;

  // SSR / hydration: render placeholder for CLS prevention
  if (country === null) {
    return (
      <div
        className={className}
        style={{ minHeight: 90 }}
        aria-hidden="true"
      />
    );
  }

  if (country === "KR") {
    return <KakaoAdfitBanner className={className} />;
  }

  return <AdSenseBanner className={className} />;
}
