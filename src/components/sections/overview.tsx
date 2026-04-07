"use client";

import { useMemo, useState } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { computePrivacyScore } from "@/lib/privacy-score";
import { SectionHeader } from "@/components/shared/section-header";
import { ScoreRing } from "@/components/shared/score-ring";
import { ScoreCategoryCard } from "@/components/shared/score-category-card";
import { DataCardModal } from "@/components/shared/data-card-modal";
import { formatAccountAge, parseDate, formatDate, pluralize } from "@/lib/format";
import { chartColors } from "@/lib/brand";

export default function Overview({
  archive,
}: {
  archive: ParsedArchive;
}) {
  const score = useMemo(() => computePrivacyScore(archive), [archive]);
  const [cardOpen, setCardOpen] = useState(false);

  const accountAge = archive.account?.createdAt
    ? formatAccountAge(archive.account.createdAt)
    : null;

  // Find the worst category for the bottom callout
  const worst = score.categories[0];

  // Data footprint timeline
  const footprint = useMemo(() => {
    interface Range {
      label: string;
      first: Date;
      last: Date;
      count: number;
      color: string;
    }

    const COLORS: Record<string, string> = chartColors;

    function dateRange(
      label: string,
      dates: (string | undefined | null)[],
    ): Range | null {
      let min = Infinity;
      let max = -Infinity;
      let count = 0;
      for (const s of dates) {
        if (!s) continue;
        const d = parseDate(s);
        if (!d) continue;
        const t = d.getTime();
        if (t < min) min = t;
        if (t > max) max = t;
        count++;
      }
      if (count === 0) return null;
      return {
        label,
        first: new Date(min),
        last: new Date(max),
        count,
        color: COLORS[label] ?? "var(--foreground-muted)",
      };
    }

    const ranges = [
      dateRange("Tweets", archive.tweets.map((t) => t.createdAt)),
      dateRange(
        "DMs",
        archive.directMessages.flatMap((c) =>
          c.messages.map((m) => m.createdAt),
        ),
      ),
      dateRange("Login IPs", archive.ipAudit.map((e) => e.createdAt)),
      dateRange("Device Tokens", archive.deviceTokens.map((d) => d.createdAt)),
      dateRange("Connected Apps", archive.connectedApps.map((a) => a.approvedAt)),
      dateRange(
        "Grok",
        archive.grokConversations.flatMap((c) =>
          c.messages.map((m) => m.createdAt),
        ),
      ),
      dateRange(
        "Ad Impressions",
        archive.adImpressions.flatMap((b) =>
          b.impressions.map((i) => i.impressionTime),
        ),
      ),
      dateRange(
        "Ad Engagements",
        archive.adEngagements.flatMap((b) =>
          b.engagements.map((e) => e.impressionTime),
        ),
      ),
      dateRange(
        "Screen Names",
        archive.screenNameChanges.map((s) => s.changedAt),
      ),
      dateRange("Devices", archive.niDevices.map((d) => d.createdDate)),
      dateRange("Key Registry", archive.keyRegistryDevices.map((d) => d.createdAt)),
    ].filter((r): r is Range => r !== null);

    if (ranges.length === 0) return null;

    ranges.sort((a, b) => a.first.getTime() - b.first.getTime());

    const globalMin = Math.min(...ranges.map((r) => r.first.getTime()));
    const globalMax = Math.max(...ranges.map((r) => r.last.getTime()));

    const accountCreated = archive.account?.createdAt
      ? parseDate(archive.account.createdAt)
      : null;

    return { ranges, globalMin, globalMax, accountCreated };
  }, [archive]);

  return (
    <div>
      <SectionHeader
        title="Privacy Score"
        description={`Privacy audit for${archive.meta.username ? ` @${archive.meta.username}` : " your account"}.`}
      />

      {/* Hero */}
      <div className="mb-6 flex flex-col items-center gap-5 rounded-xl border border-border bg-background-raised p-6 sm:flex-row sm:items-start">
        <ScoreRing score={score.overall} grade={score.grade} size={160} />
        <div className="flex flex-1 flex-col items-center gap-3 sm:items-start">
          <p className="text-lg font-medium text-foreground">
            {score.headline}
          </p>
          {accountAge && (
            <p className="text-sm text-foreground-muted">
              {accountAge} of data collection.
            </p>
          )}
          <button
            onClick={() => setCardOpen(true)}
            className="mt-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-hover"
          >
            Share Your Card
          </button>
        </div>
      </div>

      {/* Category grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {score.categories.map((cat) => (
          <ScoreCategoryCard key={cat.id} category={cat} />
        ))}
      </div>

      {/* Data footprint timeline */}
      {footprint && (
        <div className="mb-6 rounded-xl border border-border bg-background-raised p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            Data Footprint Timeline
          </h3>
          <p className="mb-4 text-sm text-foreground-muted">
            When X started collecting each type of your data.
          </p>
          <div className="relative space-y-2.5">
            {/* Account creation reference line */}
            {footprint.accountCreated && (
              <div
                className="absolute top-0 bottom-0 w-px border-l border-dashed border-foreground-muted/30"
                style={{
                  left: `${8 + ((footprint.accountCreated.getTime() - footprint.globalMin) / (footprint.globalMax - footprint.globalMin || 1)) * 72}%`,
                }}
                title={`Account created: ${formatDate(footprint.accountCreated.toISOString())}`}
              />
            )}

            {footprint.ranges.map((range) => {
              const span = footprint.globalMax - footprint.globalMin || 1;
              const left =
                ((range.first.getTime() - footprint.globalMin) / span) * 72;
              const width =
                ((range.last.getTime() - range.first.getTime()) / span) * 72;

              return (
                <div key={range.label} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-right text-xs text-foreground-muted">
                    {range.label}
                  </span>
                  <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-foreground/5">
                    <div
                      className="absolute h-full rounded-full"
                      style={{
                        left: `${left}%`,
                        width: `${Math.max(width, 1.5)}%`,
                        backgroundColor: range.color,
                      }}
                      title={`${formatDate(range.first.toISOString())} – ${formatDate(range.last.toISOString())}`}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs text-foreground-muted">
                    {pluralize(range.count, "event")}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Year markers */}
          <div className="mt-2 flex" style={{ paddingLeft: "calc(7rem + 0.75rem)" }}>
            <div className="flex flex-1 justify-between text-[10px] text-foreground-muted/50">
              {(() => {
                const minYear = new Date(footprint.globalMin).getFullYear();
                const maxYear = new Date(footprint.globalMax).getFullYear();
                const years: number[] = [];
                for (let y = minYear; y <= maxYear; y += Math.max(1, Math.floor((maxYear - minYear) / 6))) {
                  years.push(y);
                }
                if (!years.includes(maxYear)) years.push(maxYear);
                return years.map((y) => <span key={y}>{y}</span>);
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Bottom callout — worst category */}
      {worst && worst.score > 40 && (
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-5">
          <p className="text-sm font-medium text-danger">
            Your highest exposure is in{" "}
            <span className="font-bold">{worst.label}</span> (grade{" "}
            {worst.grade}).{" "}
            {worst.metrics[0] &&
              `${worst.metrics[0].label}: ${typeof worst.metrics[0].value === "number" ? worst.metrics[0].value.toLocaleString() : worst.metrics[0].value}${worst.metrics[0].detail ? ` ${worst.metrics[0].detail}` : ""}.`}
          </p>
        </div>
      )}

      <DataCardModal
        open={cardOpen}
        onClose={() => setCardOpen(false)}
        archive={archive}
        score={score}
      />
    </div>
  );
}
