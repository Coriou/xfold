"use client";

import type { EvaluatedShareCard } from "./types";
import { SHARE_CARD_SIZE } from "./_primitives";

interface Props {
  card: EvaluatedShareCard;
  selected: boolean;
  featured: boolean;
  onSelect: () => void;
}

const THUMB_SIZE = 160;
const THUMB_SCALE = THUMB_SIZE / SHARE_CARD_SIZE;

/**
 * Thumbnail of a share card. Renders the card at full 1080×1080 inside an
 * overflow:hidden 160×160 wrapper, then CSS-scales the inner element down.
 *
 * No html2canvas runs for thumbnails — pure DOM scaling. Pointer events on
 * the inner element are disabled so the parent button captures the click.
 */
export function ShareCardThumbnail({
  card,
  selected,
  featured,
  onSelect,
}: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${
        selected
          ? "border-accent"
          : "border-border hover:border-border-hover"
      }`}
      style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
    >
      <div
        className="origin-top-left"
        style={{
          width: SHARE_CARD_SIZE,
          height: SHARE_CARD_SIZE,
          transform: `scale(${THUMB_SCALE})`,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        {card.render()}
      </div>
      {featured && (
        <span className="absolute right-1 top-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase text-background">
          Featured
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 truncate bg-background/80 px-2 py-1 text-[11px] font-medium text-foreground backdrop-blur-sm">
        {card.meta.title}
      </span>
    </button>
  );
}
