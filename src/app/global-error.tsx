"use client";

import { brand } from "@/lib/brand";

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: brand.background,
          color: brand.foreground,
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>
            x<span style={{ color: brand.accent }}>fold</span>
          </h1>
          <p style={{ color: brand.foregroundMuted, marginBottom: 24 }}>
            Something went wrong
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{
              background: brand.accent,
              color: brand.background,
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
