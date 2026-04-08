import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

// 512×512 maskable PWA icon. Mirrors src/app/icon.tsx but with extra
// padding so content stays inside the maskable safe zone (the inner 80%
// circle). The full bleed is the brand background, the wordmark sits
// inside the centred safe area. Referenced from manifest.ts with
// purpose: "maskable".
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function IconMaskable() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: brand.background,
          // Smaller font and no border radius — the maskable safe zone is
          // a centred circle 80% of the canvas, so content needs to fit
          // inside roughly 410×410 of the 512×512 canvas.
          fontSize: 220,
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <span style={{ color: brand.foreground }}>x</span>
        <span style={{ color: brand.accent }}>f</span>
      </div>
    ),
    { ...size },
  );
}
