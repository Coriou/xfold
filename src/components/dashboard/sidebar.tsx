"use client";

import { useEffect, useId, useRef } from "react";
import { NAV_SECTIONS } from "@/lib/archive/constants";
import { useArchive } from "@/lib/archive/archive-store";
import type { ParsedArchive } from "@/lib/archive/types";

interface SidebarProps {
  activeSection: string;
  onNavigate: (id: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  activeSection,
  onNavigate,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const { state, reset } = useArchive();
  const archive = state.status === "ready" ? state.archive : null;
  const titleId = useId();
  const drawerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Close on Escape, lock body scroll, focus first nav button, restore focus
  // on close, and trap Tab/Shift+Tab inside the drawer. Focus trap is modeled
  // after share-gallery's implementation.
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the drawer once it has rendered.
    const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = drawerRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handler);

    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
      // Restore focus to whatever opened the drawer (the hamburger button).
      previouslyFocused.current?.focus();
    };
  }, [isOpen, onClose]);

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <span className="text-lg font-bold tracking-tight text-foreground">
          x<span className="text-accent">fold</span>
        </span>
        {archive?.meta.username && (
          <span className="truncate text-xs text-foreground-muted">
            @{archive.meta.username}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Main navigation">
        {NAV_SECTIONS.map((section) => (
          <div key={section.id} className="mb-4">
            <h3 className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
              {section.label}
            </h3>
            <ul>
              {section.items.map((item) => {
                const isActive = activeSection === item.id;
                const count = getCount(archive, item.dataKey);

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate(item.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={`
                        flex w-full items-center justify-between rounded-lg px-2 py-2
                        text-left text-sm transition-colors
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                        ${
                          isActive
                            ? "bg-accent-muted/30 text-accent font-medium"
                            : "text-foreground-muted hover:bg-background-raised hover:text-foreground"
                        }
                      `}
                    >
                      <span className="truncate">{item.label}</span>
                      {count !== null && (
                        <span
                          className={`ml-2 shrink-0 font-mono text-xs ${
                            isActive
                              ? "text-accent/70"
                              : "text-foreground-muted/60"
                          }`}
                        >
                          {count.toLocaleString()}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={() => {
            reset();
            onClose?.();
          }}
          className="w-full rounded-lg px-3 py-2 text-left text-xs text-foreground-muted transition-colors hover:bg-background-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Load different archive
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden h-full w-60 shrink-0 flex-col border-r border-border bg-background-overlay lg:flex"
        aria-label="Dashboard sections"
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer. inert when closed so the sidebar buttons aren't in
          the tab order behind the upload zone / dashboard content. */}
      <div
        ref={drawerRef}
        className={`fixed inset-0 z-40 lg:hidden ${isOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!isOpen}
        {...(isOpen
          ? { role: "dialog", "aria-modal": "true", "aria-labelledby": titleId }
          : { inert: true })}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={onClose}
          aria-hidden="true"
        />
        {/* Panel */}
        <aside
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-background-overlay shadow-2xl transition-transform duration-200 ease-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          aria-label="Dashboard sections"
        >
          <span id={titleId} className="sr-only">
            Dashboard sections
          </span>
          {sidebarContent}
        </aside>
      </div>
    </>
  );
}

function getCount(
  archive: ParsedArchive | null,
  dataKey: string | undefined,
): number | null {
  if (!archive || !dataKey) return null;

  const value = archive[dataKey as keyof ParsedArchive];

  if (Array.isArray(value)) return value.length > 0 ? value.length : null;
  if (value && typeof value === "object") return null;
  return null;
}
