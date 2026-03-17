"use client";

import type { ReactNode } from "react";
import { useTutorPanel } from "@/components/features/tutor-panel-context";
import { TutorPanel } from "@/components/features/tutor-panel";

export function DashboardMain({ children }: { children: ReactNode }) {
  const { isOpen, panelProps } = useTutorPanel();

  // Only show tutor panel when panelProps is set (i.e. on learning module pages)
  const showTutor = !!panelProps;

  return (
    <>
      <main
        id="main-content"
        className={`lg:pl-64 transition-[padding-right] duration-300 ease-in-out ${
          showTutor && isOpen ? "lg:pr-[420px]" : ""
        }`}
      >
        <div className="mx-auto max-w-5xl px-6 py-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
      {showTutor && <TutorPanel />}
    </>
  );
}
