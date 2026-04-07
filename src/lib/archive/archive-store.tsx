"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useArchiveWorker, type ArchiveState } from "./use-archive";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ArchiveContextValue {
  state: ArchiveState;
  loadArchive: (file: File) => void;
  cancelParse: () => void;
  dismissWarnings: () => void;
  getMedia: (path: string) => Promise<Blob | null>;
  reset: () => void;
}

const ArchiveContext = createContext<ArchiveContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ArchiveProvider({ children }: { children: ReactNode }) {
  const archive = useArchiveWorker();

  return (
    <ArchiveContext.Provider value={archive}>
      {children}
    </ArchiveContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useArchive(): ArchiveContextValue {
  const ctx = useContext(ArchiveContext);
  if (!ctx) {
    throw new Error("useArchive must be used within <ArchiveProvider>");
  }
  return ctx;
}
