"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useTutorPanel } from "@/components/features/tutor-panel-context";
import { TutorChat } from "@/components/features/tutor-chat";

export function TutorPanel() {
  const { isOpen, close, panelProps, selectedText } = useTutorPanel();

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        close();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={close}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border-default bg-bg-elevated/95 backdrop-blur-xl sm:w-[420px] transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
          <span className="text-sm font-medium text-text-primary">
            AI 튜터
          </span>
          <button
            type="button"
            onClick={close}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-input hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-hidden">
          {panelProps ? (
            <TutorChat
              projectId={panelProps.projectId}
              projectName={panelProps.projectName}
              learningPathId={panelProps.learningPathId}
              moduleId={panelProps.moduleId}
              selectedText={selectedText ?? undefined}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-text-muted">
                학습 모듈을 선택하세요
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
