"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import type { PrivacyScore } from "@/lib/privacy-score";
import { SHARE_CARDS } from "./registry";
import { evaluateGallery } from "./auto-pick";
import { ShareCardThumbnail } from "./share-card-thumbnail";
import { ShareCardPreview } from "./share-card-preview";
import type { EvaluatedShareCard, ShareCardId } from "./types";

interface ShareGalleryProps {
  open: boolean;
  onClose: () => void;
  archive: ParsedArchive;
  score: PrivacyScore;
  /** Optional initial card to focus instead of the auto-picked featured one. */
  initialCardId?: ShareCardId | undefined;
}

/**
 * Outer wrapper. Mounts/unmounts the inner gallery body when `open` flips,
 * which lets the inner component use a `useState` initializer for selectedId
 * (avoiding the React 19 "setState in effect" anti-pattern).
 */
export function ShareGallery({ open, ...rest }: ShareGalleryProps) {
  if (!open) return null;
  return <ShareGalleryBody {...rest} />;
}

type ShareGalleryBodyProps = Omit<ShareGalleryProps, "open">;

function ShareGalleryBody({
  onClose,
  archive,
  score,
  initialCardId,
}: ShareGalleryBodyProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const gallery = useMemo(
    () => evaluateGallery(SHARE_CARDS, { archive, score }),
    [archive, score],
  );

  // Synchronous initializer — no effect needed because the body is freshly
  // mounted every time the modal opens.
  const [selectedId, setSelectedId] = useState<ShareCardId | null>(
    () => initialCardId ?? gallery.featuredId,
  );

  // Body scroll lock
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Focus management + escape to close + tab trap
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
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
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus();
    };
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const selected: EvaluatedShareCard | null =
    gallery.available.find((c) => c.meta.id === selectedId) ??
    gallery.available[0] ??
    null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-background/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <h2 id={titleId} className="sr-only">
        Choose a card to share
      </h2>

      {/* Top: thumbnail strip */}
      <div className="flex shrink-0 items-center gap-3 overflow-x-auto border-b border-border bg-background-raised/40 px-4 py-3 sm:px-6">
        {gallery.available.map((card) => (
          <ShareCardThumbnail
            key={card.meta.id}
            card={card}
            selected={selectedId === card.meta.id}
            featured={gallery.featuredId === card.meta.id}
            onSelect={() => setSelectedId(card.meta.id)}
          />
        ))}
      </div>

      {/* Center: scaled preview + download for the selected card */}
      {selected && (
        <ShareCardPreview
          key={selected.meta.id}
          card={selected}
          username={archive.meta.username}
        />
      )}

      {/* Close button — top-right corner */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close share gallery"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-background-raised text-foreground-muted transition-colors hover:bg-background-overlay hover:text-foreground"
      >
        <span aria-hidden="true" className="text-lg">
          ×
        </span>
      </button>
    </div>
  );
}
