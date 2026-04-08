"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_SECTION, NAV_SECTIONS } from "@/lib/archive/constants";
import { useArchive } from "@/lib/archive/archive-store";
import { Sidebar } from "./sidebar";
import { ContentArea } from "./content-area";
import { ParseWarningsBanner } from "./parse-warnings-banner";

/** All known section ids, derived once from NAV_SECTIONS for URL validation. */
const VALID_SECTION_IDS = new Set(
  NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.id)),
);

function normalizeSection(value: string | null | undefined): string {
  if (value && VALID_SECTION_IDS.has(value)) return value;
  return DEFAULT_SECTION;
}

export function DashboardShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The URL is the source of truth for the active section. useSearchParams
  // re-renders on URL change (including back/forward), so deriving from it
  // gives us deep linking + history navigation for free.
  const activeSection = useMemo(
    () => normalizeSection(searchParams.get("section")),
    [searchParams],
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { state } = useArchive();

  const username =
    state.status === "ready" ? state.archive.meta.username : null;

  const handleNavigate = useCallback(
    (id: string) => {
      setSidebarOpen(false);
      // Mirror the active section into the URL so links and reloads work.
      // Preserve any other params the user may have set.
      const params = new URLSearchParams(searchParams.toString());
      params.set("section", id);
      // push (not replace): each sidebar click should add a history entry so
      // the browser back/forward buttons walk through the user's nav history.
      // No-op if the user clicks the section they're already on.
      const next = `?${params.toString()}`;
      if (next === `?${searchParams.toString()}`) return;
      router.push(next, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div className="flex h-full flex-1 flex-col">
      <ParseWarningsBanner />
      {username && (
        <h1 className="sr-only">xfold dashboard for @{username}</h1>
      )}
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
        <ContentArea sectionId={activeSection} onNavigate={handleNavigate} />
      </div>
    </div>
  );
}
