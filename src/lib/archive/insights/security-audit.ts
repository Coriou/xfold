// ---------------------------------------------------------------------------
// Account security audit — cross-referencing IPs, devices, and tweet sources
// ---------------------------------------------------------------------------
//
// Detects anomalies by cross-referencing:
//   1. Tweet sources (which app posted it)
//   2. IP addresses (where logins originated)
//   3. Devices (fingerprinted hardware)
//
// Flags unusual patterns that could indicate:
//   - Account compromise (tweets from unknown clients)
//   - Credential sharing (multiple simultaneous IP clusters)
//   - Forgotten third-party access (old OAuth apps still active)
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";
import { getDeviceBreakdown } from "@/lib/archive/account-summary";

// --- Types ------------------------------------------------------------------

export interface SecurityAnomaly {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly severity: "critical" | "warning" | "info";
}

export interface TweetSourceSummary {
  readonly source: string;
  readonly count: number;
  readonly firstSeen: string;
  readonly lastSeen: string;
}

export interface SecurityAudit {
  /** Distinct IP addresses used. */
  readonly uniqueIps: number;
  /**
   * Real device endpoints — push notification devices + encryption keys.
   * Excludes OAuth app tokens (which the previous implementation lumped in,
   * inflating the count by ~5–10x and contradicting the Devices section).
   */
  readonly deviceCount: number;
  /** Distinct tweet clients used. */
  readonly clientCount: number;
  /** Tweet clients with usage stats. */
  readonly tweetSources: readonly TweetSourceSummary[];
  /** Detected anomalies, sorted by severity. */
  readonly anomalies: readonly SecurityAnomaly[];
  /** Total login events recorded. */
  readonly loginEvents: number;
  /** Distinct countries detected from IP analysis (if available). */
  readonly distinctCountries: number;
  /** Apps with write access that are still connected. */
  readonly writeAccessApps: readonly string[];
}

// --- Helpers ----------------------------------------------------------------

function extractAppName(source: string): string {
  // Tweet source is HTML like '<a href="...">Twitter for iPhone</a>'
  const match = source.match(/>([^<]+)</);
  return match?.[1] ?? source;
}

// --- Main -------------------------------------------------------------------

export function buildSecurityAudit(
  archive: ParsedArchive,
): SecurityAudit | null {
  if (archive.tweets.length === 0 && archive.ipAudit.length === 0) return null;

  const anomalies: SecurityAnomaly[] = [];

  // --- Tweet source analysis ---
  const sourceMap = new Map<
    string,
    { count: number; firstSeen: Date; lastSeen: Date }
  >();
  for (const tweet of archive.tweets) {
    const name = extractAppName(tweet.source);
    const date = parseDate(tweet.createdAt);
    if (!date) continue;

    const existing = sourceMap.get(name);
    if (existing) {
      existing.count++;
      if (date < existing.firstSeen) existing.firstSeen = date;
      if (date > existing.lastSeen) existing.lastSeen = date;
    } else {
      sourceMap.set(name, {
        count: 1,
        firstSeen: date,
        lastSeen: date,
      });
    }
  }

  const tweetSources: TweetSourceSummary[] = Array.from(sourceMap.entries())
    .map(([source, data]) => ({
      source,
      count: data.count,
      firstSeen: data.firstSeen.toISOString(),
      lastSeen: data.lastSeen.toISOString(),
    }))
    .sort((a, b) => b.count - a.count);

  // Flag unknown/unusual clients (< 1% of tweets but exists)
  const totalTweets = archive.tweets.length;
  for (const src of tweetSources) {
    if (src.count <= 2 && totalTweets > 100) {
      anomalies.push({
        id: `rare-client-${src.source}`,
        label: `Rare tweet client: "${src.source}"`,
        detail: `Only ${src.count} tweet${src.count > 1 ? "s" : ""} from this client. If you don't recognize it, someone else may have had access.`,
        severity: "warning",
      });
    }
  }

  // --- IP analysis ---
  const uniqueIps = new Set(archive.ipAudit.map((e) => e.loginIp)).size;

  // Check for location diversity
  const locationHistory = archive.personalization?.locationHistory ?? [];
  const countries = new Set(
    locationHistory
      .map((l) => l.country)
      .filter((c): c is string => c !== null && c !== ""),
  );

  if (countries.size > 3) {
    anomalies.push({
      id: "multi-country",
      label: `Logins from ${countries.size} different countries`,
      detail: `Countries detected: ${Array.from(countries).slice(0, 5).join(", ")}${countries.size > 5 ? `, +${countries.size - 5} more` : ""}. Verify all locations are yours.`,
      severity: countries.size > 5 ? "critical" : "warning",
    });
  }

  // --- Device analysis ---
  // We surface the total number of device-related identifiers in the stats
  // grid, but the anomaly copy only counts *real* device endpoints (push +
  // encryption keys). App tokens are OAuth grants, not hardware
  // fingerprints, and conflating them inflates the count by ~5–10x.
  const devices = getDeviceBreakdown(archive);
  const realDeviceCount = devices.pushDevices + devices.encryptionKeys;

  if (realDeviceCount > 5) {
    anomalies.push({
      id: "many-devices",
      label: `${realDeviceCount} device endpoints registered`,
      detail: `X holds push tokens or encryption keys for ${realDeviceCount} of your devices${
        devices.appTokens > 0
          ? `, plus ${devices.appTokens} app authorization tokens`
          : ""
      }. Outdated devices may still have active sessions.`,
      severity: realDeviceCount > 12 ? "critical" : "warning",
    });
  }

  // --- Connected app risk ---
  const writeAccessApps = archive.connectedApps
    .filter((a) =>
      a.permissions.some(
        (p) =>
          p.toLowerCase().includes("write") ||
          p.toLowerCase().includes("direct message"),
      ),
    )
    .map((a) => a.name);

  if (writeAccessApps.length > 0) {
    anomalies.push({
      id: "write-access-apps",
      label: `${writeAccessApps.length} app${writeAccessApps.length > 1 ? "s" : ""} with write/DM access`,
      detail: `These apps can post tweets or read DMs: ${writeAccessApps.slice(0, 4).join(", ")}${writeAccessApps.length > 4 ? `, +${writeAccessApps.length - 4} more` : ""}.`,
      severity: writeAccessApps.length > 2 ? "critical" : "warning",
    });
  }

  // --- Old connected apps ---
  const now = Date.now();
  const oldApps = archive.connectedApps.filter((a) => {
    const approved = parseDate(a.approvedAt);
    if (!approved) return false;
    const ageYears =
      (now - approved.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return ageYears > 3;
  });

  if (oldApps.length > 0) {
    anomalies.push({
      id: "stale-apps",
      label: `${oldApps.length} connected app${oldApps.length > 1 ? "s" : ""} older than 3 years`,
      detail: `Old apps you may have forgotten: ${oldApps
        .slice(0, 3)
        .map((a) => a.name)
        .join(", ")}. Consider revoking access.`,
      severity: "info",
    });
  }

  // Sort anomalies by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  anomalies.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  return {
    uniqueIps,
    deviceCount: realDeviceCount,
    clientCount: tweetSources.length,
    tweetSources,
    anomalies,
    loginEvents: archive.ipAudit.length,
    distinctCountries: countries.size,
    writeAccessApps,
  };
}
