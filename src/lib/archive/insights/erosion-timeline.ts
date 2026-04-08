// ---------------------------------------------------------------------------
// Privacy erosion timeline — how surveillance expanded over time
// ---------------------------------------------------------------------------
//
// Shows the escalating layers of data collection across the user's account
// lifetime. Each "layer" is a new data category that X started collecting,
// visualized as a stacked timeline showing the net tightening over time.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";
import { getYearsOnX } from "@/lib/archive/account-summary";

// --- Types ------------------------------------------------------------------

export interface ErosionLayer {
  /** Human-readable label. */
  readonly label: string;
  /** When X first started collecting this type. Empty string if undated. */
  readonly firstSeen: string;
  /** When the most recent record was collected. Empty string if undated. */
  readonly lastSeen: string;
  /** Total records in this layer. */
  readonly count: number;
  /** Category for grouping/color coding. */
  readonly category:
    | "content"
    | "surveillance"
    | "monetization"
    | "ai"
    | "third-party";
  /** Brief description of what this tracks. */
  readonly description: string;
  /**
   * True when the layer has no per-record timestamps in the archive (e.g.
   * Likes). Undated layers are still shown in the layer list with their
   * count, but they don't claim a position on the timeline and they don't
   * contribute to the firstYear/lastYear span.
   */
  readonly undated: boolean;
}

export interface ErosionMilestone {
  /** "YYYY" format. */
  readonly year: string;
  /** How many data categories were active by this year. */
  readonly activeLayers: number;
  /** New categories that appeared this year. */
  readonly newLayers: readonly string[];
  /** Cumulative data point count by end of this year. */
  readonly cumulativePoints: number;
}

export interface ErosionTimeline {
  /** All data layers, dated layers first (sorted by firstSeen asc). */
  readonly layers: readonly ErosionLayer[];
  /** Year-by-year milestone data for the stacked visualization. */
  readonly milestones: readonly ErosionMilestone[];
  /** Total data categories X is collecting. */
  readonly totalCategories: number;
  /**
   * Canonical "years on X" — derived from account creation date via
   * `getYearsOnX`, NOT from the calendar-year span across data layers.
   * The previous implementation used `lastYear - firstYear + 1`, which
   * disagreed with the rest of the dashboard whenever a layer's first
   * record was from a different year than account creation.
   */
  readonly spanYears: number;
}

// --- Helpers ----------------------------------------------------------------

const TWITTER_EPOCH = Date.UTC(2006, 0, 1);

function earliestAndLatest(
  dates: (string | undefined | null)[],
): { first: Date; last: Date; count: number } | null {
  let min = Infinity;
  let max = -Infinity;
  let count = 0;
  for (const s of dates) {
    if (!s) continue;
    const d = parseDate(s);
    if (!d) continue;
    const t = d.getTime();
    if (t < TWITTER_EPOCH) continue;
    if (t < min) min = t;
    if (t > max) max = t;
    count++;
  }
  if (count === 0) return null;
  return { first: new Date(min), last: new Date(max), count };
}

// --- Main -------------------------------------------------------------------

