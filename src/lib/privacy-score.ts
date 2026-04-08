// ---------------------------------------------------------------------------
// Privacy score engine — pure functions, no React
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { getDeviceBreakdown } from "@/lib/archive/account-summary";

// --- Types ------------------------------------------------------------------

export interface CategoryMetric {
  label: string;
  value: number | string;
  detail?: string;
  severity: "low" | "medium" | "high";
}

export interface CategoryScore {
  id: string;
  label: string;
  score: number; // 0-100 (higher = more exposed)
  grade: string; // A-F
  metrics: CategoryMetric[];
}

export interface PrivacyScore {
  overall: number; // 0-100
  grade: string; // A-F
  categories: CategoryScore[];
  headline: string;
  /** One-sentence real-world analogy to make the score visceral */
  analogy: string;
  /** The single most concerning finding, with context */
  spotlight: PrivacySpotlight | null;
}

export interface PrivacySpotlight {
  categoryLabel: string;
  finding: string;
  severity: "medium" | "high";
}

// --- Helpers ----------------------------------------------------------------

/** Sigmoid normalization: midpoint maps to ~50, output clamped 0-100. */
function normalize(
  value: number,
  midpoint: number,
  steepness: number = 1,
): number {
  if (value <= 0) return 0;
  return Math.round(
    100 / (1 + Math.exp((-steepness * (value - midpoint)) / midpoint)),
  );
}

function toGrade(score: number): string {
  if (score <= 20) return "A";
  if (score <= 40) return "B";
  if (score <= 60) return "C";
  if (score <= 80) return "D";
  return "F";
}

function severity(score: number): "low" | "medium" | "high" {
  if (score <= 33) return "low";
  if (score <= 66) return "medium";
  return "high";
}

// --- Category scorers -------------------------------------------------------

function scoreTracking(archive: ParsedArchive): CategoryScore {
  const uniqueIps = new Set(archive.ipAudit.map((e) => e.loginIp)).size;
  const devices = getDeviceBreakdown(archive);

  // Combined signal: IPs contribute most, all device-related identifiers
  // amplify (kept the total here so the score itself is unchanged — only
  // the user-facing copy gets clearer).
  const raw = uniqueIps * 2 + devices.total;
  const score = normalize(raw, 30);

  const metrics: CategoryMetric[] = [
    {
      label: "Unique login IPs",
      value: uniqueIps,
      severity: severity(normalize(uniqueIps, 10)),
    },
    {
      label: "Device identifiers",
      value: devices.total,
      detail: `${devices.appTokens} app token${devices.appTokens === 1 ? "" : "s"}, ${devices.pushDevices} push device${devices.pushDevices === 1 ? "" : "s"}, ${devices.encryptionKeys} encryption key${devices.encryptionKeys === 1 ? "" : "s"}`,
      severity: severity(normalize(devices.total, 15)),
    },
    {
      label: "Login events recorded",
      value: archive.ipAudit.length,
      severity: severity(normalize(archive.ipAudit.length, 50)),
    },
  ];

  return {
    id: "tracking",
    label: "Tracking & Surveillance",
    score,
    grade: toGrade(score),
    metrics,
  };
}

function scoreBehavioral(archive: ParsedArchive): CategoryScore {
  const p = archive.personalization;
  const activeInterests = (p?.interests ?? []).filter((i) => !i.isDisabled);
  const showsCount = p?.shows.length ?? 0;
  const genderInferred = p?.gender ? 1 : 0;
  const ageInferred = p?.inferredAge ? 1 : 0;

  const raw =
    activeInterests.length +
    showsCount * 0.5 +
    (genderInferred + ageInferred) * 20;
  const score = normalize(raw, 100);

  const metrics: CategoryMetric[] = [
    {
      label: "Interests inferred",
      value: activeInterests.length,
      detail: `${(p?.interests ?? []).length} total, ${(p?.interests ?? []).length - activeInterests.length} disabled`,
      severity: severity(normalize(activeInterests.length, 80)),
    },
    {
      label: "Shows tracked",
      value: showsCount,
      severity: severity(normalize(showsCount, 50)),
    },
  ];

  if (p?.gender) {
    metrics.push({
      label: "Gender inferred",
      value: p.gender,
      severity: "high",
    });
  }
  if (p?.inferredAge) {
    metrics.push({
      label: "Age inferred",
      value: p.inferredAge,
      severity: "high",
    });
  }

  return {
    id: "behavioral",
    label: "Behavioral Profiling",
    score,
    grade: toGrade(score),
    metrics,
  };
}

