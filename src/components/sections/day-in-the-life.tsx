"use client";

import { useMemo } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  buildDayInTheLife,
  type DayEventKind,
} from "@/lib/archive/insights/day-in-the-life";
import { formatHour } from "@/lib/format";

interface DayInTheLifeProps {
  archive: ParsedArchive;
  onNavigate?: ((sectionId: string) => void) | undefined;
}

const EVENT_META: Record<
  DayEventKind,
  { label: string; emoji: string; color: string }
> = {
  tweet: { label: "Tweet", emoji: "\uD83D\uDCAC", color: "text-accent" },
  "deleted-tweet": {
    label: "Deleted tweet",
    emoji: "\uD83D\uDDD1\uFE0F",
    color: "text-danger",
  },
  like: { label: "Like", emoji: "\u2764\uFE0F", color: "text-accent" },
  "dm-sent": { label: "DM sent", emoji: "\uD83D\uDCE8", color: "text-accent" },
  "dm-received": {
    label: "DM received",
    emoji: "\uD83D\uDCE9",
    color: "text-foreground-muted",
  },
  login: {
    label: "Login",
    emoji: "\uD83D\uDD11",
    color: "text-foreground-muted",
  },
  "ad-impression": {
    label: "Ad shown",
    emoji: "\uD83D\uDCB0",
    color: "text-danger",
  },
  "grok-message": {
    label: "Grok message",
    emoji: "\uD83E\uDD16",
    color: "text-accent",
  },
  "app-connected": {
    label: "App connected",
    emoji: "\uD83D\uDD17",
    color: "text-foreground-muted",
  },
} as const;

export default function DayInTheLife({ archive }: DayInTheLifeProps) {
  const data = useMemo(() => buildDayInTheLife(archive), [archive]);

  if (!data) {
    return (
      <div>
        <SectionHeader
          title="A Day In The Life"
          description="What X recorded about you on your most data-dense day."
        />
        <EmptyState
          title="Not enough data"
          description="Your archive doesn't have enough timestamped events to reconstruct a day."
        />
      </div>
    );
  }

  // Group events by hour for the timeline view
  const eventsByHour = new Map<
    number,
    typeof data.events extends readonly (infer T)[] ? T[] : never
  >();
  for (const event of data.events) {
    const existing = eventsByHour.get(event.hour);
    if (existing) {
      existing.push(event);
    } else {
      eventsByHour.set(event.hour, [event]);
    }
  }

  const sortedHours = Array.from(eventsByHour.keys()).sort((a, b) => a - b);

  return (
    <div>
      <SectionHeader
        title="A Day In The Life"
        description={`Everything X recorded about you on ${data.dateFormatted} — your most data-dense day.`}
        badge={`${data.totalEvents} events`}
      />

      {/* Hero callout */}
      <div className="mb-6 rounded-xl border border-danger/30 bg-danger/5 p-5">
        <p className="text-lg font-bold text-danger">
          {data.totalEvents} events recorded in a single day.
        </p>
        <p className="mt-2 text-sm text-foreground-muted">
          On {data.dateFormatted}, X logged every tweet, DM, login, ad view, and
          AI conversation. Here&apos;s your day reconstructed from{" "}
          {data.activeSources} data sources.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total events"
          value={data.totalEvents}
          variant="danger"
        />
        <StatCard label="Data sources" value={data.activeSources} />
        <StatCard label="Peak hour" value={formatHour(data.peakHour)} />
        <StatCard
          label="Ad impressions"
          value={data.breakdown["ad-impression"]}
          variant={data.breakdown["ad-impression"] > 10 ? "danger" : "default"}
        />
      </div>

      {/* Event type breakdown */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(Object.keys(data.breakdown) as DayEventKind[])
          .filter((k) => data.breakdown[k] > 0)
          .sort((a, b) => data.breakdown[b] - data.breakdown[a])
          .map((kind) => {
            const meta = EVENT_META[kind];
            return (
              <span
                key={kind}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background-raised px-3 py-1 text-xs"
              >
                <span>{meta.emoji}</span>
                <span className="text-foreground-muted">{meta.label}</span>
                <span className="font-mono font-bold text-foreground">
                  {data.breakdown[kind]}
                </span>
              </span>
            );
          })}
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        {sortedHours.map((hour) => {
          const events = eventsByHour.get(hour) ?? [];
          return (
            <div key={hour} className="relative">
              {/* Hour label */}
              <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background py-2">
                <span className="w-16 shrink-0 text-right font-mono text-xs font-bold text-foreground-muted">
                  {formatHour(hour)}
                </span>
                <span className="text-xs text-foreground-muted">
                  {events.length} event{events.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* Events */}
              <div className="ml-[76px] border-l border-border pl-4">
                {events.slice(0, 20).map((event, i) => {
                  const meta = EVENT_META[event.kind];
                  return (
                    <div
                      key={i}
                      className="relative flex items-start gap-3 py-2"
                    >
                      {/* Timeline dot */}
                      <div className="absolute -left-[21px] top-3.5 h-2 w-2 rounded-full border border-border bg-background-raised" />

                      <span className="shrink-0 text-sm">{meta.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`text-xs font-semibold ${meta.color}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-foreground">
                          {event.description}
                        </p>
                        {event.detail && (
                          <p className="mt-0.5 text-xs text-foreground-muted">
                            {event.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {events.length > 20 && (
                  <p className="py-2 text-xs text-foreground-muted">
                    +{events.length - 20} more events this hour
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
