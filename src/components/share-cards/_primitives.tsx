// ---------------------------------------------------------------------------
// Share-card primitives — html2canvas-safe building blocks
// ---------------------------------------------------------------------------
//
// EVERY style here must be inline. EVERY color must be a hex string from
// `@/lib/brand` (no oklch, no CSS variables). EVERY font must be a system
// font. SVG only — no <img>, no <video>, no canvas, no portals.
//
// html2canvas captures these elements at 1080×1080 with `scale: 2`, then
// downloads as PNG. Anything that violates the constraints above will silently
// drop or render wrong in the export.
// ---------------------------------------------------------------------------

import type { ReactNode } from "react";
import { brand } from "@/lib/brand";

export const SHARE_CARD_SIZE = 1080;

const FONT =
  "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// --- Frame ------------------------------------------------------------------

export function CardFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: SHARE_CARD_SIZE,
        height: SHARE_CARD_SIZE,
        // border-box keeps the outer box exactly SHARE_CARD_SIZE × SHARE_CARD_SIZE
        // even with the 80px inner padding, so the absolutely-positioned
        // CardFooter (`bottom: 80`) lands at y = 1080 − 80 = 1000 inside the
        // foreignObject viewport. Without this, padding adds to the box and
        // pushes the footer below the 1080px canvas, where it's clipped off
        // the bottom of the export.
        boxSizing: "border-box",
        backgroundColor: brand.background,
        color: brand.foreground,
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        padding: 80,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

// --- Header / footer --------------------------------------------------------

export function CardHeader({ title }: { title?: string | undefined }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 32,
      }}
    >
      <span style={{ fontSize: 28, fontWeight: 700, color: brand.accent }}>
        xfold
      </span>
      {title && (
        <span style={{ fontSize: 20, color: brand.foreground, fontWeight: 600 }}>
          {title}
        </span>
      )}
    </div>
  );
}

export function CardFooter({ username }: { username: string }) {
  // The footer is absolutely positioned (rather than `margin-top: auto`) so
  // that it survives the SVG `<foreignObject>` rasterization path used to
  // export the card to PNG. Foreign-object renders flex containers without
  // honoring an explicit pixel `height` on the root, which collapses the
  // CardFrame to its content height — `margin-top: auto` then has no extra
  // space to push into and the footer disappears from the export. Anchoring
  // to `bottom` lets the same DOM render correctly both on screen (where
  // CardFrame's `position: relative` is the containing block) and inside the
  // foreignObject's HTML viewport. The 80px insets mirror CardFrame's outer
  // padding so the layout looks identical to the previous flex version.
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        bottom: 80,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
      }}
    >
      {username && (
        <span style={{ fontSize: 18, color: brand.foregroundMuted }}>
          @{username}
        </span>
      )}
      <span style={{ fontSize: 16, color: brand.accent }}>
        See what X knows → xfold.app
      </span>
    </div>
  );
}

// --- Content primitives -----------------------------------------------------

export function BigNumber({
  value,
  unit,
  color,
}: {
  value: string;
  unit?: string | undefined;
  color?: string | undefined;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 140,
          fontWeight: 700,
          fontFamily: "monospace",
          color: color ?? brand.foreground,
          lineHeight: 1,
          letterSpacing: -2,
        }}
      >
        {value}
      </div>
      {unit && (
        <div
          style={{
            fontSize: 22,
            color: brand.foregroundMuted,
            marginTop: 16,
          }}
        >
          {unit}
        </div>
      )}
    </div>
  );
}

export function MetricRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string | undefined;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        backgroundColor: brand.backgroundRaised,
        borderRadius: 12,
        padding: "20px 24px",
      }}
    >
      <span style={{ fontSize: 18, color: brand.foregroundMuted }}>
        {label}
      </span>
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
        }}
      >
        <span
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: brand.foreground,
          }}
        >
          {value}
        </span>
        {sub && (
          <span style={{ fontSize: 14, color: brand.foregroundMuted }}>
            {sub}
          </span>
        )}
      </span>
    </div>
  );
}

export function StatGrid({
  stats,
}: {
  stats: readonly { label: string; value: string }[];
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 20,
      }}
    >
      {stats.map((s, i) => (
        <div
          key={i}
          style={{
            backgroundColor: brand.backgroundRaised,
            borderRadius: 16,
            padding: "24px 20px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              fontFamily: "monospace",
              marginBottom: 4,
            }}
          >
            {s.value}
          </div>
          <div style={{ fontSize: 14, color: brand.foregroundMuted }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export function QuoteBlock({
  caption,
  text,
  date,
}: {
  caption: string;
  text: string;
  date?: string | undefined;
}) {
  return (
    <div
      style={{
        padding: 24,
        backgroundColor: brand.backgroundRaised,
        borderRadius: 16,
      }}
    >
      <div
        style={{
          fontSize: 14,
          color: brand.foregroundMuted,
          marginBottom: 8,
        }}
      >
        {caption}
      </div>
      <div
        style={{
          fontSize: 22,
          color: brand.foreground,
          lineHeight: 1.4,
        }}
      >
        &ldquo;{text}&rdquo;
      </div>
      {date && (
        <div
          style={{
            fontSize: 14,
            color: brand.foregroundMuted,
            marginTop: 12,
          }}
        >
          {date}
        </div>
      )}
    </div>
  );
}

export function NameList({
  names,
  columns = 2,
}: {
  names: readonly string[];
  columns?: number;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 12,
      }}
    >
      {names.map((name, i) => (
        <div
          key={i}
          style={{
            backgroundColor: brand.backgroundRaised,
            borderRadius: 8,
            padding: "12px 16px",
            fontSize: 18,
            color: brand.foreground,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </div>
      ))}
    </div>
  );
}

// --- SVG primitives ---------------------------------------------------------

export function ScoreRingSvg({
  score,
  grade,
  size = 220,
  strokeWidth = 14,
}: {
  score: number;
  grade: string;
  size?: number;
  strokeWidth?: number;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;

  // Color tiers — green if good, neutral if mid, danger if high exposure.
  const ringColor =
    score <= 30 ? brand.accent : score <= 60 ? brand.foreground : brand.danger;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={brand.backgroundRaised}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: ringColor,
            lineHeight: 1,
          }}
        >
          {grade}
        </span>
        <span
          style={{
            fontSize: 18,
            color: brand.foregroundMuted,
            fontFamily: "monospace",
            marginTop: 4,
          }}
        >
          {score}/100
        </span>
      </div>
    </div>
  );
}
