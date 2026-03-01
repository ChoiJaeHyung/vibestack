"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface TutorPanelProps {
  projectId: string;
  projectName?: string;
  learningPathId: string;
  moduleId: string;
}

interface TutorPanelContextValue {
  isOpen: boolean;
  toggle: () => void;
  open: (selectedText?: string) => void;
  close: () => void;
  panelProps: TutorPanelProps | null;
  setPanelProps: (props: TutorPanelProps | null) => void;
  selectedText: string | null;
  setSelectedText: (text: string | null) => void;
}

const TutorPanelContext = createContext<TutorPanelContextValue | null>(null);

export function TutorPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [panelProps, setPanelProps] = useState<TutorPanelProps | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const open = useCallback((text?: string) => {
    if (text) {
      setSelectedText(text);
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <TutorPanelContext.Provider
      value={{
        isOpen,
        toggle,
        open,
        close,
        panelProps,
        setPanelProps,
        selectedText,
        setSelectedText,
      }}
    >
      {children}
    </TutorPanelContext.Provider>
  );
}

export function useTutorPanel() {
  const ctx = useContext(TutorPanelContext);
  if (!ctx) {
    throw new Error("useTutorPanel must be used within TutorPanelProvider");
  }
  return ctx;
}