export function buildErosionTimeline(
  archive: ParsedArchive,
): ErosionTimeline | null {
  const layerConfigs: {
    label: string;
    dates: (string | undefined | null)[];
    category: ErosionLayer["category"];
    description: string;
  }[] = [
    {
      label: "Tweets & replies",
      dates: archive.tweets.map((t) => t.createdAt),
      category: "content",
      description: "Every tweet, reply, and retweet you've ever posted.",
    },
    {
      label: "Direct messages",
      dates: archive.directMessages.flatMap((c) =>
        c.messages.map((m) => m.createdAt),
      ),
      category: "content",
      description: "Private conversations — X stores every message.",
    },
    {
      label: "Likes",
      dates: [], // Likes don't have dates in the archive, use existence
      category: "content",
      description: "Everything you've liked — a detailed preference graph.",
    },
    {
      label: "Login tracking",
      dates: archive.ipAudit.map((e) => e.createdAt),
      category: "surveillance",
      description: "Every IP address and time you accessed your account.",
    },
    {
      label: "Device fingerprinting",
      dates: [
        ...archive.deviceTokens.map((d) => d.createdAt),
        ...archive.niDevices.map((d) => d.createdDate),
        ...archive.keyRegistryDevices.map((d) => d.createdAt),
      ],
      category: "surveillance",
      description:
        "Hardware IDs, push tokens, and user agents from your devices.",
    },
    {
      label: "Ad impressions",
      dates: archive.adImpressions.flatMap((b) =>
        b.impressions.map((i) => i.impressionTime),
      ),
      category: "monetization",
      description: "Every ad shown to you, with full targeting criteria.",
    },
    {
      label: "Ad engagements",
      dates: archive.adEngagements.flatMap((b) =>
        b.engagements.map((e) => e.impressionTime),
      ),
      category: "monetization",
      description: "Ads you interacted with — clicks, likes, replies.",
    },
    {
      label: "Connected apps",
      dates: archive.connectedApps.map((a) => a.approvedAt),
      category: "third-party",
      description: "Third-party apps granted access to your account.",
    },
    {
      label: "Off-platform tracking",
      dates: [
        ...archive.offTwitter.mobileConversionsAttributed.map(
          (e) => e.conversionTime,
        ),
        ...archive.offTwitter.mobileConversionsUnattributed.map(
          (e) => e.conversionTime,
        ),
        ...archive.offTwitter.onlineConversionsAttributed.map(
          (e) => e.conversionTime,
        ),
        ...archive.offTwitter.onlineConversionsUnattributed.map(
          (e) => e.conversionTime,
        ),
      ],
      category: "surveillance",
      description: "Activity tracked outside X — app installs, website visits.",
    },
    {
      label: "Grok AI conversations",
      dates: archive.grokConversations.flatMap((c) =>
        c.messages.map((m) => m.createdAt),
      ),
      category: "ai",
      description: "Every message sent to and received from X's AI.",
    },
    {
      label: "Deleted tweet retention",
      dates: archive.deletedTweets.map((t) => t.createdAt),
      category: "content",
      description: "Tweets you deleted — X kept the full text anyway.",
    },
  ];

  const layers: ErosionLayer[] = [];

  for (const config of layerConfigs) {
    // Likes have no per-record timestamps in the archive. The previous
    // implementation faked `firstSeen = account creation` and `lastSeen =
    // generation date`, which:
    //   1. anchored a "+Likes" marker on the year of account creation in
    //      the chart (a chart claim with no underlying data),
    //   2. polluted spanYears (because the synthetic firstSeen was usually
    //      the earliest of any layer),
    //   3. made the layer card lie about "First seen" / "Last".
    // We now flag Likes as `undated: true` so the layer is still listed
    // (count + description) but doesn't claim a position on the timeline.
    if (config.label === "Likes") {
      if (archive.likes.length > 0) {
        layers.push({
          label: config.label,
          firstSeen: "",
          lastSeen: "",
          count: archive.likes.length,
          category: config.category,
          description: config.description,
          undated: true,
        });
      }
      continue;
    }

    const range = earliestAndLatest(config.dates);
    if (!range) continue;

    layers.push({
      label: config.label,
      firstSeen: range.first.toISOString(),
      lastSeen: range.last.toISOString(),
      count: range.count,
      category: config.category,
      description: config.description,
      undated: false,
    });
  }

  if (layers.length < 2) return null;

  // Sort dated layers by first seen ascending; undated layers go to the end.
  layers.sort((a, b) => {
    if (a.undated && b.undated) return 0;
    if (a.undated) return 1;
    if (b.undated) return -1;
    const aDate = parseDate(a.firstSeen);
    const bDate = parseDate(b.firstSeen);
    if (!aDate || !bDate) return 0;
    return aDate.getTime() - bDate.getTime();
  });

  // Build milestones by year — only dated layers participate.
  const datedLayers = layers.filter((l) => !l.undated);
  if (datedLayers.length === 0) return null;

  const firstDate = parseDate(datedLayers[0]?.firstSeen ?? "");
  const lastDate = parseDate(
    datedLayers[datedLayers.length - 1]?.lastSeen ?? "",
  );
  if (!firstDate || !lastDate) return null;

  const firstYear = firstDate.getFullYear();
  const lastYear = lastDate.getFullYear();
  const milestones: ErosionMilestone[] = [];

  for (let year = firstYear; year <= lastYear; year++) {
    const yearEnd = new Date(year, 11, 31).getTime();
    const activeLayers = datedLayers.filter((l) => {
      const first = parseDate(l.firstSeen);
      return first && first.getTime() <= yearEnd;
    });

    const newThisYear = activeLayers.filter((l) => {
      const first = parseDate(l.firstSeen);
      return first && first.getFullYear() === year;
    });

    const cumulativePoints = activeLayers.reduce((sum, l) => sum + l.count, 0);

    milestones.push({
      year: String(year),
      activeLayers: activeLayers.length,
      newLayers: newThisYear.map((l) => l.label),
      cumulativePoints,
    });
  }

  // Use the canonical "years on X" computation so this surface and the rest
  // of the dashboard agree on a single number. Falls back to the layer-span
  // calculation when account creation date isn't known.
  const canonicalYears = getYearsOnX(archive);
  const spanYears = canonicalYears ?? lastYear - firstYear + 1;

  return {
    layers,
    milestones,
    totalCategories: layers.length,
    spanYears,
  };
}
