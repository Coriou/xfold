"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EvaluatedShareCard } from "./types";
import { SHARE_CARD_SIZE } from "./_primitives";

interface ShareCardPreviewProps {
  card: EvaluatedShareCard;
  username: string;
}

/**
 * Renders one card scaled-to-fit with a download-as-PNG button.
 *
 * CRITICAL: `cardRef` MUST point at the inner unscaled card element (rendered
 * at 1080×1080), NOT at the scaled wrapper. html2canvas captures the underlying
 * box regardless of CSS transform on a parent. The wrapper applies scale only
 * for visual preview.
 */
export function ShareCardPreview({ card, username }: ShareCardPreviewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    function update() {
      const maxW = window.innerWidth * 0.85;
      // Leave room for the thumbnail strip + button below.
      const maxH = window.innerHeight * 0.6;
      // Cap at 1.0 — never upscale the card past its native 1080×1080.
      // Without the cap, large desktops produced scale > 1 which made
      // the preview look pixelated and boxed-shadow at the wrong scale.
      setScale(Math.min(maxW / SHARE_CARD_SIZE, maxH / SHARE_CARD_SIZE, 1));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: false,
        allowTaint: false,
      });
      await new Promise<void>((resolve) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve();
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `xfold-${username || "card"}-${card.meta.slug}.png`;
          a.click();
          URL.revokeObjectURL(url);
          resolve();
        }, "image/png");
      });
    } finally {
      setDownloading(false);
    }
  }, [card.meta.slug, downloading, username]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
      {/*
        Outer wrapper sized to the *visual* dimensions so the layout knows
        the actual on-screen size. Inner wrapper is the unscaled 1080×1080
        card; CSS transform scales it down for display. cardRef is on the
        unscaled inner element so html2canvas captures the full size.
      */}
      <div
        style={{
          width: SHARE_CARD_SIZE * scale,
          height: SHARE_CARD_SIZE * scale,
        }}
      >
        <div
          ref={cardRef}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: SHARE_CARD_SIZE,
            height: SHARE_CARD_SIZE,
          }}
        >
          {card.render()}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          void handleDownload();
        }}
        disabled={downloading}
        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {downloading ? "Generating…" : "Download as image"}
      </button>
    </div>
  );
}
