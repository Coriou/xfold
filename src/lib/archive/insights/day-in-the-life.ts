// ---------------------------------------------------------------------------
// Day In The Life — reconstruct everything X recorded on a single day
// ---------------------------------------------------------------------------
//
// Pick the most data-dense day from the archive and reconstruct a timeline
// of every event X recorded: tweets, DMs, logins, ad impressions, Grok
// messages, deletions. Makes surveillance tangible.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";

// --- Types ------------------------------------------------------------------

export type DayEventKind =
  | "tweet"
  | "deleted-tweet"
  | "like"
  | "dm-sent"
  | "dm-received"
  | "login"
  | "ad-impression"
  | "grok-message"
  | "app-connected";

export interface DayEvent {
  /** ISO timestamp of the event. */
  readonly time: string;
  /** Hour (0-23) for sorting within the day. */
  readonly hour: number;
  /** What kind of event. */
  readonly kind: DayEventKind;
  /** Human-readable description (truncated). */
  readonly description: string;
  /** Optional detail line (e.g. advertiser name, IP address). */
  readonly detail: string | null;
}

export interface DayInTheLife {
  /** The date chosen (YYYY-MM-DD). */
  readonly date: string;
  /** Formatted date for display ("March 14, 2024"). */
  readonly dateFormatted: string;
  /** All events on that day, sorted chronologically. */
  readonly events: readonly DayEvent[];
  /** Event counts by kind. */
  readonly breakdown: Readonly<Record<DayEventKind, number>>;
  /** Total events X recorded on this day. */
  readonly totalEvents: number;
  /** The busiest hour of the day. */
  readonly peakHour: number;
  /** Number of different data categories active this day. */
  readonly activeSources: number;
}

// --- Helpers ----------------------------------------------------------------

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "\u2026";
}

interface RawEvent {
  readonly dateKey: string;
  readonly time: string;
  readonly hour: number;
  readonly kind: DayEventKind;
  readonly description: string;
  readonly detail: string | null;
}

// --- Main -------------------------------------------------------------------

export function buildDayInTheLife(archive: ParsedArchive): DayInTheLife | null {
  // Collect ALL events with dates
  const allEvents: RawEvent[] = [];

  // Tweets
  for (const t of archive.tweets) {
    const d = parseDate(t.createdAt);
    if (!d) continue;
    allEvents.push({
      dateKey: toDateKey(d),
      time: t.createdAt,
      hour: d.getHours(),
      kind: "tweet",
      description: truncate(t.fullText, 80),
      detail: t.source ? `via ${t.source}` : null,
    });
  }

  // Deleted tweets
  for (const t of archive.deletedTweets) {
    const d = parseDate(t.createdAt);
    if (!d) continue;
    allEvents.push({
      dateKey: toDateKey(d),
      time: t.createdAt,
      hour: d.getHours(),
      kind: "deleted-tweet",
      description: truncate(t.fullText, 80),
      detail: "Later deleted — X kept it",
    });
  }

  // DMs
  for (const convo of archive.directMessages) {
    for (const msg of convo.messages) {
      const d = parseDate(msg.createdAt);
      if (!d) continue;
      const isSent = msg.senderId === archive.account?.accountId;
      allEvents.push({
        dateKey: toDateKey(d),
        time: msg.createdAt,
        hour: d.getHours(),
        kind: isSent ? "dm-sent" : "dm-received",
        description: truncate(msg.text, 80),
        detail: null,
      });
    }
  }

  // Login IPs
  for (const entry of archive.ipAudit) {
    const d = parseDate(entry.createdAt);
    if (!d) continue;
    allEvents.push({
      dateKey: toDateKey(d),
      time: entry.createdAt,
      hour: d.getHours(),
      kind: "login",
      description: `Login recorded from ${entry.loginIp}`,
      detail: null,
    });
  }

  // Ad impressions
  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      const d = parseDate(imp.impressionTime);
      if (!d) continue;
      const topTarget = imp.targetingCriteria[0];
      allEvents.push({
        dateKey: toDateKey(d),
        time: imp.impressionTime,
        hour: d.getHours(),
        kind: "ad-impression",
        description: `Ad from ${imp.advertiserName}`,
        detail: topTarget
          ? `Targeted: ${topTarget.targetingType} = ${topTarget.targetingValue ?? "unknown"}`
          : null,
      });
    }
  }

  // Grok messages
  for (const convo of archive.grokConversations) {
    for (const msg of convo.messages) {
      if (msg.sender !== "user") continue;
      const d = parseDate(msg.createdAt);
      if (!d) continue;
      allEvents.push({
        dateKey: toDateKey(d),
        time: msg.createdAt,
        hour: d.getHours(),
        kind: "grok-message",
        description: truncate(msg.message, 80),
        detail: "Stored with your real identity",
      });
    }
  }

  if (allEvents.length < 10) return null;

  // Find the day with the most events
  const countByDay = new Map<string, number>();
  for (const e of allEvents) {
    countByDay.set(e.dateKey, (countByDay.get(e.dateKey) ?? 0) + 1);
  }

  // Pick the densest day (but not one with >500 events — that's likely a data dump)
  let bestDay = "";
  let bestCount = 0;
  for (const [day, count] of countByDay) {
    if (count > bestCount && count <= 500) {
      bestDay = day;
      bestCount = count;
    }
  }

  // Fallback: if all days have >500 events, pick the densest anyway
  if (!bestDay) {
    for (const [day, count] of countByDay) {
      if (count > bestCount) {
        bestDay = day;
        bestCount = count;
      }
    }
  }

  if (!bestDay) return null;

  // Filter events for that day and sort by time
  const dayEvents = allEvents
    .filter((e) => e.dateKey === bestDay)
    .sort((a, b) => a.time.localeCompare(b.time))
    .map(
      (e): DayEvent => ({
        time: e.time,
        hour: e.hour,
        kind: e.kind,
        description: e.description,
        detail: e.detail,
      }),
    );

  // Build breakdown
  const breakdown: Record<DayEventKind, number> = {
    tweet: 0,
    "deleted-tweet": 0,
    like: 0,
    "dm-sent": 0,
    "dm-received": 0,
    login: 0,
    "ad-impression": 0,
    "grok-message": 0,
    "app-connected": 0,
  };

  for (const e of dayEvents) {
    breakdown[e.kind]++;
  }

  // Find peak hour
  const hourCounts = new Map<number, number>();
  for (const e of dayEvents) {
    hourCounts.set(e.hour, (hourCounts.get(e.hour) ?? 0) + 1);
  }
  let peakHour = 0;
  let peakHourCount = 0;
  for (const [hour, count] of hourCounts) {
    if (count > peakHourCount) {
      peakHour = hour;
      peakHourCount = count;
    }
  }

  // Count active sources
  const activeSources = Object.values(breakdown).filter((c) => c > 0).length;

  // Format date
  const d = parseDate(bestDay);
  const dateFormatted = d
    ? d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : bestDay;

  return {
    date: bestDay,
    dateFormatted,
    events: dayEvents.slice(0, 200), // Cap at 200 for rendering sanity
    breakdown,
    totalEvents: dayEvents.length,
    peakHour,
    activeSources,
  };
}
