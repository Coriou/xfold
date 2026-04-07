"use client";

import { useState, useMemo } from "react";
import type { ParsedArchive, SocialEntry } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { SearchInput } from "@/components/shared/search-input";
import { DataTable, type Column } from "@/components/shared/data-table";
import { pluralize } from "@/lib/format";
import { safeHref } from "@/lib/safe-href";

type Tab = "followers" | "following" | "blocks" | "overlap";

export default function SocialGraph({
  archive,
}: {
  archive: ParsedArchive;
}) {
  const [tab, setTab] = useState<Tab>("overlap");
  const [search, setSearch] = useState("");

  const overlap = useMemo(() => {
    const followerSet = new Set(archive.followers.map((f) => f.accountId));
    const followingSet = new Set(archive.following.map((f) => f.accountId));

    const mutual = archive.followers.filter((f) =>
      followingSet.has(f.accountId),
    );
    const followingOnly = archive.following.filter(
      (f) => !followerSet.has(f.accountId),
    );
    const followersOnly = archive.followers.filter(
      (f) => !followingSet.has(f.accountId),
    );

    return { mutual, followingOnly, followersOnly };
  }, [archive.followers, archive.following]);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "overlap", label: "Overlap", count: overlap.mutual.length },
    { id: "followers", label: "Followers", count: archive.followers.length },
    { id: "following", label: "Following", count: archive.following.length },
    { id: "blocks", label: "Blocks", count: archive.blocks.length },
  ];

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setSearch("");
  };

  return (
    <div>
      <SectionHeader
        title="Your Social Graph"
        description={`${pluralize(archive.followers.length, "follower")}, ${pluralize(archive.following.length, "following")}, ${pluralize(archive.blocks.length, "blocked account")}.`}
      />

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              tab === t.id
                ? "bg-accent-muted/30 font-medium text-accent"
                : "text-foreground-muted hover:bg-background-raised hover:text-foreground"
            }`}
          >
            {t.label}
            <span className="font-mono text-xs opacity-60">{t.count}</span>
          </button>
        ))}
      </div>

      {tab === "overlap" ? (
        <OverlapView overlap={overlap} />
      ) : (
        <ListView
          data={
            tab === "followers"
              ? archive.followers
              : tab === "following"
                ? archive.following
                : archive.blocks
          }
          search={search}
          onSearch={setSearch}
          isDanger={tab === "blocks"}
        />
      )}
    </div>
  );
}

function OverlapView({
  overlap,
}: {
  overlap: {
    mutual: SocialEntry[];
    followingOnly: SocialEntry[];
    followersOnly: SocialEntry[];
  };
}) {
  return (
    <div>
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard
          label="Mutual"
          value={overlap.mutual.length}
          subtitle="follow each other"
          variant="accent"
        />
        <StatCard
          label="Following Only"
          value={overlap.followingOnly.length}
          subtitle="not following you back"
        />
        <StatCard
          label="Followers Only"
          value={overlap.followersOnly.length}
          subtitle="you don't follow back"
        />
      </div>

      {overlap.mutual.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            Mutual Follows
          </h3>
          <div className="flex flex-wrap gap-2">
            {overlap.mutual.map((e) => {
              const safe = safeHref(e.userLink);
              const className =
                "inline-flex items-center gap-1 rounded-lg border border-border bg-background-raised px-3 py-1.5 font-mono text-xs text-accent hover:border-border-hover";
              return safe ? (
                <a
                  key={e.accountId}
                  href={safe}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {e.accountId}
                </a>
              ) : (
                <span key={e.accountId} className={className}>
                  {e.accountId}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {overlap.followingOnly.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            Not Following You Back
          </h3>
          <div className="flex flex-wrap gap-2">
            {overlap.followingOnly.map((e) => {
              const safe = safeHref(e.userLink);
              const className =
                "inline-flex items-center gap-1 rounded-lg border border-border bg-background-raised px-3 py-1.5 font-mono text-xs text-foreground-muted hover:border-border-hover hover:text-foreground";
              return safe ? (
                <a
                  key={e.accountId}
                  href={safe}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {e.accountId}
                </a>
              ) : (
                <span key={e.accountId} className={className}>
                  {e.accountId}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ListView({
  data,
  search,
  onSearch,
  isDanger,
}: {
  data: SocialEntry[];
  search: string;
  onSearch: (v: string) => void;
  isDanger?: boolean;
}) {
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return data;
    return data.filter((e) => e.accountId.includes(q));
  }, [data, search]);

  const columns: Column<SocialEntry>[] = [
    {
      key: "id",
      label: "Account ID",
      render: (e) => (
        <span className={`font-mono text-xs ${isDanger ? "text-danger" : ""}`}>
          {e.accountId}
        </span>
      ),
      sortable: true,
      sortValue: (e) => e.accountId,
      mono: true,
    },
    {
      key: "link",
      label: "Profile",
      render: (e) => {
        const safe = safeHref(e.userLink);
        return safe ? (
          <a
            href={safe}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:text-accent-hover"
          >
            View profile
          </a>
        ) : (
          <span className="text-xs text-foreground-muted">—</span>
        );
      },
      align: "right",
    },
  ];

  return (
    <>
      <div className="mb-4 max-w-sm">
        <SearchInput
          value={search}
          onChange={onSearch}
          placeholder="Filter by account ID…"
          count={search ? filtered.length : undefined}
        />
      </div>
      <DataTable data={filtered} columns={columns} emptyMessage="No accounts found." />
    </>
  );
}
