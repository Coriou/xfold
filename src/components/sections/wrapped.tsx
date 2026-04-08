"use client";

import { useMemo, useState } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { computePrivacyScore } from "@/lib/privacy-score";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { PillBadge } from "@/components/shared/pill-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ShareGallery } from "@/components/share-cards/share-gallery";
import { buildWrappedStats } from "@/lib/archive/insights/wrapped-stats";
import { formatDate, formatHour, formatNumber, pluralize } from "@/lib/format";
import { brand } from "@/lib/brand";

export default function Wrapped({ archive }: { archive: ParsedArchive }) {
  const stats = useMemo(() => buildWrappedStats(archive), [archive]);
  const score = useMemo(() => computePrivacyScore(archive), [archive]);
  const [shareOpen, setShareOpen] = useState(false);

  if (!stats) {
    return (
      <div>
        <SectionHeader
          title="Your X, Wrapped"
          description="A look back at your life on X."
        />
        <EmptyState
          title="No tweets to wrap"
          description="Wrapped needs at least one tweet to show your story."
        />
      </div>
    );
  }

  const yearsOnX = stats.daysOnX !== null ? (stats.daysOnX / 365).toFixed(1) : null;
  const maxYearly = Math.max(...stats.yearly.map((y) => y.count), 1);
  const maxHour = Math.max(...stats.hourDistribution.buckets, 1);

  return (
    <div>
      <SectionHeader
        title="Your X, Wrapped"
        description="A look back at your life on X."
      />

      {/* 1. Hero — big numbers */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.daysOnX !== null && (
          <StatCard
            label="Days on X"
            value={stats.daysOnX}
            subtitle={yearsOnX ? `${yearsOnX} years` : undefined}
            variant="accent"
          />
        )}
        <StatCard label="Tweets" value={stats.tweetCount} />
        <StatCard label="Likes" value={stats.likeCount} />
        {stats.firstAndLast.daysBetween > 0 && (
          <StatCard
            label="Tweeting span"
            value={stats.firstAndLast.daysBetween}
            subtitle="days between first and last"
          />
        )}
      </div>

      {/* 2. First & Last tweet quotes */}
      {stats.firstAndLast.first && stats.firstAndLast.last && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <QuotePanel
            label="Your very first tweet"
            text={stats.firstAndLast.first.fullText}
            date={stats.firstAndLast.first.createdAt}
          />
          <QuotePanel
            label="Your latest tweet"
            text={stats.firstAndLast.last.fullText}
            date={stats.firstAndLast.last.createdAt}
          />
        </div>
      )}

      {/* 3. Most-active hour with 24-bar mini chart */}
      {stats.topHour && (
        <div className="mb-6 rounded-xl border border-border bg-background-raised p-5">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            When You Tweet
          </h3>
          <p className="mb-4 text-sm text-foreground">
            You tweet most at{" "}
            <span className="font-mono font-semibold text-accent">
              {stats.topHour.label}
            </span>{" "}
            ({pluralize(stats.topHour.count, "tweet")}).
          </p>
          <div className="flex h-24 items-end gap-1">
            {stats.hourDistribution.buckets.map((count, hour) => {
              const heightPct = (count / maxHour) * 100;
              const isPeak = hour === stats.topHour?.hour;
              return (
                <div
                  key={hour}
                  className="flex-1 rounded-t"
                  style={{
                    height: `${Math.max(heightPct, 2)}%`,
                    backgroundColor: isPeak ? brand.accent : brand.foregroundMuted,
                    opacity: isPeak ? 1 : 0.4,
                  }}
                  title={`${formatHour(hour)}: ${count}`}
                />
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-foreground-muted/60">
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
            <span>12 AM</span>
          </div>
        </div>
      )}

      {/* 4. Top hashtag + next ones as chips */}
      {stats.topHashtags.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-background-raised p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            Your Signature
          </h3>
          {stats.topHashtags[0] && (
            <p className="text-foreground">
              Your most-used hashtag is{" "}
              <span className="font-mono text-2xl font-bold text-accent">
                #{stats.topHashtags[0].tag}
              </span>{" "}
              <span className="text-sm text-foreground-muted">
                ({pluralize(stats.topHashtags[0].count, "time")}).
              </span>
            </p>
          )}
          {stats.topHashtags.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {stats.topHashtags.slice(1).map((h, index) => (
                <PillBadge key={`${h.tag}-${index}`} variant="muted">
                  #{h.tag} · {h.count}
                </PillBadge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Top contacts */}
      {stats.topContacts.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-background-raised p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            Your Top Contacts
          </h3>
          <p className="mb-3 text-xs text-foreground-muted">
            Across mentions, replies, and DMs.
          </p>
          <div className="space-y-2">
            {stats.topContacts.map((c) => (
              <div
                key={c.accountId}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {c.screenName ? `@${c.screenName}` : c.accountId}
                  </div>
                  {c.displayName && c.displayName !== c.screenName && (
                    <div className="truncate text-xs text-foreground-muted">
                      {c.displayName}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3 font-mono text-xs text-foreground-muted">
                  <span>
                    {formatNumber(c.totalInteractions)} total
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Tweet velocity by year */}
      {stats.yearly.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-background-raised p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            Tweets by Year
          </h3>
          <div className="space-y-2">
            {stats.yearly.map((y) => {
              const widthPct = (y.count / maxYearly) * 100;
              return (
                <div key={y.year} className="flex items-center gap-3">
                  <span className="w-12 shrink-0 font-mono text-xs text-foreground-muted">
                    {y.year}
                  </span>
                  <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-foreground/5">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-accent/70"
                      style={{ width: `${Math.max(widthPct, 2)}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right font-mono text-xs text-foreground">
                    {formatNumber(y.count)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. Identity timeline */}
      {stats.screenNameChanges.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-background-raised p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            Identity Timeline
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {stats.screenNameChanges[0] && (
              <PillBadge variant="muted">
                @{stats.screenNameChanges[0].changedFrom}
              </PillBadge>
            )}
            {stats.screenNameChanges.map((c, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="text-foreground-muted">→</span>
                <PillBadge
                  variant={
                    i === stats.screenNameChanges.length - 1 ? "accent" : "muted"
                  }
                >
                  @{c.changedTo}
                </PillBadge>
                <span className="text-xs text-foreground-muted">
                  {formatDate(c.changedAt)}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 8. Persona breakdown */}
      <div className="mb-6 rounded-xl border border-border bg-background-raised p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
          What Kind of X User Are You?
        </h3>
        <p className="mb-4 text-foreground">
          You&apos;re a{" "}
          <span className="font-bold text-accent">
            {stats.breakdown.persona}
          </span>
          .
        </p>
        <div className="grid grid-cols-3 gap-3">
          <RatioCell
            label="Original"
            value={stats.breakdown.original}
            total={stats.breakdown.total}
            isHighlight={stats.breakdown.persona === "Broadcaster"}
          />
          <RatioCell
            label="Replies"
            value={stats.breakdown.reply}
            total={stats.breakdown.total}
            isHighlight={stats.breakdown.persona === "Conversationalist"}
          />
          <RatioCell
            label="Retweets"
            value={stats.breakdown.retweet}
            total={stats.breakdown.total}
            isHighlight={stats.breakdown.persona === "Curator"}
          />
        </div>
      </div>

      {/* 9. CTA — share */}
      <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 text-center">
        <h3 className="text-base font-semibold text-foreground">
          Share your Wrapped
        </h3>
        <p className="mt-1 text-sm text-foreground-muted">
          Download a 1080×1080 PNG of your X life as a card.
        </p>
        <button
          onClick={() => setShareOpen(true)}
          className="mt-4 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-accent-hover"
        >
          Open share gallery
        </button>
      </div>

      <ShareGallery
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        archive={archive}
        score={score}
        initialCardId="wrapped"
      />
    </div>
  );
}

function QuotePanel({
  label,
  text,
  date,
}: {
  label: string;
  text: string;
  date: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background-raised p-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
        {label}
      </p>
      <p className="whitespace-pre-wrap break-words text-base text-foreground">
        &ldquo;{text}&rdquo;
      </p>
      <p className="mt-3 text-xs text-foreground-muted">{formatDate(date)}</p>
    </div>
  );
}

function RatioCell({
  label,
  value,
  total,
  isHighlight,
}: {
  label: string;
  value: number;
  total: number;
  isHighlight: boolean;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div
      className={`rounded-lg border p-3 ${
        isHighlight
          ? "border-accent/40 bg-accent/10"
          : "border-border bg-background"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-2xl font-bold ${
          isHighlight ? "text-accent" : "text-foreground"
        }`}
      >
        {pct}%
      </p>
      <p className="text-xs text-foreground-muted">{formatNumber(value)}</p>
    </div>
  );
}
