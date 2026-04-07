// ---------------------------------------------------------------------------
// Plain-English Summary — "What X knows about you, in one page"
// ---------------------------------------------------------------------------
//
// Instead of dashboards and numbers, this generates human-readable sentences
// about the user's privacy exposure. Each sentence cross-references multiple
// data sources and is ranked by severity so the top 5-7 can power the most
// shareable card in the system.
//
// The framing is conversational and damning: "X kept 847 tweets you deleted"
// is more powerful than "847 deleted tweets detected".
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";
import { buildZombieInterests } from "./zombie-interests";
import { buildDeletionLie } from "./deletion-lie";

// --- Types ------------------------------------------------------------------

export interface PlainEnglishLine {
  /** The sentence itself, ready to display. */
  readonly text: string;
  /** Severity for visual treatment (color / icon). */
  readonly severity: "info" | "warning" | "critical";
  /** 0–100 shareability weight — higher lines float to the top. */
  readonly weight: number;
  /** Which data sources were cross-referenced for this line. */
  readonly sources: readonly string[];
}

export interface PlainEnglishSummary {
  /** All generated lines, sorted by weight descending. */
  readonly lines: readonly PlainEnglishLine[];
  /** The single most impactful line. */
  readonly headline: PlainEnglishLine | null;
  /** Total data sources crossed (for the footer). */
  readonly sourcesUsed: number;
}

// --- Helpers ----------------------------------------------------------------

function accountAgeDays(archive: ParsedArchive): number {
  const created = archive.account?.createdAt;
  if (!created) return 0;
  const d = parseDate(created);
  if (!d) return 0;
  const ms = Date.now() - d.getTime();
  return ms > 0 ? Math.floor(ms / (1000 * 60 * 60 * 24)) : 0;
}

function ageLabel(days: number): string {
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years > 0 && months > 0) return `${years} years and ${months} months`;
  if (years > 0) return `${years} years`;
  if (months > 0) return `${months} months`;
  return `${days} days`;
}

function totalDmMessages(archive: ParsedArchive): number {
  let n = 0;
  for (const c of archive.directMessages) n += c.messages.length;
  for (const c of archive.groupDirectMessages) n += c.messages.length;
  return n;
}

function uniqueAdAdvertisers(archive: ParsedArchive): number {
  const names = new Set<string>();
  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) names.add(imp.advertiserName);
  }
  for (const batch of archive.adEngagements) {
    for (const eng of batch.engagements) names.add(eng.advertiserName);
  }
  return names.size;
}

function totalAdImpressions(archive: ParsedArchive): number {
  let n = 0;
  for (const batch of archive.adImpressions) n += batch.impressions.length;
  return n;
}

function uniqueIpCount(archive: ParsedArchive): number {
  return new Set(archive.ipAudit.map((e) => e.loginIp)).size;
}

function totalDevices(archive: ParsedArchive): number {
  return (
    archive.deviceTokens.length +
    archive.niDevices.length +
    archive.keyRegistryDevices.length
  );
}

// --- Sentence generators (each returns a line or null) ----------------------

function lineSurveillancePeriod(
  archive: ParsedArchive,
): PlainEnglishLine | null {
  const days = accountAgeDays(archive);
  if (days < 30) return null;
  return {
    text: `X has been collecting data on you for ${ageLabel(days)}.`,
    severity: days > 365 * 5 ? "critical" : days > 365 * 2 ? "warning" : "info",
    weight: Math.min(90, 40 + Math.floor(days / 365) * 8),
    sources: ["account"],
  };
}

function lineDeletedTweets(archive: ParsedArchive): PlainEnglishLine | null {
  const count = archive.deletedTweets.length;
  if (count === 0) return null;
  return {
    text: `X kept ${count.toLocaleString()} tweets you deleted. You deleted them — X didn't.`,
    severity: "critical",
    weight: Math.min(95, 60 + Math.floor(count / 50) * 5),
    sources: ["deletedTweets"],
  };
}

