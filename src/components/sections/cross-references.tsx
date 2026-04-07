"use client";

import { useMemo } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { buildDmAdCorrelation } from "@/lib/archive/insights/dm-ad-correlation";
import { buildGrokDeletedCorrelation } from "@/lib/archive/insights/grok-deleted-correlation";
import { formatDate } from "@/lib/format";

interface CrossReferenceProps {
  archive: ParsedArchive;
  onNavigate?: ((sectionId: string) => void) | undefined;
}

export default function CrossReference({
  archive,
  onNavigate,
}: CrossReferenceProps) {
  const dmAds = useMemo(() => buildDmAdCorrelation(archive), [archive]);
  const grokDeleted = useMemo(
    () => buildGrokDeletedCorrelation(archive),
    [archive],
  );

  const hasSomething = dmAds !== null || grokDeleted !== null;

  if (!hasSomething) {
    return (
      <div>
        <SectionHeader
          title="Cross References"
          description="Cross-domain correlations X never shows you."
        />
        <EmptyState
          title="No cross-references found"
          description="Your archive doesn't have enough overlapping data for cross-domain analysis. This requires DMs + ads, or Grok + deleted tweets."
        />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Cross References"
        description="Correlations across your data that X's viewer never shows — because connecting the dots is the quiet part."
        badge={`${(dmAds?.overlapCount ?? 0) + (grokDeleted?.overlapCount ?? 0)} correlations`}
      />

      {/* DM × Ad Targeting */}
      {dmAds && (
        <div className="mb-8">
          <div className="mb-4 rounded-xl border border-danger/30 bg-danger/5 p-5">
            <h2 className="text-lg font-bold text-danger">
              \uD83D\uDCE8 Your DMs × Ad Targeting
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">
              {dmAds.overlapCount} topics you discussed in private messages also
              appear in your ad targeting profile. X says DMs are private. Here
              are the correlations.
            </p>
          </div>

          {/* Stats */}
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="DMs analyzed" value={dmAds.totalDmMessages} />
            <StatCard label="Ad impressions" value={dmAds.totalAdImpressions} />
            <StatCard
              label="Topic overlap"
              value={dmAds.overlapCount}
              variant="danger"
            />
            <StatCard
              label="Correlation rate"
              value={`${dmAds.correlationRate}%`}
              variant={dmAds.correlationRate > 10 ? "danger" : "default"}
            />
          </div>

          {/* Most suspicious */}
          {dmAds.mostSuspicious && dmAds.mostSuspicious.adFollowedDm && (
            <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-danger">
                Most suspicious correlation
              </div>
              <p className="mt-2 text-sm text-foreground">
                You mentioned &ldquo;{dmAds.mostSuspicious.keyword}&rdquo; in
                DMs
                {dmAds.mostSuspicious.firstDmDate
                  ? ` (first: ${formatDate(dmAds.mostSuspicious.firstDmDate)})`
                  : ""}
                . Ads targeting this keyword appeared{" "}
                {dmAds.mostSuspicious.firstAdDate
                  ? `on ${formatDate(dmAds.mostSuspicious.firstAdDate)}`
                  : "afterward"}
                — <strong>after your private conversation</strong>.
              </p>
            </div>
          )}

          {/* Match list */}
          <div className="space-y-2">
            {dmAds.matches.slice(0, 15).map((match) => (
              <div
                key={match.keyword}
                className={`rounded-lg border p-3 ${
                  match.adFollowedDm
                    ? "border-danger/30 bg-danger/5"
                    : "border-border bg-background-raised"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-foreground">
                    &ldquo;{match.keyword}&rdquo;
                  </span>
                  {match.adFollowedDm && (
                    <span className="rounded-full bg-danger/20 px-2 py-0.5 text-[10px] font-bold uppercase text-danger">
                      Ad followed DM
                    </span>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-foreground-muted">
                  <div>
                    <span className="font-semibold text-foreground">
                      {match.dmMentions}
                    </span>{" "}
                    DM mentions
                    {match.firstDmDate && (
                      <> · first {formatDate(match.firstDmDate)}</>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">
                      {match.adImpressions}
                    </span>{" "}
                    ad impressions
                    {match.firstAdDate && (
                      <> · first {formatDate(match.firstAdDate)}</>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grok × Deleted Tweets */}
      {grokDeleted && (
        <div className="mb-8">
          <div className="mb-4 rounded-xl border border-danger/30 bg-danger/5 p-5">
            <h2 className="text-lg font-bold text-danger">
              \uD83E\uDD16 Grok × Deleted Tweets
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">
              {grokDeleted.overlapCount} topics overlap between what you asked
              X&apos;s AI and tweets you deleted. You tried to hide it — X has
              both the thing you deleted AND evidence you were concerned about
              it.
            </p>
          </div>

          {/* Stats */}
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard
              label="Grok messages"
              value={grokDeleted.totalGrokMessages}
            />
            <StatCard
              label="Deleted tweets"
              value={grokDeleted.totalDeletedTweets}
            />
            <StatCard
              label="Topic overlap"
              value={grokDeleted.overlapCount}
              variant="danger"
            />
          </div>

          {/* Matches */}
          <div className="space-y-3">
            {grokDeleted.matches.slice(0, 10).map((match, i) => (
              <div
                key={i}
                className={`rounded-xl border p-4 ${
                  match.grokAfterDeletion
                    ? "border-danger/30 bg-danger/5"
                    : "border-border bg-background-raised"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-foreground">
                    Topic: &ldquo;{match.keyword}&rdquo;
                  </span>
                  {match.grokAfterDeletion && (
                    <span className="rounded-full bg-danger/20 px-2 py-0.5 text-[10px] font-bold uppercase text-danger">
                      Grok asked after deletion
                    </span>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                      Deleted tweet
                    </div>
                    <p className="text-sm text-foreground">
                      &ldquo;{match.deletedExcerpt}&rdquo;
                    </p>
                    <p className="mt-1 text-xs text-foreground-muted">
                      {formatDate(match.deletedDate)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-accent">
                      Grok message
                    </div>
                    <p className="text-sm text-foreground">
                      &ldquo;{match.grokExcerpt}&rdquo;
                    </p>
                    <p className="mt-1 text-xs text-foreground-muted">
                      {formatDate(match.grokDate)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation hints */}
      {onNavigate && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate("dms")}
            className="rounded-lg border border-border bg-background-raised px-3 py-1.5 text-xs text-foreground-muted transition-colors hover:text-foreground"
          >
            View all DMs →
          </button>
          <button
            type="button"
            onClick={() => onNavigate("ad-targeting")}
            className="rounded-lg border border-border bg-background-raised px-3 py-1.5 text-xs text-foreground-muted transition-colors hover:text-foreground"
          >
            View ad targeting →
          </button>
          <button
            type="button"
            onClick={() => onNavigate("grok")}
            className="rounded-lg border border-border bg-background-raised px-3 py-1.5 text-xs text-foreground-muted transition-colors hover:text-foreground"
          >
            View Grok conversations →
          </button>
        </div>
      )}
    </div>
  );
}
