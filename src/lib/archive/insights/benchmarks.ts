// ---------------------------------------------------------------------------
// Comparative benchmarks — anchoring raw numbers against meaningful context
// ---------------------------------------------------------------------------
//
// Raw numbers are meaningless without context. "467 advertisers" means
// nothing unless you know a typical user sees ~50-100. This module provides
// benchmark comparisons for key metrics to make findings visceral.
//
// All benchmarks are based on publicly available research about Twitter/X's
// advertising platform, typical user behavior, and reported averages.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";

// --- Types ------------------------------------------------------------------

export interface Benchmark {
  readonly id: string;
  readonly label: string;
  /** The user's actual value. */
  readonly value: number;
  /** What a "typical" user might see. */
  readonly typicalRange: string;
  /** Formatted comparison string. */
  readonly comparison: string;
  /** How the user compares (multiplier or direction). */
  readonly multiplier: number | null;
  /** Whether this benchmark is concerning (user is well above typical). */
  readonly isConcerning: boolean;
}

// --- Benchmark definitions --------------------------------------------------
//
// Values based on:
//   - X/Twitter Transparency Report data (2023-2025)
//   - Published ad platform documentation
//   - Academic research on social media data practices
//   - Publicly reported average engagement/usage metrics

interface BenchmarkDef {
  id: string;
  label: string;
  typicalLow: number;
  typicalHigh: number;
  typicalLabel: string;
  extract: (archive: ParsedArchive) => number;
  format: (value: number, multiplier: number | null) => string;
  /** Threshold above which this is considered concerning. */
  concernThreshold: number;
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

const BENCHMARK_DEFS: readonly BenchmarkDef[] = [
  {
    id: "advertisers",
    label: "Advertisers targeting you",
    typicalLow: 50,
    typicalHigh: 150,
    typicalLabel: "50–150 for a typical user",
    extract: (a) => {
      const set = new Set<string>();
      for (const batch of a.adImpressions) {
        for (const imp of batch.impressions) set.add(imp.advertiserName);
      }
      for (const batch of a.adEngagements) {
        for (const eng of batch.engagements) set.add(eng.advertiserName);
      }
      return set.size;
    },
    format: (v, m) =>
      m && m > 1.5
        ? `${fmt(v)} advertisers — ${m.toFixed(1)}× more than average.`
        : `${fmt(v)} advertisers — within the typical range.`,
    concernThreshold: 200,
  },
  {
    id: "interests",
    label: "Inferred interests",
    typicalLow: 40,
    typicalHigh: 100,
    typicalLabel: "40–100 for most accounts",
    extract: (a) => a.personalization?.interests.length ?? 0,
    format: (v, m) =>
      m && m > 1.5
        ? `X inferred ${fmt(v)} interests — ${m.toFixed(1)}× the typical count.`
        : `${fmt(v)} interests — roughly average.`,
    concernThreshold: 150,
  },
  {
    id: "deleted-tweets",
    label: "Deleted tweets retained",
    typicalLow: 0,
    typicalHigh: 50,
    typicalLabel: "0–50 for most users",
    extract: (a) => a.deletedTweets.length,
    format: (v) =>
      v > 100
        ? `${fmt(v)} deleted tweets — far more than most users. X kept every word.`
        : v > 0
          ? `${fmt(v)} deleted tweets retained by X.`
          : "No deleted tweets found.",
    concernThreshold: 50,
  },
  {
    id: "contacts",
    label: "Uploaded contacts",
    typicalLow: 0,
    typicalHigh: 100,
    typicalLabel: "0–100 for most users",
    extract: (a) => a.contacts.length,
    format: (v) =>
      v > 200
        ? `${fmt(v)} contacts uploaded — more personal data than most people share on any single platform.`
        : v > 0
          ? `${fmt(v)} contacts from your phone — people who never agreed to this.`
          : "No uploaded contacts found.",
    concernThreshold: 100,
  },
  {
    id: "login-ips",
    label: "Unique login IPs",
    typicalLow: 5,
    typicalHigh: 30,
    typicalLabel: "5–30 for a typical account",
    extract: (a) => new Set(a.ipAudit.map((e) => e.loginIp)).size,
    format: (v, m) =>
      m && m > 2
        ? `${fmt(v)} unique IPs — a ${m.toFixed(0)}× bigger location footprint than average.`
        : `${fmt(v)} unique login IPs.`,
    concernThreshold: 50,
  },
  {
    id: "devices",
    label: "Fingerprinted devices",
    typicalLow: 2,
    typicalHigh: 8,
    typicalLabel: "2–8 for most people",
    extract: (a) =>
      a.deviceTokens.length + a.niDevices.length + a.keyRegistryDevices.length,
    format: (v, m) =>
      m && m > 2
        ? `${fmt(v)} devices fingerprinted — ${m.toFixed(1)}× the typical count.`
        : `${fmt(v)} devices tracked by X.`,
    concernThreshold: 12,
  },
  {
    id: "grok-messages",
    label: "Grok messages stored",
    typicalLow: 0,
    typicalHigh: 20,
    typicalLabel: "0–20 for most users (many don't use Grok)",
    extract: (a) =>
      a.grokConversations.reduce((s, c) => s + c.messages.length, 0),
    format: (v) =>
      v > 50
        ? `${fmt(v)} Grok messages — extensive AI conversations tied to your real identity.`
        : v > 0
          ? `${fmt(v)} Grok messages stored by X.`
          : "No Grok conversations found.",
    concernThreshold: 50,
  },
  {
    id: "connected-apps",
    label: "Connected apps",
    typicalLow: 1,
    typicalHigh: 5,
    typicalLabel: "1–5 for most users",
    extract: (a) => a.connectedApps.length,
    format: (v, m) =>
      m && m > 2
        ? `${fmt(v)} connected apps — ${m.toFixed(1)}× more than typical. Each has API access.`
        : `${fmt(v)} apps connected to your account.`,
    concernThreshold: 8,
  },
  {
    id: "off-twitter-events",
    label: "Off-platform tracking events",
    typicalLow: 0,
    typicalHigh: 30,
    typicalLabel: "0–30 for most users",
    extract: (a) =>
      a.offTwitter.mobileConversionsAttributed.length +
      a.offTwitter.mobileConversionsUnattributed.length +
      a.offTwitter.onlineConversionsAttributed.length +
      a.offTwitter.onlineConversionsUnattributed.length,
    format: (v) =>
      v > 50
        ? `${fmt(v)} off-platform events — X follows you extensive across the web.`
        : v > 0
          ? `${fmt(v)} events tracked outside X.`
          : "No off-platform tracking detected.",
    concernThreshold: 30,
  },
];

// --- Main -------------------------------------------------------------------

export function computeBenchmarks(archive: ParsedArchive): Benchmark[] {
  const results: Benchmark[] = [];

  for (const def of BENCHMARK_DEFS) {
    const value = def.extract(archive);
    if (value === 0) continue;

    const midpoint = (def.typicalLow + def.typicalHigh) / 2;
    const multiplier =
      midpoint > 0 ? Math.round((value / midpoint) * 10) / 10 : null;
    const isConcerning = value > def.concernThreshold;

    results.push({
      id: def.id,
      label: def.label,
      value,
      typicalRange: def.typicalLabel,
      comparison: def.format(value, multiplier),
      multiplier,
      isConcerning,
    });
  }

  // Sort by how far above the concern threshold
  results.sort((a, b) => {
    const aDef = BENCHMARK_DEFS.find((d) => d.id === a.id);
    const bDef = BENCHMARK_DEFS.find((d) => d.id === b.id);
    const aRatio = aDef ? a.value / aDef.concernThreshold : 0;
    const bRatio = bDef ? b.value / bDef.concernThreshold : 0;
    return bRatio - aRatio;
  });

  return results;
}
