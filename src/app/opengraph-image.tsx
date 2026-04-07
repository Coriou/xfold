import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: brand.background,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", fontSize: 96, fontWeight: 700 }}>
          <span style={{ color: brand.foreground }}>x</span>
          <span style={{ color: brand.accent }}>fold</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: brand.foregroundMuted,
            marginTop: 16,
          }}
        >
          See what X knows about you
        </div>

        {/* Trust badges */}
        <div
          style={{
            display: "flex",
            gap: 40,
            marginTop: 48,
            fontSize: 20,
            color: brand.foregroundDim,
          }}
        >
          <span>100% client-side</span>
          <span>Open source</span>
          <span>No tracking</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
