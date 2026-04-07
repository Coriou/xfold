"use client";

import { useCallback, useState } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { SearchInput } from "@/components/shared/search-input";
import {
  crossSearch,
  type CrossSearchResult,
  type SearchResultKind,
} from "@/lib/archive/insights/cross-search";

interface SearchSurveillanceProps {
  archive: ParsedArchive;
  onNavigate?: ((sectionId: string) => void) | undefined;
}

const KIND_META: Record<
  SearchResultKind,
  { label: string; emoji: string; bg: string }
> = {
  tweet: { label: "Tweet", emoji: "\uD83D\uDCAC", bg: "bg-accent/10" },
  "deleted-tweet": {
    label: "Deleted tweet",
    emoji: "\uD83D\uDDD1\uFE0F",
    bg: "bg-danger/10",
  },
  dm: { label: "DM", emoji: "\uD83D\uDCE8", bg: "bg-accent/10" },
  grok: { label: "Grok", emoji: "\uD83E\uDD16", bg: "bg-accent/10" },
  like: { label: "Like", emoji: "\u2764\uFE0F", bg: "bg-accent/10" },
  interest: {
    label: "Interest",
    emoji: "\uD83C\uDFAF",
    bg: "bg-danger/10",
  },
  "ad-targeting": {
    label: "Ad targeting",
    emoji: "\uD83D\uDCB0",
    bg: "bg-danger/10",
  },
  contact: {
    label: "Contact",
    emoji: "\uD83D\uDCCB",
    bg: "bg-foreground/5",
  },
};

const SUGGESTIONS = [
  "politics",
  "health",
  "money",
  "crypto",
  "travel",
  "dating",
  "job",
  "therapy",
  "depression",
];

export default function SearchSurveillance({
  archive,
}: SearchSurveillanceProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<CrossSearchResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      if (q.trim().length < 2) {
        setResult(null);
        setHasSearched(false);
        return;
      }
      setHasSearched(true);
      setResult(crossSearch(archive, q));
    },
    [archive],
  );

  return (
    <div>
      <SectionHeader
        title="Search Your Surveillance"
        description="Search one keyword across every data type. See how X tracks a single topic everywhere you go."
      />

      <div className="mb-6">
        <SearchInput
          value={query}
          onChange={setQuery}
          onSubmit={handleSearch}
          placeholder="Search across all your data…"
          label="Cross-data search"
          count={result?.totalHits}
        />
        <p className="mt-2 text-xs text-foreground-muted">
          Press Enter to search. Checks tweets, deleted tweets, DMs, Grok,
          likes, interests, ad targeting, and contacts.
        </p>
      </div>

      {/* Suggestions */}
      {!hasSearched && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Try searching for
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setQuery(s);
                  handleSearch(s);
                }}
                className="rounded-lg border border-border bg-background-raised px-3 py-1.5 text-sm text-foreground-muted transition-colors hover:border-accent hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {hasSearched && result && (
        <div>
          {/* Narrative */}
          <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
            <p className="text-sm font-medium text-foreground">
              {result.narrative}
            </p>
          </div>

          {/* Domain breakdown */}
          <div className="mb-6 flex flex-wrap gap-2">
            {(Object.keys(result.countsByKind) as SearchResultKind[])
              .filter((k) => result.countsByKind[k] > 0)
              .sort((a, b) => result.countsByKind[b] - result.countsByKind[a])
              .map((kind) => {
                const meta = KIND_META[kind];
                return (
                  <span
                    key={kind}
                    className={`inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs ${meta.bg}`}
                  >
                    <span>{meta.emoji}</span>
                    <span className="text-foreground-muted">{meta.label}</span>
                    <span className="font-mono font-bold text-foreground">
                      {result.countsByKind[kind]}
                    </span>
                  </span>
                );
              })}
          </div>

          {/* Hit list grouped by kind */}
          {(Object.keys(result.countsByKind) as SearchResultKind[])
            .filter((kind) => result.countsByKind[kind] > 0)
            .sort((a, b) => result.countsByKind[b] - result.countsByKind[a])
            .map((kind) => {
              const meta = KIND_META[kind];
              const kindHits = result.hits.filter((h) => h.kind === kind);
              return (
                <div key={kind} className="mb-6">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                    <span>{meta.emoji}</span>
                    {meta.label} ({result.countsByKind[kind]})
                  </h3>
                  <div className="space-y-1.5">
                    {kindHits.slice(0, 10).map((hit, i) => (
                      <div
                        key={i}
                        className={`rounded-lg border border-border p-3 ${meta.bg}`}
                      >
                        <p className="text-sm text-foreground">{hit.text}</p>
                        <div className="mt-1 flex items-center gap-3">
                          {hit.date && (
                            <span className="text-xs text-foreground-muted">
                              {hit.date}
                            </span>
                          )}
                          {hit.detail && (
                            <span className="text-xs text-foreground-muted">
                              {hit.detail}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {kindHits.length > 10 && (
                      <p className="py-1 text-xs text-foreground-muted">
                        +{result.countsByKind[kind] - 10} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* No results */}
      {hasSearched && !result && (
        <div className="rounded-xl border border-border bg-background-raised p-6 text-center">
          <p className="text-sm text-foreground-muted">
            No results for &ldquo;{query}&rdquo; across any data type.
          </p>
        </div>
      )}
    </div>
  );
}
