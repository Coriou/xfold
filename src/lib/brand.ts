// ---------------------------------------------------------------------------
// Brand colors — single source of truth for color tokens
// ---------------------------------------------------------------------------
// Two parallel representations of the same palette:
//
//   1. `brand` — hex strings for contexts that can't reference CSS variables:
//        - next/og ImageResponse (icon, apple-icon, opengraph-image)
//        - html2canvas screenshots (data-card)
//        - global-error.tsx (renders without the layout/globals.css)
//
//   2. `chartColors` — oklch strings for inline `style={{ color }}` props
//      in chart/timeline components. oklch is the same color space used in
//      globals.css, so renders match exactly.
//
// IMPORTANT: when changing a token, update BOTH this file AND globals.css.
// They must stay in sync. There is no automated check.
// ---------------------------------------------------------------------------

/** Core brand palette as hex strings. Mirror of `:root` in globals.css. */
export const brand = {
  background: "#1a1b1e",
  backgroundRaised: "#222326",
  backgroundOverlay: "#2a2b2e",
  foreground: "#e8e9eb",
  foregroundMuted: "#8b8d94",
  foregroundDim: "#6b6d74",
  accent: "#4db8a4",
  accentHover: "#5fcfb8",
  danger: "#d4533b",
  border: "#2a2b2e",
  borderHover: "#3a3b3e",
  /**
   * Secondary share-card-only accents. These are NOT mirrored in
   * globals.css because they're only used inside html2canvas exports
   * (1080×1080 PNGs), where CSS variables can't be resolved. Only add
   * to globals.css if a dashboard component needs them too.
   */
  accentOrange: "#e67e22",
  accentAmber: "#e0a040",
  accentBlue: "#7b93db",
  accentPurple: "#c77dba",
} as const;

/**
 * Multi-color palette for charts/timelines. Used inline in `style` props,
 * so these are oklch strings (same color space as globals.css).
 */
export const chartColors = {
  Tweets: "oklch(0.72 0.12 192)", // accent / teal
  DMs: "oklch(0.72 0.15 280)", // purple
  Logins: "oklch(0.65 0.2 25)", // danger / red
  "Login IPs": "oklch(0.65 0.2 25)",
  Grok: "oklch(0.72 0.12 145)", // green
  Ads: "oklch(0.60 0.10 60)", // amber
  "Ad Impressions": "oklch(0.65 0.12 90)",
  "Ad Engagements": "oklch(0.60 0.15 45)",
  "Device Tokens": "oklch(0.72 0.12 145)",
  Devices: "oklch(0.62 0.08 170)",
  "Connected Apps": "oklch(0.60 0.10 60)",
  "Screen Names": "oklch(0.70 0.10 230)",
  "Key Registry": "oklch(0.58 0.06 260)",
} as const;

/** The accent color in oklch form, for heatmap and intensity ramps. */
export const accentOklch = "oklch(0.72 0.12 192)";

/** A faint neutral fill (used for heatmap empty cells). */
export const neutralOklchFaint = "oklch(0.93 0.005 260 / 0.03)";

/** Build an accent color string at the given alpha (0–1). */
export function accentAlpha(opacity: number): string {
  return `oklch(0.72 0.12 192 / ${opacity})`;
}

export type BrandColor = keyof typeof brand;
export type ChartColorKey = keyof typeof chartColors;
