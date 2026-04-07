import type { NextConfig } from "next";

// ----------------------------------------------------------------------------
// Content Security Policy
// ----------------------------------------------------------------------------
// xfold is a 100% client-side app — there is no legitimate reason for the
// page to make any cross-origin network requests. The production CSP below
// enforces that promise at the browser level: even if a future bug or
// malicious archive tried to phone home, the browser would block it.
//
// Dev mode needs a relaxed policy because Next.js / Turbopack inject inline
// scripts and rely on `eval()` for HMR. With the strict policy, hydration
// fails silently and React event handlers (including drag/drop) never
// attach — the symptom is that dropping a file makes the browser navigate
// to its URL because no JS handler called `preventDefault`.
//
// Notes (production policy):
// - 'unsafe-inline' on style-src is required by Tailwind 4 / Next.js
//   inline style injection. There's currently no clean way around this.
// - 'wasm-unsafe-eval' is reserved for fflate's optional WASM path.
// - blob: in img-src and media-src is required for archive media (we
//   create blob URLs from decompressed bytes in the worker).
// - worker-src 'self' blob: covers the parsing worker.
// - connect-src 'self' is the keystone: blocks ALL outbound network calls.
// ----------------------------------------------------------------------------
const isDev = process.env.NODE_ENV !== "production";

const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'wasm-unsafe-eval'";

const connectSrc = isDev
  ? // Dev needs websocket + http for HMR / Turbopack
    "'self' ws: wss: http://localhost:* http://127.0.0.1:*"
  : "'self'";

const csp = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