function lineZombieInterests(archive: ParsedArchive): PlainEnglishLine | null {
  const zombies = buildZombieInterests(archive);
  if (!zombies || zombies.zombieCount === 0) return null;
  return {
    text: `You disabled ${zombies.totalDisabled} interests. ${zombies.zombieCount} of them are still used to target you with ads.`,
    severity: "critical",
    weight: Math.min(95, 65 + zombies.zombieCount * 3),
    sources: ["personalization", "adImpressions"],
  };
}

function lineDeletionLie(archive: ParsedArchive): PlainEnglishLine | null {
  const stats = buildDeletionLie(archive);
  if (!stats || stats.survivingTopicCount === 0) return null;
  const line =
    stats.fullyErasedButProfiled > 0
      ? `${stats.survivingTopicCount} topics from your deleted tweets are still in your interest profile. ${stats.fullyErasedButProfiled} exist only in deleted content.`
      : `${stats.survivingTopicCount} topics from your deleted tweets are still in your ad-targeting profile.`;
  return {
    text: line,
    severity: "critical",
    weight: Math.min(90, 55 + stats.survivingTopicCount * 4),
    sources: ["deletedTweets", "personalization", "adImpressions"],
  };
}

function lineAdvertiserCount(archive: ParsedArchive): PlainEnglishLine | null {
  const count = uniqueAdAdvertisers(archive);
  if (count === 0) return null;
  const impressions = totalAdImpressions(archive);
  return {
    text: `${count.toLocaleString()} companies paid to target you. They showed you ${impressions.toLocaleString()} ads. You got $0.`,
    severity: count > 200 ? "critical" : count > 50 ? "warning" : "info",
    weight: Math.min(92, 50 + Math.floor(count / 30) * 5),
    sources: ["adImpressions", "adEngagements"],
  };
}

function lineHiddenDemographics(
  archive: ParsedArchive,
): PlainEnglishLine | null {
  const hiddenTypes = new Set([
    "Income range",
    "Job title",
    "Education",
    "Relationship status",
    "Homeownership",
    "Behaviors",
    "Purchase behavior",
    "Life events",
  ]);
  const found = new Set<string>();
  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      for (const crit of imp.targetingCriteria) {
        if (hiddenTypes.has(crit.targetingType)) found.add(crit.targetingType);
      }
    }
  }
  if (found.size === 0) return null;
  const examples = [...found].slice(0, 3).map((s) => s.toLowerCase());
  return {
    text: `X inferred your ${examples.join(", ")}${found.size > 3 ? ` and ${found.size - 3} more categories` : ""} — none of which you ever shared.`,
    severity: "critical",
    weight: Math.min(93, 60 + found.size * 6),
    sources: ["adImpressions"],
  };
}

function lineContacts(archive: ParsedArchive): PlainEnglishLine | null {
  const count = archive.contacts.length;
  if (count === 0) return null;
  return {
    text: `X stored ${count.toLocaleString()} contacts from your address book. Those people never consented.`,
    severity: "critical",
    weight: Math.min(90, 55 + Math.floor(count / 100) * 5),
    sources: ["contacts"],
  };
}

function lineIpTracking(archive: ParsedArchive): PlainEnglishLine | null {
  const ips = uniqueIpCount(archive);
  if (ips < 3) return null;
  return {
    text: `X logged your location from ${ips} different network addresses.`,
    severity: ips > 30 ? "critical" : ips > 10 ? "warning" : "info",
    weight: Math.min(80, 40 + ips * 2),
    sources: ["ipAudit"],
  };
}

function lineDeviceFingerprints(
  archive: ParsedArchive,
): PlainEnglishLine | null {
  const count = totalDevices(archive);
  if (count < 2) return null;
  return {
    text: `X fingerprinted ${count} of your devices — phones, browsers, and app tokens.`,
    severity: count > 10 ? "critical" : count > 5 ? "warning" : "info",
    weight: Math.min(75, 35 + count * 4),
    sources: ["deviceTokens", "niDevices", "keyRegistryDevices"],
  };
}

function lineInterests(archive: ParsedArchive): PlainEnglishLine | null {
  const all = archive.personalization?.interests ?? [];
  if (all.length < 5) return null;
  return {
    text: `X built a profile of ${all.length} interests about you — most of which you never confirmed.`,
    severity:
      all.length > 200 ? "critical" : all.length > 50 ? "warning" : "info",
    weight: Math.min(80, 40 + Math.floor(all.length / 20) * 3),
    sources: ["personalization"],
  };
}

