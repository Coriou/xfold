// ---------------------------------------------------------------------------
// Betrayal Stack — three broken promises, one devastating view
// ---------------------------------------------------------------------------
//
// Combines the three most damning privacy betrayals X commits against users
// who tried to protect themselves:
//
//   1. Deleted ≠ Gone — tweets you deleted that X kept
//   2. Disabled ≠ Off — interests you disabled that X still monetized
//   3. Private ≠ Private — times you went private but tracking continued
//
// Each entry shows what the user did, what X did anyway, and the evidence.
// This is the single most impactful share card because it tells a story
// about trust violated, not just numbers collected.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";
import { buildZombieInterests } from "./zombie-interests";

// --- Types ------------------------------------------------------------------

export interface Betrayal {
  /** Short label: "Deleted ≠ Gone" */
  readonly label: string;
  /** What the user did: "You deleted 847 tweets" */
  readonly userAction: string;
  /** What X did: "X kept all of them" */
  readonly xAction: string;
  /** Concrete evidence line: "Topics from deleted tweets still appear in your interest profile" */
  readonly evidence: string;
  /** Severity weight for ranking. */
  readonly severity: number;
}

export interface BetrayalStack {
  /** The betrayals detected, ordered by severity. */
  readonly betrayals: readonly Betrayal[];
  /** Total number of betrayals found (max 3). */
  readonly count: number;
  /** Total data points involved across all betrayals. */
  readonly totalDataPoints: number;
}

// --- Betrayal detectors -----------------------------------------------------

function detectDeletionBetrayal(archive: ParsedArchive): Betrayal | null {
  const deleted = archive.deletedTweets.length;
  if (deleted === 0) return null;

  // Check how long the oldest has been retained
  let oldestDays = 0;
  for (const tweet of archive.deletedTweets) {
    const d = parseDate(tweet.createdAt);
    if (d) {
      const days = Math.floor(
        (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (days > oldestDays) oldestDays = days;
    }
  }

  const yearsKept = Math.floor(oldestDays / 365);
  const evidencePart =
    yearsKept > 1
      ? `The oldest is from ${yearsKept} years ago.`
      : "They're all still in X's database.";

  return {
    label: "Deleted ≠ Gone",
    userAction: `You deleted ${deleted.toLocaleString()} tweets`,
    xAction: "X kept every single one",
    evidence: evidencePart,
    severity: Math.min(100, 50 + Math.floor(deleted / 20) * 5),
  };
}

function detectZombieBetrayal(archive: ParsedArchive): Betrayal | null {
  const zombies = buildZombieInterests(archive);
  if (!zombies || zombies.zombieCount === 0) return null;

  return {
    label: "Disabled ≠ Off",
    userAction: `You disabled ${zombies.totalDisabled} interests`,
    xAction: `${zombies.zombieCount} are still used for ad targeting`,
    evidence: `${zombies.totalZombieImpressions.toLocaleString()} ads were served using interests you turned off.`,
    severity: Math.min(100, 55 + zombies.zombieCount * 4),
  };
}

function detectPrivacyBetrayal(archive: ParsedArchive): Betrayal | null {
  // Check if user ever went protected
  const protectedEvents = archive.protectedHistory.filter(
    (e) =>
      e.action.toLowerCase().includes("protect") ||
      e.action.toLowerCase().includes("private"),
  );

  if (protectedEvents.length === 0) return null;

  // Count data collected during/after going private
  // (IPs, device tokens, ad impressions all continue regardless)
  const ipsDuringAll = archive.ipAudit.length;
  const adsDuringAll = archive.adImpressions.reduce(
    (n, b) => n + b.impressions.length,
    0,
  );

  if (ipsDuringAll === 0 && adsDuringAll === 0) return null;

  const timesPrivate = protectedEvents.length;

  return {
    label: "Private ≠ Private",
    userAction: `You went private ${timesPrivate} time${timesPrivate === 1 ? "" : "s"}`,
    xAction: "IP logging, ads, and device tracking continued",
    evidence: `${ipsDuringAll.toLocaleString()} login events and ${adsDuringAll.toLocaleString()} ad impressions were recorded regardless.`,
    severity: Math.min(95, 50 + timesPrivate * 15),
  };
}

// --- Main -------------------------------------------------------------------

export function buildBetrayalStack(
  archive: ParsedArchive,
): BetrayalStack | null {
  const betrayals: Betrayal[] = [];

  const deletion = detectDeletionBetrayal(archive);
  if (deletion) betrayals.push(deletion);

  const zombie = detectZombieBetrayal(archive);
  if (zombie) betrayals.push(zombie);

  const privacy = detectPrivacyBetrayal(archive);
  if (privacy) betrayals.push(privacy);

  if (betrayals.length === 0) return null;

  betrayals.sort((a, b) => b.severity - a.severity);

  // Sum up data points involved
  let totalDataPoints = 0;
  totalDataPoints += archive.deletedTweets.length;
  const zombieStats = buildZombieInterests(archive);
  if (zombieStats) totalDataPoints += zombieStats.totalZombieImpressions;
  totalDataPoints += archive.protectedHistory.length;

  return {
    betrayals,
    count: betrayals.length,
    totalDataPoints,
  };
}
