"use client";

import { useRef, useEffect, useState, useCallback, useId } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import type { PrivacyScore } from "@/lib/privacy-score";
import { DataCard } from "./data-card";

interface DataCardModalProps {
  open: boolean;
  onClose: () => void;
  archive: ParsedArchive;
  score: PrivacyScore;
}

const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function DataCardModal({
  open,
  onClose,
  archive,
  score,
}: DataCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [scale, setScale] = useState(0.4);
  const [downloading, setDownloading] = useState(false);
  const titleId = useId();

  // Scale card to fit viewport
  useEffect(() => {
    if (!open) return;
    function updateScale() {
      const maxW = window.innerWidth * 0.85;
      const maxH = window.innerHeight * 0.7;
      setScale(Math.min(maxW / 1080, maxH / 1080, 1));
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [open]);

  // Body scroll lock + focus restore
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open]);

  // Close on Escape + focus trap (Tab cycles within dialog)
  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Initial focus on the dialog when it opens
  useEffect(() => {
    if (!open) return;
    const root = dialogRef.current;
    if (!root) return;
    const firstFocusable = root.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();
  }, [open]);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        // Block any external resource loading — DataCard is text/SVG only.
        useCORS: false,
        allowTaint: false,
      });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `xfold-${archive.meta.username || "card"}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    } finally {
      setDownloading(false);
    }
  }, [archive.meta.username, downloading]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <h2 id={titleId} className="sr-only">
        Shareable privacy summary card
      </h2>

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close shareable card"
        className="absolute right-4 top-4 rounded-lg p-2 text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Card preview (scaled) */}
      <div className="origin-top" style={{ transform: `scale(${scale})` }}>
        <DataCard ref={cardRef} archive={archive} score={score} />
      </div>

      {/* Download button */}
      <div
        className="mt-4"
        style={{ marginTop: `${-1080 * (1 - scale) + 16}px` }}
      >
        <button
          type="button"
          onClick={() => {
            void handleDownload();
          }}
          disabled={downloading}
          aria-busy={downloading}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
        >
          {downloading && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-spin"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          )}
          {downloading ? "Generating…" : "Download as Image"}
        </button>
      </div>
    </div>
  );
}
