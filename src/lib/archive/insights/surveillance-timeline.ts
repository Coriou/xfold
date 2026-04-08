// ---------------------------------------------------------------------------
// Surveillance Timeline — milestones of X's data collection
// ---------------------------------------------------------------------------
//
// Builds a chronological timeline of when X started collecting each type
// of data about the user. Each milestone represents the earliest evidence
// of a specific surveillance category — showing the accumulation of
// tracking over months and years.
//
// This answers the question: "When did X start watching, and what did it
// collect along the way?"
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";

// --- Types ------------------------------------------------------------------

export interface SurveillanceMilestone {
  /** When this data collection started (ISO string for display). */
  readonly date: string;
  /** Parsed timestamp for sorting. */
  readonly timestamp: number;
  /** Icon emoji for display. */
  readonly icon: string;
  /** Short label for the milestone. */
  readonly label: string;
  /** One-line description of what started being collected. */
  readonly description: string;
  /** Data source key. */
  readonly source: string;
}

export interface SurveillanceTimeline {
  /** All milestones, sorted from earliest to latest. */
  readonly milestones: readonly SurveillanceMilestone[];
  /** Duration of surveillance in days. */
  readonly totalDays: number;
  /** Human-readable duration label. */
  readonly durationLabel: string;
  /** First and last dates for display. */
  readonly firstDate: string;
  readonly lastDate: string;
}

// --- Helpers ----------------------------------------------------------------

function earliest(
  dates: readonly string[],
): { date: string; ts: number } | null {
  let best: { date: string; ts: number } | null = null;
  for (const raw of dates) {
    const d = parseDate(raw);
    if (!d) continue;
    const ts = d.getTime();
    if (!best || ts < best.ts) best = { date: raw, ts };
  }
  return best;
}

