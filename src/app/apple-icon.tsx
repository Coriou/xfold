import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 112,
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
