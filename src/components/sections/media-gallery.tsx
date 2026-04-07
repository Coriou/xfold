"use client";

import { useState, useMemo } from "react";
import type { ParsedArchive, Tweet, TweetMedia } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { SearchInput } from "@/components/shared/search-input";
import { PillBadge } from "@/components/shared/pill-badge";
import { Pagination } from "@/components/shared/pagination";
import { ArchiveMedia } from "@/components/shared/archive-media";
import { formatDate, pluralize } from "@/lib/format";

interface MediaItem {
  media: TweetMedia;
  tweet: Tweet;
}

type TypeFilter = "all" | "photo" | "video" | "animated_gif";
const PAGE_SIZE = 40;

export default function MediaGallery({
  archive,
}: {
  archive: ParsedArchive;
}) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const allMedia = useMemo(() => {
    const items: MediaItem[] = [];
    for (const tweet of archive.tweets) {
      for (const media of tweet.media) {
        items.push({ media, tweet });
      }
    }
    return items;
  }, [archive.tweets]);

  const photos = allMedia.filter((m) => m.media.type === "photo");
  const videos = allMedia.filter(
    (m) => m.media.type === "video" || m.media.type === "animated_gif",
  );

  const filtered = useMemo(() => {
    let items = allMedia;
    if (typeFilter !== "all") {
      items = items.filter((m) => m.media.type === typeFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((m) =>
        m.tweet.fullText.toLowerCase().includes(q),
      );
    }
    return items;
  }, [allMedia, typeFilter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleFilter = (f: TypeFilter) => {
    setTypeFilter(f);
    setPage(0);
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(0);
  };

  return (
    <div>
      <SectionHeader
        title="Your Media"
        description={`${pluralize(allMedia.length, "media file")} attached to your tweets.`}
        badge={String(allMedia.length)}
      />

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard label="Total Media" value={allMedia.length} />
        <StatCard label="Photos" value={photos.length} variant="accent" />
        <StatCard label="Videos / GIFs" value={videos.length} />
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {(["all", "photo", "video", "animated_gif"] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                typeFilter === f
                  ? "bg-accent-muted/30 font-medium text-accent"
                  : "text-foreground-muted hover:bg-background-raised hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f === "animated_gif" ? "GIFs" : f === "photo" ? "Photos" : "Videos"}
            </button>
          ))}
        </div>
        <div className="max-w-sm flex-1">
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="Search by tweet text…"
            count={search || typeFilter !== "all" ? filtered.length : undefined}
          />
        </div>
      </div>

      {/* Grid */}
      {pageData.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {pageData.map((item, i) => (
            <MediaCard key={`${item.media.id}-${i}`} item={item} />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-foreground-muted">
          No media found.
        </p>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function MediaCard({ item }: { item: MediaItem }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-background-raised">
      <ArchiveMedia
        localPath={item.media.localPath}
        type={item.media.type}
        className="aspect-square w-full object-cover"
      />
      {/* Type badge */}
      {item.media.type !== "photo" && (
        <div className="absolute right-2 top-2">
          <PillBadge variant="accent">
            {item.media.type === "video" ? "Video" : "GIF"}
          </PillBadge>
        </div>
      )}
      {/* Hover overlay */}
      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="text-xs text-white">
          <p>{formatDate(item.tweet.createdAt)}</p>
          <p className="mt-0.5 line-clamp-2 opacity-80">
            {item.tweet.fullText}
          </p>
        </div>
      </div>
    </div>
  );
}
