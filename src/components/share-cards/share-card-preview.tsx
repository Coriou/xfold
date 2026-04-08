"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EvaluatedShareCard } from "./types";
import { SHARE_CARD_SIZE } from "./_primitives";

interface ShareCardPreviewProps {
  card: EvaluatedShareCard;
  username: string;
}

/**
 * Pixel ratio applied to the rasterized PNG. The card is laid out at 1080×1080
 * and we double it for retina sharpness when shared on social media.
 */
const EXPORT_PIXEL_RATIO = 2;

/**
 * Rasterize a DOM subtree to a PNG Blob via SVG `<foreignObject>`.
 *
 * Why a custom path instead of `html2canvas` / `html-to-image`:
 *
 * - `html2canvas` reimplements its own CSS color parser and chokes on
 *   `oklch()` / `lab()` (which is what Tailwind 4's design tokens compile to).
 *   Every download blew up with `Attempting to parse an unsupported color
 *   function "lab"`.
 *
 * - `html-to-image` defers color resolution to the browser (good), but its
 *   clone-node step calls `getComputedStyle().cssText` and assigns it back
 *   onto the cloned node. With Tailwind 4's CSS-variable-heavy cascade, that
 *   round-trip blocked the main thread for 30+ seconds even on a 24-element
 *   card. `setInterval` got throttled while it ran, which is the smoking gun.
 *
 * The cards are deliberately built so this custom path can be tiny:
 * `_primitives.tsx` mandates that every style is *inline* (`style={...}`) and
 * every color is a hex string from `@/lib/brand`. That means a plain
 * `cloneNode(true)` already preserves the entire visual contract — no style
 * inlining or computed-style copying needed. We drop the clone into a
 * `<foreignObject>`, serialize to a data: SVG URL, draw it to a canvas, and
 * call `canvas.toBlob`. End-to-end this takes ~100–300ms instead of timing
 * out.
 *
 * If a future contributor adds a card primitive that relies on a class name
 * or a CSS variable from globals.css instead of an inline style, this path
 * will silently render the default value for that property in the export.
 * Add a comment in `_primitives.tsx` if you change that contract.
 */
async function rasterizeCardToPng(
  source: HTMLElement,
  width: number,
  height: number,
): Promise<Blob> {
  // 1. Clone the live card. cloneNode(true) preserves all inline styles and
  //    SVG attributes (which is everything the cards use).
  //
  //    `source` is the *outer* wrapper that the React component uses to apply
  //    `transform: scale(N)` for the on-screen preview. We want the actual
  //    CardFrame (its first child) for the export — the wrapper is just a
  //    pure-block element with no layout intent of its own, and putting it in
  //    a foreignObject swallows the inner flex layout's `margin-top: auto`
  //    that pushes the footer to the bottom of the card. Cloning the inner
  //    element directly gets us a self-contained 1080×1080 flex container.
  const inner = source.firstElementChild;
  if (!(inner instanceof HTMLElement)) {
    throw new Error("Card has no rasterizable content");
  }
  const clone = inner.cloneNode(true) as HTMLElement;
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");

  // 2. Wrap the clone in an SVG with a <foreignObject> sized to the card.
  //    The browser will render the HTML inside the foreignObject as part of
  //    rasterizing the SVG image, which is the trick that lets us bridge
  //    HTML → canvas without a third-party serializer.
  //
  //    We deliberately encode the SVG as a `data:` URL rather than a `blob:`
  //    URL. Blob URLs are treated as cross-origin by the canvas security
  //    model — `drawImage` happily draws them, but the canvas is then
  //    tainted and `toBlob`/`toDataURL` throws "Tainted canvases may not be
  //    exported." Data URLs of `image/svg+xml` are considered same-origin
  //    and bypass that check.
  const serializer = new XMLSerializer();
  const cloneXml = serializer.serializeToString(clone);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject x="0" y="0" width="100%" height="100%">${cloneXml}</foreignObject>` +
    `</svg>`;
  // encodeURIComponent is the most forgiving encoder for the wide character
  // range that ends up in user-generated content (handles names, tweet
  // snippets, etc. that contain `#`, `&`, non-Latin scripts and emoji).
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  // 3. Decode the SVG into an Image, then draw it onto a canvas at the
  //    target pixel ratio.
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () =>
      reject(new Error("Browser failed to decode the rendered card."));
    i.src = svgUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width * EXPORT_PIXEL_RATIO;
  canvas.height = height * EXPORT_PIXEL_RATIO;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // 4. Hand the rasterized canvas back as a PNG blob.
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png");
  });
  if (!blob) {
    throw new Error("Canvas produced no PNG bytes");
  }
  return blob;
}

/**
 * Renders one card scaled-to-fit with a download-as-PNG button.
 *
 * CRITICAL: `cardRef` MUST point at the inner unscaled card element (rendered
 * at 1080×1080), NOT at the scaled wrapper. The rasterizer captures the
 * underlying box regardless of CSS transform on a parent. The wrapper applies
 * scale only for visual preview.
 */
export function ShareCardPreview({ card, username }: ShareCardPreviewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

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
    setDownloadError(null);
    try {
      const blob = await rasterizeCardToPng(
        cardRef.current,
        SHARE_CARD_SIZE,
        SHARE_CARD_SIZE,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `xfold-${username || "card"}-${card.meta.slug}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setDownloadError(`Couldn't generate the image: ${message}`);
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
        unscaled inner element so the rasterizer captures the full size.
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
      {downloadError && (
        <div
          role="alert"
          className="max-w-sm rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-center text-xs text-danger"
        >
          {downloadError}
        </div>
      )}
    </div>
  );
}
