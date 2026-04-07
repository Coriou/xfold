"use client";

import { useState, useMemo } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { SearchInput } from "@/components/shared/search-input";
import { TagCloud } from "@/components/shared/tag-cloud";
import { pluralize } from "@/lib/format";

export default function Interests({
  archive,
}: {
  archive: ParsedArchive;
}) {
  const p = archive.personalization;
  const [search, setSearch] = useState("");
  const [showDisabled, setShowDisabled] = useState(true);
  const [tab, setTab] = useState<"interests" | "shows">("interests");

  const interests = useMemo(() => p?.interests ?? [], [p?.interests]);
  const shows = useMemo(() => p?.shows ?? [], [p?.shows]);

  const activeCount = interests.filter((i) => !i.isDisabled).length;
  const disabledCount = interests.filter((i) => i.isDisabled).length;

  const filteredInterests = useMemo(() => {
    const q = search.toLowerCase();
    return interests
      .filter((i) => showDisabled || !i.isDisabled)
      .filter((i) => !q || i.name.toLowerCase().includes(q));
  }, [interests, search, showDisabled]);

  const filteredShows = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return shows;
    return shows.filter((s) => s.toLowerCase().includes(q));
  }, [shows, search]);

  if (!p) {
    return (
      <div>
        <SectionHeader
          title="What X Thinks You Like"
          description="No personalization data found in your archive."
        />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="What X Thinks You Like"
        description={`X inferred ${pluralize(activeCount, "interest")} about you${disabledCount > 0 ? ` (${disabledCount} disabled)` : ""}, and tracked ${pluralize(shows.length, "show")}.`}
        badge={String(interests.length + shows.length)}
      />

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-2">
        {(["interests", "shows"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(""); }}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              tab === t
                ? "bg-accent-muted/30 font-medium text-accent"
                : "text-foreground-muted hover:bg-background-raised hover:text-foreground"
            }`}
          >
            {t === "interests" ? `Interests (${interests.length})` : `Shows (${shows.length})`}
          </button>
        ))}
      </div>

      {/* Search + controls */}
      <div className="mb-4 flex items-center gap-3">
        <div className="max-w-sm flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={tab === "interests" ? "Search interests…" : "Search shows…"}
            count={search ? (tab === "interests" ? filteredInterests.length : filteredShows.length) : undefined}
          />
        </div>
        {tab === "interests" && disabledCount > 0 && (
          <button
            onClick={() => setShowDisabled((s) => !s)}
            className="text-xs text-foreground-muted hover:text-foreground"
          >
            {showDisabled ? "Hide disabled" : "Show disabled"}
          </button>
        )}
      </div>

      {tab === "interests" ? (
        <TagCloud
          tags={filteredInterests.map((i) => ({
            label: i.name,
            variant: i.isDisabled ? "disabled" as const : "default" as const,
          }))}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredShows.map((show, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-background-raised px-3 py-2 text-sm text-foreground"
            >
              {show}
            </div>
          ))}
          {filteredShows.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-foreground-muted">
              No shows found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