function scoreAdExposure(archive: ParsedArchive): CategoryScore {
  const advertiserSet = new Set<string>();
  const targetingTypes = new Set<string>();

  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      advertiserSet.add(imp.advertiserName);
      for (const tc of imp.targetingCriteria) {
        targetingTypes.add(tc.targetingType);
      }
    }
  }
  for (const batch of archive.adEngagements) {
    for (const eng of batch.engagements) {
      advertiserSet.add(eng.advertiserName);
      for (const tc of eng.targetingCriteria) {
        targetingTypes.add(tc.targetingType);
      }
    }
  }

  const audiences = archive.personalization?.numAudiences ?? 0;
  const lookalikes = archive.personalization?.lookalikeAdvertisers.length ?? 0;

  const raw = advertiserSet.size * 2 + audiences + lookalikes;
  const score = normalize(raw, 100);

  const metrics: CategoryMetric[] = [
    {
      label: "Unique advertisers",
      value: advertiserSet.size,
      detail: "targeted you",
      severity: severity(normalize(advertiserSet.size, 30)),
    },
    {
      label: "Targeting methods",
      value: targetingTypes.size,
      severity: severity(normalize(targetingTypes.size, 8)),
    },
    {
      label: "Audience lists",
      value: audiences,
      detail: "you appear in",
      severity: severity(normalize(audiences, 20)),
    },
    {
      label: "Lookalike audiences",
      value: lookalikes,
      severity: severity(normalize(lookalikes, 10)),
    },
  ];

  return {
    id: "ads",
    label: "Ad Exposure",
    score,
    grade: toGrade(score),
    metrics,
  };
}

function scoreDataRetention(archive: ParsedArchive): CategoryScore {
  const totalDMs = archive.directMessages.reduce(
    (s, c) => s + c.messages.length,
    0,
  );
  const totalPoints =
    archive.tweets.length +
    archive.likes.length +
    totalDMs +
    archive.followers.length +
    archive.following.length;

  const raw = archive.tweets.length + archive.likes.length * 0.5 + totalDMs * 2;
  const score = normalize(raw, 2000);

  const metrics: CategoryMetric[] = [
    {
      label: "Tweets stored",
      value: archive.tweets.length,
      severity: severity(normalize(archive.tweets.length, 500)),
    },
    {
      label: "Likes recorded",
      value: archive.likes.length,
      severity: severity(normalize(archive.likes.length, 1000)),
    },
    {
      label: "DM messages",
      value: totalDMs,
      severity: severity(normalize(totalDMs, 200)),
    },
    {
      label: "Total data points",
      value: totalPoints,
      severity: severity(normalize(totalPoints, 3000)),
    },
  ];

  if (archive.meta.sizeBytes > 0) {
    const mb = (archive.meta.sizeBytes / (1024 * 1024)).toFixed(1);
    metrics.push({
      label: "Archive size",
      value: `${mb} MB`,
      severity: severity(normalize(archive.meta.sizeBytes / (1024 * 1024), 50)),
    });
  }

  return {
    id: "retention",
    label: "Data Retention",
    score,
    grade: toGrade(score),
    metrics,
  };
}

function scoreThirdParty(archive: ParsedArchive): CategoryScore {
  const total = archive.connectedApps.length;
  const writeApps = archive.connectedApps.filter((a) =>
    a.permissions.some(
      (p) =>
        p.toLowerCase().includes("write") ||
        p.toLowerCase().includes("direct message"),
    ),
  );

  const raw = total + writeApps.length * 5;
  const score = normalize(raw, 15);

  const metrics: CategoryMetric[] = [
    {
      label: "Connected apps",
      value: total,
      detail: "with account access",
      severity: severity(normalize(total, 8)),
    },
    {
      label: "Apps with write access",
      value: writeApps.length,
      severity: writeApps.length > 0 ? "high" : "low",
    },
  ];

  return {
    id: "thirdParty",
    label: "Third-Party Access",
    score,
    grade: toGrade(score),
    metrics,
  };
}

function scoreAI(archive: ParsedArchive): CategoryScore {
  const convos = archive.grokConversations.length;
  const messages = archive.grokConversations.reduce(
    (s, c) => s + c.messages.length,
    0,
  );

  // Any Grok usage at all is notable
  const raw = convos > 0 ? 30 + messages : 0;
  const score = normalize(raw, 80);

  const metrics: CategoryMetric[] = [
    {
      label: "Grok conversations",
      value: convos,
      severity: convos > 0 ? "medium" : "low",
    },
    {
      label: "Messages shared with AI",
      value: messages,
      detail: "stored by X",
      severity: severity(normalize(messages, 40)),
    },
  ];

  return {
    id: "ai",
    label: "AI Data Sharing",
    score,
    grade: toGrade(score),
    metrics,
  };
}

