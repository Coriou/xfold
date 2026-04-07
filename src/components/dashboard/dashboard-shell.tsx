"use client";

import { useState, useCallback } from "react";
import { DEFAULT_SECTION } from "@/lib/archive/constants";
import { useArchive } from "@/lib/archive/archive-store";
import { Sidebar } from "./sidebar";
import { ContentArea } from "./content-area";
import { ParseWarningsBanner } from "./parse-warnings-banner";

export function DashboardShell() {
  const [activeSection, setActiveSection] = useState(DEFAULT_SECTION);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { state } = useArchive();

  const username =
    state.status === "ready" ? state.archive.meta.username : null;

  const handleNavigate = useCallback((id: string) => {
    setActiveSection(id);
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-full flex-1 flex-col">
      <ParseWarningsBanner />
      <div className="flex h-full flex-1 flex-col lg:flex-row">
      {/* Mobile top bar */}
      <div className="flex items-center gap-3 border-b border-border bg-background-overlay px-4 py-3 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-background-raised hover:text-foreground"
          aria-label="Open navigation"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="text-lg font-bold tracking-tight text-foreground">
          x<span className="text-accent">fold</span>
        </span>
        {username && (
          <span className="truncate text-xs text-foreground-muted">
            @{username}
          </span>
        )}
      </div>

      <Sidebar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <ContentArea sectionId={activeSection} />
      </div>
    </div>
  );
}
