"use client";

import { useState, useMemo } from "react";
import type { ParsedArchive, Tweet } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { SearchInput } from "@/components/shared/search-input";
import { DataTable, type Column } from "@/components/shared/data-table";
import { BarList } from "@/components/shared/bar-list";
import { PillBadge } from "@/components/shared/pill-badge";
import { Pagination } from "@/components/shared/pagination";
import { ArchiveMedia } from "@/components/shared/archive-media";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, truncate, pluralize, formatNumber, parseDate, toMonthKey } from "@/lib/format";
import { getLanguageName } from "@/lib/language-names";
import { StackedBarTimeline, type TimelineBucket } from "@/components/shared/stacked-bar-timeline";
import { chartColors } from "@/lib/brand";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
  buildTweetClientJourney,
  type ClientJourneyEntry,
} from "@/lib/archive/insights/tweet-client-journey";

type View = "timeline" | "table" | "analytics" | "clients";
const PAGE_SIZE = 50;

export default function Tweets({ archive }: { archive: ParsedArchive }) {
  const [view, setView] = useState<View>("timeline");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  // Filtering hundreds of thousands of tweets on every keystroke is a
  // visible UX hit. Debouncing 200ms keeps the input responsive while
  // amortising the work to once-per-pause.
  const debouncedSearch = useDebouncedValue(search, 200);

  const tweets = archive.tweets;
  const originals = tweets.filter((t) => !t.isRetweet && !t.inReplyToStatusId);
  const replies = tweets.filter((t) => t.inReplyToStatusId);
  const retweets = tweets.filter((t) => t.isRetweet);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    if (!q) return tweets;
    return tweets.filter(
      (t) =>
        t.fullText.toLowerCase().includes(q) ||
        t.hashtags.some((h) => h.toLowerCase().includes(q)) ||
        t.mentions.some((m) => m.screenName.toLowerCase().includes(q)),
    );
  }, [tweets, debouncedSearch]);

  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(0);
  };

  return (
    <div>
      <SectionHeader
        title="Your Tweets"
        description={`${pluralize(tweets.length, "tweet")} in your archive.`}
        badge={String(tweets.length)}
      />

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total" value={tweets.length} />
        <StatCard label="Original" value={originals.length} variant="accent" />
        <StatCard label="Replies" value={replies.length} />
        <StatCard label="Retweets" value={retweets.length} />
      </div>

      {/* View toggle */}
      <div className="mb-4 flex items-center gap-2">
        {(["timeline", "table", "analytics", "clients"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize transition-colors ${
              view === v
                ? "bg-accent-muted/30 font-medium text-accent"
                : "text-foreground-muted hover:bg-background-raised hover:text-foreground"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "analytics" ? (
        <AnalyticsView
          tweets={tweets}
          accountId={archive.account?.accountId ?? archive.meta.accountId}
        />
      ) : view === "clients" ? (
        <ClientsView archive={archive} />
      ) : (
        <>
          <div className="mb-4 max-w-sm">
            <SearchInput
              value={search}
              onChange={handleSearch}
              placeholder="Search tweets…"
              count={search ? filtered.length : undefined}
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              title={`No matches for "${debouncedSearch}"`}
              description="Try different keywords, or clear the search to see every tweet."
            />
          ) : view === "timeline" ? (
            <>
              <div className="space-y-3">
                {pageData.map((t) => (
                  <TweetCard key={t.id} tweet={t} />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          ) : (
            <>
              <TableView data={pageData} />
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function TweetCard({ tweet }: { tweet: Tweet }) {
  return (
    <div className="rounded-xl border border-border bg-background-raised p-4">
      <p className="whitespace-pre-wrap break-words text-sm text-foreground">
        {tweet.fullText}
      </p>

      {/* Media */}
      {tweet.media.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {tweet.media.map((m) => (
            <ArchiveMedia
              key={m.id}
              localPath={m.localPath}
              type={m.type}
              className="h-32 w-32 shrink-0 rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      {/* Tags */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tweet.isRetweet && <PillBadge variant="muted">RT</PillBadge>}
        {tweet.inReplyToScreenName && (
          <PillBadge variant="muted">
            Reply to @{tweet.inReplyToScreenName}
          </PillBadge>
        )}
        {tweet.hashtags.map((h, i) => (
          <PillBadge key={i} variant="accent">#{h}</PillBadge>
        ))}
        {tweet.lang !== "en" && tweet.lang !== "und" && (
          <PillBadge variant="muted">{tweet.lang}</PillBadge>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-foreground-muted">
        <span>{formatDate(tweet.createdAt)} via {tweet.source}</span>
        <div className="flex gap-3 font-mono">
          <span>{formatNumber(tweet.favoriteCount)} likes</span>
          <span>{formatNumber(tweet.retweetCount)} RTs</span>
        </div>
      </div>
    </div>
  );
}

function TableView({ data }: { data: Tweet[] }) {
  const columns: Column<Tweet>[] = [
    {
      key: "date",
      label: "Date",
      render: (t) => formatDate(t.createdAt),
      sortable: true,
      sortValue: (t) => t.createdAt,
    },
    {
      key: "text",
      label: "Tweet",
      render: (t) => (
        <span className="text-sm">{truncate(t.fullText, 100)}</span>
      ),
    },
    {
      key: "likes",
      label: "Likes",
      render: (t) => formatNumber(t.favoriteCount),
      sortable: true,
      sortValue: (t) => t.favoriteCount,
      align: "right",
      mono: true,
    },
    {
      key: "rts",
      label: "RTs",
      render: (t) => formatNumber(t.retweetCount),
      sortable: true,
      sortValue: (t) => t.retweetCount,
      align: "right",
      mono: true,
    },
    {
      key: "type",
      label: "Type",
      render: (t) => (
        <PillBadge variant={t.isRetweet ? "muted" : t.inReplyToStatusId ? "muted" : "accent"}>
          {t.isRetweet ? "RT" : t.inReplyToStatusId ? "Reply" : "Original"}
        </PillBadge>
      ),
    },
  ];

  return <DataTable data={data} columns={columns} />;
}

function AnalyticsPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-background-raised p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
        {title}
      </h3>
      {children}
    </div>
  );
}

function AnalyticsView({
  tweets,
  accountId,
}: {
  tweets: Tweet[];
  accountId: string | null;
}) {
  const analytics = useMemo(() => {
    const hashtagMap = new Map<string, number>();
    const mentionMap = new Map<string, number>();
    const sourceMap = new Map<string, number>();
    const yearMap = new Map<string, number>();
    const langMap = new Map<string, number>();
    const domainMap = new Map<string, number>();
    const monthMap = new Map<string, number>();

    // Type counts
    let originalCount = 0;
    let replyCount = 0;
    let selfReplyCount = 0;
    let retweetCount = 0;

    // Engagement accumulators (non-RT only)
    let totalFav = 0;
    let totalRT = 0;
    let nonRTCount = 0;
    const engByYear = new Map<string, { fav: number; rt: number; n: number }>();

    // Per-type engagement
    let origFav = 0;
    let origN = 0;
    let replyFav = 0;
    let replyN = 0;

    // Media usage (per tweet, not per media item)
    let withPhoto = 0;
    let withVideo = 0;
    let withGif = 0;
    let noMedia = 0;

    // First/last tweet dates for cadence
    let firstTime = Infinity;
    let lastTime = -Infinity;

    for (const t of tweets) {
      // Hashtags
      for (const h of t.hashtags) {
        const lower = h.toLowerCase();
        hashtagMap.set(lower, (hashtagMap.get(lower) ?? 0) + 1);
      }
      // Mentions
      for (const m of t.mentions) {
        mentionMap.set(m.screenName, (mentionMap.get(m.screenName) ?? 0) + 1);
      }
      // Source
      sourceMap.set(t.source, (sourceMap.get(t.source) ?? 0) + 1);

      // Date
      const date = parseDate(t.createdAt);
      if (date) {
        const year = String(date.getFullYear());
        yearMap.set(year, (yearMap.get(year) ?? 0) + 1);
        const month = toMonthKey(date);
        monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
        const time = date.getTime();
        if (time < firstTime) firstTime = time;
        if (time > lastTime) lastTime = time;

        // Engagement by year (non-RT only)
        if (!t.isRetweet) {
          const eng = engByYear.get(year) ?? { fav: 0, rt: 0, n: 0 };
          eng.fav += t.favoriteCount;
          eng.rt += t.retweetCount;
          eng.n++;
          engByYear.set(year, eng);
        }
      }

      // Language
      langMap.set(t.lang, (langMap.get(t.lang) ?? 0) + 1);

      // URLs / domains
      for (const u of t.urls) {
        try {
          const hostname = new URL(u.expandedUrl).hostname
            .replace(/^www\./, "");
          if (!hostname.includes("t.co") && hostname) {
            domainMap.set(hostname, (domainMap.get(hostname) ?? 0) + 1);
          }
        } catch {
          // skip malformed URLs
        }
      }

      // Type classification
      if (t.isRetweet) {
        retweetCount++;
      } else if (t.inReplyToStatusId) {
        replyCount++;
        if (accountId && t.inReplyToUserId === accountId) {
          selfReplyCount++;
        }
        replyFav += t.favoriteCount;
        replyN++;
      } else {
        originalCount++;
        origFav += t.favoriteCount;
        origN++;
      }

      // Engagement totals (non-RT)
      if (!t.isRetweet) {
        totalFav += t.favoriteCount;
        totalRT += t.retweetCount;
        nonRTCount++;
      }

      // Media
      if (t.media.length === 0) {
        noMedia++;
      } else {
        const types = new Set(t.media.map((m) => m.type));
        if (types.has("photo")) withPhoto++;
        if (types.has("video")) withVideo++;
        if (types.has("animated_gif")) withGif++;
      }
    }

    const toSorted = (m: Map<string, number>) =>
      [...m.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);

    // Top tweets by engagement
    const nonRTs = tweets.filter((t) => !t.isRetweet);
    const topByLikes = [...nonRTs]
      .sort((a, b) => b.favoriteCount - a.favoriteCount)
      .slice(0, 5);
    const topByRTs = [...nonRTs]
      .sort((a, b) => b.retweetCount - a.retweetCount)
      .slice(0, 5);

    // Cadence
    const spanWeeks =
      firstTime < lastTime
        ? (lastTime - firstTime) / (1000 * 60 * 60 * 24 * 7)
        : 1;
    const avgPerWeek = tweets.length / Math.max(spanWeeks, 1);

    const monthEntries = [...monthMap.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const bestMonth = monthEntries.reduce(
      (best, [label, value]) => (value > best.value ? { label, value } : best),
      { label: "", value: 0 },
    );

    // Engagement by year sorted
    const engByYearItems = [...engByYear.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, eng]) => ({
        label,
        value: Math.round(eng.fav / Math.max(eng.n, 1)),
        subLabel: `avg ${Math.round(eng.rt / Math.max(eng.n, 1))} RTs`,
      }));

    // Languages with names
    const languages = toSorted(langMap).map((item) => ({
      ...item,
      label: getLanguageName(item.label),
    }));

    // Monthly timeline buckets
    const monthlyBuckets: TimelineBucket[] = monthEntries.map(
      ([label, count]) => ({
        label,
        segments: [{ source: "Tweets", count }],
      }),
    );

    return {
      hashtags: toSorted(hashtagMap),
      mentions: toSorted(mentionMap),
      sources: toSorted(sourceMap),
      years: toSorted(yearMap).sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
      // Self-replies are a *subset* of replies, not a peer category — listing
      // them as a fourth bar makes the breakdown sum to >100%. We surface
      // self-replies inside the Replies sub-label instead, so the three
      // partition-of-tweets categories sum cleanly to 100%.
      typeBreakdown: [
        {
          label: "Original",
          value: originalCount,
          subLabel: `${tweets.length > 0 ? Math.round((originalCount / tweets.length) * 100) : 0}%`,
        },
        {
          label: "Replies",
          value: replyCount,
          subLabel:
            tweets.length > 0
              ? `${Math.round((replyCount / tweets.length) * 100)}%${
                  selfReplyCount > 0
                    ? ` • ${formatNumber(selfReplyCount)} to yourself`
                    : ""
                }`
              : "0%",
        },
        {
          label: "Retweets",
          value: retweetCount,
          subLabel: `${tweets.length > 0 ? Math.round((retweetCount / tweets.length) * 100) : 0}%`,
        },
      ],
      originalCount,
      replyCount,
      selfReplyCount,
      retweetCount,
      languages,
      domains: toSorted(domainMap).slice(0, 15),
      avgFavorites: nonRTCount > 0 ? totalFav / nonRTCount : 0,
      avgRetweets: nonRTCount > 0 ? totalRT / nonRTCount : 0,
      engagementByType: [
        { label: "Originals", value: origN > 0 ? Math.round(origFav / origN) : 0, subLabel: "avg likes" },
        { label: "Replies", value: replyN > 0 ? Math.round(replyFav / replyN) : 0, subLabel: "avg likes" },
      ],
      engByYearItems,
      topByLikes,
      topByRTs,
      avgPerWeek,
      bestMonth,
      monthlyBuckets,
      mediaUsage: [
        { label: "Photo", value: withPhoto },
        { label: "Video", value: withVideo },
        { label: "GIF", value: withGif },
        { label: "No media", value: noMedia },
      ].filter((m) => m.value > 0),
    };
  }, [tweets, accountId]);

  return (
    <div className="space-y-6">
      {/* Type breakdown stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Original" value={analytics.originalCount} variant="accent" />
        <StatCard label="Replies" value={analytics.replyCount} />
        <StatCard label="Self-replies" value={analytics.selfReplyCount} />
        <StatCard label="Retweets" value={analytics.retweetCount} />
      </div>

      {/* Type + Language */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AnalyticsPanel title="Tweet Type Breakdown">
          <BarList items={analytics.typeBreakdown} />
        </AnalyticsPanel>
        <AnalyticsPanel title="Language Distribution">
          <BarList items={analytics.languages} maxItems={10} />
        </AnalyticsPanel>
      </div>

      {/* Engagement stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Avg Likes" value={analytics.avgFavorites.toFixed(1)} />
        <StatCard label="Avg RTs" value={analytics.avgRetweets.toFixed(1)} />
        <StatCard label="Avg/Week" value={analytics.avgPerWeek.toFixed(1)} />
        <StatCard
          label="Best Month"
          value={analytics.bestMonth.label}
          subtitle={`${analytics.bestMonth.value} tweets`}
        />
      </div>

      {/* Hashtags + Mentions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AnalyticsPanel title="Top Hashtags">
          {analytics.hashtags.length > 0 ? (
            <BarList items={analytics.hashtags} maxItems={10} />
          ) : (
            <p className="text-sm text-foreground-muted">No hashtags found.</p>
          )}
        </AnalyticsPanel>
        <AnalyticsPanel title="Top Mentions">
          {analytics.mentions.length > 0 ? (
            <BarList items={analytics.mentions} maxItems={10} />
          ) : (
            <p className="text-sm text-foreground-muted">No mentions found.</p>
          )}
        </AnalyticsPanel>
      </div>

      {/* Engagement by type + over time */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AnalyticsPanel title="Engagement by Tweet Type">
          <BarList items={analytics.engagementByType} valueLabel="avg likes" />
        </AnalyticsPanel>
        <AnalyticsPanel title="Avg Likes by Year">
          {analytics.engByYearItems.length > 0 ? (
            <BarList items={analytics.engByYearItems} valueLabel="avg likes" />
          ) : (
            <p className="text-sm text-foreground-muted">Not enough data.</p>
          )}
        </AnalyticsPanel>
      </div>

      {/* Top tweets */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AnalyticsPanel title="Most Liked Tweets">
          <div className="space-y-2">
            {analytics.topByLikes.map((t) => (
              <MiniTweetCard key={t.id} tweet={t} />
            ))}
          </div>
        </AnalyticsPanel>
        <AnalyticsPanel title="Most Retweeted Tweets">
          <div className="space-y-2">
            {analytics.topByRTs.map((t) => (
              <MiniTweetCard key={t.id} tweet={t} />
            ))}
          </div>
        </AnalyticsPanel>
      </div>

      {/* Domains + Media */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AnalyticsPanel title="Top Domains Shared">
          {analytics.domains.length > 0 ? (
            <BarList items={analytics.domains} maxItems={15} valueLabel="links" />
          ) : (
            <p className="text-sm text-foreground-muted">No URLs found.</p>
          )}
        </AnalyticsPanel>
        <AnalyticsPanel title="Media Usage">
          <BarList items={analytics.mediaUsage} valueLabel="tweets" />
        </AnalyticsPanel>
      </div>

      {/* Sources + Years */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AnalyticsPanel title="Tweets by Source">
          <BarList items={analytics.sources} maxItems={10} />
        </AnalyticsPanel>
        <AnalyticsPanel title="Tweets by Year">
          <BarList items={analytics.years} />
        </AnalyticsPanel>
      </div>

      {/* Monthly cadence (full width) */}
      {analytics.monthlyBuckets.length > 1 && (
        <div className="rounded-xl border border-border bg-background-raised p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            Tweets Per Month
          </h3>
          <StackedBarTimeline
            buckets={analytics.monthlyBuckets}
            sourceColors={{ Tweets: chartColors.Tweets }}
          />
        </div>
      )}
    </div>
  );
}

function ClientsView({ archive }: { archive: ParsedArchive }) {
  const journey = useMemo(
    () => buildTweetClientJourney(archive),
    [archive],
  );

  if (journey.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-foreground-muted">
        No tweet client data found.
      </p>
    );
  }

  const total = journey.reduce((sum, e) => sum + e.count, 0);
  const thirdPartyCount = journey.filter((e) => e.isThirdParty).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Distinct clients" value={journey.length} />
        <StatCard
          label="Third-party clients"
          value={thirdPartyCount}
          variant={thirdPartyCount > 0 ? "danger" : "default"}
        />
        <StatCard label="Total tweets" value={total} />
      </div>

      <div className="rounded-xl border border-border bg-background-raised p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
          Tweet Client Journey
        </h3>
        <p className="mb-4 text-xs text-foreground-muted">
          Every app you&apos;ve tweeted from. Third-party clients are
          highlighted &mdash; some may be apps you&apos;ve forgotten you
          authorized.
        </p>
        <div className="space-y-2">
          {journey.map((entry) => (
            <ClientRow key={entry.client} entry={entry} total={total} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ClientRow({
  entry,
  total,
}: {
  entry: ClientJourneyEntry;
  total: number;
}) {
  const pct = total > 0 ? (entry.count / total) * 100 : 0;
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {entry.client}
          </span>
          {entry.isThirdParty && (
            <PillBadge variant="danger">third-party</PillBadge>
          )}
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="text-foreground">{formatNumber(entry.count)}</span>
          <span className="w-10 text-right text-foreground-muted">
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>
      {(entry.firstSeen || entry.lastSeen) && (
        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-foreground-muted">
          {entry.firstSeen && <span>First: {formatDate(entry.firstSeen)}</span>}
          {entry.lastSeen && <span>Last: {formatDate(entry.lastSeen)}</span>}
        </div>
      )}
    </div>
  );
}

function MiniTweetCard({ tweet }: { tweet: Tweet }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-sm text-foreground">{truncate(tweet.fullText, 120)}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-foreground-muted">
        <span>{formatDate(tweet.createdAt)}</span>
        <div className="flex gap-3 font-mono">
          <span>{formatNumber(tweet.favoriteCount)} likes</span>
          <span>{formatNumber(tweet.retweetCount)} RTs</span>
        </div>
      </div>
    </div>
  );
}
