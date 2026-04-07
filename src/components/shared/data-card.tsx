"use client";

import { forwardRef } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import type { PrivacyScore } from "@/lib/privacy-score";
import { brand } from "@/lib/brand";
import { parseDate } from "@/lib/format";

interface DataCardProps {
  archive: ParsedArchive;
  score: PrivacyScore;
}

// html2canvas doesn't support oklch, so we use the hex equivalents
// from `@/lib/brand`. Aliased here purely for short usage in styles.
const BG = brand.background;
const BG_RAISED = brand.backgroundRaised;
const FG = brand.foreground;
const FG_MUTED = brand.foregroundMuted;
const ACCENT = brand.accent;
const DANGER = brand.danger;

function scoreColor(score: number): string {
  if (score <= 30) return ACCENT;
  if (score <= 60) return FG;
  return DANGER;
}

function formatNum(n: number): string {
  return n.toLocaleString("en-US");
}

function accountAge(createdAt: string): string {
  const d = parseDate(createdAt);
  if (!d) return "";
  const now = new Date();
  const years = now.getFullYear() - d.getFullYear();
  if (years > 1) return `${years} years`;
  if (years === 1) return "1 year";
  const months = now.getMonth() - d.getMonth();
  return months > 0 ? `${months} months` : "< 1 month";
}

export const DataCard = forwardRef<HTMLDivElement, DataCardProps>(
  function DataCard({ archive, score }, ref) {
    const username = archive.meta.username;
    const totalDMs = archive.directMessages.reduce(
      (s, c) => s + c.messages.length,
      0,
    );
    const interestsCount = archive.personalization?.interests.length ?? 0;
    const uniqueIps = new Set(archive.ipAudit.map((e) => e.loginIp)).size;
    const age = archive.account?.createdAt
      ? accountAge(archive.account.createdAt)
      : null;
    const sizeMB = (archive.meta.sizeBytes / (1024 * 1024)).toFixed(1);

    const ring = score;
    const ringColor = scoreColor(ring.overall);

    // SVG ring params
    const size = 180;
    const sw = 12;
    const r = (size - sw) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (ring.overall / 100) * circ;

    const stats = [
      { label: "tweets", value: formatNum(archive.tweets.length) },
      { label: "likes", value: formatNum(archive.likes.length) },
      { label: "DMs", value: formatNum(totalDMs) },
      { label: "interests tracked", value: formatNum(interestsCount) },
      { label: "login IPs", value: formatNum(uniqueIps) },
      {
        label: "followers",
        value: formatNum(archive.followers.length),
      },
    ];

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1080,
          backgroundColor: BG,
          color: FG,
          fontFamily:
            "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          display: "flex",
          flexDirection: "column",
          padding: 80,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 48,
          }}
        >
          <span style={{ fontSize: 28, fontWeight: 700, color: ACCENT }}>
            xfold
          </span>
          <span style={{ fontSize: 18, color: FG_MUTED }}>xfold.app</span>
        </div>

        {/* Score ring */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 48,
          }}
        >
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
                stroke={BG_RAISED}
                strokeWidth={sw}
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={ringColor}
                strokeWidth={sw}
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
                  fontSize: 56,
                  fontWeight: 700,
                  color: ringColor,
                  lineHeight: 1,
                }}
              >
                {ring.grade}
              </span>
              <span
                style={{
                  fontSize: 16,
                  color: FG_MUTED,
                  fontFamily: "monospace",
                  marginTop: 4,
                }}
              >
                {ring.overall}/100
              </span>
            </div>
          </div>
          <span
            style={{ fontSize: 18, color: FG_MUTED, marginTop: 16 }}
          >
            X Exposure Score
          </span>
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 20,
            marginBottom: 48,
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                backgroundColor: BG_RAISED,
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
              <div style={{ fontSize: 14, color: FG_MUTED }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Memorable stat */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ fontSize: 18, color: FG_MUTED }}>
            {sizeMB} MB of data collected
            {age ? ` over ${age}` : ""}
          </span>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          {username && (
            <span style={{ fontSize: 18, color: FG_MUTED }}>
              @{username}
            </span>
          )}
          <span style={{ fontSize: 16, color: ACCENT }}>
            See what X knows &rarr; xfold.app
          </span>
        </div>
      </div>
    );
  },
);