function lineDms(archive: ParsedArchive): PlainEnglishLine | null {
  const count = totalDmMessages(archive);
  if (count < 10) return null;
  return {
    text: `X stored ${count.toLocaleString()} of your private messages. Every word you thought was private.`,
    severity: count > 1000 ? "critical" : count > 100 ? "warning" : "info",
    weight: Math.min(85, 45 + Math.floor(count / 100) * 5),
    sources: ["directMessages", "groupDirectMessages"],
  };
}

function lineGrok(archive: ParsedArchive): PlainEnglishLine | null {
  const convos = archive.grokConversations.length;
  if (convos === 0) return null;
  let userMessages = 0;
  for (const c of archive.grokConversations) {
    for (const m of c.messages) {
      if (m.sender === "user") userMessages++;
    }
  }
  return {
    text: `You sent ${userMessages} messages to X's AI. X stored every prompt and response.`,
    severity: userMessages > 50 ? "critical" : "warning",
    weight: Math.min(88, 55 + Math.floor(userMessages / 10) * 5),
    sources: ["grokConversations"],
  };
}

function lineConnectedApps(archive: ParsedArchive): PlainEnglishLine | null {
  const apps = archive.connectedApps;
  if (apps.length < 2) return null;
  const writeApps = apps.filter((a) =>
    a.permissions.some(
      (p) =>
        p.toLowerCase().includes("write") || p.toLowerCase().includes("dm"),
    ),
  );
  if (writeApps.length > 0) {
    return {
      text: `${apps.length} third-party apps have access to your account. ${writeApps.length} can post or read DMs on your behalf.`,
      severity: writeApps.length > 3 ? "critical" : "warning",
      weight: Math.min(78, 40 + apps.length * 3 + writeApps.length * 8),
      sources: ["connectedApps"],
    };
  }
  return {
    text: `${apps.length} third-party apps have access to your account — some you may have forgotten.`,
    severity: "info",
    weight: Math.min(60, 30 + apps.length * 3),
    sources: ["connectedApps"],
  };
}

function lineOffTwitter(archive: ParsedArchive): PlainEnglishLine | null {
  const ot = archive.offTwitter;
  const total =
    ot.mobileConversionsAttributed.length +
    ot.mobileConversionsUnattributed.length +
    ot.onlineConversionsAttributed.length +
    ot.onlineConversionsUnattributed.length;
  if (total === 0) return null;
  return {
    text: `X tracked ${total} of your actions outside the app — website visits, app installs, purchases.`,
    severity: total > 20 ? "critical" : "warning",
    weight: Math.min(88, 55 + Math.floor(total / 5) * 5),
    sources: ["offTwitter"],
  };
}

function lineSuspensions(archive: ParsedArchive): PlainEnglishLine | null {
  if (archive.suspensions.length === 0) return null;
  return {
    text: `Your account was actioned ${archive.suspensions.length} time${archive.suspensions.length === 1 ? "" : "s"} — that's part of your permanent record too.`,
    severity: "warning",
    weight: 55,
    sources: ["suspensions"],
  };
}

// --- Main builder -----------------------------------------------------------

export function buildPlainEnglishSummary(
  archive: ParsedArchive,
): PlainEnglishSummary | null {
  const generators = [
    lineSurveillancePeriod,
    lineDeletedTweets,
    lineZombieInterests,
    lineDeletionLie,
    lineAdvertiserCount,
    lineHiddenDemographics,
    lineContacts,
    lineIpTracking,
    lineDeviceFingerprints,
    lineInterests,
    lineDms,
    lineGrok,
    lineConnectedApps,
    lineOffTwitter,
    lineSuspensions,
  ];

  const lines: PlainEnglishLine[] = [];
  const allSources = new Set<string>();

  for (const gen of generators) {
    const line = gen(archive);
    if (line) {
      lines.push(line);
      for (const src of line.sources) allSources.add(src);
    }
  }

  if (lines.length === 0) return null;

  lines.sort((a, b) => b.weight - a.weight);

  return {
    lines,
    headline: lines[0] ?? null,
    sourcesUsed: allSources.size,
  };
}
