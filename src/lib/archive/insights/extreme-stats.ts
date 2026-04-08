// ---------------------------------------------------------------------------
// Extreme stats — find the most "extreme" thing about an archive
// ---------------------------------------------------------------------------
//
// This is the engine behind the Receipt share card and the gallery auto-picker.
// Each ExtremeStat is a candidate "headline number" with a normalized
// shareability score. Higher score = more shocking / shareable.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";
import { buildAdvertiserStats } from "@/lib/archive/insights/advertiser-stats";
import {
  getDeviceBreakdown,
  getReferenceDate,
  getYearsOnX,
} from "@/lib/archive/account-summary";

export type ExtremeStatKey =
  | "advertisers"
  | "interests"
  | "ips"
  | "ageYears"
  | "adImpressions"
  | "tweets"
  | "dms"
  | "connectedApps"
  | "devices";

export interface ExtremeStat {
  key: ExtremeStatKey;
  /** The raw number to display ("427"). */
  value: number;
  /** A short label ("advertisers"). */
  label: string;
  /** A one-line context line shown under the big number. */
  contextLine: string;
  /** 0–100, higher = more shareable. */
  shareability: number;
}

function clamp(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 100) return 100;
  return Math.round(n);
}

/**
 * Account age as a fractional year, anchored on the archive's generation
 * date (not `Date.now()`) so the same archive always produces the same
 * shareability score regardless of when it's opened.
 */
function accountAgeYearsFractional(archive: ParsedArchive): number {
  const created = archive.account?.createdAt;
  if (!created) return 0;
  const d = parseDate(created);
  if (!d) return 0;
  const ref = getReferenceDate(archive);
  const ms = ref.getTime() - d.getTime();
  if (ms <= 0) return 0;
  return ms / (1000 * 60 * 60 * 24 * 365.25);
}

function totalDmMessages(archive: ParsedArchive): number {
  let total = 0;
  for (const c of archive.directMessages) total += c.messages.length;
  return total;
}

/**
 * Real device endpoints — push devices + encryption keys. Excludes app
 * tokens (OAuth grants) so the receipt card and the gallery auto-picker
 * agree with the canonical "device fingerprints" wording elsewhere.
 */
function realDeviceCount(archive: ParsedArchive): number {
  const d = getDeviceBreakdown(archive);
  return d.pushDevices + d.encryptionKeys;
}

export function scanForExtremeStats(archive: ParsedArchive): ExtremeStat[] {
  const ads = buildAdvertiserStats(archive, 0);
  const interests = archive.personalization?.interests.length ?? 0;
  const uniqueIps = new Set(archive.ipAudit.map((e) => e.loginIp)).size;
  const yearsFractional = accountAgeYearsFractional(archive);
  // Use the canonical "years on X" for the displayed value, falling back
  // to floor(fractional) when the canonical helper has nothing to compute.
  const yearsCanonical = getYearsOnX(archive) ?? Math.floor(yearsFractional);
  const totalImpressions = ads.totalImpressions;
  const tweetCount = archive.tweets.length;
  const dms = totalDmMessages(archive);
  const apps = archive.connectedApps.length;
  const devices = realDeviceCount(archive);

  const candidates: ExtremeStat[] = [
    {
      key: "advertisers",
      value: ads.uniqueAdvertisers,
      label: "advertisers tracked you",
      contextLine: `using ${ads.targetingTypes.length} different targeting methods`,
      shareability: clamp((ads.uniqueAdvertisers / 300) * 100),
    },
    {
      key: "interests",
      value: interests,
      label: "interests inferred about you",
      contextLine: "things X thinks you care about",
      shareability: clamp((interests / 200) * 100),
    },
    {
      key: "ips",
      value: uniqueIps,
      label: "unique IPs in your login history",
      contextLine: "every network you've connected from",
      shareability: clamp((uniqueIps / 30) * 100),
    },
    {
      key: "ageYears",
      value: yearsCanonical,
      label: "years of data collection",
      contextLine: "the entire history X has on you",
      shareability: clamp((yearsFractional / 15) * 100),
    },
    {
      key: "adImpressions",
      value: totalImpressions,
      label: "ads shown to you",
      contextLine: "every promoted post in your feed",
      shareability: clamp((totalImpressions / 5000) * 100),
    },
    {
      key: "tweets",
      value: tweetCount,
      label: "tweets stored forever",
      contextLine: "every post you've ever made",
      shareability: clamp((tweetCount / 5000) * 100),
    },
    {
      key: "dms",
      value: dms,
      label: "private messages stored",
      contextLine: "X can read every one of them",
      shareability: clamp((dms / 2000) * 100),
    },
    {
      key: "connectedApps",
      value: apps,
      label: "third-party apps with account access",
      contextLine: "things you may have forgotten you authorized",
      shareability: clamp((apps / 15) * 100),
    },
    {
      key: "devices",
      value: devices,
      label: "device fingerprints",
      contextLine: "phones, browsers, and tokens X tracks",
      shareability: clamp((devices / 20) * 100),
    },
  ];

  candidates.sort((a, b) => b.shareability - a.shareability);
  return candidates;
}
