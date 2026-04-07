"use client";

import { useMemo, useState } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import {
  matchInterests,
  buildCorpus,
  buildAdTargetingCounts,
} from "@/lib/archive/interest-matching";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { TagCloud } from "@/components/shared/tag-cloud";
import { BarList } from "@/components/shared/bar-list";
import { DataTable } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { formatNumber } from "@/lib/format";

type Tab = "all" | "comparison" | "ads";

export default function AdProfile({
  archive,
}: {
  archive: ParsedArchive;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  const analysis = useMemo(() => {
    const interests = archive.personalization?.interests ?? [];
    if (interests.length === 0) return null;

    // Build corpora
    const tweetTexts = archive.tweets.flatMap((t) => [
      t.fullText,
      ...t.hashtags,
    ]);
    const likeTexts = archive.likes.map((l) => l.fullText);

    const tweetCorpus = buildCorpus(tweetTexts);
    const likeCorpus = buildCorpus(likeTexts);

    // Build ad targeting counts
    const allImpressions = [
      ...archive.adImpressions.flatMap((b) => b.impressions),
      ...archive.adEngagements.flatMap((b) => b.engagements),
    ];
    const adTargetingCounts = buildAdTargetingCounts(allImpressions);

    const matches = matchInterests(
      interests,
      tweetCorpus,
      likeCorpus,
      adTargetingCounts,
    );

    const confirmed = matches.filter((m) => m.confirmed);
    const usedByAds = matches.filter((m) => m.usedByAdvertisers);
    const disabledButTargeted = matches.filter(
      (m) => m.isDisabled && m.usedByAdvertisers,
    );
    const matchRate =
      interests.length > 0
        ? Math.round((confirmed.length / interests.length) * 100)
        : 0;

    const totalAdImpressions = usedByAds.reduce(
      (s, m) => s + m.adImpressionCount,
      0,
    );

    // Top actual interests from hashtags
    const hashtagCounts = new Map<string, number>();
    for (const tweet of archive.tweets) {
      for (const tag of tweet.hashtags) {
        const lower = tag.toLowerCase();
        hashtagCounts.set(lower, (hashtagCounts.get(lower) ?? 0) + 1);
      }
    }
    const topHashtags = [...hashtagCounts.entries()]
      .map(([label, value]) => ({ label: `#${label}`, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);

    // Top inferred interests by ad usage
    const topInferredByAds = usedByAds
      .map((m) => ({ label: m.name, value: m.adImpressionCount }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);

    return {
      matches,
      matchRate,
      confirmedCount: confirmed.length,
      usedByAdsCount: usedByAds.length,
      disabledButTargeted: disabledButTargeted.length,
      totalAdImpressions,
      topHashtags,
      topInferredByAds,
      totalInterests: interests.length,
    };
  }, [archive]);

  if (!analysis) {
    return (
      <div>
        <SectionHeader
          title="Your Ad Profile"
          description="No personalization data found in your archive."
        />
      </div>
    );
  }

  const q = search.toLowerCase();
  const filteredMatches = search
    ? analysis.matches.filter((m) => m.name.toLowerCase().includes(q))
    : analysis.matches;

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: "All Interests" },
    { id: "comparison", label: "Inferred vs Actual" },
    { id: "ads", label: "Ad Usage" },
  ];

  return (
    <div>
      <SectionHeader
        title="Your Ad Profile"
        description={`Comparing ${formatNumber(analysis.totalInterests)} inferred interests against your actual tweets and likes.`}
        badge={`${analysis.matchRate}% match`}
      />

      {/* Callout */}
      <div className="mb-6 rounded-xl border border-danger/20 bg-danger/5 p-5">
        <p className="text-sm font-medium text-danger">
          X inferred{" "}
          <span className="font-bold">{analysis.totalInterests}</span>{" "}
          interests about you. Only{" "}
          <span className="font-bold">{analysis.matchRate}%</span> have evidence
          in your actual tweets and likes. The rest were inferred from signals
          you can&apos;t see.
        </p>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Match Rate"
          value={`${analysis.matchRate}%`}
          subtitle={`${analysis.confirmedCount} confirmed`}
        />
        <StatCard
          label="Used by Ads"
          value={analysis.usedByAdsCount}
          subtitle="interests targeted"
          variant="danger"
        />
        <StatCard
          label="Disabled But Targeted"
          value={analysis.disabledButTargeted}
          subtitle="you said no, ads said yes"
          variant="danger"
        />
        <StatCard
          label="Ad Impressions"
          value={analysis.totalAdImpressions}
          subtitle="interest-based"
        />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              tab === t.id
                ? "bg-accent-muted/30 font-medium text-accent"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search interests…"
          count={filteredMatches.length}
        />
      </div>

      {/* Tab content */}
      {tab === "all" && (
        <div className="rounded-xl border border-border bg-background-raised p-5">
          <TagCloud
            tags={filteredMatches.map((m) => ({
              label: m.name,
              weight: m.adImpressionCount + (m.confirmed ? 1 : 0),
              variant: m.isDisabled && m.usedByAdvertisers
                ? "danger"
                : m.isDisabled
                  ? "disabled"
                  : m.confirmed
                    ? "accent"
                    : "default",
            }))}
          />
          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-foreground-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-accent/30 bg-accent/20" />
              Confirmed by your activity
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-border" />
              No evidence in your data
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-danger/30 bg-danger/20" />
              Disabled but still targeted
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-border/50 bg-foreground-muted/10" />
              Disabled
            </span>
          </div>
        </div>
      )}

      {tab === "comparison" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-background-raised p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
              What X Thinks (by ad usage)
            </h3>
            {analysis.topInferredByAds.length > 0 ? (
              <BarList items={analysis.topInferredByAds} valueLabel="impressions" />
            ) : (
              <p className="text-sm text-foreground-muted">
                No interest-based ad targeting found.
              </p>
            )}
          </div>
          <div className="rounded-xl border border-border bg-background-raised p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
              What You Actually Tweet About
            </h3>
            {analysis.topHashtags.length > 0 ? (
              <BarList items={analysis.topHashtags} valueLabel="tweets" />
            ) : (
              <p className="text-sm text-foreground-muted">
                No hashtags found in your tweets.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === "ads" && (
        <DataTable
          data={filteredMatches.filter((m) => m.usedByAdvertisers)}
          columns={[
            {
              key: "name",
              label: "Interest",
              render: (m) => m.name,
              sortable: true,
              sortValue: (m) => m.name,
            },
            {
              key: "status",
              label: "Status",
              render: (m) => (
                <span
                  className={
                    m.isDisabled ? "text-foreground-muted" : "text-foreground"
                  }
                >
                  {m.isDisabled ? "Disabled" : "Active"}
                </span>
              ),
              sortable: true,
              sortValue: (m) => (m.isDisabled ? 1 : 0),
            },
            {
              key: "impressions",
              label: "Ad Impressions",
              render: (m) => formatNumber(m.adImpressionCount),
              sortable: true,
              sortValue: (m) => m.adImpressionCount,
              align: "right" as const,
              mono: true,
            },
            {
              key: "confirmed",
              label: "In Your Activity",
              render: (m) => (
                <span
                  className={m.confirmed ? "text-accent" : "text-foreground-muted"}
                >
                  {m.confirmed ? "Yes" : "No"}
                </span>
              ),
              sortable: true,
              sortValue: (m) => (m.confirmed ? 1 : 0),
            },
          ]}
          emptyMessage="No interest-based ad targeting found."
        />
      )}
    </div>
  );
}
