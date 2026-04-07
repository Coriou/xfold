"use client";

import { useMemo, useState } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { Pagination } from "@/components/shared/pagination";
import { StackedBarTimeline } from "@/components/shared/stacked-bar-timeline";
import { formatDate, formatNumber, pluralize } from "@/lib/format";
import { buildDeletionTimeline } from "@/lib/archive/insights/deletion-timeline";

const PAGE_SIZE = 50;

type DeletedTab = "timeline" | "erased-topics" | "all-tweets";

export default function DeletedTweets({ archive }: { archive: ParsedArchive }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<DeletedTab>("timeline");

  const deleted = archive.deletedTweets;
  const activeCount = archive.tweets.length;

  const timeline = useMemo(() => buildDeletionTimeline(archive), [archive]);

  const sorted = useMemo(
    () => [...deleted].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [deleted],
  );

  const filtered = useMemo(() => {
    if (!search) return sorted;
    const lower = search.toLowerCase();
    return sorted.filter((t) => t.fullText.toLowerCase().includes(lower));
  }, [sorted, search]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const timelineBuckets = useMemo(() => {
    if (!timeline) return [];
    // Show yearly buckets for cleaner viz when there are many months
    const yearMap = new Map<string, { deleted: number; active: number }>();
    for (const b of timeline.timeline) {
      const year = b.month.slice(0, 4);
      const existing = yearMap.get(year);
      if (existing) {
        existing.deleted += b.deletedCount;
        existing.active += b.activeCount;
      } else {
        yearMap.set(year, { deleted: b.deletedCount, active: b.activeCount });
      }
    }
    return Array.from(yearMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, counts]) => ({
        label: year,
        segments: [
          { source: "Kept (active)", count: counts.active },
          { source: "Deleted (kept by X)", count: counts.deleted },
        ],
      }));
  }, [timeline]);

  if (deleted.length === 0) {
    return (
      <div>
        <SectionHeader
          title="Deleted Tweets"
          description="Tweets you deleted — but X still kept."
        />
        <EmptyState
          title="No deleted tweets found"
          description="Your archive doesn't contain any deleted tweet data, or this data file wasn't included."
        />
      </div>
    );
  }

  const retweetCount = deleted.filter((t) => t.isRetweet).length;
  const originalCount = deleted.length - retweetCount;
  const withText = deleted.filter((t) => t.fullText.length > 0).length;

  return (
    <div>
      <SectionHeader
        title="Deleted Tweets"
        description="X keeps tweets you deleted. These are still in your archive."
        badge={`${deleted.length.toLocaleString()} kept`}
      />

      {/* Warning callout */}
      <div className="mb-6 rounded-xl border border-danger/30 bg-danger/5 p-4">
        <p className="text-sm font-semibold text-danger">
          You deleted {pluralize(deleted.length, "tweet")}, but X still has{" "}
          {withText > 0 ? "the full text of " : ""}
          {withText > 0 ? pluralize(withText, "of them") : "them"} in your
          archive.
        </p>
        <p className="mt-1.5 text-xs text-foreground-muted">
          {activeCount > 0
            ? `For comparison, you currently have ${activeCount.toLocaleString()} active tweets. That means ${Math.round((deleted.length / (deleted.length + activeCount)) * 100)}% of all tweets you've ever written are ones you thought were gone.`
            : "This data never leaves your device — only you can see it here."}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Deleted tweets kept"
          value={deleted.length}
          variant="danger"
        />
        <StatCard label="Original tweets" value={originalCount} />
        <StatCard
          label="% of all-time tweets"
          value={
            activeCount > 0
              ? `${Math.round((deleted.length / (deleted.length + activeCount)) * 100)}%`
              : "—"
          }
          variant="danger"
        />
        {timeline?.longestRetentionDays != null && (
          <StatCard
            label="Longest retention"
            value={`${formatNumber(Math.round(timeline.longestRetentionDays / 365))} yrs`}
            variant="danger"
          />
        )}
      </div>

      {/* Retention stats */}
      {timeline &&
        (timeline.averageRetentionDays != null ||
          timeline.fullyErasedCount > 0) && (
          <div className="mb-6 rounded-xl border border-border bg-background-raised p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              Data Retention Analysis
            </h3>
            <div className="flex flex-wrap gap-6 text-sm">
              {timeline.averageRetentionDays != null && (
                <div>
                  <span className="text-foreground-muted">
                    Avg. retention:{" "}
                  </span>
                  <span className="font-mono font-semibold text-danger">
                    {formatNumber(Math.round(timeline.averageRetentionDays))}{" "}
                    days
                  </span>
                  <span className="text-foreground-muted">
                    {" "}
                    ({(timeline.averageRetentionDays / 365).toFixed(1)} years)
                  </span>
                </div>
              )}
              {timeline.fullyErasedCount > 0 && (
                <div>
                  <span className="text-foreground-muted">
                    Topics only in deleted tweets:{" "}
                  </span>
                  <span className="font-mono font-semibold text-danger">
                    {formatNumber(timeline.fullyErasedCount)}
                  </span>
                  <span className="text-foreground-muted">
                    {" "}
                    (successfully hidden from public, but X still has them)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-2">
        {[
          { key: "timeline" as const, label: "Deletion Timeline" },
          { key: "erased-topics" as const, label: "Erased Topics" },
          { key: "all-tweets" as const, label: "All Deleted Tweets" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setSearch("");
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              tab === t.key
                ? "bg-accent-muted/30 font-medium text-accent"
                : "text-foreground-muted hover:bg-background-raised hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Timeline tab */}
      {tab === "timeline" && (
        <>
          {timelineBuckets.length > 0 ? (
            <div className="rounded-xl border border-border bg-background-raised p-5">
              <h3 className="mb-1 text-sm font-semibold text-foreground">
                Active vs. Deleted Tweets by Year
              </h3>
              <p className="mb-4 text-xs text-foreground-muted">
                The red bars show tweets you deleted that X kept. The teal bars
                show tweets that remain active.
                {timeline?.peakMonth && (
                  <>
                    {" "}
                    Peak deletion activity:{" "}
                    <span className="font-semibold text-danger">
                      {timeline.peakMonth}
                    </span>{" "}
                    ({formatNumber(timeline.peakMonthCount)} tweets).
                  </>
                )}
              </p>
              <StackedBarTimeline
                buckets={timelineBuckets}
                sourceColors={{
                  "Kept (active)": "oklch(0.72 0.12 192)",
                  "Deleted (kept by X)": "oklch(0.65 0.2 25)",
                }}
              />
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-foreground-muted">
              Not enough date data to build a timeline.
            </p>
          )}
        </>
      )}

      {/* Erased topics tab */}
      {tab === "erased-topics" && timeline && (
        <>
          {timeline.erasedTopics.length > 0 ? (
            <div className="space-y-2">
              <p className="mb-4 text-xs text-foreground-muted">
                Hashtags that appear in your deleted tweets. Topics marked
                &ldquo;Fully erased&rdquo; exist <em>only</em> in deleted tweets
                &mdash; you successfully removed them from public view, but X
                still has them.
              </p>
              {timeline.erasedTopics.slice(0, 30).map((topic) => (
                <div
                  key={topic.tag}
                  className="flex items-center justify-between rounded-lg border border-border bg-background-raised px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">
                      #{topic.tag}
                    </span>
                    {topic.fullyErased && (
                      <span className="rounded bg-danger/15 px-1.5 py-0.5 text-[10px] font-medium text-danger">
                        Fully erased from public
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-foreground-muted">
                    <span>
                      <span className="font-mono text-danger">
                        {topic.deletedCount}
                      </span>{" "}
                      deleted
                    </span>
                    <span>
                      <span className="font-mono">{topic.activeCount}</span>{" "}
                      active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-foreground-muted">
              No hashtags found in deleted tweets.
            </p>
          )}
        </>
      )}

      {/* All tweets tab */}
      {tab === "all-tweets" && (
        <>
          {/* Search */}
          <div className="mb-4">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search deleted tweets..."
            />
          </div>

          {/* List */}
          <div className="space-y-3">
            {paged.map((tweet) => (
              <div
                key={tweet.id}
                className="rounded-xl border border-border bg-background-raised p-4"
              >
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {tweet.fullText || (
                    <span className="italic text-foreground-muted">
                      [Text not available]
                    </span>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-foreground-muted">
                  <span>Posted: {formatDate(tweet.createdAt)}</span>
                  {tweet.deletedAt && (
                    <span className="text-danger">
                      Deleted: {formatDate(tweet.deletedAt)}
                    </span>
                  )}
                  {tweet.isRetweet && (
                    <span className="rounded bg-foreground/10 px-1.5 py-0.5">
                      Retweet
                    </span>
                  )}
                  {tweet.hashtags.length > 0 && (
                    <span>#{tweet.hashtags.join(" #")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filtered.length > PAGE_SIZE && (
            <div className="mt-4">
              <Pagination
                page={page}
                totalPages={Math.ceil(filtered.length / PAGE_SIZE)}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