function scoreCommunication(archive: ParsedArchive): CategoryScore {
  const convos = archive.directMessages.length;
  const messages = archive.directMessages.reduce(
    (s, c) => s + c.messages.length,
    0,
  );

  const raw = messages + convos * 5;
  const score = normalize(raw, 300);

  const metrics: CategoryMetric[] = [
    {
      label: "DM conversations",
      value: convos,
      severity: severity(normalize(convos, 10)),
    },
    {
      label: "Private messages stored",
      value: messages,
      severity: severity(normalize(messages, 200)),
    },
  ];

  return {
    id: "communication",
    label: "Communication Surveillance",
    score,
    grade: toGrade(score),
    metrics,
  };
}

// --- Main -------------------------------------------------------------------

const WEIGHTS: Record<string, number> = {
  tracking: 20,
  behavioral: 20,
  ads: 20,
  retention: 15,
  thirdParty: 10,
  ai: 10,
  communication: 5,
};

function headline(score: number): string {
  if (score >= 81)
    return "X has built an extensive surveillance profile on you.";
  if (score >= 61)
    return "X has collected a significant amount of data about you.";
  if (score >= 41) return "X has a moderate data footprint on your activity.";
  if (score >= 21) return "X has collected limited data about you.";
  return "Your X data footprint is relatively small.";
}

function buildAnalogy(archive: ParsedArchive, score: number): string {
  // Use the *real* device count (push devices + encryption keys) — app
  // tokens are OAuth grants, not hardware fingerprints, so they don't
  // belong in a "fingerprinted N devices" analogy.
  const devices = getDeviceBreakdown(archive);
  const realDeviceCount = devices.pushDevices + devices.encryptionKeys;
  const uniqueIps = new Set(archive.ipAudit.map((e) => e.loginIp)).size;

  const advertiserSet = new Set<string>();
  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) advertiserSet.add(imp.advertiserName);
  }
  for (const batch of archive.adEngagements) {
    for (const eng of batch.engagements) advertiserSet.add(eng.advertiserName);
  }

  // Pick the most visceral analogy based on what's most extreme
  const deletedCount = archive.deletedTweets.length;
  const contactCount = archive.contacts.length;
  if (deletedCount > 50) {
    return `You deleted ${deletedCount.toLocaleString()} tweets thinking they were gone. X kept every single one.`;
  }
  if (contactCount > 100) {
    return `You gave X ${contactCount.toLocaleString()} contacts from your phone — people who never agreed to share their info.`;
  }
  if (advertiserSet.size > 200) {
    return `${advertiserSet.size.toLocaleString()} different companies paid to reach you — that's more brands than most supermarkets stock.`;
  }
  if (realDeviceCount > 5) {
    return `X fingerprinted ${realDeviceCount} of your devices — like a private investigator tracking you across ${realDeviceCount} locations.`;
  }
  if (uniqueIps > 20) {
    return `X logged ${uniqueIps} unique IPs where you accessed your account — a detailed map of everywhere you've been online.`;
  }
  if (score >= 60) {
    return "X knows more about your online habits than most people you've met in person.";
  }
  return "X has been quietly assembling a profile on you, one interaction at a time.";
}

function buildSpotlight(categories: CategoryScore[]): PrivacySpotlight | null {
  // Find the worst category
  const worst = categories[0];
  if (!worst || worst.score <= 30) return null;

  // Find the worst metric in that category
  const worstMetric = worst.metrics.reduce<CategoryMetric | null>((best, m) => {
    if (!best) return m;
    return m.severity === "high" && best.severity !== "high" ? m : best;
  }, null);

  if (!worstMetric) return null;

  const value =
    typeof worstMetric.value === "number"
      ? worstMetric.value.toLocaleString()
      : worstMetric.value;

  return {
    categoryLabel: worst.label,
    finding: `${worstMetric.label}: ${value}${worstMetric.detail ? ` (${worstMetric.detail})` : ""}`,
    severity: worst.score >= 60 ? "high" : "medium",
  };
}

export function computePrivacyScore(archive: ParsedArchive): PrivacyScore {
  const categories = [
    scoreTracking(archive),
    scoreBehavioral(archive),
    scoreAdExposure(archive),
    scoreDataRetention(archive),
    scoreThirdParty(archive),
    scoreAI(archive),
    scoreCommunication(archive),
  ];

  const totalWeight = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const overall = Math.round(
    categories.reduce(
      (sum, cat) => sum + cat.score * (WEIGHTS[cat.id] ?? 0),
      0,
    ) / totalWeight,
  );

  return {
    overall,
    grade: toGrade(overall),
    categories: categories.sort((a, b) => b.score - a.score),
    headline: headline(overall),
    analogy: buildAnalogy(archive, overall),
    spotlight: buildSpotlight(categories),
  };
}
