// ---------------------------------------------------------------------------
// WTF findings engine — extensible registry of "huh, that's surprising" facts
// ---------------------------------------------------------------------------
//
// Each finding is produced by a small detector function that takes a parsed
// archive and returns a Finding (or null if not applicable). The engine runs
// every detector and returns the findings sorted by shareability descending.
//
// The point of this engine is to give the dashboard a single "what should we
// shout about for THIS user" call: `findWtfMoments(archive)[0]`.
//
// Phase 0 ships three detectors:
//   - forgottenZombieApp: connected app with write access, oldest first
//   - oldestStoredDm: the date and short text of the oldest DM
//   - audienceListShock: count of distinct audience-list memberships
//
// More detectors can be added cheaply by appending to the DETECTORS array.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";

export type WtfFindingId =
  | "forgotten-zombie-app"
  | "oldest-stored-dm"
  | "audience-list-shock";

export type WtfSeverity = "low" | "medium" | "high" | "critical";

export interface WtfFinding {
  readonly id: WtfFindingId;
  /** Short title (~5 words). */
  readonly title: string;
  /** 1–2 sentences. The quotable body. */
  readonly body: string;
  readonly severity: WtfSeverity;
  /** 0–100. Higher = more shareable. */
  readonly shareability: number;
  /** Optional call-to-action with external link (e.g. revoke-app page). */
  readonly cta?: { readonly label: string; readonly href: string };
}

type WtfDetector = (archive: ParsedArchive) => WtfFinding | null;

// ---------------------------------------------------------------------------
// Detectors
// ---------------------------------------------------------------------------

const FORGOTTEN_APP_THRESHOLD_YEARS = 5;

function forgottenZombieApp(archive: ParsedArchive): WtfFinding | null {
  const writeApps = archive.connectedApps.filter((a) =>
    a.permissions.some((p) => p.toLowerCase().includes("write")),
  );
  if (writeApps.length === 0) return null;

  let oldest = writeApps[0];
  if (!oldest) return null;
  let oldestTs = parseDate(oldest.approvedAt)?.getTime() ?? Infinity;
  for (const app of writeApps) {
    const ts = parseDate(app.approvedAt)?.getTime() ?? Infinity;
    if (ts < oldestTs) {
      oldest = app;
      oldestTs = ts;
    }
  }
  if (oldestTs === Infinity) return null;

  const yearsAgo = Math.floor(
    (Date.now() - oldestTs) / (1000 * 60 * 60 * 24 * 365.25),
  );
  if (yearsAgo < FORGOTTEN_APP_THRESHOLD_YEARS) return null;

  const severity: WtfSeverity =
    yearsAgo >= 12 ? "critical" : yearsAgo >= 8 ? "high" : "medium";

  return {
    id: "forgotten-zombie-app",
    title: "Forgotten app with write access",
    body: `${oldest.name} has had write access to your account for ${yearsAgo} years. It can still post tweets as you.`,
    severity,
    shareability: Math.min(100, 50 + yearsAgo * 4),
    cta: {
      label: "Review connected apps",
      href: "https://x.com/settings/connected_apps",
    },
  };
}

function oldestStoredDm(archive: ParsedArchive): WtfFinding | null {
  let earliestTs = Infinity;
  for (const convo of archive.directMessages) {
    for (const msg of convo.messages) {
      if (!msg.text.trim()) continue;
      const ts = parseDate(msg.createdAt)?.getTime();
      if (ts !== undefined && ts < earliestTs) {
        earliestTs = ts;
      }
    }
  }
  if (earliestTs === Infinity) return null;

  const yearsAgo = Math.floor(
    (Date.now() - earliestTs) / (1000 * 60 * 60 * 24 * 365.25),
  );
  if (yearsAgo < 3) return null;

  const severity: WtfSeverity =
    yearsAgo >= 10 ? "critical" : yearsAgo >= 6 ? "high" : "medium";

  return {
    id: "oldest-stored-dm",
    title: "X is still storing a decade of your DMs",
    body: `Your oldest stored DM is from ${yearsAgo} years ago. X has retained every word since.`,
    severity,
    shareability: Math.min(100, 30 + yearsAgo * 5),
  };
}

function audienceListShock(archive: ParsedArchive): WtfFinding | null {
  const lists = new Set<string>();
  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      for (const tc of imp.targetingCriteria) {
        if (tc.targetingType === "List" && tc.targetingValue) {
          lists.add(tc.targetingValue);
        }
      }
    }
  }
  for (const batch of archive.adEngagements) {
    for (const eng of batch.engagements) {
      for (const tc of eng.targetingCriteria) {
        if (tc.targetingType === "List" && tc.targetingValue) {
          lists.add(tc.targetingValue);
        }
      }
    }
  }

  if (lists.size === 0) return null;

  const severity: WtfSeverity =
    lists.size >= 30 ? "critical" : lists.size >= 10 ? "high" : "medium";

  return {
    id: "audience-list-shock",
    title: "You're on advertiser audience lists",
    body: `Real advertisers uploaded ${lists.size} different customer lists with you on them. You appear by name on each one.`,
    severity,
    shareability: Math.min(100, 40 + lists.size * 2),
  };
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

const DETECTORS: readonly WtfDetector[] = [
  forgottenZombieApp,
  oldestStoredDm,
  audienceListShock,
];

/**
 * Returns all applicable WTF findings for an archive, sorted by shareability
 * descending. Empty when nothing is interesting.
 */
export function findWtfMoments(archive: ParsedArchive): WtfFinding[] {
  const out: WtfFinding[] = [];
  for (const detector of DETECTORS) {
    const finding = detector(archive);
    if (finding) out.push(finding);
  }
  out.sort((a, b) => b.shareability - a.shareability);
  return out;
}

/**
 * The single most shareable finding, or null if no detector fired.
 */
export function pickHeroWtfMoment(archive: ParsedArchive): WtfFinding | null {
  const findings = findWtfMoments(archive);
  return findings[0] ?? null;
}
