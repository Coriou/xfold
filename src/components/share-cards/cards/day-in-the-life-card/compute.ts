import { buildDayInTheLife } from "@/lib/archive/insights/day-in-the-life";
import { formatHour } from "@/lib/format";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface DayInTheLifeCardProps {
  readonly username: string;
  readonly dateFormatted: string;
  readonly totalEvents: number;
  readonly activeSources: number;
  readonly peakHour: string;
  /** Top 6 events for the card timeline */
  readonly highlights: readonly {
    readonly time: string;
    readonly emoji: string;
    readonly text: string;
  }[];
  readonly breakdown: readonly {
    readonly label: string;
    readonly count: number;
  }[];
}

const EVENT_EMOJI: Record<string, string> = {
  tweet: "\uD83D\uDCAC",
  "deleted-tweet": "\uD83D\uDDD1\uFE0F",
  "dm-sent": "\uD83D\uDCE8",
  "dm-received": "\uD83D\uDCE9",
  login: "\uD83D\uDD11",
  "ad-impression": "\uD83D\uDCB0",
  "grok-message": "\uD83E\uDD16",
  like: "\u2764\uFE0F",
  "app-connected": "\uD83D\uDD17",
};

const EVENT_LABELS: Record<string, string> = {
  tweet: "Tweets",
  "deleted-tweet": "Deleted tweets",
  "dm-sent": "DMs sent",
  "dm-received": "DMs received",
  login: "Logins",
  "ad-impression": "Ads shown",
  "grok-message": "Grok messages",
  like: "Likes",
  "app-connected": "Apps connected",
};

export function computeDayInTheLife(
  ctx: ComputeContext,
): DayInTheLifeCardProps | null {
  const data = buildDayInTheLife(ctx.archive);
  if (!data || data.totalEvents < 10) return null;

  // Pick 6 diverse highlights — one from each active kind
  const seenKinds = new Set<string>();
  const highlights: DayInTheLifeCardProps["highlights"][number][] = [];

  for (const event of data.events) {
    if (highlights.length >= 6) break;
    if (seenKinds.has(event.kind)) continue;
    seenKinds.add(event.kind);
    highlights.push({
      time: formatHour(event.hour),
      emoji: EVENT_EMOJI[event.kind] ?? "\uD83D\uDCCC",
      text:
        event.description.length > 50
          ? event.description.slice(0, 49) + "\u2026"
          : event.description,
    });
  }

  // Build breakdown for active types
  const breakdown = (
    Object.keys(data.breakdown) as (keyof typeof data.breakdown)[]
  )
    .filter((k) => data.breakdown[k] > 0)
    .sort((a, b) => data.breakdown[b] - data.breakdown[a])
    .slice(0, 5)
    .map((k) => ({
      label: EVENT_LABELS[k] ?? k,
      count: data.breakdown[k],
    }));

  return {
    username: ctx.archive.meta.username,
    dateFormatted: data.dateFormatted,
    totalEvents: data.totalEvents,
    activeSources: data.activeSources,
    peakHour: formatHour(data.peakHour),
    highlights,
    breakdown,
  };
}

export function computeDayInTheLifeShareability(
  props: DayInTheLifeCardProps,
): ShareabilityScore {
  return {
    magnitude: Math.min(100, Math.sqrt(props.totalEvents) * 8),
    specificity: Math.min(100, 70 + props.activeSources * 5),
    uniqueness: 85, // "One day reconstructed" is very specific
  };
}
