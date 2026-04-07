// ---------------------------------------------------------------------------
// X's Version vs Reality — side-by-side comparison of what X shows vs truth
// ---------------------------------------------------------------------------
//
// The single clearest value proposition: a direct comparison showing what X's
// built-in archive viewer reveals versus what's actually in the archive.
// Each row is a data category with "What X shows" vs "What's really there".
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { buildZombieInterests } from "./zombie-interests";

// --- Types ------------------------------------------------------------------

export type ComparisonSeverity = "critical" | "warning" | "info";

export interface ComparisonRow {
  /** Data category name. */
  readonly category: string;
  /** What X's built-in viewer shows (or claims). */
  readonly xVersion: string;
  /** What's actually in the archive once you dig. */
  readonly reality: string;
  /** How much worse is reality than X's version? */
  readonly severity: ComparisonSeverity;
  /** Section to navigate to for drill-down. */
  readonly sectionId: string;
  /** A multiplier: "3.2× more data" or similar. */
  readonly multiplier: string | null;
}

export interface XVsReality {
  /** All comparison rows, ordered by severity. */
  readonly rows: readonly ComparisonRow[];
  /** How many categories have critical discrepancy. */
  readonly criticalCount: number;
  /** Total rows generated. */
  readonly totalRows: number;
  /** Headline summarizing the gap. */
  readonly headline: string;
}

// --- Row builders -----------------------------------------------------------

function compareInterests(archive: ParsedArchive): ComparisonRow | null {
  const p = archive.personalization;
  if (!p || p.interests.length === 0) return null;

  const active = p.interests.filter((i) => !i.isDisabled).length;
  const disabled = p.interests.filter((i) => i.isDisabled).length;
  const partners = p.partnerInterests.length;

  const total = p.interests.length + partners;

  if (total < 10) return null;

  return {
    category: "Your interests",
    xVersion: `${active} interests you can see and toggle`,
    reality: `${total} total: ${active} active + ${disabled} "disabled" + ${partners} from data brokers`,
    severity: partners > 0 || disabled > 5 ? "critical" : "warning",
    sectionId: "interests",
    multiplier:
      total > active * 1.5
        ? `${(total / Math.max(active, 1)).toFixed(1)}× more`
        : null,
  };
}

function compareDeletedTweets(archive: ParsedArchive): ComparisonRow | null {
  if (archive.deletedTweets.length === 0) return null;

  const active = archive.tweets.length;
  const deleted = archive.deletedTweets.length;

  return {
    category: "Your tweets",
    xVersion: `${active.toLocaleString()} tweets in your timeline`,
    reality: `${(active + deleted).toLocaleString()} total — ${deleted.toLocaleString()} you deleted are still stored`,
    severity: deleted > 50 ? "critical" : "warning",
    sectionId: "deleted-tweets",
    multiplier:
      deleted > 0
        ? `+${Math.round((deleted / Math.max(active, 1)) * 100)}% hidden`
        : null,
  };
}

function compareDms(archive: ParsedArchive): ComparisonRow | null {
  const totalMessages = archive.directMessages.reduce(
    (s, c) => s + c.messages.length,
    0,
  );
  if (totalMessages === 0) return null;

  const convos = archive.directMessages.length;

  return {
    category: "Direct messages",
    xVersion: `${convos} conversations you can scroll through`,
    reality: `${totalMessages.toLocaleString()} messages stored — including metadata, reactions, and deleted messages`,
    severity: totalMessages > 500 ? "warning" : "info",
    sectionId: "dms",
    multiplier: null,
  };
}

function compareAds(archive: ParsedArchive): ComparisonRow | null {
  const totalImpressions = archive.adImpressions.reduce(
    (s, b) => s + b.impressions.length,
    0,
  );
  if (totalImpressions === 0) return null;

  const advertisers = new Set<string>();
  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      advertisers.add(imp.advertiserName);
    }
  }
  for (const batch of archive.adEngagements) {
    for (const eng of batch.engagements) {
      advertisers.add(eng.advertiserName);
    }
  }

  const targetingTypes = new Set<string>();
  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      for (const tc of imp.targetingCriteria) {
        targetingTypes.add(tc.targetingType);
      }
    }
  }

  return {
    category: "Ad targeting",
    xVersion: `"You were shown some ads"`,
    reality: `${advertisers.size} companies, ${totalImpressions.toLocaleString()} impressions, ${targetingTypes.size} targeting methods`,
    severity: advertisers.size > 50 ? "critical" : "warning",
    sectionId: "ad-targeting",
    multiplier: null,
  };
}

