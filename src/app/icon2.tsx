import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

// 512×512 PWA icon. Mirrors src/app/icon.tsx at a larger size so installed
// PWAs and OS launchers have a sharp icon to render. Next 16 auto-discovers
// numbered icon files in lexical order.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon512() {
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
          borderRadius: 96,
          fontSize: 320,
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
