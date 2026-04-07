// ---------------------------------------------------------------------------
// Relatable units — turn raw archive numbers into visceral comparisons
// ---------------------------------------------------------------------------
//
// Raw numbers are meaningless to most people. "5,432 ad impressions" is
// abstract; "15 ads per day, every day, for a year" is visceral.
// This module converts raw archive metrics into human-relatable framing.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";

export interface RelatableUnit {
  /** Short label for the metric. */
  readonly label: string;
  /** The raw number. */
  readonly raw: number;
  /** Human-readable framing (e.g. "~15 ads per day"). */
  readonly relatable: string;
  /** A one-sentence comparison for share cards. */
  readonly sentence: string;
  /** Category tag — useful for grouping in share card. */
  readonly category: "tracking" | "profiling" | "retention" | "monetization";
}

function daysBetween(a: Date, b: Date): number {
  return Math.max(
    1,
    Math.round(Math.abs(b.getTime() - a.getTime()) / 86400000),
  );
}

function accountAgeDays(archive: ParsedArchive): number {
  const created = archive.account?.createdAt
    ? parseDate(archive.account.createdAt)
    : null;
  if (!created) return 365; // fallback
  return daysBetween(created, new Date());
}

export function buildRelatableUnits(
  archive: ParsedArchive,
): readonly RelatableUnit[] {
  const results: RelatableUnit[] = [];
  const ageDays = accountAgeDays(archive);
  const ageYears = Math.max(1, Math.round(ageDays / 365));

  // --- Ad impressions → ads per day ---
  let totalImpressions = 0;
  for (const batch of archive.adImpressions) {
    totalImpressions += batch.impressions.length;
  }
  if (totalImpressions > 0) {
    const perDay = Math.round(totalImpressions / ageDays);
    const perDayStr = perDay > 0 ? `~${perDay}` : "<1";
    results.push({
      label: "Ad impressions",
      raw: totalImpressions,
      relatable: `${perDayStr} ads/day for ${ageYears} ${ageYears === 1 ? "year" : "years"}`,
      sentence: `X served you roughly ${perDayStr} ads every single day.`,
      category: "monetization",
    });
  }

  // --- Unique advertisers → "a crowd" comparison ---
  const advSet = new Set<string>();
  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) advSet.add(imp.advertiserScreenName);
  }
  for (const batch of archive.adEngagements) {
    for (const eng of batch.engagements) advSet.add(eng.advertiserScreenName);
  }
  const advCount = advSet.size;
  if (advCount > 0) {
    const comparison =
      advCount > 500
        ? "more than a sold-out concert venue"
        : advCount > 200
          ? "more than a large wedding"
          : advCount > 50
            ? "more than a classroom"
            : "a small meeting room full";
    results.push({
      label: "Advertisers",
      raw: advCount,
      relatable: `${comparison} of companies`,
      sentence: `${advCount} companies bought access to your attention — ${comparison}.`,
      category: "monetization",
    });
  }

  // --- Interests → "more than your best friend knows" ---
  const interestCount = archive.personalization?.interests.length ?? 0;
  if (interestCount > 0) {
    const comparison =
      interestCount > 200
        ? "more than most dating profiles ask"
        : interestCount > 100
          ? "more than a job interview covers"
          : interestCount > 30
            ? "more than most friends know about you"
            : "a decent conversation's worth";
    results.push({
      label: "Interests profiled",
      raw: interestCount,
      relatable: `${comparison}`,
      sentence: `X thinks it knows ${interestCount} things about you — ${comparison}.`,
      category: "profiling",
    });
  }

  // --- IPs → locations per month ---
  const uniqueIps = new Set(archive.ipAudit.map((e) => e.loginIp)).size;
  if (uniqueIps > 0) {
    const months = Math.max(1, Math.round(ageDays / 30));
    const perMonth = Math.round((uniqueIps / months) * 10) / 10;
    results.push({
      label: "IP addresses",
      raw: uniqueIps,
      relatable: `~${perMonth} new locations tracked per month`,
      sentence: `X logged ${uniqueIps} IP addresses — about ${perMonth} new locations tracked per month.`,
      category: "tracking",
    });
  }

  // --- Deleted tweets → average retention ---
  if (archive.deletedTweets.length > 0) {
    const withDates = archive.deletedTweets.filter((t) => t.createdAt);
    const oldest =
      withDates.length > 0
        ? withDates.reduce((a, b) => {
            const da = parseDate(a.createdAt);
            const db = parseDate(b.createdAt);
            if (!da) return b;
            if (!db) return a;
            return da < db ? a : b;
          })
        : null;
    const oldestDate = oldest ? parseDate(oldest.createdAt) : null;
    const retentionYears = oldestDate
      ? Math.round(daysBetween(oldestDate, new Date()) / 365)
      : 0;

    results.push({
      label: "Deleted tweets retained",
      raw: archive.deletedTweets.length,
      relatable:
        retentionYears > 0
          ? `kept for up to ${retentionYears} ${retentionYears === 1 ? "year" : "years"} after deletion`
          : `${archive.deletedTweets.length} tweets you thought were gone`,
      sentence: `X retained ${archive.deletedTweets.length} tweets you deleted${retentionYears > 0 ? ` — some for ${retentionYears} years` : ""}.`,
      category: "retention",
    });
  }

  // --- DMs → messages per year ---
  const totalDms = archive.directMessages.reduce(
    (acc, c) => acc + c.messages.length,
    0,
  );
  if (totalDms > 0) {
    const perYear = Math.round(totalDms / ageYears);
    results.push({
      label: "Private messages stored",
      raw: totalDms,
      relatable: `~${perYear} private messages stored per year`,
      sentence: `X stores ${totalDms.toLocaleString("en-US")} of your private messages — ~${perYear} per year.`,
      category: "retention",
    });
  }

  // --- Contacts → "gave away" framing ---
  if (archive.contacts.length > 0) {
    const emailCount = archive.contacts.reduce(
      (acc, c) => acc + c.emails.length,
      0,
    );
    const phoneCount = archive.contacts.reduce(
      (acc, c) => acc + c.phoneNumbers.length,
      0,
    );
    results.push({
      label: "Uploaded contacts",
      raw: archive.contacts.length,
      relatable: `${emailCount} emails and ${phoneCount} phone numbers from your phone`,
      sentence: `You gave X ${archive.contacts.length} contacts from your phone — their emails and phone numbers, without their consent.`,
      category: "tracking",
    });
  }

  // --- Devices tracked ---
  const deviceCount =
    archive.deviceTokens.length +
    archive.niDevices.length +
    archive.keyRegistryDevices.length;
  if (deviceCount > 0) {
    results.push({
      label: "Devices fingerprinted",
      raw: deviceCount,
      relatable: `${deviceCount} unique device fingerprints`,
      sentence: `X fingerprinted ${deviceCount} of your devices — every phone, tablet, and computer you've used.`,
      category: "tracking",
    });
  }

  return results;
}
