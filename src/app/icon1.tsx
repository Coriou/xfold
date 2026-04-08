import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

// 192×192 PWA icon. Mirrors src/app/icon.tsx at a larger size for the
// web app manifest. Next 16 auto-discovers numbered icon files (icon.tsx,
// icon1.tsx, icon2.tsx, ...).
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon192() {
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
          borderRadius: 36,
          fontSize: 120,
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