function compareDeviceTracking(archive: ParsedArchive): ComparisonRow | null {
  const uniqueIps = new Set(archive.ipAudit.map((e) => e.loginIp)).size;
  const deviceCount =
    archive.deviceTokens.length +
    archive.niDevices.length +
    archive.keyRegistryDevices.length;

  if (uniqueIps < 3 && deviceCount < 2) return null;

  return {
    category: "Device & location tracking",
    xVersion: `"Login history" with dates`,
    reality: `${uniqueIps} unique IPs, ${deviceCount} fingerprinted devices, ${archive.ipAudit.length} login events with full detail`,
    severity: uniqueIps > 10 ? "critical" : "warning",
    sectionId: "ip-analysis",
    multiplier: null,
  };
}

function compareContacts(archive: ParsedArchive): ComparisonRow | null {
  if (archive.contacts.length === 0) return null;

  const emails = archive.contacts.reduce((s, c) => s + c.emails.length, 0);
  const phones = archive.contacts.reduce(
    (s, c) => s + c.phoneNumbers.length,
    0,
  );

  return {
    category: "Uploaded contacts",
    xVersion: `Not shown in X's viewer at all`,
    reality: `${archive.contacts.length} contacts: ${emails} emails + ${phones} phone numbers from people who never consented`,
    severity: "critical",
    sectionId: "contacts",
    multiplier: null,
  };
}

function compareGrok(archive: ParsedArchive): ComparisonRow | null {
  if (archive.grokConversations.length === 0) return null;

  const totalMessages = archive.grokConversations.reduce(
    (s, c) => s + c.messages.length,
    0,
  );
  const userMessages = archive.grokConversations.reduce(
    (s, c) => s + c.messages.filter((m) => m.sender === "user").length,
    0,
  );

  return {
    category: "Grok AI conversations",
    xVersion: `Shown as simple chat history`,
    reality: `${totalMessages} messages across ${archive.grokConversations.length} conversations — all tied to your real identity and ad profile`,
    severity: userMessages > 20 ? "critical" : "warning",
    sectionId: "grok",
    multiplier: null,
  };
}

function compareOffPlatform(archive: ParsedArchive): ComparisonRow | null {
  const ot = archive.offTwitter;
  const total =
    ot.mobileConversionsAttributed.length +
    ot.mobileConversionsUnattributed.length +
    ot.onlineConversionsAttributed.length +
    ot.onlineConversionsUnattributed.length;

  if (total === 0 && ot.inferredApps.length === 0) return null;

  return {
    category: "Off-platform tracking",
    xVersion: `Not shown in X's viewer`,
    reality: `${total} tracked events off X + ${ot.inferredApps.length} apps X thinks are on your devices`,
    severity: total > 10 ? "critical" : "warning",
    sectionId: "off-twitter",
    multiplier: null,
  };
}

function compareZombieInterests(archive: ParsedArchive): ComparisonRow | null {
  const zombies = buildZombieInterests(archive);
  if (!zombies || zombies.zombieCount === 0) return null;

  return {
    category: "Disabled preferences",
    xVersion: `"Your preferences have been updated"`,
    reality: `${zombies.zombieCount} "disabled" interests still served ${zombies.totalZombieImpressions.toLocaleString()} ads`,
    severity: "critical",
    sectionId: "interests",
    multiplier: null,
  };
}

function compareConnectedApps(archive: ParsedArchive): ComparisonRow | null {
  if (archive.connectedApps.length < 2) return null;

  const writeApps = archive.connectedApps.filter((a) =>
    a.permissions.some(
      (p) =>
        p.toLowerCase().includes("write") ||
        p.toLowerCase().includes("direct message"),
    ),
  );

  if (writeApps.length === 0) return null;

  return {
    category: "Connected apps",
    xVersion: `${archive.connectedApps.length} apps listed in settings`,
    reality: `${writeApps.length} can still post tweets or read DMs on your behalf — including stale ones`,
    severity: writeApps.length > 1 ? "critical" : "warning",
    sectionId: "connected-apps",
    multiplier: null,
  };
}

// --- Main -------------------------------------------------------------------

export function buildXVsReality(archive: ParsedArchive): XVsReality | null {
  const builders = [
    compareDeletedTweets,
    compareInterests,
    compareZombieInterests,
    compareContacts,
    compareAds,
    compareOffPlatform,
    compareGrok,
    compareDeviceTracking,
    compareDms,
    compareConnectedApps,
  ];

  const rows: ComparisonRow[] = [];
  for (const builder of builders) {
    const row = builder(archive);
    if (row) rows.push(row);
  }

  if (rows.length < 2) return null;

  // Sort by severity: critical first, then warning, then info
  const severityOrder: Record<ComparisonSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  rows.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const criticalCount = rows.filter((r) => r.severity === "critical").length;

  const headline =
    criticalCount > 3
      ? `X's viewer hides the truth about ${criticalCount} data categories.`
      : criticalCount > 0
        ? `${criticalCount} critical discrepancies between what X shows you and what's actually stored.`
        : `${rows.length} differences between X's version and reality.`;

  return {
    rows,
    criticalCount,
    totalRows: rows.length,
    headline,
  };
}
