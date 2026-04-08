"use client";

import { useMemo, useState } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate, getDayLabel, formatHour, formatNumber, toMonthKey, pluralize } from "@/lib/format";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { ActivityHeatmap, type HeatmapCell } from "@/components/shared/activity-heatmap";
import { StackedBarTimeline, type TimelineBucket } from "@/components/shared/stacked-bar-timeline";
import { chartColors } from "@/lib/brand";

// --- Source definitions -----------------------------------------------------

type SourceId = "Tweets" | "DMs" | "Logins" | "Grok" | "Ads";

const SOURCE_COLORS: Record<SourceId, string> = {
  Tweets: chartColors.Tweets,
  DMs: chartColors.DMs,
  Logins: chartColors.Logins,
  Grok: chartColors.Grok,
  Ads: chartColors.Ads,
};

interface ActivityEvent {
  date: Date;
  source: SourceId;
}

// --- Component --------------------------------------------------------------

export default function ActivityPatterns({
  archive,
}: {
  archive: ParsedArchive;
}) {
  // Collect all timestamped events
  const allEvents = useMemo(() => {
    const events: ActivityEvent[] = [];

    for (const tweet of archive.tweets) {
      const d = parseDate(tweet.createdAt);
      if (d) events.push({ date: d, source: "Tweets" });
    }
    for (const convo of archive.directMessages) {
      for (const msg of convo.messages) {
        const d = parseDate(msg.createdAt);
        if (d) events.push({ date: d, source: "DMs" });
      }
    }
    for (const entry of archive.ipAudit) {
      const d = parseDate(entry.createdAt);
      if (d) events.push({ date: d, source: "Logins" });
    }
    for (const convo of archive.grokConversations) {
      for (const msg of convo.messages) {
        const d = parseDate(msg.createdAt);
        if (d) events.push({ date: d, source: "Grok" });
      }
    }
    for (const batch of archive.adImpressions) {
      for (const imp of batch.impressions) {
        const d = parseDate(imp.impressionTime);
        if (d) events.push({ date: d, source: "Ads" });
      }
    }

    return events;
  }, [archive]);

  // Source counts for toggle badges
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of allEvents) {
      counts[e.source] = (counts[e.source] ?? 0) + 1;
    }
    return counts;
  }, [allEvents]);

  // Active sources with data
  const availableSources = useMemo(
    () =>
      (Object.keys(SOURCE_COLORS) as SourceId[]).filter(
        (s) => (sourceCounts[s] ?? 0) > 0,
      ),
    [sourceCounts],
  );

  const [activeSources, setActiveSources] = useState<Set<SourceId>>(
    () => new Set(Object.keys(SOURCE_COLORS) as SourceId[]),
  );

  const toggleSource = (source: SourceId) => {
    setActiveSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) {
        next.delete(source);
      } else {
        next.add(source);
      }
      return next;
    });
  };

  const allSourceIds = Object.keys(SOURCE_COLORS) as SourceId[];
  const showAllSources = () => setActiveSources(new Set(allSourceIds));
  const allSelected = activeSources.size === allSourceIds.length;

  // Filtered events
  const filtered = useMemo(
    () => allEvents.filter((e) => activeSources.has(e.source)),
    [allEvents, activeSources],
  );

  // Heatmap data
  const heatmapData = useMemo(() => {
    const grid = new Map<string, number>();
    for (const e of filtered) {
      const key = `${e.date.getDay()}-${e.date.getHours()}`;
      grid.set(key, (grid.get(key) ?? 0) + 1);
    }
    const cells: HeatmapCell[] = [];
    for (const [key, count] of grid) {
      const [day, hour] = key.split("-").map(Number);
      cells.push({ day: day ?? 0, hour: hour ?? 0, count });
    }
    return cells;
  }, [filtered]);

  // Peak activity
  const peak = useMemo(() => {
    if (heatmapData.length === 0) return null;
    const sorted = [...heatmapData].sort((a, b) => b.count - a.count);
    return sorted[0];
  }, [heatmapData]);

  // Stats
  const stats = useMemo(() => {
    const uniqueDays = new Set(
      filtered.map((e) => e.date.toDateString()),
    ).size;

    // Day distribution
    const dayCount = new Map<number, number>();
    const hourCount = new Map<number, number>();
    for (const e of filtered) {
      dayCount.set(e.date.getDay(), (dayCount.get(e.date.getDay()) ?? 0) + 1);
      hourCount.set(
        e.date.getHours(),
        (hourCount.get(e.date.getHours()) ?? 0) + 1,
      );
    }

    let topDay = 0;
    let topDayCount = 0;
    for (const [day, count] of dayCount) {
      if (count > topDayCount) {
        topDay = day;
        topDayCount = count;
      }
    }

    let topHour = 0;
    let topHourCount = 0;
    for (const [hour, count] of hourCount) {
      if (count > topHourCount) {
        topHour = hour;
        topHourCount = count;
      }
    }

    return { uniqueDays, topDay, topHour };
  }, [filtered]);

  // Timeline buckets
  const timelineBuckets = useMemo(() => {
    const bucketMap = new Map<
      string,
      Map<string, number>
    >();

    for (const e of filtered) {
      const month = toMonthKey(e.date);
      let sources = bucketMap.get(month);
      if (!sources) {
        sources = new Map();
        bucketMap.set(month, sources);
      }
      sources.set(e.source, (sources.get(e.source) ?? 0) + 1);
    }

    const months = [...bucketMap.keys()].sort();
    return months.map((month): TimelineBucket => ({
      label: month,
      segments: (Object.keys(SOURCE_COLORS) as SourceId[])
        .filter((s) => activeSources.has(s))
        .map((source) => ({
          source,
          count: bucketMap.get(month)?.get(source) ?? 0,
        })),
    }));
  }, [filtered, activeSources]);

  // Date ranges per source
  const dateRanges = useMemo(() => {
    const ranges: { source: SourceId; first: Date; last: Date; count: number }[] = [];
    for (const source of availableSources) {
      const events = allEvents.filter((e) => e.source === source);
      if (events.length === 0) continue;
      const dates = events.map((e) => e.date.getTime());
      ranges.push({
        source,
        first: new Date(Math.min(...dates)),
        last: new Date(Math.max(...dates)),
        count: events.length,
      });
    }
    return ranges;
  }, [allEvents, availableSources]);

  // Global date range for coverage bars
  const globalRange = useMemo(() => {
    if (allEvents.length === 0) return { min: 0, max: 1 };
    const times = allEvents.map((e) => e.date.getTime());
    return { min: Math.min(...times), max: Math.max(...times) };
  }, [allEvents]);

  if (allEvents.length === 0) {
    return (
      <div>
        <SectionHeader
          title="Activity Patterns"
          description="No timestamped data found in your archive."
        />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Activity Patterns"
        description={`Cross-referencing ${formatNumber(allEvents.length)} events across ${availableSources.length} data sources.`}
      />

      {/* Privacy callout — note: this measures the single hottest cell in
          the heatmap (one specific day-of-week + hour combo), which can
          differ from the marginals shown in the stat cards below. The "most
          active day" stat sums an entire row; "most active hour" sums an
          entire column; this banner finds the single hottest cell. Don't
          conflate these in copy. */}
      {peak && (
        <div className="mb-6 rounded-xl border border-danger/20 bg-danger/5 p-5">
          <p className="text-sm font-medium text-danger">
            Your single most active hour is{" "}
            <span className="font-bold">{getDayLabel(peak.day, true)}</span> at{" "}
            <span className="font-bold">{formatHour(peak.hour)}</span> — this
            pattern is visible to anyone with access to your data.
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Events" value={filtered.length} />
        <StatCard label="Active Days" value={stats.uniqueDays} />
        <StatCard
          label="Most Active Day"
          value={getDayLabel(stats.topDay, true)}
        />
        <StatCard
          label="Most Active Hour"
          value={formatHour(stats.topHour)}
        />
      </div>

      {/* Source toggles */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {availableSources.map((source) => {
          const active = activeSources.has(source);
          return (
            <button
              key={source}
              type="button"
              onClick={() => toggleSource(source)}
              aria-pressed={active}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                active
                  ? "border-border-hover bg-background-raised font-medium text-foreground"
                  : "border-border bg-background text-foreground-muted"
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: SOURCE_COLORS[source],
                  opacity: active ? 1 : 0.3,
                }}
                aria-hidden="true"
              />
              {source}
              <span className="font-mono text-xs text-foreground-muted">
                {formatNumber(sourceCounts[source] ?? 0)}
              </span>
            </button>
          );
        })}
        {!allSelected && (
          <button
            type="button"
            onClick={showAllSources}
            className="rounded-lg px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Show all
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="mb-6 rounded-lg border border-border bg-background-raised px-4 py-3 text-sm text-foreground-muted">
          No sources selected — pick at least one above to see activity.
        </p>
      )}

      {/* Heatmap */}
      <div className="mb-6 rounded-xl border border-border bg-background-raised p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
          Activity by Day & Hour
        </h3>
        <ActivityHeatmap data={heatmapData} />
      </div>

      {/* Timeline */}
      {timelineBuckets.length > 1 && (
        <div className="mb-6 rounded-xl border border-border bg-background-raised p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            Activity Over Time
          </h3>
          <StackedBarTimeline
            buckets={timelineBuckets}
            sourceColors={SOURCE_COLORS}
          />
        </div>
      )}

      {/* Data coverage */}
      {dateRanges.length > 0 && (
        <div className="rounded-xl border border-border bg-background-raised p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            Data Coverage by Source
          </h3>
          <div className="space-y-3">
            {dateRanges.map((range) => {
              const span = globalRange.max - globalRange.min || 1;
              const left =
                ((range.first.getTime() - globalRange.min) / span) * 100;
              const width =
                ((range.last.getTime() - range.first.getTime()) / span) * 100;

              return (
                <div key={range.source} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-sm text-foreground-muted">
                    {range.source}
                  </span>
                  <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-foreground/5">
                    <div
                      className="absolute h-full rounded-full"
                      style={{
                        left: `${left}%`,
                        width: `${Math.max(width, 1)}%`,
                        backgroundColor: SOURCE_COLORS[range.source],
                      }}
                    />
                  </div>
                  <span className="w-28 shrink-0 text-right text-xs text-foreground-muted">
                    {pluralize(range.count, "event")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
