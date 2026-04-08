"use client";

import { useState, useMemo } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { BarList } from "@/components/shared/bar-list";
import { TagCloud } from "@/components/shared/tag-cloud";
import { DataTable } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { truncate, pluralize } from "@/lib/format";
import { safeHref } from "@/lib/safe-href";

type View = "analytics" | "table";
const PAGE_SIZE = 100;

const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "her",
  "was", "one", "our", "out", "has", "have", "this", "that", "with",
  "they", "been", "from", "will", "would", "could", "should", "what",
  "when", "where", "which", "there", "their", "about", "into", "just",
  "like", "more", "some", "than", "them", "then", "very", "your",
  "also", "back", "even", "here", "most", "much", "only", "over",
  "said", "same", "such", "take", "want", "well", "were", "going",
  "it's", "don't", "won't", "didn't", "isn't", "let's", "i'm",
  "https", "http", "he's", "she's", "we're", "they're", "that's",
]);

/**
 * Extract the most likely author from a liked tweet's text.
 * Retweets start with "RT @user:", otherwise grab the first @mention.
 */
function extractAuthor(fullText: string | null): string | null {
  if (!fullText) return null;
  // Retweet pattern: "RT @username: ..."
  const rt = fullText.match(/^RT @(\w+)/);
  if (rt?.[1]) return rt[1].toLowerCase();
  // First @mention in the text
  const mention = fullText.match(/@(\w{1,15})/);
  return mention?.[1] ? mention[1].toLowerCase() : null;
}

export default function Likes({ archive }: { archive: ParsedArchive }) {
  const [view, setView] = useState<View>("analytics");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const likes = archive.likes;

  const analytics = useMemo(() => {
    const accountMap = new Map<string, number>();
    const wordMap = new Map<string, number>();
    let withText = 0;

    for (const like of likes) {
      const username = extractAuthor(like.fullText);
      if (username) {
        accountMap.set(username, (accountMap.get(username) ?? 0) + 1);
      }

      if (like.fullText) {
        withText++;
        const words = like.fullText
          .toLowerCase()
          .split(/[^a-zA-Z0-9']+/)
          .filter(
            (w) =>
              w.length >= 4 &&
              !STOPWORDS.has(w) &&
              !w.startsWith("http") &&
              !w.startsWith("@"),
          );
        for (const word of words) {
          wordMap.set(word, (wordMap.get(word) ?? 0) + 1);
        }
      }
    }

    const topAccounts = [...accountMap.entries()]
      .map(([label, value]) => ({ label: `@${label}`, value }))
      .sort((a, b) => b.value - a.value);

    const topWords = [...wordMap.entries()]
      .map(([label, weight]) => ({ label, weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 60);

    return {
      topAccounts,
      topWords,
      withText,
      withoutText: likes.length - withText,
      uniqueAccounts: accountMap.size,
    };
  }, [likes]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return likes;
    return likes.filter(
      (l) =>
        (l.fullText?.toLowerCase().includes(q) ?? false) ||
        (extractAuthor(l.fullText)?.includes(q) ?? false),
    );
  }, [likes, search]);

  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(0);
  };

  if (likes.length === 0) {
    return (
      <div>
        <SectionHeader
          title="Your Likes"
          description="The tweets you've liked, with author and engagement breakdowns."
        />
        <EmptyState
          title="No likes found"
          description="Your archive doesn't contain a like.js file or it's empty. This usually means you've never liked a tweet, or the file was excluded from the archive."
        />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Your Likes"
        description={`${pluralize(likes.length, "liked tweet")} in your archive.`}
        badge={String(likes.length)}
      />

      {/* Stat cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Likes" value={likes.length} />
        <StatCard
          label="With Text"
          value={analytics.withText}
          variant="accent"
        />
        <StatCard label="Without Text" value={analytics.withoutText} />
        <StatCard label="Unique Accounts" value={analytics.uniqueAccounts} />
      </div>

      {/* View toggle */}
      <div className="mb-4 flex items-center gap-2">
        {(["analytics", "table"] as const).map((v) => (
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-background-raised p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
              Top Liked Accounts
            </h3>
            {analytics.topAccounts.length > 0 ? (
              <BarList
                items={analytics.topAccounts}
                maxItems={15}
                valueLabel="likes"
              />
            ) : (
              <p className="text-sm text-foreground-muted">
                Could not extract account names from URLs.
              </p>
            )}
          </div>
          <div className="rounded-xl border border-border bg-background-raised p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
              Topic Cloud
            </h3>
            {analytics.topWords.length > 0 ? (
              <TagCloud
                tags={analytics.topWords.map((w) => ({
                  label: w.label,
                  weight: w.weight,
                  variant: "accent" as const,
                }))}
              />
            ) : (
              <p className="text-sm text-foreground-muted">
                Not enough text data to extract topics.
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 max-w-sm">
            <SearchInput
              value={search}
              onChange={handleSearch}
              placeholder="Search likes…"
              count={search ? filtered.length : undefined}
            />
          </div>
          {search && filtered.length === 0 ? (
            <EmptyState
              title={`No matches for "${search}"`}
              description="Try different keywords, or clear the search to see every like."
            />
          ) : (
            <>
              <DataTable
                data={pageData}
                columns={[
                  {
                    key: "account",
                    label: "Account",
                    render: (l) => {
                      const author = extractAuthor(l.fullText);
                      return author ? (
                        <span className="font-mono text-xs text-foreground-muted">
                          @{author}
                        </span>
                      ) : (
                        <span className="text-xs text-foreground-muted">—</span>
                      );
                    },
                    sortable: true,
                    sortValue: (l) => extractAuthor(l.fullText) ?? "",
                  },
                  {
                    key: "text",
                    label: "Tweet",
                    render: (l) => (
                      <span className="text-sm">
                        {l.fullText ? (
                          truncate(l.fullText, 120)
                        ) : (
                          <span className="italic text-foreground-muted">
                            No text available
                          </span>
                        )}
                      </span>
                    ),
                  },
                  {
                    key: "link",
                    label: "",
                    render: (l) => {
                      const safe = safeHref(l.expandedUrl);
                      return safe ? (
                        <a
                          href={safe}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent hover:text-accent-hover"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-foreground-muted">—</span>
                      );
                    },
                    align: "right" as const,
                  },
                ]}
                emptyMessage="No likes found."
              />
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
