"use client";

import { useEffect, useRef } from "react";

interface AdSlotProps {
  className?: string;
}

export function AdSlot({ className }: AdSlotProps) {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      const adsbygoogle = (window as unknown as { adsbygoogle: unknown[] })
        .adsbygoogle;
      if (adsbygoogle) {
        adsbygoogle.push({});
        pushed.current = true;
      }
    } catch {
      // AdSense not loaded or blocked
    }
  }, []);

  return (
    <div className={className}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-4760760559027921"
        data-ad-slot="8006064906"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
