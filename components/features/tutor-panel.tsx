"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X, MessageCircle, Search } from "lucide-react";
import { useTutorPanel } from "@/components/features/tutor-panel-context";
import { TutorChat } from "@/components/features/tutor-chat";
import { TutorSearch } from "@/components/features/tutor-search";

type TabType = "chat" | "search";

export function TutorPanel() {
  const t = useTranslations("Tutor");
  const { isOpen, close, panelProps, selectedText } = useTutorPanel();
  const [activeTab, setActiveTab] = useState<TabType>("chat");

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

  // Switch to chat tab when new selectedText arrives (adjust state during render)
  const [prevSelectedText, setPrevSelectedText] = useState(selectedText);
  if (selectedText && selectedText !== prevSelectedText) {
    setActiveTab("chat");
    setPrevSelectedText(selectedText);
  }

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
        <div className="border-b border-border-default">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium text-text-primary">
              {t("panel.title")}
            </span>
            <button
              type="button"
              onClick={close}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-input hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex px-4 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-1.5 rounded-t-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "chat"
                  ? "bg-bg-input text-violet-400"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {t("panel.chat")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("search")}
              className={`flex items-center gap-1.5 rounded-t-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "search"
                  ? "bg-bg-input text-violet-400"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              {t("panel.search")}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "chat" ? (
            panelProps ? (
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
                  {t("panel.selectModule")}
                </p>
              </div>
            )
          ) : (
            <TutorSearch
              moduleName={panelProps?.moduleName}
            />
          )}
        </div>
      </div>
    </>
  );
}
