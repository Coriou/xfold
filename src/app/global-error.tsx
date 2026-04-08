"use client";

import { brand } from "@/lib/brand";

export default function GlobalError({
  error,
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
        <div style={{ maxWidth: 480, padding: "0 24px" }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>
            x<span style={{ color: brand.accent }}>fold</span>
          </h1>
          <p style={{ color: brand.foregroundMuted, marginBottom: 16 }}>
            Something went wrong
          </p>
          <pre
            style={{
              margin: "0 auto 24px",
              padding: "12px 16px",
              background: brand.backgroundRaised,
              border: `1px solid ${brand.danger}40`,
              borderRadius: 8,
              color: brand.danger,
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
              fontSize: 12,
              textAlign: "left",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {error.message || "An unexpected error occurred"}
            {error.digest ? `\n\nDigest: ${error.digest}` : ""}
          </pre>
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
