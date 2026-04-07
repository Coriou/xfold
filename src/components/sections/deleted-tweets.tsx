"use client";

import { useMemo, useState } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { Pagination } from "@/components/shared/pagination";
import { formatDate, pluralize } from "@/lib/format";

const PAGE_SIZE = 50;

export default function DeletedTweets({ archive }: { archive: ParsedArchive }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const deleted = archive.deletedTweets;
  const activeCount = archive.tweets.length;

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
        <StatCard label="Deleted retweets" value={retweetCount} />
        <StatCard
          label="% of all-time tweets"
          value={
            activeCount > 0
              ? `${Math.round((deleted.length / (deleted.length + activeCount)) * 100)}%`
              : "—"
          }
          variant="danger"
        />
      </div>

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
    </div>
  );
}
