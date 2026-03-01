"use client";

import { useEffect, useState } from "react";

const LINES = [
  { text: "$ npx @vibeuniv/mcp-server@latest", color: "text-zinc-100", prefix: "text-cyan-500" },
  { text: "✓ Connected to VibeUniv", color: "text-cyan-500", prefix: "" },
  { text: "⏳ Scanning project files...", color: "text-zinc-400", prefix: "" },
  { text: "📦 Detected: Next.js 15, React 19, Supabase, Tailwind", color: "text-violet-400", prefix: "" },
  { text: "🎓 Learning path generated — 6 modules, 24 lessons", color: "text-cyan-500", prefix: "" },
  { text: "✨ Ready! Ask your AI tutor anything about your code.", color: "text-green-500", prefix: "" },
];

export function TerminalDemo() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (visibleLines >= LINES.length) {
      setIsTyping(false);
      return;
    }

    const line = LINES[visibleLines];
    let charIndex = 0;

    const typeInterval = setInterval(() => {
      charIndex++;
      setCurrentText(line.text.slice(0, charIndex));

      if (charIndex >= line.text.length) {
        clearInterval(typeInterval);
        setTimeout(() => {
          setVisibleLines((prev) => prev + 1);
          setCurrentText("");
        }, 400);
      }
    }, 25);

    return () => clearInterval(typeInterval);
  }, [visibleLines]);

  return (
    <div className="flex-[1_1_440px] min-w-[340px]">
      <div className="bg-[rgba(0,0,0,0.5)] rounded-2xl border border-[rgba(255,255,255,0.08)] overflow-hidden shadow-terminal">
        {/* Title bar */}
        <div className="px-4 py-3 flex items-center gap-2 bg-[rgba(255,255,255,0.03)] border-b border-[rgba(255,255,255,0.06)]">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
          <span className="ml-3 text-xs text-zinc-500">~/my-awesome-app</span>
        </div>

        {/* Terminal content */}
        <div className="p-5 min-h-[200px] font-mono text-[13px] leading-[1.8]">
          {LINES.slice(0, visibleLines).map((line, i) => (
            <div key={i} className={line.color}>
              {line.prefix && line.text.startsWith("$") ? (
                <>
                  <span className={line.prefix}>$</span>
                  <span>{line.text.slice(1)}</span>
                </>
              ) : (
                line.text
              )}
            </div>
          ))}
          {visibleLines < LINES.length && (
            <div className={LINES[visibleLines].color}>
              {LINES[visibleLines].prefix && currentText.startsWith("$") ? (
                <>
                  <span className={LINES[visibleLines].prefix}>$</span>
                  <span>{currentText.slice(1)}</span>
                </>
              ) : (
                currentText
              )}
              <span className="animate-[blink_1s_step-end_infinite] text-violet-500">▌</span>
            </div>
          )}
          {!isTyping && (
            <div>
              <span className="animate-[blink_1s_step-end_infinite] text-violet-500">▌</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