function formatDuration(days: number): string {
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "month" : "months"}`);
  if (parts.length === 0) parts.push(`${days} days`);
  return parts.join(", ");
}

// --- Main -------------------------------------------------------------------

export function buildSurveillanceTimeline(
  archive: ParsedArchive,
): SurveillanceTimeline | null {
  const milestones: SurveillanceMilestone[] = [];

  // Account creation — the beginning
  const accountCreated = archive.account?.createdAt;
  if (accountCreated) {
    const d = parseDate(accountCreated);
    if (d) {
      milestones.push({
        date: accountCreated,
        timestamp: d.getTime(),
        icon: "📍",
        label: "Account created",
        description: `First IP logged${archive.account?.creationIp ? ` (${archive.account.creationIp})` : ""}.`,
        source: "account",
      });
    }
  }

  // First tweet
  if (archive.tweets.length > 0) {
    const e = earliest(archive.tweets.map((t) => t.createdAt));
    if (e) {
      milestones.push({
        date: e.date,
        timestamp: e.ts,
        icon: "💬",
        label: "First tweet",
        description: `Tweet collection begins. ${archive.tweets.length.toLocaleString()} tweets to date.`,
        source: "tweets",
      });
    }
  }

  // First ad impression
  {
    const allDates: string[] = [];
    for (const batch of archive.adImpressions) {
      for (const imp of batch.impressions) {
        allDates.push(imp.impressionTime);
      }
    }
    const e = earliest(allDates);
    if (e) {
      milestones.push({
        date: e.date,
        timestamp: e.ts,
        icon: "🎯",
        label: "First ad served",
        description: "Advertisers start targeting you.",
        source: "adImpressions",
      });
    }
  }

  // First DM
  {
    const allDates: string[] = [];
    for (const c of archive.directMessages) {
      for (const m of c.messages) allDates.push(m.createdAt);
    }
    for (const c of archive.groupDirectMessages) {
      for (const m of c.messages) allDates.push(m.createdAt);
    }
    const e = earliest(allDates);
    if (e) {
      const total =
        archive.directMessages.reduce((n, c) => n + c.messages.length, 0) +
        archive.groupDirectMessages.reduce((n, c) => n + c.messages.length, 0);
      milestones.push({
        date: e.date,
        timestamp: e.ts,
        icon: "✉️",
        label: "First private message",
        description: `X starts storing DMs. ${total.toLocaleString()} messages to date.`,
        source: "directMessages",
      });
    }
  }

  // First IP audit entry
  if (archive.ipAudit.length > 0) {
    const e = earliest(archive.ipAudit.map((i) => i.createdAt));
    if (e) {
      const uniqueIps = new Set(archive.ipAudit.map((i) => i.loginIp)).size;
      milestones.push({
        date: e.date,
        timestamp: e.ts,
        icon: "🌐",
        label: "IP tracking begins",
        description: `Login IPs recorded. ${uniqueIps} unique addresses logged.`,
        source: "ipAudit",
      });
    }
  }

  // First device fingerprint — sum all three identifier types in the
  // headline since this is a "device-related identifiers" milestone, not
  // a hardware-only count, and the source list explicitly enumerates them.
  {
    const dates: string[] = [
      ...archive.deviceTokens.map((d) => d.createdAt),
      ...archive.niDevices.map((d) => d.createdDate),
      ...archive.keyRegistryDevices.map((d) => d.createdAt),
    ];
    const e = earliest(dates);
    if (e) {
      const total =
        archive.deviceTokens.length +
        archive.niDevices.length +
        archive.keyRegistryDevices.length;
      milestones.push({
        date: e.date,
        timestamp: e.ts,
        icon: "📱",
        label: "Device fingerprinting",
        description: `${total} device identifiers tracked across app tokens, push devices, and encryption keys.`,
        source: "devices",
      });
    }
  }

  // Contacts upload
  if (archive.contacts.length > 0) {
    const dates = archive.contacts
      .map((c) => c.importedAt)
      .filter((d): d is string => d !== null);
    const e = earliest(dates);
    if (e) {
      milestones.push({
        date: e.date,
        timestamp: e.ts,
        icon: "📇",
        label: "Contacts synced",
        description: `${archive.contacts.length.toLocaleString()} people from your address book stored.`,
        source: "contacts",
      });
    }
  }

  // First connected app
  if (archive.connectedApps.length > 0) {
    const e = earliest(archive.connectedApps.map((a) => a.approvedAt));
    if (e) {
      milestones.push({
        date: e.date,
        timestamp: e.ts,
        icon: "🔑",
        label: "First third-party app",
        description: `Third-party access begins. ${archive.connectedApps.length} apps connected.`,
        source: "connectedApps",
      });
    }
  }

  // First Grok conversation
  {
    const dates: string[] = [];
    for (const c of archive.grokConversations) {
      for (const m of c.messages) dates.push(m.createdAt);
    }
    const e = earliest(dates);
    if (e) {
      milestones.push({
        date: e.date,
        timestamp: e.ts,
        icon: "🤖",
        label: "First Grok conversation",
        description: `AI has your prompts. ${archive.grokConversations.length} conversations stored.`,
        source: "grokConversations",
      });
    }
  }

  // First deleted tweet (earliest created, not deleted)
  if (archive.deletedTweets.length > 0) {
    const e = earliest(archive.deletedTweets.map((t) => t.createdAt));
    if (e) {
      milestones.push({
        date: e.date,
        timestamp: e.ts,
        icon: "🗑️",
        label: "First deleted tweet (kept)",
        description: `${archive.deletedTweets.length.toLocaleString()} deleted tweets — X still has them.`,
        source: "deletedTweets",
      });
    }
  }

  // Off-Twitter tracking
  {
    const dates: string[] = [
      ...archive.offTwitter.mobileConversionsAttributed.map(
        (c) => c.conversionTime,
      ),
      ...archive.offTwitter.mobileConversionsUnattributed.map(
        (c) => c.conversionTime,
      ),
      ...archive.offTwitter.onlineConversionsAttributed.map(
        (c) => c.conversionTime,
      ),
      ...archive.offTwitter.onlineConversionsUnattributed.map(
        (c) => c.conversionTime,
      ),
    ];
    const e = earliest(dates);
    if (e) {
      milestones.push({
        date: e.date,
        timestamp: e.ts,
        icon: "👁️",
        label: "Off-platform tracking begins",
        description: "X starts tracking your activity outside the app.",
        source: "offTwitter",
      });
    }
  }

  if (milestones.length < 2) return null;

  milestones.sort((a, b) => a.timestamp - b.timestamp);

  const firstMs = milestones[0];
  const lastMs = milestones[milestones.length - 1];
  if (!firstMs || !lastMs) return null;

  const totalDays = Math.max(
    1,
    Math.floor((lastMs.timestamp - firstMs.timestamp) / (1000 * 60 * 60 * 24)),
  );

  // Extend to "now" for the duration label
  const daysToNow = Math.max(
    totalDays,
    Math.floor((Date.now() - firstMs.timestamp) / (1000 * 60 * 60 * 24)),
  );

  return {
    milestones,
    totalDays: daysToNow,
    durationLabel: formatDuration(daysToNow),
    firstDate: firstMs.date,
    lastDate: lastMs.date,
  };
}
